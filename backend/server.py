from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager

# ─── Config ─────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# ─── MongoDB ────────────────────────────────────────────────────────
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ─── Helpers ────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    return pyjwt.encode(
        {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

def create_refresh_token(user_id: str) -> str:
    return pyjwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return {"id": user["_id"], "email": user["email"], "name": user.get("name", "")}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Seed Admin ─────────────────────────────────────────────────────
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@planner.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")

# ─── Lifespan ───────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.tasks.create_index([("user_id", 1), ("date", 1)])
    await db.habits.create_index("user_id")
    await db.notes.create_index([("user_id", 1), ("created_at", -1)])
    await db.schedule.create_index([("user_id", 1), ("date", 1)])
    await db.timer_sessions.create_index([("user_id", 1)])
    await seed_admin()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ───────────────────────────────────────────────
class RegisterReq(BaseModel):
    email: str
    password: str
    name: str = ""

class LoginReq(BaseModel):
    email: str
    password: str

class TaskReq(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    date: str = ""
    completed: bool = False
    time_slot: str = ""

class HabitReq(BaseModel):
    name: str
    icon: str = "star"
    color: str = "#00E5FF"
    target_days: int = 7

class NoteReq(BaseModel):
    title: str
    content: str = ""
    mood: str = ""

class ScheduleReq(BaseModel):
    task_id: str = ""
    title: str = ""
    start_time: str
    end_time: str
    date: str
    color: str = "#00E5FF"

class TimerSettingsReq(BaseModel):
    work_duration: int = 25
    short_break: int = 5
    long_break: int = 15
    sessions_before_long: int = 4

class TimerSessionReq(BaseModel):
    duration: int
    type: str = "work"
    completed: bool = True

class AISuggestReq(BaseModel):
    context: str = ""

# ─── Health ─────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ─── Auth Routes ────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email, "password_hash": hash_password(req.password),
        "name": req.name or email.split("@")[0], "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    # Create default timer settings
    await db.timer_settings.update_one(
        {"user_id": uid}, {"$setOnInsert": {"user_id": uid, "work_duration": 25, "short_break": 5, "long_break": 15, "sessions_before_long": 4}}, upsert=True
    )
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": uid, "email": email, "name": doc["name"], "token": access}

@app.post("/api/auth/login")
async def login(req: LoginReq, request: Request, response: Response):
    email = req.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout = attempt.get("last_attempt", datetime.now(timezone.utc)) + timedelta(minutes=15)
        if datetime.now(timezone.utc) < lockout:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc)}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": uid, "email": email, "name": user.get("name", ""), "token": access}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@app.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return user

@app.post("/api/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── Task Routes ────────────────────────────────────────────────────
@app.get("/api/tasks")
async def get_tasks(date: str = "", user=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if date:
        query["date"] = date
    tasks = await db.tasks.find(query).sort("order", 1).to_list(200)
    return [serialize_doc(t) for t in tasks]

@app.post("/api/tasks")
async def create_task(req: TaskReq, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    count = await db.tasks.count_documents({"user_id": user["id"], "date": req.date or today})
    doc = {
        "user_id": user["id"], "title": req.title, "description": req.description,
        "priority": req.priority, "date": req.date or today,
        "completed": False, "time_slot": req.time_slot,
        "order": count, "created_at": datetime.now(timezone.utc)
    }
    result = await db.tasks.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, req: TaskReq, user=Depends(get_current_user)):
    update = {k: v for k, v in req.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc)
    result = await db.tasks.update_one(
        {"_id": ObjectId(task_id), "user_id": user["id"]}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return serialize_doc(task)

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    result = await db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@app.patch("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: str, user=Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": user["id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)}, {"$set": {"completed": not task["completed"]}}
    )
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return serialize_doc(task)

# ─── AI Suggestions ─────────────────────────────────────────────────
@app.post("/api/tasks/ai-suggest")
async def ai_suggest(req: AISuggestReq, user=Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tasks = await db.tasks.find({"user_id": user["id"], "date": today}).to_list(50)
    habits = await db.habits.find({"user_id": user["id"]}).to_list(50)
    task_list = "\n".join([f"- {t['title']} (priority: {t['priority']}, done: {t['completed']})" for t in tasks]) or "No tasks yet"
    habit_list = "\n".join([f"- {h['name']}" for h in habits]) or "No habits"
    prompt = f"""You are a productivity AI assistant. Based on the user's current tasks and habits, suggest 3 new tasks or improvements. Be specific and actionable.

Current tasks for today:
{task_list}

User's habits:
{habit_list}

Additional context: {req.context}

Respond with a JSON array of exactly 3 objects, each with "title", "description", and "priority" (high/medium/low). Only respond with the JSON array, no other text."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"suggest-{user['id']}-{uuid.uuid4().hex[:8]}",
            system_message="You are a smart productivity assistant. Always respond with valid JSON only."
        ).with_model("openai", "gpt-4.1-mini")
        resp = await chat.send_message(UserMessage(text=prompt))
        import json
        text = resp.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        suggestions = json.loads(text)
        return {"suggestions": suggestions}
    except Exception as e:
        return {"suggestions": [
            {"title": "Review and prioritize today's tasks", "description": "Take 5 minutes to review your task list and reorder by importance", "priority": "high"},
            {"title": "Take a short break", "description": "Step away for 10 minutes to recharge your focus", "priority": "medium"},
            {"title": "Plan tomorrow's top 3 tasks", "description": "Before ending today, identify the 3 most important tasks for tomorrow", "priority": "medium"}
        ], "fallback": True}

@app.post("/api/tasks/ai-prioritize")
async def ai_prioritize(user=Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tasks = await db.tasks.find({"user_id": user["id"], "date": today, "completed": False}).to_list(50)
    if not tasks:
        return {"message": "No incomplete tasks to prioritize"}
    task_list = "\n".join([f"- ID:{str(t['_id'])} | {t['title']} | current priority: {t['priority']}" for t in tasks])
    prompt = f"""Analyze these tasks and assign optimal priorities. Consider urgency, importance, and dependencies.

Tasks:
{task_list}

Respond with a JSON array of objects with "id" and "priority" (high/medium/low). Only respond with the JSON array."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"prioritize-{user['id']}-{uuid.uuid4().hex[:8]}",
            system_message="You are a task prioritization expert. Always respond with valid JSON only."
        ).with_model("openai", "gpt-4.1-mini")
        resp = await chat.send_message(UserMessage(text=prompt))
        import json
        text = resp.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        priorities = json.loads(text)
        for p in priorities:
            await db.tasks.update_one(
                {"_id": ObjectId(p["id"]), "user_id": user["id"]},
                {"$set": {"priority": p["priority"]}}
            )
        updated = await db.tasks.find({"user_id": user["id"], "date": today}).sort("order", 1).to_list(50)
        return {"tasks": [serialize_doc(t) for t in updated]}
    except Exception as e:
        return {"message": "Could not auto-prioritize", "error": str(e)}

# ─── Habit Routes ───────────────────────────────────────────────────
@app.get("/api/habits")
async def get_habits(user=Depends(get_current_user)):
    habits = await db.habits.find({"user_id": user["id"]}).to_list(50)
    result = []
    for h in habits:
        h = serialize_doc(h)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        h["checked_today"] = today in h.get("check_ins", [])
        h["streak"] = calculate_streak(h.get("check_ins", []))
        result.append(h)
    return result

def calculate_streak(check_ins):
    if not check_ins:
        return 0
    sorted_dates = sorted(check_ins, reverse=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    streak = 0
    current = datetime.now(timezone.utc).date()
    if sorted_dates[0] != today:
        yesterday = (current - timedelta(days=1)).strftime("%Y-%m-%d")
        if sorted_dates[0] != yesterday:
            return 0
        current = current - timedelta(days=1)
    for d in sorted_dates:
        if d == current.strftime("%Y-%m-%d"):
            streak += 1
            current -= timedelta(days=1)
        else:
            break
    return streak

@app.post("/api/habits")
async def create_habit(req: HabitReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"], "name": req.name, "icon": req.icon,
        "color": req.color, "target_days": req.target_days,
        "check_ins": [], "created_at": datetime.now(timezone.utc)
    }
    result = await db.habits.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    doc["checked_today"] = False
    doc["streak"] = 0
    return doc

@app.put("/api/habits/{habit_id}")
async def update_habit(habit_id: str, req: HabitReq, user=Depends(get_current_user)):
    result = await db.habits.update_one(
        {"_id": ObjectId(habit_id), "user_id": user["id"]},
        {"$set": {"name": req.name, "icon": req.icon, "color": req.color, "target_days": req.target_days}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    h = await db.habits.find_one({"_id": ObjectId(habit_id)})
    return serialize_doc(h)

@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: str, user=Depends(get_current_user)):
    result = await db.habits.delete_one({"_id": ObjectId(habit_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"message": "Habit deleted"}

@app.post("/api/habits/{habit_id}/check")
async def check_habit(habit_id: str, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    habit = await db.habits.find_one({"_id": ObjectId(habit_id), "user_id": user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    check_ins = habit.get("check_ins", [])
    if today in check_ins:
        check_ins.remove(today)
    else:
        check_ins.append(today)
    await db.habits.update_one({"_id": ObjectId(habit_id)}, {"$set": {"check_ins": check_ins}})
    h = await db.habits.find_one({"_id": ObjectId(habit_id)})
    h = serialize_doc(h)
    h["checked_today"] = today in check_ins
    h["streak"] = calculate_streak(check_ins)
    return h

# ─── Note Routes ────────────────────────────────────────────────────
@app.get("/api/notes")
async def get_notes(user=Depends(get_current_user)):
    notes = await db.notes.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [serialize_doc(n) for n in notes]

@app.post("/api/notes")
async def create_note(req: NoteReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"], "title": req.title, "content": req.content,
        "mood": req.mood, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.notes.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, req: NoteReq, user=Depends(get_current_user)):
    result = await db.notes.update_one(
        {"_id": ObjectId(note_id), "user_id": user["id"]},
        {"$set": {"title": req.title, "content": req.content, "mood": req.mood, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    n = await db.notes.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(n)

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str, user=Depends(get_current_user)):
    result = await db.notes.delete_one({"_id": ObjectId(note_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ─── Schedule Routes ────────────────────────────────────────────────
@app.get("/api/schedule")
async def get_schedule(date: str, user=Depends(get_current_user)):
    blocks = await db.schedule.find({"user_id": user["id"], "date": date}).to_list(50)
    return [serialize_doc(b) for b in blocks]

@app.post("/api/schedule")
async def create_schedule_block(req: ScheduleReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"], "task_id": req.task_id, "title": req.title,
        "start_time": req.start_time, "end_time": req.end_time,
        "date": req.date, "color": req.color,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.schedule.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@app.put("/api/schedule/{block_id}")
async def update_schedule_block(block_id: str, req: ScheduleReq, user=Depends(get_current_user)):
    result = await db.schedule.update_one(
        {"_id": ObjectId(block_id), "user_id": user["id"]},
        {"$set": {"title": req.title, "start_time": req.start_time, "end_time": req.end_time, "color": req.color}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    b = await db.schedule.find_one({"_id": ObjectId(block_id)})
    return serialize_doc(b)

@app.delete("/api/schedule/{block_id}")
async def delete_schedule_block(block_id: str, user=Depends(get_current_user)):
    result = await db.schedule.delete_one({"_id": ObjectId(block_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"message": "Block deleted"}

# ─── Timer Routes ───────────────────────────────────────────────────
@app.get("/api/timer/settings")
async def get_timer_settings(user=Depends(get_current_user)):
    settings = await db.timer_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    if not settings:
        settings = {"user_id": user["id"], "work_duration": 25, "short_break": 5, "long_break": 15, "sessions_before_long": 4}
        await db.timer_settings.insert_one(settings)
    return settings

@app.put("/api/timer/settings")
async def update_timer_settings(req: TimerSettingsReq, user=Depends(get_current_user)):
    await db.timer_settings.update_one(
        {"user_id": user["id"]},
        {"$set": {"work_duration": req.work_duration, "short_break": req.short_break, "long_break": req.long_break, "sessions_before_long": req.sessions_before_long}},
        upsert=True
    )
    return {"message": "Settings updated"}

@app.post("/api/timer/sessions")
async def log_timer_session(req: TimerSessionReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"], "duration": req.duration, "type": req.type,
        "completed": req.completed, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc)
    }
    await db.timer_sessions.insert_one(doc)
    return {"message": "Session logged"}

@app.get("/api/timer/sessions")
async def get_timer_sessions(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sessions = await db.timer_sessions.find({"user_id": user["id"], "date": today}, {"_id": 0}).to_list(50)
    return sessions

# ─── Dashboard Stats ───────────────────────────────────────────────
@app.get("/api/dashboard")
async def get_dashboard(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tasks = await db.tasks.find({"user_id": user["id"], "date": today}).to_list(100)
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.get("completed"))
    habits = await db.habits.find({"user_id": user["id"]}).to_list(50)
    habits_done = sum(1 for h in habits if today in h.get("check_ins", []))
    sessions = await db.timer_sessions.find({"user_id": user["id"], "date": today}).to_list(50)
    focus_minutes = sum(s.get("duration", 0) for s in sessions if s.get("type") == "work")
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "total_habits": len(habits),
        "habits_done": habits_done,
        "focus_minutes": focus_minutes,
        "pomodoro_sessions": len([s for s in sessions if s.get("type") == "work"]),
        "date": today
    }

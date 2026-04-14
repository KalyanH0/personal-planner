# Pulse Planner - PRD

## Original Problem Statement
Build a personal daily planner mobile app with unique UI and unlike AI common interfaces for real-time usage. Core Features: Task management (add, edit, delete, prioritize tasks), Time blocking / schedule view, Habit tracker (daily habits with streaks), Notes / journal entry, Pomodoro / focus timer. Glassmorphism style. AI Features - Smart task suggestions / auto-prioritization. User accounts / login. Cyan shades with glow and many modern effects.

## Architecture
- **Frontend**: React 18 (mobile-first web app, max-width 480px), Framer Motion, Phosphor Icons
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB (local)
- **AI**: OpenAI GPT-4.1-mini via Emergent Integrations (Emergent LLM Key)
- **Auth**: JWT (httpOnly cookies + Bearer token), bcrypt password hashing

## User Personas
- Productivity-focused individuals who want a mobile planner
- Users who prefer dark glassmorphism UI over standard AI interfaces
- People tracking habits, tasks, and focus sessions daily

## Core Requirements (Static)
1. JWT-based email/password auth
2. Task CRUD with priority levels (high/medium/low)
3. AI-powered task suggestions and auto-prioritization
4. Daily habit tracking with streak calculation
5. Journal/notes with mood tracking
6. Pomodoro timer with customizable intervals
7. Schedule/time blocking view
8. Dashboard with daily stats overview
9. Mobile-optimized bottom navigation
10. Glassmorphism UI with cyan glow effects

## What's Been Implemented (2026-04-14)
- Full JWT authentication (register, login, logout, refresh, admin seed)
- Dashboard with real-time stats (tasks done, habits, focus time, sessions)
- Task manager with add, edit, delete, toggle, priority badges
- AI task suggestions via GPT-4.1-mini (with fallback)
- AI auto-prioritization of tasks
- Habit tracker with check-in toggle and streak calculation
- Journal/notes with CRUD and mood selection
- Pomodoro timer with SVG ring progress, customizable intervals (work/short/long break)
- Schedule view with time blocks, current time indicator, unscheduled task chips
- Bottom navigation between all 6 pages
- Glassmorphism dark theme with cyan glow, Unbounded + Manrope fonts

## Testing Status
- Backend: 100% pass (all API endpoints verified)
- Frontend: 85% pass (core flows working, modal overlay minor Playwright interaction issue)

## Prioritized Backlog
### P0 (Critical) - None remaining
### P1 (High)
- Drag-and-drop for schedule time blocks
- Task reordering via drag
- Offline PWA support
### P2 (Medium)
- Password reset flow
- Dark/light theme toggle
- Weekly/monthly habit streak calendar view
- Task categories/tags
- Recurring tasks
### P3 (Low)
- Audio notification for Pomodoro timer completion
- Data export (CSV/JSON)
- Sharing/collaboration features

## Next Tasks
1. Add drag-and-drop to schedule view
2. Add PWA manifest for installability
3. Add weekly habit streak visualization

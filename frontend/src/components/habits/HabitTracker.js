import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash, X, Fire, Check } from '@phosphor-icons/react';

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

const HABIT_COLORS = ['#ffffff', '#0088FF', '#00FFB2', '#FFB800', '#FF3B30', '#8800FF', '#FF6B9D', '#00D68F'];

export default function HabitTracker() {
  const { request } = useApi();
  const [habits, setHabits] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', icon: 'star', color: '#ffffff', target_days: 7 });

  const load = useCallback(async () => {
    try {
      const data = await request('get', '/api/habits');
      setHabits(data);
    } catch {}
  }, [request]);

  useEffect(() => { load(); }, [load]);

  const addHabit = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/api/habits', form);
      setShowAdd(false);
      setForm({ name: '', icon: 'star', color: '#ffffff', target_days: 7 });
      load();
    } catch {}
  };

  const checkHabit = async (id) => {
    try {
      await request('post', `/api/habits/${id}/check`);
      load();
    } catch {}
  };

  const deleteHabit = async (id) => {
    try {
      await request('delete', `/api/habits/${id}`);
      load();
    } catch {}
  };

  // Week days for the mini calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d;
  });

  return (
    <div className="habits-page" data-testid="habits-page">
      <div className="page-header">
        <h1 className="page-title">Habits</h1>
        <p className="page-subtitle">Build consistency, one day at a time</p>
      </div>

      <div style={{ padding: '0 24px 16px' }}>
        <button className="btn-primary" onClick={() => setShowAdd(true)} data-testid="add-habit-btn" style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} weight="bold" /> New Habit
        </button>
      </div>

      {/* Week overview */}
      <div className="week-bar" data-testid="habit-week-bar">
        {weekDays.map((d, i) => {
          const isToday = i === 6;
          return (
            <div key={i} className={`week-day ${isToday ? 'week-today' : ''}`}>
              <span className="week-day-name">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
              <span className="week-day-num">{d.getDate()}</span>
              {isToday && <div className="week-day-dot" />}
            </div>
          );
        })}
      </div>

      {/* Habits list */}
      <motion.div className="habit-list" variants={{ visible: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="visible">
        {habits.length === 0 && (
          <div className="empty-state">
            <Fire size={48} weight="thin" color="#71717A" />
            <p style={{ marginTop: 12 }}>No habits yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Start building better routines</p>
          </div>
        )}
        {habits.map(habit => (
          <motion.div key={habit.id} variants={fadeUp} className="habit-card" data-testid={`habit-${habit.id}`}>
            <div className="habit-left" onClick={() => checkHabit(habit.id)} data-testid={`check-habit-${habit.id}`} style={{ cursor: 'pointer' }}>
              <div
                className={`habit-check-ring ${habit.checked_today ? 'habit-checked' : ''}`}
                style={{ borderColor: habit.checked_today ? habit.color : 'rgba(255,255,255,0.15)', background: habit.checked_today ? `${habit.color}15` : 'transparent' }}
              >
                {habit.checked_today ? <Check size={20} weight="bold" color={habit.color} /> : <div className="habit-check-empty" />}
              </div>
              <div>
                <div className="habit-name">{habit.name}</div>
                <div className="habit-streak">
                  {habit.streak > 0 && (
                    <>
                      <Fire size={14} weight="fill" color="#FFB800" />
                      <span>{habit.streak} day streak</span>
                    </>
                  )}
                  {habit.streak === 0 && <span style={{ color: '#71717A' }}>No streak yet</span>}
                </div>
              </div>
            </div>
            <button onClick={() => deleteHabit(habit.id)} className="habit-delete" data-testid={`delete-habit-${habit.id}`}>
              <Trash size={18} color="#71717A" />
            </button>
          </motion.div>
        ))}
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)}>
            <motion.div className="modal-sheet" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, color: '#fff' }}>New Habit</h3>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#71717A" /></button>
              </div>
              <form onSubmit={addHabit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  data-testid="habit-name-input"
                  className="input-field"
                  placeholder="Habit name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
                <div>
                  <label className="overline" style={{ display: 'block', marginBottom: 8 }}>Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {HABIT_COLORS.map(c => (
                      <button
                        key={c} type="button"
                        style={{
                          width: 32, height: 32, borderRadius: 10, background: c,
                          border: form.color === c ? '2px solid #fff' : '2px solid transparent',
                          cursor: 'pointer', transition: 'border 0.2s'
                        }}
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary" data-testid="habit-submit-btn" style={{ width: '100%' }}>Create Habit</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .habits-page { padding: 20px 0; }
        .week-bar {
          display: flex;
          justify-content: space-around;
          padding: 0 24px 20px;
        }
        .week-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .week-day-name {
          font-size: 11px;
          color: #71717A;
          font-weight: 600;
        }
        .week-day-num {
          font-size: 14px;
          color: #A1A1AA;
          font-weight: 600;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        .week-today .week-day-num {
          background: rgba(0,229,255,0.1);
          color: #ffffff;
          border: 1px solid rgba(0,229,255,0.3);
        }
        .week-day-dot {
          width: 4px;
          height: 4px;
          background: #ffffff;
          border-radius: 50%;
        }
        .habit-list { padding: 0 24px; }
        .habit-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          margin-bottom: 8px;
          transition: all 0.3s;
        }
        .habit-card:hover {
          border-color: rgba(255,255,255,0.12);
        }
        .habit-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .habit-check-ring {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          flex-shrink: 0;
        }
        .habit-checked {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .habit-check-empty {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.15);
        }
        .habit-name {
          color: #fff;
          font-weight: 600;
          font-size: 14px;
        }
        .habit-streak {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #FFB800;
          margin-top: 2px;
        }
        .habit-delete {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .habit-delete:hover {
          background: rgba(255,59,48,0.1);
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash, X, Clock } from '@phosphor-icons/react';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export default function ScheduleView() {
  const { request } = useApi();
  const [blocks, setBlocks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', start_time: '09:00', end_time: '10:00', color: '#ffffff' });

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([
        request('get', `/api/schedule?date=${today}`),
        request('get', `/api/tasks?date=${today}`)
      ]);
      setBlocks(b);
      setTasks(t.filter(x => !x.completed));
    } catch {}
  }, [request, today]);

  useEffect(() => { load(); }, [load]);

  const addBlock = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/api/schedule', { ...form, date: today });
      setShowAdd(false);
      setForm({ title: '', start_time: '09:00', end_time: '10:00', color: '#ffffff' });
      load();
    } catch {}
  };

  const addTaskToSchedule = async (task) => {
    try {
      await request('post', '/api/schedule', {
        task_id: task.id, title: task.title,
        start_time: '09:00', end_time: '10:00',
        date: today, color: '#ffffff'
      });
      load();
    } catch {}
  };

  const deleteBlock = async (id) => {
    try {
      await request('delete', `/api/schedule/${id}`);
      load();
    } catch {}
  };

  const getBlockPosition = (block) => {
    const [sh, sm] = block.start_time.split(':').map(Number);
    const [eh, em] = block.end_time.split(':').map(Number);
    const top = ((sh - 6) * 60 + sm) * (72 / 60);
    const height = ((eh - sh) * 60 + (em - sm)) * (72 / 60);
    return { top: `${top}px`, height: `${Math.max(height, 36)}px` };
  };

  return (
    <div className="schedule-page" data-testid="schedule-page">
      <div className="page-header">
        <h1 className="page-title">Schedule</h1>
        <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
      </div>

      <div className="sched-actions" style={{ padding: '0 24px 16px', display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={() => setShowAdd(true)} data-testid="add-block-btn" style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} weight="bold" /> Add Block
        </button>
      </div>

      {/* Unscheduled tasks */}
      {tasks.length > 0 && (
        <div className="unscheduled" style={{ padding: '0 24px 16px' }}>
          <p className="overline" style={{ marginBottom: 8 }}>Unscheduled Tasks</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {tasks.map(task => (
              <button
                key={task.id}
                className="unsched-chip"
                onClick={() => addTaskToSchedule(task)}
                data-testid={`schedule-task-${task.id}`}
              >
                <Clock size={14} /> {task.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="timeline" data-testid="schedule-timeline">
        <div className="timeline-grid">
          {HOURS.map(h => (
            <div key={h} className="timeline-row">
              <div className="timeline-label">
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
              <div className="timeline-line" />
            </div>
          ))}
          {/* Blocks */}
          {blocks.map(block => {
            const pos = getBlockPosition(block);
            return (
              <motion.div
                key={block.id}
                className="time-block"
                style={{ ...pos, borderLeftColor: block.color, left: '56px', right: '16px', position: 'absolute' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                data-testid={`block-${block.id}`}
              >
                <div className="block-title">{block.title}</div>
                <div className="block-time">{block.start_time} - {block.end_time}</div>
                <button className="block-delete" onClick={() => deleteBlock(block.id)} data-testid={`delete-block-${block.id}`}>
                  <Trash size={14} />
                </button>
              </motion.div>
            );
          })}
          {/* Current time indicator */}
          <CurrentTimeIndicator />
        </div>
      </div>

      {/* Add Block Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)}>
            <motion.div className="modal-sheet" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, color: '#fff' }}>New Time Block</h3>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#71717A" /></button>
              </div>
              <form onSubmit={addBlock} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  data-testid="block-title-input"
                  className="input-field"
                  placeholder="Block title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="overline" style={{ display: 'block', marginBottom: 6 }}>Start</label>
                    <input
                      data-testid="block-start-input"
                      type="time"
                      className="select-field"
                      value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="overline" style={{ display: 'block', marginBottom: 6 }}>End</label>
                    <input
                      data-testid="block-end-input"
                      type="time"
                      className="select-field"
                      value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="overline" style={{ display: 'block', marginBottom: 6 }}>Color</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['#ffffff', '#0088FF', '#00FFB2', '#FFB800', '#FF3B30', '#8800FF'].map(c => (
                      <button
                        key={c} type="button"
                        style={{
                          width: 32, height: 32, borderRadius: 10, background: c, border: form.color === c ? '2px solid #fff' : '2px solid transparent',
                          cursor: 'pointer', transition: 'border 0.2s'
                        }}
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary" data-testid="block-submit-btn" style={{ width: '100%' }}>Create Block</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .schedule-page { padding: 20px 0; }
        .timeline {
          padding: 0 24px;
          overflow-y: auto;
          max-height: calc(100vh - 280px);
        }
        .timeline-grid {
          position: relative;
          min-height: ${HOURS.length * 72}px;
        }
        .timeline-row {
          display: flex;
          align-items: flex-start;
          height: 72px;
        }
        .timeline-label {
          width: 48px;
          font-size: 11px;
          color: #71717A;
          font-weight: 600;
          flex-shrink: 0;
          padding-top: 2px;
        }
        .timeline-line {
          flex: 1;
          border-top: 1px solid rgba(255,255,255,0.04);
          height: 1px;
          margin-top: 6px;
        }
        .time-block {
          background: rgba(15, 15, 20, 0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-left: 3px solid;
          border-radius: 8px;
          padding: 8px 12px;
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .block-title {
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .block-time {
          color: #71717A;
          font-size: 11px;
          margin-top: 2px;
        }
        .block-delete {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          cursor: pointer;
          color: #71717A;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .time-block:hover .block-delete { opacity: 1; }
        .unsched-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: #A1A1AA;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.3s;
          font-family: 'Manrope', sans-serif;
        }
        .unsched-chip:hover {
          border-color: rgba(0,229,255,0.3);
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}

function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < 6 || h > 21) return null;
  const top = ((h - 6) * 60 + m) * (72 / 60);
  return (
    <div style={{ position: 'absolute', top: `${top}px`, left: 48, right: 0, display: 'flex', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30', boxShadow: '0 0 8px rgba(255,59,48,0.5)' }} />
      <div style={{ flex: 1, height: 1, background: 'rgba(255,59,48,0.4)' }} />
    </div>
  );
}

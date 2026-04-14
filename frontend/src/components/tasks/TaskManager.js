import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, CheckCircle, Circle, Trash, PencilSimple,
  Sparkle, ArrowsDownUp, CircleNotch, X
} from '@phosphor-icons/react';

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, x: -50 } };

export default function TaskManager() {
  const { request, loading } = useApi();
  const [tasks, setTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });

  const today = new Date().toISOString().split('T')[0];

  const loadTasks = useCallback(async () => {
    try {
      const data = await request('get', `/api/tasks?date=${today}`);
      setTasks(data);
    } catch {}
  }, [request, today]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await request('post', '/api/tasks', { ...form, date: today });
      setForm({ title: '', description: '', priority: 'medium' });
      setShowAdd(false);
      loadTasks();
    } catch {}
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await request('put', `/api/tasks/${editTask.id}`, { ...form, date: today });
      setEditTask(null);
      setForm({ title: '', description: '', priority: 'medium' });
      loadTasks();
    } catch {}
  };

  const toggleTask = async (id) => {
    try {
      await request('patch', `/api/tasks/${id}/toggle`);
      loadTasks();
    } catch {}
  };

  const deleteTask = async (id) => {
    try {
      await request('delete', `/api/tasks/${id}`);
      loadTasks();
    } catch {}
  };

  const getAISuggestions = async () => {
    setAiLoading(true);
    setShowAI(true);
    try {
      const data = await request('post', '/api/tasks/ai-suggest', { context: '' });
      setAiSuggestions(data.suggestions || []);
    } catch {
      setAiSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const autoPrioritize = async () => {
    try {
      const data = await request('post', '/api/tasks/ai-prioritize');
      if (data.tasks) setTasks(data.tasks);
      else loadTasks();
    } catch {}
  };

  const addSuggestion = async (s) => {
    try {
      await request('post', '/api/tasks', { title: s.title, description: s.description, priority: s.priority, date: today });
      loadTasks();
      setAiSuggestions(prev => prev.filter(x => x.title !== s.title));
    } catch {}
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({ title: task.title, description: task.description || '', priority: task.priority });
  };

  const incomplete = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  return (
    <div className="tasks-page" data-testid="tasks-page">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <p className="page-subtitle">{tasks.length} tasks today</p>
      </div>

      {/* Action buttons */}
      <div className="task-actions">
        <button className="btn-primary task-add-btn" onClick={() => { setShowAdd(true); setEditTask(null); setForm({ title: '', description: '', priority: 'medium' }); }} data-testid="add-task-btn">
          <Plus size={18} weight="bold" /> Add Task
        </button>
        <button className="btn-glass task-ai-btn" onClick={getAISuggestions} data-testid="ai-suggest-btn">
          <Sparkle size={18} weight="bold" /> AI Suggest
        </button>
        <button className="btn-glass task-sort-btn" onClick={autoPrioritize} data-testid="ai-prioritize-btn">
          <ArrowsDownUp size={18} weight="bold" /> Prioritize
        </button>
      </div>

      {/* Task List */}
      <motion.div className="task-list" variants={{ visible: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="visible">
        {incomplete.length === 0 && completed.length === 0 && !loading && (
          <div className="empty-state">
            <CheckCircle size={48} weight="thin" color="#71717A" />
            <p style={{ marginTop: 12 }}>No tasks for today</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Tap "Add Task" to get started</p>
          </div>
        )}
        <AnimatePresence>
          {incomplete.map(task => (
            <motion.div key={task.id} variants={fadeUp} exit="exit" layout className="task-item" data-testid={`task-${task.id}`}>
              <button className="task-check" onClick={() => toggleTask(task.id)} data-testid={`toggle-task-${task.id}`}>
                <Circle size={24} weight="regular" color="#71717A" />
              </button>
              <div className="task-body">
                <div className="task-title">{task.title}</div>
                {task.description && <div className="task-desc">{task.description}</div>}
                <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
              </div>
              <div className="task-item-actions">
                <button onClick={() => openEdit(task)} data-testid={`edit-task-${task.id}`}><PencilSimple size={18} color="#71717A" /></button>
                <button onClick={() => deleteTask(task.id)} data-testid={`delete-task-${task.id}`}><Trash size={18} color="#71717A" /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {completed.length > 0 && (
          <div className="completed-section">
            <p className="overline" style={{ padding: '16px 0 8px' }}>Completed ({completed.length})</p>
            {completed.map(task => (
              <motion.div key={task.id} variants={fadeUp} layout className="task-item task-done" data-testid={`task-${task.id}`}>
                <button className="task-check" onClick={() => toggleTask(task.id)} data-testid={`toggle-task-${task.id}`}>
                  <CheckCircle size={24} weight="fill" color="#00E5FF" />
                </button>
                <div className="task-body">
                  <div className="task-title task-title-done">{task.title}</div>
                </div>
                <button onClick={() => deleteTask(task.id)} data-testid={`delete-task-${task.id}`}><Trash size={18} color="#71717A" /></button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAdd || editTask) && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAdd(false); setEditTask(null); }}>
            <motion.div className="modal-sheet" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <h3 style={{ fontFamily: "'Unbounded', cursive", fontSize: 18, color: '#fff', marginBottom: 20 }}>
                {editTask ? 'Edit Task' : 'New Task'}
              </h3>
              <form onSubmit={editTask ? handleUpdate : handleAdd} className="task-form">
                <input
                  data-testid="task-title-input"
                  className="input-field"
                  placeholder="Task title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                />
                <textarea
                  data-testid="task-desc-input"
                  className="textarea-field"
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
                <div>
                  <label className="overline" style={{ display: 'block', marginBottom: 8 }}>Priority</label>
                  <div className="priority-select">
                    {['high', 'medium', 'low'].map(p => (
                      <button
                        key={p} type="button"
                        data-testid={`priority-${p}`}
                        className={`priority-option ${form.priority === p ? `priority-option-active priority-${p}` : ''}`}
                        onClick={() => setForm(f => ({ ...f, priority: p }))}
                      >{p}</button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary" data-testid="task-submit-btn" style={{ width: '100%' }}>
                  {editTask ? 'Update' : 'Add Task'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions Modal */}
      <AnimatePresence>
        {showAI && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAI(false)}>
            <motion.div className="modal-sheet" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Unbounded', cursive", fontSize: 18, color: '#fff' }}>
                  <Sparkle size={20} color="#00E5FF" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  AI Suggestions
                </h3>
                <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={22} color="#71717A" />
                </button>
              </div>
              {aiLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <CircleNotch size={32} color="#00E5FF" className="spinner" style={{ animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ marginTop: 12, color: '#71717A' }}>Analyzing your tasks...</p>
                </div>
              ) : aiSuggestions.length === 0 ? (
                <p style={{ color: '#71717A', textAlign: 'center', padding: 24 }}>No suggestions available</p>
              ) : (
                aiSuggestions.map((s, i) => (
                  <div key={i} className="ai-suggestion-card" data-testid={`ai-suggestion-${i}`}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s.title}</div>
                      <div style={{ color: '#A1A1AA', fontSize: 13 }}>{s.description}</div>
                      <span className={`priority-badge priority-${s.priority}`} style={{ marginTop: 8, display: 'inline-block' }}>{s.priority}</span>
                    </div>
                    <button className="btn-glass" onClick={() => addSuggestion(s)} data-testid={`add-suggestion-${i}`} style={{ padding: '8px 16px', fontSize: 12 }}>
                      <Plus size={14} weight="bold" /> Add
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .tasks-page { padding: 20px 0; }
        .task-actions {
          display: flex;
          gap: 8px;
          padding: 0 24px 16px;
          flex-wrap: wrap;
        }
        .task-add-btn {
          padding: 10px 20px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .task-ai-btn, .task-sort-btn {
          padding: 10px 16px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .task-list { padding: 0 24px; }
        .task-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          margin-bottom: 8px;
          transition: all 0.3s;
        }
        .task-item:hover {
          border-color: rgba(255,255,255,0.12);
        }
        .task-done { opacity: 0.5; }
        .task-check {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .task-body { flex: 1; min-width: 0; }
        .task-title { color: #fff; font-weight: 600; font-size: 14px; }
        .task-title-done { text-decoration: line-through; color: #71717A; }
        .task-desc { color: #71717A; font-size: 13px; margin: 4px 0 8px; }
        .task-item-actions {
          display: flex;
          gap: 4px;
        }
        .task-item-actions button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .task-item-actions button:hover {
          background: rgba(255,255,255,0.05);
        }
        .task-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .priority-select {
          display: flex;
          gap: 8px;
        }
        .priority-option {
          flex: 1;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #A1A1AA;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          text-transform: capitalize;
          cursor: pointer;
          transition: all 0.3s;
          font-family: 'Manrope', sans-serif;
        }
        .priority-option-active {
          color: inherit;
        }
        .ai-suggestion-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 1px solid rgba(0,229,255,0.15);
          background: rgba(0,229,255,0.03);
          border-radius: 16px;
          margin-bottom: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}

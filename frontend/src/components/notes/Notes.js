import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash, PencilSimple, X, NotePencil } from '@phosphor-icons/react';

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

const MOODS = [
  { emoji: '\u{1F60A}', label: 'Happy' },
  { emoji: '\u{1F610}', label: 'Neutral' },
  { emoji: '\u{1F614}', label: 'Sad' },
  { emoji: '\u{1F525}', label: 'Motivated' },
  { emoji: '\u{1F634}', label: 'Tired' },
];

export default function Notes() {
  const { request } = useApi();
  const [notes, setNotes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', mood: '' });

  const load = useCallback(async () => {
    try {
      const data = await request('get', '/api/notes');
      setNotes(data);
    } catch {}
  }, [request]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editNote) {
        await request('put', `/api/notes/${editNote.id}`, form);
      } else {
        await request('post', '/api/notes', form);
      }
      setShowAdd(false);
      setEditNote(null);
      setForm({ title: '', content: '', mood: '' });
      load();
    } catch {}
  };

  const deleteNote = async (id) => {
    try {
      await request('delete', `/api/notes/${id}`);
      load();
    } catch {}
  };

  const openEdit = (note) => {
    setEditNote(note);
    setForm({ title: note.title, content: note.content || '', mood: note.mood || '' });
    setShowAdd(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="notes-page" data-testid="notes-page">
      <div className="page-header">
        <h1 className="page-title">Journal</h1>
        <p className="page-subtitle">Capture your thoughts</p>
      </div>

      <div style={{ padding: '0 24px 16px' }}>
        <button
          className="btn-primary"
          onClick={() => { setShowAdd(true); setEditNote(null); setForm({ title: '', content: '', mood: '' }); }}
          data-testid="add-note-btn"
          style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} weight="bold" /> New Entry
        </button>
      </div>

      <motion.div className="notes-list" variants={{ visible: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="visible">
        {notes.length === 0 && (
          <div className="empty-state">
            <NotePencil size={48} weight="thin" color="#71717A" />
            <p style={{ marginTop: 12 }}>No journal entries yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Start writing your thoughts</p>
          </div>
        )}
        {notes.map(note => (
          <motion.div key={note.id} variants={fadeUp} className="note-card" data-testid={`note-${note.id}`}>
            <div className="note-header">
              <div>
                <div className="note-title">{note.title}</div>
                <div className="note-date">{formatDate(note.date)}</div>
              </div>
              <div className="note-actions">
                {note.mood && <span className="note-mood">{MOODS.find(m => m.label === note.mood)?.emoji || note.mood}</span>}
                <button onClick={() => openEdit(note)} data-testid={`edit-note-${note.id}`}><PencilSimple size={18} color="#71717A" /></button>
                <button onClick={() => deleteNote(note.id)} data-testid={`delete-note-${note.id}`}><Trash size={18} color="#71717A" /></button>
              </div>
            </div>
            {note.content && <div className="note-content">{note.content.length > 150 ? note.content.slice(0, 150) + '...' : note.content}</div>}
          </motion.div>
        ))}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAdd(false); setEditNote(null); }}>
            <motion.div className="modal-sheet" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, color: '#fff' }}>
                  {editNote ? 'Edit Entry' : 'New Entry'}
                </h3>
                <button onClick={() => { setShowAdd(false); setEditNote(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#71717A" /></button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  data-testid="note-title-input"
                  className="input-field"
                  placeholder="Title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                />
                <textarea
                  data-testid="note-content-input"
                  className="textarea-field"
                  placeholder="Write your thoughts..."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={6}
                />
                <div>
                  <label className="overline" style={{ display: 'block', marginBottom: 8 }}>Mood</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {MOODS.map(m => (
                      <button
                        key={m.label} type="button"
                        data-testid={`mood-${m.label.toLowerCase()}`}
                        onClick={() => setForm(f => ({ ...f, mood: f.mood === m.label ? '' : m.label }))}
                        style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: form.mood === m.label ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                          border: form.mood === m.label ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          fontSize: 20, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >{m.emoji}</button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary" data-testid="note-submit-btn" style={{ width: '100%' }}>
                  {editNote ? 'Update' : 'Save Entry'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .notes-page { padding: 20px 0; }
        .notes-list { padding: 0 24px; }
        .note-card {
          padding: 18px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          margin-bottom: 8px;
          transition: all 0.3s;
        }
        .note-card:hover {
          border-color: rgba(255,255,255,0.12);
        }
        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .note-title {
          color: #fff;
          font-weight: 600;
          font-size: 15px;
        }
        .note-date {
          color: #71717A;
          font-size: 12px;
          margin-top: 2px;
        }
        .note-content {
          color: #A1A1AA;
          font-size: 13px;
          line-height: 1.6;
          margin-top: 10px;
        }
        .note-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .note-actions button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .note-actions button:hover {
          background: rgba(255,255,255,0.05);
        }
        .note-mood {
          font-size: 20px;
        }
      `}</style>
    </div>
  );
}

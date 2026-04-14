import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { motion } from 'framer-motion';
import { Play, Pause, ArrowClockwise, GearSix, X } from '@phosphor-icons/react';

export default function PomodoroTimer() {
  const { request } = useApi();
  const [settings, setSettings] = useState({ work_duration: 25, short_break: 5, long_break: 15, sessions_before_long: 4 });
  const [mode, setMode] = useState('work'); // work, short_break, long_break
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...settings });
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await request('get', '/api/timer/settings');
      setSettings(data);
      setSettingsForm(data);
      if (!running) setTimeLeft(data.work_duration * 60);
    } catch {}
  }, [request, running]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now() - ((getDuration() - timeLeft) * 1000);
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = getDuration() - elapsed;
        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          setRunning(false);
          handleSessionEnd();
        } else {
          setTimeLeft(remaining);
        }
      }, 250);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]); // eslint-disable-line

  const getDuration = () => {
    if (mode === 'work') return settings.work_duration * 60;
    if (mode === 'short_break') return settings.short_break * 60;
    return settings.long_break * 60;
  };

  const handleSessionEnd = async () => {
    if (mode === 'work') {
      try {
        await request('post', '/api/timer/sessions', { duration: settings.work_duration, type: 'work', completed: true });
      } catch {}
      if (session >= settings.sessions_before_long) {
        setMode('long_break');
        setTimeLeft(settings.long_break * 60);
        setSession(1);
      } else {
        setMode('short_break');
        setTimeLeft(settings.short_break * 60);
      }
    } else {
      if (mode === 'short_break') setSession(s => s + 1);
      setMode('work');
      setTimeLeft(settings.work_duration * 60);
    }
  };

  const toggle = () => setRunning(!running);

  const reset = () => {
    setRunning(false);
    setTimeLeft(getDuration());
  };

  const switchMode = (m) => {
    setRunning(false);
    setMode(m);
    if (m === 'work') setTimeLeft(settings.work_duration * 60);
    else if (m === 'short_break') setTimeLeft(settings.short_break * 60);
    else setTimeLeft(settings.long_break * 60);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await request('put', '/api/timer/settings', settingsForm);
      setSettings(settingsForm);
      setShowSettings(false);
      if (!running) {
        if (mode === 'work') setTimeLeft(settingsForm.work_duration * 60);
        else if (mode === 'short_break') setTimeLeft(settingsForm.short_break * 60);
        else setTimeLeft(settingsForm.long_break * 60);
      }
    } catch {}
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalDuration = getDuration();
  const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;

  // SVG ring
  const size = 280;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const modeColors = {
    work: '#00E5FF',
    short_break: '#00FFB2',
    long_break: '#0088FF',
  };
  const activeColor = modeColors[mode];

  return (
    <div className="timer-page" data-testid="timer-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Focus</h1>
            <p className="page-subtitle">Session {session} of {settings.sessions_before_long}</p>
          </div>
          <button className="timer-settings-btn" onClick={() => setShowSettings(true)} data-testid="timer-settings-btn">
            <GearSix size={22} weight="regular" />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="timer-modes" data-testid="timer-mode-tabs">
        {[
          { key: 'work', label: 'Focus' },
          { key: 'short_break', label: 'Short Break' },
          { key: 'long_break', label: 'Long Break' },
        ].map(m => (
          <button
            key={m.key}
            data-testid={`mode-${m.key}`}
            className={`timer-mode-tab ${mode === m.key ? 'timer-mode-active' : ''}`}
            style={mode === m.key ? { borderColor: modeColors[m.key], color: modeColors[m.key] } : {}}
            onClick={() => switchMode(m.key)}
          >{m.label}</button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="timer-ring-container" data-testid="timer-display">
        <svg width={size} height={size} className="timer-svg">
          {/* Background ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={activeColor} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.3s ease', transform: 'rotate(-90deg)', transformOrigin: 'center', filter: `drop-shadow(0 0 8px ${activeColor}50)` }}
          />
        </svg>
        <div className="timer-display">
          <div className="timer-time" style={{ color: activeColor }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="timer-mode-label">{mode === 'work' ? 'Focus Time' : mode === 'short_break' ? 'Short Break' : 'Long Break'}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button className="timer-reset-btn" onClick={reset} data-testid="timer-reset-btn">
          <ArrowClockwise size={22} weight="regular" />
        </button>
        <motion.button
          className="timer-play-btn"
          style={{ background: activeColor, boxShadow: `0 0 30px ${activeColor}40` }}
          onClick={toggle}
          data-testid="timer-toggle-btn"
          whileTap={{ scale: 0.95 }}
        >
          {running ? <Pause size={28} weight="fill" color="#000" /> : <Play size={28} weight="fill" color="#000" />}
        </motion.button>
        <div style={{ width: 48 }} />
      </div>

      {/* Session dots */}
      <div className="session-dots" data-testid="session-dots">
        {Array.from({ length: settings.sessions_before_long }, (_, i) => (
          <div
            key={i}
            className="session-dot"
            style={{
              background: i < session - (mode === 'work' ? 0 : 0) ? activeColor : 'rgba(255,255,255,0.1)',
              boxShadow: i < session ? `0 0 8px ${activeColor}40` : 'none'
            }}
          />
        ))}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowSettings(false)}>
          <motion.div className="modal-sheet" initial={{ y: 100 }} animate={{ y: 0 }} onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Unbounded', cursive", fontSize: 18, color: '#fff' }}>Timer Settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#71717A" /></button>
            </div>
            <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="settings-row">
                <label className="settings-label">Focus Duration (min)</label>
                <input
                  data-testid="setting-work-duration"
                  type="number"
                  className="settings-input"
                  min={1} max={120}
                  value={settingsForm.work_duration}
                  onChange={e => setSettingsForm(f => ({ ...f, work_duration: parseInt(e.target.value) || 25 }))}
                />
              </div>
              <div className="settings-row">
                <label className="settings-label">Short Break (min)</label>
                <input
                  data-testid="setting-short-break"
                  type="number"
                  className="settings-input"
                  min={1} max={60}
                  value={settingsForm.short_break}
                  onChange={e => setSettingsForm(f => ({ ...f, short_break: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="settings-row">
                <label className="settings-label">Long Break (min)</label>
                <input
                  data-testid="setting-long-break"
                  type="number"
                  className="settings-input"
                  min={1} max={60}
                  value={settingsForm.long_break}
                  onChange={e => setSettingsForm(f => ({ ...f, long_break: parseInt(e.target.value) || 15 }))}
                />
              </div>
              <div className="settings-row">
                <label className="settings-label">Sessions Before Long Break</label>
                <input
                  data-testid="setting-sessions-count"
                  type="number"
                  className="settings-input"
                  min={1} max={10}
                  value={settingsForm.sessions_before_long}
                  onChange={e => setSettingsForm(f => ({ ...f, sessions_before_long: parseInt(e.target.value) || 4 }))}
                />
              </div>
              <button type="submit" className="btn-primary" data-testid="settings-save-btn" style={{ width: '100%' }}>Save Settings</button>
            </form>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        .timer-page { padding: 20px 0; }
        .timer-settings-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px;
          cursor: pointer;
          color: #71717A;
          transition: all 0.3s;
        }
        .timer-settings-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
        .timer-modes {
          display: flex;
          gap: 8px;
          padding: 0 24px 24px;
        }
        .timer-mode-tab {
          flex: 1;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          color: #71717A;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          font-family: 'Manrope', sans-serif;
        }
        .timer-mode-active {
          background: rgba(255,255,255,0.03);
        }
        .timer-ring-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          width: 280px;
          height: 280px;
        }
        .timer-svg {
          position: absolute;
          top: 0;
          left: 0;
        }
        .timer-display {
          text-align: center;
          z-index: 1;
        }
        .timer-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 56px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .timer-mode-label {
          font-size: 13px;
          color: #71717A;
          margin-top: 8px;
          font-weight: 600;
        }
        .timer-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 32px;
        }
        .timer-play-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .timer-play-btn:hover {
          transform: scale(1.05);
        }
        .timer-reset-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #A1A1AA;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .timer-reset-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
        .session-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .session-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transition: all 0.3s;
        }
        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .settings-label {
          color: #A1A1AA;
          font-size: 14px;
          font-weight: 500;
        }
        .settings-input {
          width: 80px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 16px;
          text-align: center;
          outline: none;
          font-family: 'JetBrains Mono', monospace;
        }
        .settings-input:focus { border-color: #00E5FF; }
      `}</style>
    </div>
  );
}

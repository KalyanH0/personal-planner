import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { motion } from 'framer-motion';
import {
  Lightning, CheckCircle, Heartbeat, Timer,
  ArrowRight, SignOut, Sparkle
} from '@phosphor-icons/react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    request('get', '/api/dashboard').then(setStats).catch(() => {});
  }, [request]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="dashboard" data-testid="dashboard-page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <p className="overline">{today}</p>
          <h1 className="dash-greeting">{greeting()}, <span className="dash-name">{user?.name || 'there'}</span></h1>
        </div>
        <button onClick={logout} className="dash-logout" data-testid="logout-btn">
          <SignOut size={22} weight="regular" />
        </button>
      </div>

      {/* Stats Grid */}
      <motion.div className="stats-grid" variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="stat-card stat-tasks" onClick={() => navigate('/tasks')} data-testid="stat-tasks">
          <div className="stat-icon-wrap stat-icon-cyan">
            <CheckCircle size={22} weight="bold" />
          </div>
          <div className="stat-value">{stats?.completed_tasks || 0}<span className="stat-total">/{stats?.total_tasks || 0}</span></div>
          <div className="stat-label">Tasks Done</div>
        </motion.div>

        <motion.div variants={fadeUp} className="stat-card stat-habits" onClick={() => navigate('/habits')} data-testid="stat-habits">
          <div className="stat-icon-wrap stat-icon-green">
            <Heartbeat size={22} weight="bold" />
          </div>
          <div className="stat-value">{stats?.habits_done || 0}<span className="stat-total">/{stats?.total_habits || 0}</span></div>
          <div className="stat-label">Habits</div>
        </motion.div>

        <motion.div variants={fadeUp} className="stat-card stat-focus" onClick={() => navigate('/timer')} data-testid="stat-focus">
          <div className="stat-icon-wrap stat-icon-blue">
            <Timer size={22} weight="bold" />
          </div>
          <div className="stat-value">{stats?.focus_minutes || 0}<span className="stat-unit">m</span></div>
          <div className="stat-label">Focus Time</div>
        </motion.div>

        <motion.div variants={fadeUp} className="stat-card stat-sessions" onClick={() => navigate('/timer')} data-testid="stat-sessions">
          <div className="stat-icon-wrap stat-icon-purple">
            <Lightning size={22} weight="bold" />
          </div>
          <div className="stat-value">{stats?.pomodoro_sessions || 0}</div>
          <div className="stat-label">Sessions</div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={stagger} initial="hidden" animate="visible" className="quick-actions">
        <p className="overline" style={{ padding: '0 24px', marginBottom: 12 }}>Quick Actions</p>
        {[
          { label: 'Manage Tasks', path: '/tasks', icon: CheckCircle, desc: 'Add, edit & prioritize' },
          { label: 'Time Blocks', path: '/schedule', icon: Lightning, desc: 'Plan your schedule' },
          { label: 'Focus Timer', path: '/timer', icon: Timer, desc: 'Start a pomodoro session' },
          { label: 'AI Suggestions', path: '/tasks', icon: Sparkle, desc: 'Smart task ideas', glow: true },
        ].map(item => (
          <motion.div key={item.path + item.label} variants={fadeUp}>
            <button
              className={`quick-action-btn ${item.glow ? 'quick-action-glow' : ''}`}
              onClick={() => navigate(item.path)}
              data-testid={`quick-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div className="qa-left">
                <item.icon size={20} weight="regular" color={item.glow ? '#00E5FF' : '#A1A1AA'} />
                <div>
                  <div className="qa-label">{item.label}</div>
                  <div className="qa-desc">{item.desc}</div>
                </div>
              </div>
              <ArrowRight size={18} weight="regular" color="#71717A" />
            </button>
          </motion.div>
        ))}
      </motion.div>

      <style>{`
        .dashboard { padding: 20px 0; }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0 24px 24px;
        }
        .dash-greeting {
          font-family: 'Unbounded', cursive;
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin-top: 6px;
          letter-spacing: -0.03em;
        }
        .dash-name {
          background: linear-gradient(135deg, #00E5FF, #00FFB2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dash-logout {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px;
          cursor: pointer;
          color: #71717A;
          transition: all 0.3s;
        }
        .dash-logout:hover { color: #FF3B30; border-color: rgba(255,59,48,0.3); }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 0 24px;
          margin-bottom: 32px;
        }
        .stat-card {
          backdrop-filter: blur(24px);
          background: rgba(15, 15, 20, 0.4);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .stat-card:hover {
          border-color: rgba(255,255,255,0.12);
          transform: scale(1.02);
        }
        .stat-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .stat-icon-cyan { background: rgba(0,229,255,0.1); color: #00E5FF; }
        .stat-icon-green { background: rgba(0,255,178,0.1); color: #00FFB2; }
        .stat-icon-blue { background: rgba(0,136,255,0.1); color: #0088FF; }
        .stat-icon-purple { background: rgba(136,0,255,0.1); color: #8800FF; }
        .stat-value {
          font-family: 'Unbounded', cursive;
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }
        .stat-total { font-size: 16px; color: #71717A; font-weight: 400; }
        .stat-unit { font-size: 14px; color: #71717A; font-weight: 400; margin-left: 2px; }
        .stat-label {
          font-size: 12px;
          color: #71717A;
          margin-top: 6px;
          font-weight: 600;
        }

        .quick-actions { padding-bottom: 16px; }
        .quick-action-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: calc(100% - 48px);
          margin: 0 24px 8px;
          padding: 16px 18px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s;
          color: #fff;
        }
        .quick-action-btn:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.12);
        }
        .quick-action-glow {
          border-color: rgba(0,229,255,0.15);
          background: rgba(0,229,255,0.03);
        }
        .quick-action-glow:hover {
          border-color: rgba(0,229,255,0.3);
          box-shadow: 0 0 20px rgba(0,229,255,0.08);
        }
        .qa-left { display: flex; align-items: center; gap: 14px; }
        .qa-label { font-size: 14px; font-weight: 600; text-align: left; }
        .qa-desc { font-size: 12px; color: #71717A; text-align: left; margin-top: 1px; }
      `}</style>
    </div>
  );
}

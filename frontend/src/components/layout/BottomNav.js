import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { House, ListChecks, CalendarBlank, Heartbeat, Timer, NotePencil } from '@phosphor-icons/react';

const navItems = [
  { path: '/', icon: House, label: 'Home' },
  { path: '/tasks', icon: ListChecks, label: 'Tasks' },
  { path: '/schedule', icon: CalendarBlank, label: 'Schedule' },
  { path: '/habits', icon: Heartbeat, label: 'Habits' },
  { path: '/timer', icon: Timer, label: 'Focus' },
  { path: '/notes', icon: NotePencil, label: 'Notes' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav" data-testid="bottom-navigation">
      {navItems.map(item => {
        const active = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            data-testid={`nav-${item.label.toLowerCase()}`}
            className={`nav-item ${active ? 'nav-active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={24} weight={active ? 'fill' : 'regular'} />
            <span className="nav-label">{item.label}</span>
            {active && <div className="nav-indicator" />}
          </button>
        );
      })}

      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 8px 12px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          background: rgba(5, 5, 5, 0.85);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          z-index: 100;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: none;
          border: none;
          cursor: pointer;
          color: #71717A;
          padding: 6px 8px;
          border-radius: 12px;
          transition: all 0.3s;
          position: relative;
          min-width: 52px;
        }
        .nav-item:hover {
          color: #A1A1AA;
        }
        .nav-active {
          color: #00E5FF;
        }
        .nav-label {
          font-size: 10px;
          font-weight: 600;
          font-family: 'Manrope', sans-serif;
          letter-spacing: 0.02em;
        }
        .nav-indicator {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: #00E5FF;
          border-radius: 0 0 4px 4px;
          box-shadow: 0 0 10px rgba(0,229,255,0.5);
        }
      `}</style>
    </nav>
  );
}

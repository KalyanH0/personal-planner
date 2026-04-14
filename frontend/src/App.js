import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import TaskManager from './components/tasks/TaskManager';
import ScheduleView from './components/schedule/ScheduleView';
import HabitTracker from './components/habits/HabitTracker';
import Notes from './components/notes/Notes';
import PomodoroTimer from './components/timer/PomodoroTimer';
import BottomNav from './components/layout/BottomNav';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loader"><div className="loader-ring" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <div className="app-content">{children}</div>
      <BottomNav />
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loader"><div className="loader-ring" /></div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><AppLayout><TaskManager /></AppLayout></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><AppLayout><ScheduleView /></AppLayout></ProtectedRoute>} />
      <Route path="/habits" element={<ProtectedRoute><AppLayout><HabitTracker /></AppLayout></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><AppLayout><Notes /></AppLayout></ProtectedRoute>} />
      <Route path="/timer" element={<ProtectedRoute><AppLayout><PomodoroTimer /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

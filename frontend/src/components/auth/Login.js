import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Envelope, Lock, SignIn, CircleNotch } from '@phosphor-icons/react';

function formatApiError(detail) {
  if (detail == null) return 'Something went wrong.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => e?.msg || JSON.stringify(e)).join(' ');
  return String(detail);
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" data-testid="login-page">
      <div className="auth-bg-glow" />
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="auth-brand">
          <div className="auth-logo-ring">
            <SignIn size={28} weight="bold" color="#ffffff" />
          </div>
          <h1 className="auth-title">Personal Planner</h1>
          <p className="auth-tagline">Your intelligent daily planner</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error" data-testid="login-error">
              {error}
            </div>
          )}

          <div className="auth-input-group">
            <Envelope size={20} weight="regular" className="auth-input-icon" />
            <input
              data-testid="login-email-input"
              type="email"
              placeholder="Email address"
              className="input-field auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <Lock size={20} weight="regular" className="auth-input-icon" />
            <input
              data-testid="login-password-input"
              type="password"
              placeholder="Password"
              className="input-field auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            data-testid="login-submit-btn"
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? (
              <CircleNotch size={20} className="spinner" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="auth-switch">
          No account?{' '}
          <Link to="/register" data-testid="go-to-register">
            Create one
          </Link>
        </p>
      </motion.div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .auth-bg-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(0,229,255,0.15), transparent 70%);
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 50%;
          pointer-events: none;
        }
        .auth-container {
          width: 100%;
          max-width: 380px;
          position: relative;
          z-index: 1;
        }
        .auth-brand {
          text-align: center;
          margin-bottom: 40px;
        }
        .auth-logo-ring {
          width: 64px;
          height: 64px;
          border: 2px solid rgba(0,229,255,0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          background: rgba(0,229,255,0.05);
          box-shadow: 0 0 30px rgba(0,229,255,0.1);
        }
        .auth-title {
          font-family: 'Manrope', sans-serif;
          font-size: 36px;
          font-weight: 900;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #f1f3f3ff, #f9fafcff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-tagline {
          color: #71717A;
          font-size: 14px;
          margin-top: 6px;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .auth-input-group {
          position: relative;
        }
        .auth-input-icon {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          color: #71717A;
        }
        .auth-input {
          padding-left: 32px !important;
        }
        .auth-submit {
          width: 100%;
          margin-top: 8px;
        }
        .auth-error {
          background: rgba(255,59,48,0.1);
          border: 1px solid rgba(255,59,48,0.3);
          color: #FF3B30;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }
        .auth-switch {
          text-align: center;
          margin-top: 24px;
          color: #71717A;
          font-size: 14px;
        }
        .auth-switch a {
          color: #ffffff;
          text-decoration: none;
          font-weight: 600;
        }
        .spinner {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

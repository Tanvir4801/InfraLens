import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin',    username: 'admin',    password: 'admin123',    role: 'Full Access',  color: '#E24B4A' },
  { label: 'Operator', username: 'operator', password: 'operator123', role: 'Ops Access',   color: '#EF9F27' },
  { label: 'Viewer',   username: 'viewer',   password: 'viewer123',   role: 'Read Only',    color: '#378ADD' },
];

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid credentials. Try a demo account below.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acct) => {
    setUsername(acct.username);
    setPassword(acct.password);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: '#1D9E75',
              boxShadow: '0 0 12px #1D9E75',
            }} />
            <span style={{ fontSize: 26, fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.5px' }}>
              InfraLens
            </span>
          </div>
          <p style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>
            AI-Powered DevOps Monitoring Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: 14,
          padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ color: '#e6edf3', fontSize: 18, fontWeight: 600, margin: '0 0 6px 0' }}>
            Sign in to your account
          </h2>
          <p style={{ color: '#8b949e', fontSize: 13, margin: '0 0 24px 0' }}>
            Enter your credentials or use a demo account
          </p>

          {error && (
            <div style={{
              background: 'rgba(226, 75, 74, 0.12)',
              border: '1px solid rgba(226, 75, 74, 0.35)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#E24B4A',
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8b949e', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  color: '#e6edf3',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#1D9E75'}
                onBlur={e  => e.target.style.borderColor = '#30363d'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#8b949e', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  color: '#e6edf3',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#1D9E75'}
                onBlur={e  => e.target.style.borderColor = '#30363d'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 8,
                background: loading ? '#1a6b52' : '#1D9E75',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                letterSpacing: '0.3px',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            margin: '24px 0 16px',
          }}>
            <div style={{ flex: 1, height: 1, background: '#30363d' }} />
            <span style={{ color: '#484f58', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
              DEMO ACCOUNTS — CLICK TO FILL
            </span>
            <div style={{ flex: 1, height: 1, background: '#30363d' }} />
          </div>

          {/* Demo account pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.label}
                type="button"
                onClick={() => fillDemo(acct)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#0d1117',
                  border: `1px solid ${acct.color}33`,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = acct.color + '88';
                  e.currentTarget.style.background = acct.color + '11';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = acct.color + '33';
                  e.currentTarget.style.background = '#0d1117';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: acct.color + '22',
                    border: `1px solid ${acct.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: acct.color,
                  }}>
                    {acct.label[0]}
                  </div>
                  <div>
                    <div style={{ color: '#e6edf3', fontSize: 13, fontWeight: 600 }}>
                      {acct.username}
                    </div>
                    <div style={{ color: '#8b949e', fontSize: 11 }}>
                      Password: <span style={{ color: '#5DCAA5', fontFamily: 'monospace' }}>{acct.password}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px',
                    borderRadius: 4, background: acct.color + '22',
                    color: acct.color, border: `1px solid ${acct.color}44`,
                  }}>
                    {acct.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: '#484f58' }}>{acct.role}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#484f58', fontSize: 11, marginTop: 20 }}>
          InfraLens v0.3.0 · AI-Powered Infrastructure Monitoring
        </p>
      </div>
    </div>
  );
};

export default Login;

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import AlertsPage from './pages/AlertsPage';
import Metrics from './pages/Metrics';
import AiPredict from './pages/AiPredict';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import './App.css';

const API_BASE = '';

function Sidebar({ alertCount }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-section-label">OVERVIEW</div>
      <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">⊞</span> Dashboard
      </NavLink>
      <NavLink to="/servers" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">⬡</span> Servers
      </NavLink>
      <NavLink to="/alerts" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🔔</span> Alerts
        {alertCount > 0 && <span className="badge-red">{alertCount}</span>}
      </NavLink>

      <div className="sidebar-section-label" style={{ marginTop: 20 }}>ANALYTICS</div>
      <NavLink to="/metrics" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">∿</span> Metrics
      </NavLink>
      <NavLink to="/ai-predict" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">✦</span> AI Predict
      </NavLink>

      <div className="sidebar-section-label" style={{ marginTop: 20 }}>SYSTEM</div>
      <NavLink to="/logs" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">≡</span> Logs
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">⚙</span> Settings
      </NavLink>
    </nav>
  );
}

function Topbar({ metrics, alertCount, wsConnected }) {
  const [secAgo, setSecAgo] = useState(0);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    if (metrics) {
      lastUpdateRef.current = Date.now();
      setSecAgo(0);
    }
  }, [metrics]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecAgo(Math.round((Date.now() - lastUpdateRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="logo-dot" />
        <span className="logo-text">InfraLens</span>
      </div>
      <div className="topbar-right">
        <span className="pill-green">● 3 nodes healthy</span>
        {alertCount > 0 && (
          <span className="pill-red">🔔 {alertCount} alert{alertCount !== 1 ? 's' : ''}</span>
        )}
        <span className="live-badge">
          <span className={wsConnected ? 'live-dot' : 'live-dot-off'} />
          {wsConnected ? 'Live' : 'Polling'} · updated {secAgo}s ago
        </span>
        <span className="topbar-menu">···</span>
      </div>
    </header>
  );
}

function AppShell() {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const metricsHistoryRef = useRef([]);

  const connectWs = () => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/live`);

    ws.onopen = () => {
      setWsConnected(true);
      ws.send('ping');
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMetrics(data);
        metricsHistoryRef.current = [...metricsHistoryRef.current.slice(-59), data];
      } catch {}
    };

    ws.onclose = () => {
      setWsConnected(false);
      setTimeout(connectWs, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    connectWs();

    const pollMetrics = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/metrics`);
        if (r.ok) {
          const data = await r.json();
          setMetrics(data);
          metricsHistoryRef.current = [...metricsHistoryRef.current.slice(-59), data];
        }
      } catch {}
    };

    const pollAlerts = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/alerts`);
        const d = await r.json();
        setAlerts(d.alerts || []);
      } catch {}
    };

    pollMetrics();
    pollAlerts();
    const tMetrics = setInterval(pollMetrics, 3000);
    const tAlerts = setInterval(pollAlerts, 10000);

    return () => {
      clearInterval(tMetrics);
      clearInterval(tAlerts);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const alertCount = alerts.length;

  return (
    <div className="app-shell">
      <Topbar metrics={metrics} alertCount={alertCount} wsConnected={wsConnected} />
      <div className="app-body">
        <Sidebar alertCount={alertCount} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard metrics={metrics} metricsHistory={metricsHistoryRef} alerts={alerts} apiBase={API_BASE} />} />
            <Route path="/servers" element={<Servers apiBase={API_BASE} />} />
            <Route path="/alerts" element={<AlertsPage alerts={alerts} apiBase={API_BASE} />} />
            <Route path="/metrics" element={<Metrics metrics={metrics} metricsHistory={metricsHistoryRef} apiBase={API_BASE} />} />
            <Route path="/ai-predict" element={<AiPredict apiBase={API_BASE} />} />
            <Route path="/logs" element={<Logs apiBase={API_BASE} />} />
            <Route path="/settings" element={<Settings apiBase={API_BASE} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

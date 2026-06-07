import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import AlertsPage from './pages/AlertsPage';
import Metrics from './pages/Metrics';
import AiPredict from './pages/AiPredict';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import AiCopilot from './pages/AiCopilot';
import InfraMap from './pages/InfraMap';
import IncidentTimeline from './pages/IncidentTimeline';
import CostOptimizer from './pages/CostOptimizer';
import Login from './pages/Login';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

function Sidebar() {
  const { user, logout } = useAuth();
  
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
      </NavLink>
      <NavLink to="/infra-map" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🗺</span> Infra Map
      </NavLink>

      <div className="sidebar-section-label" style={{ marginTop: 20 }}>ANALYTICS</div>
      <NavLink to="/metrics" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">∿</span> Metrics
      </NavLink>
      <NavLink to="/ai-predict" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">✦</span> AI Predict
      </NavLink>
      <NavLink to="/ai-copilot" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🤖</span> AI Copilot
      </NavLink>
      <NavLink to="/incident-timeline" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🕒</span> Timeline
      </NavLink>
      <NavLink to="/cost-optimizer" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">💰</span> Optimizer
      </NavLink>

      <div className="sidebar-section-label" style={{ marginTop: 20 }}>SYSTEM</div>
      <NavLink to="/logs" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">≡</span> Logs
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">⚙</span> Settings
      </NavLink>

      <div className="mt-auto p-4 border-t border-gray-700">
         <div className="text-xs text-gray-500 mb-2">Logged in as:</div>
         <div className="text-sm font-bold text-blue-400 mb-4">{user?.username} ({user?.role})</div>
         <button onClick={logout} className="w-full bg-red-900/20 text-red-400 border border-red-900/50 py-1.5 rounded text-xs font-bold hover:bg-red-900/40 transition-all">
            LOGOUT
         </button>
      </div>
    </nav>
  );
}

function Topbar() {
  const { metrics, connectionState } = useWebSocket();
  useEffect(() => {}, [metrics]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="logo-dot" />
        <span className="logo-text">InfraLens <span className="text-[10px] bg-blue-600 px-1 rounded ml-1">PRO</span></span>
      </div>
      <div className="topbar-right">
        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold uppercase">System Status</span>
              <span className="text-xs font-bold text-green-400">● Optimal</span>
           </div>
           <div className={`px-3 py-1 rounded-full flex items-center gap-2 border ${
             connectionState === 'connected' ? 'bg-green-900/20 border-green-500/50 text-green-400' : 
             connectionState === 'reconnecting' ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400' :
             'bg-red-900/20 border-red-500/50 text-red-400'
           }`}>
              <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'animate-pulse bg-green-500' : 'bg-current'}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">{connectionState}</span>
           </div>
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  return (
    <div className="app-shell">
      <Topbar />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/ai-predict" element={<AiPredict />} />
            <Route path="/ai-copilot" element={<AiCopilot />} />
            <Route path="/infra-map" element={<InfraMap />} />
            <Route path="/incident-timeline" element={<IncidentTimeline />} />
            <Route path="/cost-optimizer" element={<CostOptimizer />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          } />
        </Routes>
        <ToastContainer theme="dark" position="bottom-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

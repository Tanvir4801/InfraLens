import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
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
import { useSse } from './hooks/useSse';
import './App.css';

function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <nav className={`sidebar ${collapsed ? 'w-16' : 'w-[170px]'} transition-all duration-300 relative`}>
      <div className="p-4 flex items-center gap-2 mb-4">
        <span className="text-xl">🔷</span>
        {!collapsed && <span className="font-bold text-lg tracking-tight">InfraLens</span>}
      </div>

      <div className="sidebar-section-label">{collapsed ? '—' : 'OVERVIEW'}</div>
      <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">⊞</span> {!collapsed && 'Dashboard'}
      </NavLink>
      <NavLink to="/servers" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">⬡</span> {!collapsed && 'Servers'}
      </NavLink>
      <NavLink to="/alerts" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🔔</span> {!collapsed && 'Alerts'}
      </NavLink>
      <NavLink to="/infra-map" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🗺</span> {!collapsed && 'Infra Map'}
      </NavLink>

      <div className="sidebar-section-label" style={{ marginTop: 20 }}>{collapsed ? '—' : 'ANALYTICS'}</div>
      <NavLink to="/metrics" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">∿</span> {!collapsed && 'Metrics'}
      </NavLink>
      <NavLink to="/ai-predict" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">✦</span> {!collapsed && 'AI Predict'}
      </NavLink>
      <NavLink to="/ai-copilot" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🤖</span> {!collapsed && 'AI Copilot'}
      </NavLink>
      <NavLink to="/incident-timeline" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">🕒</span> {!collapsed && 'Timeline'}
      </NavLink>
      <NavLink to="/cost-optimizer" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">💰</span> {!collapsed && 'Optimizer'}
      </NavLink>

      <div className="sidebar-section-label" style={{ marginTop: 20 }}>{collapsed ? '—' : 'SYSTEM'}</div>
      <NavLink to="/logs" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">≡</span> {!collapsed && 'Logs'}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        <span className="nav-icon">⚙</span> {!collapsed && 'Settings'}
      </NavLink>

      <div className="mt-auto p-4 border-t border-gray-700/50">
         {!collapsed && (
           <>
             <div className="text-[10px] text-gray-500 mb-1 uppercase font-bold">Session</div>
             <div className="text-xs font-bold text-blue-400 mb-3 truncate">{user?.username}</div>
           </>
         )}
         <button onClick={logout} className="w-full bg-red-900/20 text-red-400 border border-red-900/50 py-1.5 rounded text-[10px] font-bold hover:bg-red-900/40 transition-all">
            {collapsed ? '📤' : 'LOGOUT'}
         </button>
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-10 bg-gray-800 border border-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-[10px] hover:bg-gray-700 z-20"
      >
        {collapsed ? '→' : '←'}
      </button>
    </nav>
  );
}

function Topbar() {
  const { connectionState } = useWebSocket();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="logo-dot" />
        <span className="logo-text">InfraLens <span className="text-[9px] bg-gradient-to-r from-blue-600 to-indigo-600 px-1.5 py-0.5 rounded ml-1 shadow-lg shadow-blue-900/20">v2.0 PRO</span></span>
      </div>
      <div className="topbar-right">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/40 border border-gray-700/50 rounded-lg">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Status</span>
              <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Optimal
              </span>
           </div>
           <div className={`px-3 py-1 rounded-lg flex items-center gap-2 border transition-all duration-500 ${
             connectionState === 'connected' ? 'bg-green-900/10 border-green-500/30 text-green-400' : 
             connectionState === 'reconnecting' ? 'bg-yellow-900/10 border-yellow-500/30 text-yellow-400' :
             'bg-red-900/10 border-red-500/30 text-red-400'
           }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connectionState === 'connected' ? 'animate-pulse bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-current'}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">{connectionState}</span>
           </div>
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  const { lastAlert } = useSse();
  
  useEffect(() => {
    if (lastAlert) {
      if (lastAlert.severity === 'critical') {
        toast.error(`🚨 Critical Alert: ${lastAlert.name}`, { autoClose: 8000 });
      } else if (lastAlert.severity === 'warning') {
        toast.warn(`⚠️ Warning: ${lastAlert.name}`, { autoClose: 5000 });
      } else {
        toast.info(`ℹ️ Info: ${lastAlert.name}`, { autoClose: 3000 });
      }
    }
  }, [lastAlert]);

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

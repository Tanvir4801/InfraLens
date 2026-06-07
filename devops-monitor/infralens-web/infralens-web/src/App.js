import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import Sidebar       from './components/layout/Sidebar';
import TopBar        from './components/layout/TopBar';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Login               from './pages/Login';
import Dashboard           from './pages/Dashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import UserManagement      from './pages/UserManagement';
import AlertCenter         from './pages/AlertCenter';
import IncidentManagement  from './pages/IncidentManagement';
import ContainerManager    from './pages/ContainerManager';
import LogExplorer         from './pages/LogExplorer';
import InfraMap            from './pages/InfraMap';
import CostAnalytics       from './pages/CostAnalytics';
import AiOperations        from './pages/AiOperations';
import DatabaseExplorer    from './pages/DatabaseExplorer';
import SecurityCenter      from './pages/SecurityCenter';
import Settings            from './pages/Settings';

function AppShell() {
  return (
    <div style={{ display:'flex', height:'100vh', background:'#0d1117', overflow:'hidden' }}>
      <Sidebar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar />
        <main style={{ flex:1, overflowY:'auto' }}>
          <Routes>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/supervisor" element={<ProtectedRoute allowedRoles={['admin','supervisor']}><SupervisorDashboard /></ProtectedRoute>} />
            <Route path="/users"      element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/alerts"     element={<ProtectedRoute allowedRoles={['admin','supervisor','operator']}><AlertCenter /></ProtectedRoute>} />
            <Route path="/incidents"  element={<ProtectedRoute allowedRoles={['admin','supervisor','operator']}><IncidentManagement /></ProtectedRoute>} />
            <Route path="/containers" element={<ProtectedRoute allowedRoles={['admin','supervisor','operator']}><ContainerManager /></ProtectedRoute>} />
            <Route path="/logs"       element={<ProtectedRoute allowedRoles={['admin','supervisor','operator']}><LogExplorer /></ProtectedRoute>} />
            <Route path="/infra-map"  element={<InfraMap />} />
            <Route path="/cost"       element={<ProtectedRoute allowedRoles={['admin','supervisor']}><CostAnalytics /></ProtectedRoute>} />
            <Route path="/ai-ops"     element={<ProtectedRoute allowedRoles={['admin','supervisor','operator']}><AiOperations /></ProtectedRoute>} />
            <Route path="/database"   element={<ProtectedRoute allowedRoles={['admin']}><DatabaseExplorer /></ProtectedRoute>} />
            <Route path="/security"   element={<ProtectedRoute allowedRoles={['admin']}><SecurityCenter /></ProtectedRoute>} />
            <Route path="/settings"   element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
            <Route path="/unauthorized" element={
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12, color:'#8b949e' }}>
                <div style={{ fontSize:48 }}>🔒</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#e6edf3' }}>Access Denied</div>
                <div style={{ fontSize:13 }}>You don't have permission to view this page.</div>
              </div>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
        <ToastContainer theme="dark" position="bottom-right" autoClose={4000} />
      </BrowserRouter>
    </AuthProvider>
  );
}

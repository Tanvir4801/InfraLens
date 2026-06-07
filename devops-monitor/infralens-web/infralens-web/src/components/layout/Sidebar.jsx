import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../config/theme';

const ALL_NAV = [
  { path: '/dashboard',   label: 'Dashboard',        icon: '⊞', roles: ['admin','supervisor','operator','viewer'] },
  { path: '/supervisor',  label: 'Supervisor View',  icon: '👨‍💼', roles: ['admin','supervisor'] },
  { path: '/users',       label: 'Users',            icon: '👥', roles: ['admin'] },
  { path: '/alerts',      label: 'Alert Center',     icon: '🚨', roles: ['admin','supervisor','operator'] },
  { path: '/incidents',   label: 'Incidents',        icon: '📋', roles: ['admin','supervisor','operator'] },
  { path: '/containers',  label: 'Containers',       icon: '🐳', roles: ['admin','supervisor','operator'] },
  { path: '/logs',        label: 'Log Explorer',     icon: '📝', roles: ['admin','supervisor','operator'] },
  { path: '/infra-map',   label: 'Infra Map',        icon: '🌐', roles: ['admin','supervisor','operator','viewer'] },
  { path: '/cost',        label: 'Cost Analytics',   icon: '💰', roles: ['admin','supervisor'] },
  { path: '/ai-ops',      label: 'AI Operations',    icon: '🤖', roles: ['admin','supervisor','operator'] },
  { path: '/database',    label: 'Database',         icon: '🗄️', roles: ['admin'] },
  { path: '/security',    label: 'Security',         icon: '🔐', roles: ['admin'] },
  { path: '/settings',    label: 'Settings',         icon: '⚙️', roles: ['admin'] },
];

const ROLE_COLORS = { admin:'#E24B4A', supervisor:'#EF9F27', operator:'#378ADD', viewer:'#8957E5' };

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const nav = ALL_NAV.filter(n => n.roles.includes(role));
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside style={{
      width: collapsed ? 60 : 220,
      minWidth: collapsed ? 60 : 220,
      background: T.bgCard,
      borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s, min-width 0.2s',
      position: 'relative', zIndex: 10, height: '100%',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 0' : '20px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:T.green, boxShadow:`0 0 8px ${T.green}`, flexShrink:0, marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0 }} />
        {!collapsed && <span style={{ color:T.textPrimary, fontWeight:700, fontSize:16, letterSpacing:'-0.3px', whiteSpace:'nowrap' }}>InfraLens</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {nav.map(item => (
          <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:10,
            padding: collapsed ? '10px 0' : '10px 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: isActive ? T.green : T.textMuted,
            background: isActive ? `${T.green}14` : 'transparent',
            borderRight: isActive ? `2px solid ${T.green}` : '2px solid transparent',
            textDecoration:'none', fontSize:13, fontWeight: isActive ? 600 : 400,
            transition:'all 0.15s', cursor:'pointer',
          })}>
            <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
            {!collapsed && <span style={{ whiteSpace:'nowrap' }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop:`1px solid ${T.border}`, padding: collapsed ? '12px 0' : '12px 16px' }}>
        {!collapsed ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background: `${ROLE_COLORS[role] || T.green}22`,
                border: `1px solid ${ROLE_COLORS[role] || T.green}44`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:700, color: ROLE_COLORS[role] || T.green, flexShrink:0,
              }}>{initials}</div>
              <div style={{ overflow:'hidden' }}>
                <div style={{ color:T.textPrimary, fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.username}</div>
                <div style={{ fontSize:10, color: ROLE_COLORS[role] || T.textMuted, textTransform:'uppercase', fontWeight:700 }}>{role}</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{
              width:'100%', padding:'7px', borderRadius:6, border:`1px solid ${T.red}33`,
              background:`${T.red}11`, color:T.red, fontSize:12, fontWeight:600, cursor:'pointer',
            }}>Sign Out</button>
          </>
        ) : (
          <button onClick={handleLogout} title="Sign Out" style={{
            width:'100%', padding:'8px 0', border:'none', background:'transparent', cursor:'pointer', fontSize:16,
          }}>↩</button>
        )}
      </div>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(c => !c)} style={{
        position:'absolute', top:14, right:-12, width:22, height:22, borderRadius:'50%',
        background:T.bgCardAlt, border:`1px solid ${T.border}`, cursor:'pointer',
        fontSize:10, color:T.textMuted, display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:20,
      }}>{collapsed ? '›' : '‹'}</button>
    </aside>
  );
}

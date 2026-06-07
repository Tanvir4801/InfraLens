import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import { T } from '../../config/theme';

const LABELS = {
  '/dashboard':'Dashboard','/supervisor':'Supervisor View','/users':'User Management',
  '/alerts':'Alert Center','/incidents':'Incidents','/containers':'Containers',
  '/logs':'Log Explorer','/infra-map':'Infra Map','/cost':'Cost Analytics',
  '/ai-ops':'AI Operations','/database':'Database','/security':'Security','/settings':'Settings',
};

const CONN_STYLES = {
  connected:    { bg:`${T.green}18`, border:`${T.green}44`, color:T.green,  dot:T.green,  label:'Live' },
  reconnecting: { bg:`${T.amber}18`, border:`${T.amber}44`, color:T.amber,  dot:T.amber,  label:'Reconnecting' },
  offline:      { bg:`${T.red}18`,   border:`${T.red}44`,   color:T.red,    dot:T.red,    label:'Offline' },
  connecting:   { bg:`${T.blue}18`,  border:`${T.blue}44`,  color:T.blue,   dot:T.blue,   label:'Connecting' },
};

export default function TopBar() {
  const { connectionState } = useWebSocket();
  const loc = useLocation();
  const page = LABELS[loc.pathname] || 'InfraLens';
  const cs = CONN_STYLES[connectionState] || CONN_STYLES.connecting;

  return (
    <header style={{
      height:52, background:T.bgCard, borderBottom:`1px solid ${T.border}`,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 20px', flexShrink:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Link to="/dashboard" style={{ color:T.textMuted, fontSize:13, textDecoration:'none' }}>Home</Link>
        <span style={{ color:T.textHint, fontSize:13 }}>›</span>
        <span style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>{page}</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20,
          background:cs.bg, border:`1px solid ${cs.border}`,
        }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:cs.dot, boxShadow:`0 0 6px ${cs.dot}` }} />
          <span style={{ color:cs.color, fontSize:11, fontWeight:700 }}>{cs.label}</span>
        </div>
      </div>
    </header>
  );
}

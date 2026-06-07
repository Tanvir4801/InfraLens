import React, { useState, useEffect } from 'react';
import { fetchAuditLogs } from '../services/api';
import { T, glass } from '../config/theme';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const TABS = ['Failed Logins','Active Sessions','Suspicious Activity','Audit Log'];

const MOCK_FAILED = [
  { username:'root', ip:'185.220.101.42', timestamp:'2026-06-07T17:45:00Z', attempts:8, status:'blocked' },
  { username:'admin', ip:'192.168.1.55',  timestamp:'2026-06-07T16:30:00Z', attempts:3, status:'warning' },
];
const MOCK_SESSIONS = [
  { user:'admin', role:'admin', ip:'10.0.0.1', login:'2026-06-07T18:00:00Z', last_active:'just now' },
  { user:'operator', role:'operator', ip:'10.0.0.5', login:'2026-06-07T17:00:00Z', last_active:'5m ago' },
];
const MOCK_SUSPICIOUS = [
  { type:'Brute Force', source_ip:'185.220.101.42', user:'root', details:'8 failed login attempts in 2 min', timestamp:'2026-06-07T17:45:00Z', severity:'high' },
  { type:'Port Scan', source_ip:'203.0.113.5',     user:'—',    details:'Scanned 1024 ports in 30s',        timestamp:'2026-06-07T15:00:00Z', severity:'medium' },
];

export default function SecurityCenter() {
  const [tab,      setTab]      = useState('Audit Log');
  const [auditLog, setAuditLog] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState('');

  useEffect(() => {
    setLoading(true);
    fetchAuditLogs().then(d => { setAuditLog(Array.isArray(d)?d:[]); setLoading(false); }).catch(() => {
      setAuditLog([
        { user:'admin', action:'login', resource:'/api/auth/login', ip:'10.0.0.1', timestamp:'2026-06-07T18:00:00Z' },
        { user:'operator', action:'restart_container', resource:'/api/containers/node-1/restart', ip:'10.0.0.5', timestamp:'2026-06-07T17:30:00Z' },
        { user:'admin', action:'acknowledge_alert', resource:'/api/alerts/a1/acknowledge', ip:'10.0.0.1', timestamp:'2026-06-07T17:00:00Z' },
      ]);
      setLoading(false);
    });
  }, []);

  const stats = [
    { l:'Failed Logins (24h)', v: MOCK_FAILED.reduce((s,f)=>s+f.attempts,0), c:T.red },
    { l:'Active Sessions',     v: MOCK_SESSIONS.length, c:T.green },
    { l:'Suspicious Events',   v: MOCK_SUSPICIOUS.length, c:T.amber },
    { l:'Audit Events',        v: auditLog.length, c:T.blue },
  ];

  const th = { padding:'10px 16px', textAlign:'left', color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px' };
  const td = (extra={}) => ({ padding:'10px 16px', fontSize:12, ...extra });

  const exportCSV = () => {
    const rows = [Object.keys(auditLog[0]||{}).join(','), ...auditLog.map(r=>Object.values(r).join(','))];
    const blob = new Blob([rows.join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='audit-log.csv'; a.click();
  };

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:'0 0 20px' }}>Security Center</h1>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.l} style={{ ...glass, padding:'14px 18px' }}>
            <div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase' }}>{s.l}</div>
            <div style={{ color:s.c, fontSize:26, fontWeight:800, marginTop:4 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:`1px solid ${T.border}` }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:tab===t?700:400, color:tab===t?T.green:T.textMuted, borderBottom:tab===t?`2px solid ${T.green}`:'2px solid transparent' }}>{t}</button>)}
      </div>

      {tab==='Failed Logins' && (
        <div style={{ ...glass, overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{['Username','IP Address','Timestamp','Attempts','Status'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{MOCK_FAILED.map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.border}22` }} onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ ...td(), color:T.textPrimary, fontWeight:600 }}>{r.username}</td>
                <td style={{ ...td(), color:T.textMuted, fontFamily:'monospace' }}>{r.ip}</td>
                <td style={{ ...td(), color:T.textMuted }}>{new Date(r.timestamp).toLocaleString()}</td>
                <td style={{ ...td(), color:T.red, fontWeight:700 }}>{r.attempts}</td>
                <td style={{ ...td() }}><span style={{ fontSize:10, color:r.status==='blocked'?T.red:T.amber, background:`${r.status==='blocked'?T.red:T.amber}18`, padding:'2px 8px', borderRadius:4, fontWeight:700, textTransform:'uppercase' }}>{r.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==='Active Sessions' && (
        <div style={{ ...glass, overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{['User','Role','IP','Login Time','Last Active','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{MOCK_SESSIONS.map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.border}22` }} onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ ...td(), color:T.textPrimary, fontWeight:600 }}>{r.user}</td>
                <td style={{ ...td() }}><span style={{ fontSize:10, color:T.blue, background:`${T.blue}18`, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>{r.role.toUpperCase()}</span></td>
                <td style={{ ...td(), color:T.textMuted, fontFamily:'monospace' }}>{r.ip}</td>
                <td style={{ ...td(), color:T.textMuted }}>{new Date(r.login).toLocaleString()}</td>
                <td style={{ ...td() }}><span style={{ color:T.green, fontSize:12 }}>{r.last_active}</span></td>
                <td style={{ ...td() }}><button style={{ padding:'4px 8px', borderRadius:5, border:`1px solid ${T.red}44`, background:`${T.red}14`, color:T.red, fontSize:10, cursor:'pointer' }}>Revoke</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==='Suspicious Activity' && (
        <div style={{ ...glass, overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{['Type','Source IP','User','Details','Timestamp'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{MOCK_SUSPICIOUS.map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px solid ${T.border}22`, background:r.severity==='high'?`${T.red}08`:'transparent' }} onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt} onMouseLeave={e=>e.currentTarget.style.background=r.severity==='high'?`${T.red}08`:'transparent'}>
                <td style={{ ...td() }}><span style={{ fontSize:10, color:r.severity==='high'?T.red:T.amber, background:`${r.severity==='high'?T.red:T.amber}18`, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>{r.type}</span></td>
                <td style={{ ...td(), color:T.textMuted, fontFamily:'monospace' }}>{r.source_ip}</td>
                <td style={{ ...td(), color:T.textPrimary }}>{r.user}</td>
                <td style={{ ...td(), color:T.textMuted, maxWidth:300 }}>{r.details}</td>
                <td style={{ ...td(), color:T.textMuted }}>{new Date(r.timestamp).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==='Audit Log' && (
        <div style={{ ...glass, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'center' }}>
            <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter audit logs…" style={{ background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'7px 12px', fontSize:12, outline:'none', width:220 }} />
            <button onClick={exportCSV} style={{ marginLeft:'auto', padding:'6px 14px', borderRadius:8, background:T.bgCardAlt, border:`1px solid ${T.border}`, color:T.textMuted, fontSize:12, cursor:'pointer' }}>Export CSV</button>
          </div>
          {loading ? <LoadingSpinner /> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{['User','Action','Resource','Timestamp','IP'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {auditLog.filter(r=>!filter||JSON.stringify(r).toLowerCase().includes(filter.toLowerCase())).map((r,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}22` }} onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ ...td(), color:T.textPrimary, fontWeight:600 }}>{r.user}</td>
                    <td style={{ ...td(), color:T.blue, fontFamily:'monospace', fontSize:11 }}>{r.action}</td>
                    <td style={{ ...td(), color:T.textMuted, fontSize:11, fontFamily:'monospace' }}>{r.resource}</td>
                    <td style={{ ...td(), color:T.textMuted }}>{r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}</td>
                    <td style={{ ...td(), color:T.textMuted, fontFamily:'monospace' }}>{r.ip||'—'}</td>
                  </tr>
                ))}
                {auditLog.length===0 && <tr><td colSpan={5}><EmptyState icon="🔐" title="No audit events" /></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

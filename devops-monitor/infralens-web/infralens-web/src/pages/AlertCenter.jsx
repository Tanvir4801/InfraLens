import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { useWebSocket } from '../hooks/useWebSocket';
import { acknowledgeAlert, resolveAlert, generateRCA } from '../services/api';
import { T, glass, severityColor } from '../config/theme';
import AlertBadge from '../components/ui/AlertBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const TABS = ['All','Critical','Warning','Acknowledged','Resolved'];

export default function AlertCenter() {
  const { alerts, loading, lastUpdated, refresh } = useAlerts(30000);
  const { metrics } = useWebSocket();
  const { hasRole } = useAuth();
  const [tab,       setTab]       = useState('All');
  const [rcaMap,    setRcaMap]    = useState({});
  const [rcaLoad,   setRcaLoad]   = useState({});
  const [rcaOpen,   setRcaOpen]   = useState({});
  const [localAck,  setLocalAck]  = useState({});
  const [localRes,  setLocalRes]  = useState({});

  const filtered = alerts.filter(a => {
    const sev  = (a.labels?.severity || a.severity || '').toLowerCase();
    const acked = localAck[a.id || JSON.stringify(a.labels)] || a.acknowledged;
    const res   = localRes[a.id || JSON.stringify(a.labels)];
    if (tab === 'Critical')     return sev === 'critical' && !res;
    if (tab === 'Warning')      return sev === 'warning'  && !res;
    if (tab === 'Acknowledged') return acked && !res;
    if (tab === 'Resolved')     return !!res;
    return true;
  });

  const counts = {
    total:    alerts.length,
    critical: alerts.filter(a => (a.labels?.severity||a.severity||'').toLowerCase()==='critical').length,
    warning:  alerts.filter(a => (a.labels?.severity||a.severity||'').toLowerCase()==='warning').length,
    resolved: Object.values(localRes).filter(Boolean).length,
  };

  const doAck = async (a) => {
    const key = a.id || JSON.stringify(a.labels);
    try { await acknowledgeAlert(key); setLocalAck(p => ({...p,[key]:true})); toast.success('Alert acknowledged'); }
    catch { setLocalAck(p => ({...p,[key]:true})); toast.success('Alert acknowledged'); }
  };

  const doResolve = async (a) => {
    const key = a.id || JSON.stringify(a.labels);
    try { await resolveAlert(key); setLocalRes(p => ({...p,[key]:true})); toast.success('Alert resolved'); }
    catch { setLocalRes(p => ({...p,[key]:true})); toast.success('Alert resolved'); }
  };

  const doRCA = async (a) => {
    const key = a.id || JSON.stringify(a.labels);
    setRcaLoad(p => ({...p,[key]:true}));
    try {
      const r = await generateRCA({ name: a.labels?.alertname||a.name, severity: a.labels?.severity||a.severity, description: a.annotations?.description||a.description }, metrics);
      setRcaMap(p => ({...p,[key]:r.report}));
      setRcaOpen(p => ({...p,[key]:true}));
      toast.success('RCA generated');
    } catch { toast.error('RCA failed'); }
    setRcaLoad(p => ({...p,[key]:false}));
  };

  const inp = { background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'8px 12px', fontSize:13, outline:'none', cursor:'pointer' };

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:0 }}>Alert Center</h1>
          <p style={{ color:T.textMuted, fontSize:13, margin:'4px 0 0' }}>Updated {lastUpdated}s ago</p>
        </div>
        <button onClick={refresh} style={{ ...inp, color:T.blue }}>↻ Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[['Total Alerts', counts.total, T.textPrimary], ['Critical', counts.critical, T.red], ['Warning', counts.warning, T.amber], ['Resolved Today', counts.resolved, T.green]].map(([l,v,c]) => (
          <div key={l} style={{ ...glass, padding:'14px 18px' }}>
            <div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px' }}>{l}</div>
            <div style={{ color:c, fontSize:26, fontWeight:800, marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:`1px solid ${T.border}`, paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight: tab===t ? 700 : 400,
            color: tab===t ? T.green : T.textMuted, borderBottom: tab===t ? `2px solid ${T.green}` : '2px solid transparent',
            transition:'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon="🛡" title="No alerts" message="No alerts match the current filter." />
      ) : filtered.map((a, i) => {
        const key  = a.id || JSON.stringify(a.labels) || i;
        const name = a.labels?.alertname || a.name || 'Alert';
        const sev  = a.labels?.severity  || a.severity || 'warning';
        const desc = a.annotations?.description || a.description || '';
        const sc   = severityColor(sev);
        const acked= localAck[key] || a.acknowledged;
        const res  = localRes[key];
        return (
          <div key={key} style={{ ...glass, marginBottom:12, borderLeft:`3px solid ${sc}`, padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <AlertBadge severity={sev} />
                  <span style={{ color:T.textPrimary, fontSize:14, fontWeight:600 }}>{name}</span>
                  {acked && <span style={{ fontSize:10, color:T.green, background:`${T.green}18`, padding:'2px 6px', borderRadius:4 }}>ACKNOWLEDGED</span>}
                  {res   && <span style={{ fontSize:10, color:T.textMuted, background:T.bgCardAlt, padding:'2px 6px', borderRadius:4 }}>RESOLVED</span>}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {!acked && !res && hasRole('admin','supervisor','operator') && (
                    <button onClick={() => doAck(a)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.green}44`, background:`${T.green}14`, color:T.green, fontSize:11, cursor:'pointer' }}>Acknowledge</button>
                  )}
                  {!res && hasRole('admin','supervisor') && (
                    <button onClick={() => doResolve(a)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.blue}44`, background:`${T.blue}14`, color:T.blue, fontSize:11, cursor:'pointer' }}>Resolve</button>
                  )}
                  <button onClick={() => doRCA(a)} disabled={rcaLoad[key]} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.purple}44`, background:`${T.purple}14`, color:T.purple, fontSize:11, cursor:'pointer' }}>
                    {rcaLoad[key] ? '…' : '🤖 Generate RCA'}
                  </button>
                </div>
              </div>
              {desc && <p style={{ color:T.textMuted, fontSize:12, margin:'8px 0 0' }}>{desc}</p>}
            </div>

            {rcaOpen[key] && rcaMap[key] && (
              <div style={{ background:`${T.blue}0d`, borderTop:`1px solid ${T.blue}22`, padding:'14px 18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ color:T.blue, fontSize:12, fontWeight:700 }}>🤖 AI Root Cause Analysis</span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => navigator.clipboard.writeText(rcaMap[key]).then(() => toast.success('Copied!'))} style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:10, cursor:'pointer' }}>Copy</button>
                    <button onClick={() => setRcaOpen(p=>({...p,[key]:false}))} style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:10, cursor:'pointer' }}>✕</button>
                  </div>
                </div>
                <pre style={{ color:T.blueLight, fontSize:12, whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0 }}>{rcaMap[key]}</pre>
                <div style={{ color:T.textHint, fontSize:10, marginTop:8 }}>Generated by Gemini / Rule-based engine</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

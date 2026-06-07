import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchIncidents, fetchAlerts, fetchServers } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { T, glass } from '../config/theme';
import AlertBadge from '../components/ui/AlertBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const tt = { contentStyle:{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }, labelStyle:{ color:T.textMuted } };

export default function SupervisorDashboard() {
  const { metrics } = useWebSocket();
  const [incidents, setIncidents] = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [servers,   setServers]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([fetchIncidents(), fetchAlerts(), fetchServers()]).then(([inc, alt, srv]) => {
      setIncidents(Array.isArray(inc)?inc:[]);
      setAlerts(Array.isArray(alt)?alt:alt?.alerts??[]);
      setServers(Array.isArray(srv)?srv:[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const cpu  = metrics?.cpu_percent ?? 0;
  const ram  = metrics?.ram_percent ?? 0;
  const healthScore = Math.max(0, Math.round(100 - (alerts.length * 12) - (cpu > 80 ? 20 : 0)));
  const criticalInc = incidents.filter(i => (i.severity||'').toUpperCase()==='P1'||(i.severity||'').toLowerCase()==='critical').length;

  const alertTrend = Array.from({length:12},(_,i)=>({ h:`${i*2}h`, critical:Math.floor(Math.random()*3), warning:Math.floor(Math.random()*5) }));
  const incTrend   = Array.from({length:7},(_,i)=>({ d:`Day ${i+1}`, count:Math.floor(Math.random()*8)+1 }));
  const resTrend   = Array.from({length:24},(_,i)=>({ t:`${i}:00`, cpu:Math.max(5,cpu+Math.sin(i)*15+Math.random()*10-5), ram:Math.max(10,ram+Math.cos(i)*12+Math.random()*8-4) }));

  const stats = [
    { l:'Total Servers',    v:servers.length,       c:T.blue },
    { l:'Active Alerts',    v:alerts.length,         c:alerts.length>5?T.red:T.amber },
    { l:'Critical Incidents',v:criticalInc,          c:T.red },
    { l:'Health Score',     v:`${healthScore}%`,     c:healthScore>80?T.green:T.amber },
    { l:'SLA Compliance',   v:'96.4%',               c:T.green },
    { l:'Infra Availability',v:'99.1%',              c:T.green },
  ];

  if (loading) return <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}><LoadingSpinner /></div>;

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:'0 0 20px' }}>Supervisor Dashboard</h1>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.l} style={{ ...glass, padding:'14px 18px' }}>
            <div style={{ color:T.textMuted, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px' }}>{s.l}</div>
            <div style={{ color:s.c, fontSize:22, fontWeight:800, marginTop:4 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ ...glass, padding:18 }}>
          <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600, marginBottom:12 }}>Alert Trends (24h)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={alertTrend}>
              <XAxis dataKey="h" tick={{ fill:T.textHint, fontSize:9 }} /><YAxis hide />
              <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:10 }} />
              <Bar dataKey="critical" fill={T.red} name="Critical" radius={[2,2,0,0]} />
              <Bar dataKey="warning"  fill={T.amber} name="Warning" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...glass, padding:18 }}>
          <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600, marginBottom:12 }}>Incident Trends (7d)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={incTrend}>
              <XAxis dataKey="d" tick={{ fill:T.textHint, fontSize:9 }} /><YAxis hide />
              <Tooltip {...tt} />
              <Line type="monotone" dataKey="count" stroke={T.purple} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...glass, padding:18 }}>
          <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600, marginBottom:12 }}>Resource Usage (24h)</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={resTrend}>
              <defs>
                <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient>
                <linearGradient id="gram" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blue} stopOpacity={0.3}/><stop offset="95%" stopColor={T.blue} stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fill:T.textHint, fontSize:9 }} /><YAxis hide />
              <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize:10 }} />
              <Area type="monotone" dataKey="cpu" stroke={T.green} fill="url(#gcpu)" name="CPU%" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="ram" stroke={T.blue}  fill="url(#gram)" name="RAM%" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incidents table */}
      <div style={{ ...glass, overflow:'hidden', marginBottom:16 }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, color:T.textPrimary, fontSize:13, fontWeight:600 }}>Recent Incidents</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
            {['ID','Severity','Title','Owner','Status','Created'].map(h => (
              <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {incidents.slice(0,8).map((inc, i) => {
              const sc = inc.status==='resolved' ? T.green : inc.status==='assigned' ? T.amber : T.red;
              return (
                <tr key={inc.id||i} style={{ borderBottom:`1px solid ${T.border}22` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 16px', color:T.textMuted, fontSize:12, fontFamily:'monospace' }}>{inc.id||`INC-${i+1}`}</td>
                  <td style={{ padding:'10px 16px' }}><AlertBadge severity={inc.severity||'P3'} /></td>
                  <td style={{ padding:'10px 16px', color:T.textPrimary, fontSize:13 }}>{inc.title||inc.description||'System Event'}</td>
                  <td style={{ padding:'10px 16px', color:T.textMuted, fontSize:12 }}>{inc.assigned_to||'Unassigned'}</td>
                  <td style={{ padding:'10px 16px' }}><span style={{ fontSize:10, color:sc, background:`${sc}18`, padding:'2px 8px', borderRadius:4, fontWeight:700, textTransform:'capitalize' }}>{inc.status||'open'}</span></td>
                  <td style={{ padding:'10px 16px', color:T.textMuted, fontSize:12 }}>{inc.created_at ? new Date(inc.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              );
            })}
            {incidents.length === 0 && <tr><td colSpan={6} style={{ padding:'24px', textAlign:'center', color:T.textHint, fontSize:13 }}>No incidents</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

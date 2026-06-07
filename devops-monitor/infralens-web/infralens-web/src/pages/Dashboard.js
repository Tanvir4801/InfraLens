import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAlerts } from '../hooks/useAlerts';
import { fetchServers, fetchPrediction, restartContainer, generateRCA } from '../services/api';
import { T, glass, metricColor, severityColor } from '../config/theme';
import StatCard from '../components/ui/StatCard';
import StatusDot from '../components/ui/StatusDot';
import AlertBadge from '../components/ui/AlertBadge';
import ConfirmModal from '../components/ui/ConfirmModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const fmt = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; };

export default function Dashboard() {
  const { metrics, rollingHistory, connectionState } = useWebSocket();
  const { alerts, lastUpdated } = useAlerts(30000);
  const { hasRole } = useAuth();
  const [servers,    setServers]    = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [rcaMap,     setRcaMap]     = useState({});
  const [rcaLoading, setRcaLoading] = useState({});
  const [confirm,    setConfirm]    = useState(null);
  const [loadingSrv, setLoadingSrv] = useState(true);

  useEffect(() => {
    fetchServers().then(d => { setServers(d); setLoadingSrv(false); }).catch(() => setLoadingSrv(false));
    fetchPrediction().then(setPrediction).catch(() => {});
    const i1 = setInterval(() => fetchServers().then(setServers).catch(()=>{}), 10000);
    const i2 = setInterval(() => fetchPrediction().then(setPrediction).catch(()=>{}), 60000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, []);

  const doRestart = async (id) => {
    try { await restartContainer(id); toast.success(`Container ${id} restarted ✓`); }
    catch { toast.error(`Failed to restart ${id}`); }
    setConfirm(null);
  };

  const handleRCA = async (alert, key) => {
    setRcaLoading(p => ({...p,[key]:true}));
    try {
      const r = await generateRCA(alert, metrics);
      setRcaMap(p => ({...p,[key]:r.report}));
      toast.success('RCA generated');
    } catch { toast.error('RCA failed'); }
    setRcaLoading(p => ({...p,[key]:false}));
  };

  const handleExportCSV = () => {
    const rows = [['Metric','Value'],['CPU',`${metrics?.cpu_percent}%`],['RAM',`${metrics?.ram_percent}%`],['Disk',`${metrics?.disk_percent}%`],['Uptime',`${metrics?.uptime_seconds}s`]];
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='metrics.csv'; a.click();
  };

  const cpu    = metrics?.cpu_percent  ?? 0;
  const ram    = metrics?.ram_percent  ?? 0;
  const disk   = metrics?.disk_percent ?? 0;
  const uptime = metrics?.uptime_seconds ?? 0;
  const healthScore = Math.max(0, Math.round(100-(alerts.length*12)-(cpu>80?20:0)-(ram>80?10:0)));
  const chartData = rollingHistory.map((v,i) => ({t:i, cpu:v}));
  const csColor = connectionState==='connected' ? T.green : connectionState==='reconnecting' ? T.amber : T.red;

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:0 }}>Infrastructure Overview</h1>
          <p style={{ color:T.textMuted, fontSize:13, margin:'4px 0 0' }}>Live monitoring · Updated {lastUpdated}s ago</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:`${csColor}18`, border:`1px solid ${csColor}44` }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:csColor, boxShadow:`0 0 6px ${csColor}` }} />
            <span style={{ color:csColor, fontSize:11, fontWeight:700 }}>{connectionState==='connected'?'Live':connectionState}</span>
          </div>
          <span style={{ color:T.textMuted, fontSize:12, padding:'5px 12px', borderRadius:20, background:T.bgCard, border:`1px solid ${T.border}` }}>{servers.length} nodes</span>
          <button onClick={handleExportCSV} style={{ padding:'6px 14px', borderRadius:8, background:T.bgCard, border:`1px solid ${T.border}`, color:T.textMuted, fontSize:12, cursor:'pointer' }}>Export CSV</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:20 }}>
        <StatCard label="CPU Usage"  value={cpu}  unit="%" sub={`${servers.length} nodes`}  color={metricColor(cpu)}  icon="🖥" />
        <StatCard label="RAM Usage"  value={ram}  unit="%" sub="Virtual memory"              color={metricColor(ram)}  icon="🧠" />
        <StatCard label="Disk Usage" value={disk} unit="%" sub="Root partition"              color={metricColor(disk)} icon="💾" />
        <StatCard label="Uptime"     value={fmt(uptime)} sub="Since last boot"               color={T.blue}            icon="⏱" />
      </div>

      {/* AI Prediction banner */}
      {prediction && (
        <div style={{ ...glass, padding:'14px 20px', marginBottom:20, borderLeft:`3px solid ${prediction.will_overload?T.red:T.blue}`, background:prediction.will_overload?`${T.red}0d`:`${T.blue}0d` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>✦</span>
              <span style={{ color:prediction.will_overload?T.red:T.blue, fontWeight:700, fontSize:13 }}>
                {prediction.will_overload
                  ? `⚠ CPU surge predicted in ${prediction.minutes_until_overload} min — scale deployment recommended`
                  : `System stable · Predicted max CPU: ${prediction.predicted_max_cpu?.toFixed(1)}%`}
              </span>
            </div>
            <span style={{ color:T.textMuted, fontSize:11 }}>Confidence {Math.round((prediction.confidence||0)*100)}%</span>
          </div>
        </div>
      )}

      {/* Health score + CPU sparkline */}
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, marginBottom:20 }}>
        <div style={{ ...glass, padding:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:12 }}>Health Score</div>
          <div style={{ position:'relative', width:110, height:110 }}>
            <svg width="110" height="110" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="55" cy="55" r="48" stroke={T.border} strokeWidth="7" fill="none" />
              <circle cx="55" cy="55" r="48" stroke={healthScore>80?T.green:healthScore>50?T.amber:T.red} strokeWidth="7" fill="none"
                strokeDasharray={301.6} strokeDashoffset={301.6-(301.6*healthScore/100)} strokeLinecap="round" />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:26, fontWeight:800, color:healthScore>80?T.green:healthScore>50?T.amber:T.red }}>{healthScore}</span>
              <span style={{ fontSize:9, color:T.textHint, fontWeight:700, textTransform:'uppercase' }}>score</span>
            </div>
          </div>
          <div style={{ fontSize:12, color:T.textMuted, marginTop:8 }}>{healthScore>90?'Excellent':healthScore>75?'Good':healthScore>50?'At Risk':'Critical'}</div>
        </div>

        <div style={{ ...glass, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>CPU Utilization (Live)</span>
            <span style={{ color:T.green, fontSize:11, fontWeight:700, background:`${T.green}18`, padding:'2px 8px', borderRadius:4 }}>LIVE</span>
          </div>
          <div style={{ height:120 }}>
            {chartData.length>0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="cpuGrd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="t" hide /><YAxis domain={[0,100]} hide />
                  <Tooltip formatter={v=>[`${v.toFixed(1)}%`,'CPU']} contentStyle={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }} />
                  <Area type="monotone" dataKey="cpu" stroke={T.green} strokeWidth={2} fill="url(#cpuGrd)" dot={false} animationDuration={500} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:T.textHint, fontSize:13 }}>Waiting for WebSocket data…</div>}
          </div>
        </div>
      </div>

      {/* Servers + Alerts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ ...glass, padding:20 }}>
          <h3 style={{ color:T.textPrimary, fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Node Health</h3>
          {loadingSrv ? <LoadingSpinner /> : servers.map(s => (
            <div key={s.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${T.border}33` }}>
              <StatusDot status={s.status} />
              <div style={{ flex:1 }}>
                <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>{s.name}</div>
                <div style={{ color:T.textHint, fontSize:10, textTransform:'uppercase' }}>{s.role} · {s.ip}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, width:120 }}>
                <div style={{ flex:1, height:5, background:T.border, borderRadius:3 }}><div style={{ width:`${s.cpu}%`, height:'100%', background:metricColor(s.cpu), borderRadius:3 }} /></div>
                <span style={{ color:metricColor(s.cpu), fontSize:11, fontWeight:700, width:34, textAlign:'right' }}>{s.cpu}%</span>
              </div>
              {hasRole('admin','operator') && (
                <button onClick={() => setConfirm({id:s.name,label:s.name})} style={{ padding:'4px 10px', borderRadius:6, background:`${T.amber}18`, border:`1px solid ${T.amber}33`, color:T.amber, fontSize:11, cursor:'pointer' }}>Restart</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ ...glass, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <h3 style={{ color:T.textPrimary, fontSize:14, fontWeight:600, margin:0 }}>Active Alerts</h3>
            <span style={{ fontSize:11, color:alerts.length?T.red:T.green, background:alerts.length?`${T.red}18`:`${T.green}18`, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>{alerts.length} active</span>
          </div>
          {alerts.length===0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:T.textHint }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🛡</div>
              <div style={{ fontSize:13 }}>All systems healthy</div>
            </div>
          ) : alerts.slice(0,5).map((a,i) => {
            const key = a.id||i;
            const name = a.labels?.alertname||a.name||'Alert';
            const sev  = a.labels?.severity||a.severity||'warning';
            const desc = a.annotations?.description||a.description||'';
            const sc   = severityColor(sev);
            return (
              <div key={key} style={{ borderLeft:`3px solid ${sc}`, padding:'10px 12px', marginBottom:8, background:`${sc}0a`, borderRadius:'0 8px 8px 0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <AlertBadge severity={sev} />
                    <span style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>{name}</span>
                  </div>
                  <button onClick={() => handleRCA(a,key)} disabled={rcaLoading[key]} style={{ padding:'3px 8px', borderRadius:6, background:`${T.blue}18`, border:`1px solid ${T.blue}33`, color:T.blue, fontSize:10, cursor:'pointer' }}>
                    {rcaLoading[key]?'…':'RCA'}
                  </button>
                </div>
                {desc && <div style={{ color:T.textMuted, fontSize:11, marginTop:4 }}>{desc}</div>}
                {rcaMap[key] && (
                  <div style={{ marginTop:8, padding:10, background:`${T.blue}0d`, borderRadius:6, border:`1px solid ${T.blue}22`, fontSize:11, color:T.blueLight }}>
                    <strong>🤖 AI RCA:</strong> {rcaMap[key]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmModal open={!!confirm} title={`Restart ${confirm?.label}?`} message="This will restart the container and may cause brief downtime." danger onConfirm={() => doRestart(confirm.id)} onCancel={() => setConfirm(null)} />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { fetchServers, restartContainer, fetchContainerLogs } from '../services/api';
import { T, glass, metricColor } from '../config/theme';
import StatusDot from '../components/ui/StatusDot';
import ConfirmModal from '../components/ui/ConfirmModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

function LogsModal({ open, containerId, onClose }) {
  const [logs,   setLogs]   = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [live,   setLive]   = useState(false);

  useEffect(() => {
    if (!open || !containerId) return;
    const load = () => fetchContainerLogs(containerId).then(d => setLogs(Array.isArray(d) ? d : [])).catch(() => {});
    load();
    if (live) { const i = setInterval(load, 2000); return () => clearInterval(i); }
  }, [open, containerId, live]);

  if (!open) return null;

  const LEVELS = ['ALL','ERROR','WARN','INFO'];
  const filtered = logs.filter(l => {
    const upper = l.toUpperCase();
    if (filter !== 'ALL' && !upper.includes(filter)) return false;
    if (search && !l.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lineColor = (l) => {
    if (l.toUpperCase().includes('ERROR')) return T.red;
    if (l.toUpperCase().includes('WARN'))  return T.amber;
    if (l.toUpperCase().includes('DEBUG')) return T.textHint;
    return '#4ade80';
  };

  const downloadLog = () => {
    const blob = new Blob([filtered.join('\n')], { type:'text/plain' });
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${containerId}.log`; a.click();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ width:'85vw', height:'80vh', background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:T.textPrimary, fontWeight:700, fontSize:14 }}>📋 Logs — {containerId}</span>
            <div style={{ display:'flex', gap:4 }}>
              {LEVELS.map(l => <button key={l} onClick={() => setFilter(l)} style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${filter===l?T.green:T.border}`, background:filter===l?`${T.green}18`:'transparent', color:filter===l?T.green:T.textMuted, fontSize:10, cursor:'pointer' }}>{l}</button>)}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs..." style={{ background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:6, color:T.textPrimary, padding:'5px 10px', fontSize:12, outline:'none', width:160 }} />
            <button onClick={() => setLive(l=>!l)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${live?T.green:T.border}`, background:live?`${T.green}18`:'transparent', color:live?T.green:T.textMuted, fontSize:11, cursor:'pointer' }}>{live?'● Live':'○ Live'}</button>
            <button onClick={downloadLog} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:11, cursor:'pointer' }}>Download</button>
            <button onClick={onClose} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:12, cursor:'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:16, background:T.bgPrimary, fontFamily:'monospace', fontSize:12, lineHeight:1.7 }}>
          {filtered.map((line, i) => (
            <div key={i} style={{ color:lineColor(line), background: line.toUpperCase().includes('ERROR') ? `${T.red}10` : line.toUpperCase().includes('WARN') ? `${T.amber}08` : 'transparent', padding:'1px 4px', borderRadius:3 }}>
              {search ? line.split(new RegExp(`(${search})`, 'gi')).map((part, j) => part.toLowerCase() === search.toLowerCase() ? <mark key={j} style={{ background:'#EF9F2788', color:T.textPrimary }}>{part}</mark> : part) : line}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color:T.textHint, textAlign:'center', paddingTop:40 }}>No log lines match the filter</div>}
        </div>
        <div style={{ padding:'8px 16px', borderTop:`1px solid ${T.border}`, color:T.textHint, fontSize:11 }}>{filtered.length} lines · {containerId}</div>
      </div>
    </div>
  );
}

export default function ContainerManager() {
  const [containers, setContainers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('All');
  const [confirm,    setConfirm]    = useState(null);
  const [logsModal,  setLogsModal]  = useState(null);
  const [restarting, setRestarting] = useState({});
  const { hasRole } = useAuth();

  const load = async () => {
    try {
      const d = await fetchServers();
      const mapped = (Array.isArray(d) ? d : []).map(s => ({
        id: s.name, name: s.name, image: `infralens/${s.role}:latest`, cpu: s.cpu, ram: s.ram, disk: s.disk,
        status: s.status === 'healthy' ? 'running' : s.status === 'warning' ? 'running' : 'stopped',
        uptime: s.uptime, role: s.role,
      }));
      setContainers(mapped); setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, []);

  const doRestart = async (id) => {
    setRestarting(p=>({...p,[id]:true})); setConfirm(null);
    try { await restartContainer(id); toast.success(`Container ${id} restarted ✓`); await load(); }
    catch { toast.error(`Failed to restart ${id}`); }
    setRestarting(p=>({...p,[id]:false}));
  };

  const TABS = ['All','Running','Stopped'];
  const filtered = containers.filter(c => {
    if (tab==='Running') return c.status==='running';
    if (tab==='Stopped') return c.status==='stopped';
    return true;
  });

  const counts = { total:containers.length, running:containers.filter(c=>c.status==='running').length, stopped:containers.filter(c=>c.status==='stopped').length };

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:0 }}>Container Manager</h1>
          <p style={{ color:T.textMuted, fontSize:13, margin:'4px 0 0' }}>All nodes and services</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[['Total',counts.total,T.textPrimary],['Running',counts.running,T.green],['Stopped',counts.stopped,T.red]].map(([l,v,c]) => (
          <div key={l} style={{ ...glass, padding:'14px 18px' }}><div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase' }}>{l}</div><div style={{ color:c, fontSize:26, fontWeight:800, marginTop:4 }}>{v}</div></div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:`1px solid ${T.border}` }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:tab===t?700:400, color:tab===t?T.green:T.textMuted, borderBottom:tab===t?`2px solid ${T.green}`:'2px solid transparent' }}>{t}</button>)}
      </div>

      {/* Table */}
      <div style={{ ...glass, overflow:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {['Status','Name','Image','CPU','RAM','Disk','Uptime','Actions'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding:40 }}><LoadingSpinner /></td></tr>
            : filtered.length === 0 ? <tr><td colSpan={8}><EmptyState icon="🐳" title="No containers" /></td></tr>
            : filtered.map(c => (
              <tr key={c.id} style={{ borderBottom:`1px solid ${T.border}22` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'12px 16px' }}><StatusDot status={c.status} /></td>
                <td style={{ padding:'12px 16px', color:T.textPrimary, fontSize:13, fontWeight:600 }}>{c.name}</td>
                <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12, fontFamily:'monospace' }}>{c.image}</td>
                <td style={{ padding:'12px 16px', minWidth:100 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ flex:1, height:5, background:T.border, borderRadius:3 }}><div style={{ width:`${c.cpu}%`, height:'100%', background:metricColor(c.cpu), borderRadius:3 }} /></div>
                    <span style={{ color:metricColor(c.cpu), fontSize:11, fontWeight:700, width:34 }}>{c.cpu}%</span>
                  </div>
                </td>
                <td style={{ padding:'12px 16px', minWidth:100 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ flex:1, height:5, background:T.border, borderRadius:3 }}><div style={{ width:`${c.ram}%`, height:'100%', background:metricColor(c.ram), borderRadius:3 }} /></div>
                    <span style={{ color:metricColor(c.ram), fontSize:11, fontWeight:700, width:34 }}>{c.ram}%</span>
                  </div>
                </td>
                <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{c.disk}%</td>
                <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{c.uptime ? `${Math.floor(c.uptime/3600)}h` : '—'}</td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => setLogsModal(c.id)} style={{ padding:'4px 8px', borderRadius:5, border:`1px solid ${T.blue}44`, background:`${T.blue}14`, color:T.blue, fontSize:10, cursor:'pointer' }}>Logs</button>
                    {hasRole('admin','operator') && (
                      <button onClick={() => setConfirm({ id:c.id, label:c.name })} disabled={restarting[c.id]} style={{ padding:'4px 8px', borderRadius:5, border:`1px solid ${T.amber}44`, background:`${T.amber}14`, color:T.amber, fontSize:10, cursor:'pointer' }}>
                        {restarting[c.id] ? '…' : 'Restart'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LogsModal open={!!logsModal} containerId={logsModal} onClose={() => setLogsModal(null)} />
      <ConfirmModal open={!!confirm} title={`Restart ${confirm?.label}?`} message="This will restart the container and may cause brief downtime." danger onConfirm={() => doRestart(confirm.id)} onCancel={() => setConfirm(null)} />
    </div>
  );
}

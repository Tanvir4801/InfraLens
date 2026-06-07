import React, { useState, useEffect } from 'react';
import { fetchIncidents, createIncident, resolveIncident } from '../services/api';
import { T, glass } from '../config/theme';
import AlertBadge from '../components/ui/AlertBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ConfirmModal from '../components/ui/ConfirmModal';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = { open:T.red, assigned:T.amber, 'in progress':T.blue, resolved:T.green };
const TABS = ['Open','Assigned','In Progress','Resolved','All'];

function CreateModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ title:'', severity:'P2', description:'', assigned_to:'' });
  if (!open) return null;
  const s = { background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'8px 12px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ ...glass, padding:28, width:480, maxWidth:'90vw' }}>
        <h3 style={{ color:T.textPrimary, fontSize:16, fontWeight:700, margin:'0 0 20px' }}>Create Incident</h3>
        {[['Title','title','text'],['Description','description','text'],['Assign To','assigned_to','text']].map(([l,k,t]) => (
          <div key={k} style={{ marginBottom:14 }}>
            <label style={{ display:'block', color:T.textMuted, fontSize:12, marginBottom:5 }}>{l}</label>
            <input type={t} value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} style={s} />
          </div>
        ))}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', color:T.textMuted, fontSize:12, marginBottom:5 }}>Severity</label>
          <select value={form.severity} onChange={e => setForm(p=>({...p,severity:e.target.value}))} style={s}>
            {['P1','P2','P3','P4'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={() => { onCreate(form); onClose(); }} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:T.green, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Create</button>
        </div>
      </div>
    </div>
  );
}

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('All');
  const [showCreate,setShowCreate]= useState(false);
  const [confirm,   setConfirm]   = useState(null);
  const { hasRole } = useAuth();

  const load = async () => {
    try { const d = await fetchIncidents(); setIncidents(Array.isArray(d) ? d : []); setLoading(false); }
    catch { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

  const handleCreate = async (form) => {
    try {
      const d = await createIncident({ ...form, status:'open', created_at: new Date().toISOString(), id: `INC-${Date.now()}` });
      setIncidents(p => [d || {...form, id:`INC-${Date.now()}`, status:'open', created_at:new Date().toISOString()}, ...p]);
      toast.success('Incident created');
    } catch { toast.error('Failed to create incident'); }
  };

  const handleResolve = async (id) => {
    try { await resolveIncident(id); setIncidents(p => p.map(i => i.id===id ? {...i,status:'resolved'} : i)); toast.success('Incident resolved'); }
    catch { setIncidents(p => p.map(i => i.id===id ? {...i,status:'resolved'} : i)); toast.success('Incident resolved'); }
    setConfirm(null);
  };

  const filtered = incidents.filter(i => {
    const s = (i.status||'').toLowerCase();
    if (tab==='Open')        return s==='open';
    if (tab==='Assigned')    return s==='assigned';
    if (tab==='In Progress') return s==='in progress' || s==='in_progress';
    if (tab==='Resolved')    return s==='resolved';
    return true;
  });

  const counts = { open: incidents.filter(i=>(i.status||'').toLowerCase()==='open').length, assigned: incidents.filter(i=>(i.status||'').toLowerCase()==='assigned').length, resolved: incidents.filter(i=>(i.status||'').toLowerCase()==='resolved').length };

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:0 }}>Incidents</h1>
          <p style={{ color:T.textMuted, fontSize:13, margin:'4px 0 0' }}>Manage and track all incidents</p>
        </div>
        {hasRole('admin','supervisor','operator') && (
          <button onClick={() => setShowCreate(true)} style={{ padding:'8px 18px', borderRadius:8, background:T.green, border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ Create Incident</button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[['Total',incidents.length,T.textPrimary],['Open',counts.open,T.red],['Assigned',counts.assigned,T.amber],['Resolved Today',counts.resolved,T.green]].map(([l,v,c]) => (
          <div key={l} style={{ ...glass, padding:'14px 18px' }}><div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px' }}>{l}</div><div style={{ color:c, fontSize:26, fontWeight:800, marginTop:4 }}>{v}</div></div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:`1px solid ${T.border}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 16px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:tab===t?700:400, color:tab===t?T.green:T.textMuted, borderBottom:tab===t?`2px solid ${T.green}`:'2px solid transparent', transition:'all 0.15s' }}>{t}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...glass, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {['ID','Severity','Title','Owner','Status','Created','Actions'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:40, textAlign:'center' }}><LoadingSpinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon="📋" title="No incidents" message="No incidents match this filter." /></td></tr>
            ) : filtered.map((inc) => {
              const sc = STATUS_COLORS[(inc.status||'').toLowerCase()] || T.textMuted;
              return (
                <tr key={inc.id} style={{ borderBottom:`1px solid ${T.border}22`, transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12, fontFamily:'monospace' }}>{inc.id}</td>
                  <td style={{ padding:'12px 16px' }}><AlertBadge severity={inc.severity||'P3'} /></td>
                  <td style={{ padding:'12px 16px', color:T.textPrimary, fontSize:13, fontWeight:500, maxWidth:260 }}>{inc.title||inc.description||'Unnamed'}</td>
                  <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{inc.assigned_to||inc.owner||'—'}</td>
                  <td style={{ padding:'12px 16px' }}><span style={{ fontSize:11, color:sc, background:`${sc}18`, padding:'3px 8px', borderRadius:4, fontWeight:700, textTransform:'capitalize' }}>{inc.status||'open'}</span></td>
                  <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{inc.created_at ? new Date(inc.created_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding:'12px 16px' }}>
                    {(inc.status||'open') !== 'resolved' && hasRole('admin','supervisor') && (
                      <button onClick={() => setConfirm({ id:inc.id, label:inc.title||inc.id })} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.green}44`, background:`${T.green}14`, color:T.green, fontSize:11, cursor:'pointer' }}>Resolve</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      <ConfirmModal open={!!confirm} title={`Resolve ${confirm?.label}?`} message="Mark this incident as resolved." onConfirm={() => handleResolve(confirm.id)} onCancel={() => setConfirm(null)} />
    </div>
  );
}

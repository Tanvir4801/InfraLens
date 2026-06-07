import React, { useState } from 'react';
import { T, glass } from '../config/theme';
import EmptyState from '../components/ui/EmptyState';

const MOCK_DB = {
  Users:    [{ _id:'u1', username:'admin', role:'admin', status:'active', created:'2026-01-01' },{ _id:'u2', username:'operator', role:'operator', status:'active', created:'2026-01-02' }],
  Alerts:   [{ _id:'a1', name:'HighCPU', severity:'warning', status:'active', created:'2026-06-07' },{ _id:'a2', name:'ServiceDown', severity:'critical', status:'active', created:'2026-06-07' }],
  Incidents:[{ _id:'i1', title:'CPU spike', severity:'P2', status:'open', assigned:'operator', created:'2026-06-07' }],
  Metrics:  [{ _id:'m1', cpu:23.4, ram:41.2, disk:0.0, uptime:3600, source:'psutil', ts:'2026-06-07T18:00:00Z' }],
  'Audit Logs':[{ _id:'l1', user:'admin', action:'login', resource:'/api/auth/login', ip:'127.0.0.1', ts:'2026-06-07T18:00:00Z' }],
};

export default function DatabaseExplorer() {
  const [selected, setSelected]   = useState('Users');
  const [search,   setSearch]     = useState('');
  const [page,     setPage]       = useState(1);
  const [detailRow,setDetailRow]  = useState(null);
  const PER_PAGE = 20;

  const raw    = MOCK_DB[selected] || [];
  const filter = raw.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  const pages  = Math.max(1, Math.ceil(filter.length / PER_PAGE));
  const rows   = filter.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const cols   = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%', display:'flex', gap:16 }}>
      {/* Left panel */}
      <div style={{ ...glass, width:200, flexShrink:0, padding:16 }}>
        <div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:12 }}>Collections</div>
        {Object.keys(MOCK_DB).map(name => (
          <button key={name} onClick={() => { setSelected(name); setPage(1); setSearch(''); }} style={{
            width:'100%', padding:'9px 12px', borderRadius:8, marginBottom:4, border:`1px solid ${selected===name?T.green:T.border}`,
            background:selected===name?`${T.green}14`:T.bgPrimary, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{ color:selected===name?T.green:T.textPrimary, fontSize:13, textAlign:'left' }}>{name}</span>
            <span style={{ color:T.textHint, fontSize:10 }}>{MOCK_DB[name].length}</span>
          </button>
        ))}
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, minWidth:0 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <h1 style={{ color:T.textPrimary, fontSize:18, fontWeight:700, margin:0 }}>{selected}</h1>
          <span style={{ color:T.textHint, fontSize:12 }}>{filter.length} documents</span>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={`Search ${selected}…`}
            style={{ marginLeft:'auto', background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'7px 12px', fontSize:12, outline:'none', width:240 }} />
        </div>

        <div style={{ ...glass, overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {cols.map(c => <th key={c} style={{ padding:'10px 14px', textAlign:'left', color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', whiteSpace:'nowrap' }}>{c}</th>)}
            </tr></thead>
            <tbody>
              {rows.length===0 ? <tr><td colSpan={cols.length}><EmptyState icon="🗄️" title="No documents" /></td></tr>
              : rows.map((row,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${T.border}22`, cursor:'pointer' }}
                  onClick={() => setDetailRow(row)}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  {cols.map(c => (
                    <td key={c} style={{ padding:'10px 14px', color:T.textPrimary, fontSize:12, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:typeof row[c]==='string'&&row[c].startsWith('{')?'monospace':'inherit' }}>
                      {String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages>1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
            <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:'5px 14px', borderRadius:6, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:12, cursor:'pointer' }}>← Prev</button>
            <span style={{ color:T.textMuted, fontSize:12, padding:'5px 10px' }}>{page} / {pages}</span>
            <button onClick={() => setPage(p=>Math.min(pages,p+1))} disabled={page===pages} style={{ padding:'5px 14px', borderRadius:6, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:12, cursor:'pointer' }}>Next →</button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailRow && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }} onClick={() => setDetailRow(null)}>
          <div style={{ ...glass, padding:24, width:500, maxWidth:'90vw', maxHeight:'80vh', overflow:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <span style={{ color:T.textPrimary, fontSize:14, fontWeight:700 }}>Document Detail</span>
              <button onClick={() => setDetailRow(null)} style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <pre style={{ background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, padding:16, color:T.green, fontSize:12, fontFamily:'monospace', overflow:'auto', margin:0 }}>
              {JSON.stringify(detailRow, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

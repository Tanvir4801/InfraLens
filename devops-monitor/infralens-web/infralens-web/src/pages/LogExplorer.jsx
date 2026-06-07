import React, { useState, useEffect } from 'react';
import { fetchServers, fetchContainerLogs } from '../services/api';
import { T, glass } from '../config/theme';

const LEVELS = ['ALL','ERROR','WARN','INFO','DEBUG'];

export default function LogExplorer() {
  const [services,  setServices]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [level,     setLevel]     = useState('ALL');
  const [search,    setSearch]    = useState('');
  const [live,      setLive]      = useState(false);
  const [lastUpdate,setLastUpdate]= useState(0);

  useEffect(() => {
    fetchServers().then(d => {
      const svcs = Array.isArray(d) ? d : [];
      setServices(svcs);
      if (svcs.length) setSelected(svcs[0].name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = () => {
      fetchContainerLogs(selected).then(d => { setLogs(Array.isArray(d) ? d : []); setLastUpdate(0); }).catch(() => {});
    };
    load();
    if (live) { const i = setInterval(load, 2000); return () => clearInterval(i); }
  }, [selected, live]);

  useEffect(() => { const i = setInterval(() => setLastUpdate(p=>p+1),1000); return () => clearInterval(i); }, []);

  const filtered = logs.filter(l => {
    const upper = l.toUpperCase();
    if (level !== 'ALL' && !upper.includes(level)) return false;
    if (search && !l.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lineColor = (l) => {
    if (l.toUpperCase().includes('ERROR')) return T.red;
    if (l.toUpperCase().includes('WARN'))  return T.amber;
    if (l.toUpperCase().includes('DEBUG')) return T.textHint;
    return '#4ade80';
  };
  const lineBg = (l) => {
    if (l.toUpperCase().includes('ERROR')) return `${T.red}0c`;
    if (l.toUpperCase().includes('WARN'))  return `${T.amber}08`;
    return 'transparent';
  };

  const download = () => {
    const blob = new Blob([filtered.join('\n')], { type:'text/plain' });
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${selected}-logs.log`; a.click();
  };

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%', display:'flex', flexDirection:'column', gap:16 }}>
      <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:0 }}>Log Explorer</h1>

      <div style={{ display:'flex', gap:16, flex:1, minHeight:0 }}>
        {/* Left panel - services */}
        <div style={{ ...glass, width:220, flexShrink:0, padding:16, overflowY:'auto' }}>
          <div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:12 }}>Services</div>
          {services.map(s => (
            <button key={s.name} onClick={() => setSelected(s.name)} style={{
              width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${selected===s.name?T.green:T.border}`,
              background:selected===s.name?`${T.green}14`:T.bgPrimary, cursor:'pointer',
              display:'flex', alignItems:'center', gap:8, marginBottom:6,
            }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:s.status==='healthy'?T.green:T.amber, flexShrink:0 }} />
              <span style={{ color:selected===s.name?T.green:T.textPrimary, fontSize:12, fontWeight:selected===s.name?600:400, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Main log area */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, minWidth:0 }}>
          {/* Toolbar */}
          <div style={{ ...glass, padding:'12px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs…" style={{ background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'7px 12px', fontSize:12, outline:'none', width:220 }} />
            <div style={{ display:'flex', gap:4 }}>
              {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${level===l?T.green:T.border}`, background:level===l?`${T.green}14`:'transparent', color:level===l?T.green:T.textMuted, fontSize:11, cursor:'pointer', fontWeight:level===l?700:400 }}>{l}</button>)}
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button onClick={() => setLive(l=>!l)} style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${live?T.green:T.border}`, background:live?`${T.green}14`:'transparent', color:live?T.green:T.textMuted, fontSize:11, cursor:'pointer' }}>{live?'● Live tail':'Live tail'}</button>
              <button onClick={download} style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:11, cursor:'pointer' }}>Download</button>
            </div>
          </div>

          {/* Log output */}
          <div style={{ ...glass, flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'8px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:T.textMuted, fontSize:11 }}>{filtered.length} lines · {selected}</span>
              <span style={{ color:T.textHint, fontSize:11 }}>Updated {lastUpdate}s ago</span>
            </div>
            <div style={{ flex:1, overflow:'auto', padding:16, background:T.bgPrimary, fontFamily:'monospace', fontSize:12, lineHeight:1.8 }}>
              {filtered.length === 0 ? (
                <div style={{ color:T.textHint, textAlign:'center', paddingTop:40 }}>No log lines match the filter</div>
              ) : filtered.map((line, i) => (
                <div key={i} style={{ color:lineColor(line), background:lineBg(line), padding:'1px 6px', borderRadius:3 }}>
                  {search ? line.split(new RegExp(`(${search})`, 'gi')).map((p, j) => p.toLowerCase()===search.toLowerCase() ? <mark key={j} style={{ background:'#EF9F2788', color:T.textPrimary }}>{p}</mark> : p) : line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

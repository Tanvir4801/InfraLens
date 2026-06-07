import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchCostAnalysis } from '../services/api';
import { T, glass, metricColor } from '../config/theme';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const tt = { contentStyle:{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 } };

export default function CostAnalytics() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostAnalysis().then(d => { setData(Array.isArray(d)?d:[]); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const totalSavings  = data.reduce((s,r)=>s+(r.saving_usd||0), 0);
  const avgCpu        = data.length ? (data.reduce((s,r)=>s+(r.avg_cpu||0),0)/data.length).toFixed(1) : 0;
  const avgRam        = data.length ? (data.reduce((s,r)=>s+(r.avg_ram||0),0)/data.length).toFixed(0) : 0;
  const estMonthly    = data.length * 45;

  const chartData = data.map(r => ({ name:r.container, cpu:r.avg_cpu, ram:r.avg_ram, saving:r.saving_usd }));

  if (loading) return <div style={{ padding:24, background:T.bgPrimary }}><LoadingSpinner /></div>;

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:'0 0 20px' }}>Cost Analytics</h1>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[['Est. Monthly Cost',`$${estMonthly}`,T.blue],['Avg CPU Util',`${avgCpu}%`,metricColor(Number(avgCpu))],['Avg RAM Usage',`${avgRam} MB`,T.purple],['Potential Savings',`$${totalSavings.toFixed(0)}/mo`,T.green]].map(([l,v,c]) => (
          <div key={l} style={{ ...glass, padding:'14px 18px' }}><div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase' }}>{l}</div><div style={{ color:c, fontSize:22, fontWeight:800, marginTop:4 }}>{v}</div></div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ ...glass, padding:20, marginBottom:20 }}>
        <div style={{ color:T.textPrimary, fontSize:14, fontWeight:600, marginBottom:16 }}>Resource Usage by Service</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fill:T.textMuted, fontSize:11 }} />
            <YAxis tick={{ fill:T.textMuted, fontSize:11 }} />
            <Tooltip {...tt} />
            <Bar dataKey="cpu" fill={T.green}  name="CPU %"   radius={[3,3,0,0]} />
            <Bar dataKey="ram" fill={T.blue}   name="RAM MB"  radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div style={{ ...glass, overflow:'auto' }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, color:T.textPrimary, fontSize:14, fontWeight:600 }}>Underutilized Services</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
            {['Container','Avg CPU %','Avg RAM (MB)','Recommendation','Est. Saving/mo'].map(h => (
              <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.length===0 ? <tr><td colSpan={5}><EmptyState icon="💰" title="No data" /></td></tr>
            : data.map((r,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.border}22`, background:r.avg_cpu<10?`${T.amber}08`:'transparent' }}
                onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt}
                onMouseLeave={e=>e.currentTarget.style.background=r.avg_cpu<10?`${T.amber}08`:'transparent'}>
                <td style={{ padding:'12px 16px', color:T.textPrimary, fontSize:13, fontWeight:500 }}>{r.container}</td>
                <td style={{ padding:'12px 16px', color:metricColor(r.avg_cpu), fontSize:13, fontWeight:700 }}>{r.avg_cpu}%</td>
                <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:13 }}>{r.avg_ram}</td>
                <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{r.recommendation}</td>
                <td style={{ padding:'12px 16px', color:r.saving_usd>0?T.green:T.textHint, fontSize:13, fontWeight:700 }}>{r.saving_usd>0?`$${r.saving_usd.toFixed(2)}`:'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optimization cards */}
      {data.filter(r=>r.saving_usd>0).length>0 && (
        <div style={{ marginTop:20 }}>
          <div style={{ color:T.textPrimary, fontSize:14, fontWeight:600, marginBottom:12 }}>💡 Optimization Suggestions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {data.filter(r=>r.saving_usd>0).map((r,i) => (
              <div key={i} style={{ ...glass, padding:16 }}>
                <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>{r.container}</div>
                <div style={{ color:T.textMuted, fontSize:12, margin:'6px 0 10px' }}>{r.recommendation}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:T.green, fontSize:12, fontWeight:700 }}>Save ${r.saving_usd}/mo</span>
                  <button style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${T.green}44`, background:`${T.green}14`, color:T.green, fontSize:11, cursor:'pointer' }}>Apply</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

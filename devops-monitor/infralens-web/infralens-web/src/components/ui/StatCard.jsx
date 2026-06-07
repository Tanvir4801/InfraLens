import React from 'react';
import { T, glass, metricColor } from '../../config/theme';

export default function StatCard({ label, value, unit = '', sub, color, icon, loading }) {
  const c = color || (typeof value === 'number' ? metricColor(value) : T.green);
  return (
    <div style={{ ...glass, padding:'20px', display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</span>
        {icon && <span style={{ fontSize:16 }}>{icon}</span>}
      </div>
      {loading ? (
        <div style={{ height:36, background:T.bgCardAlt, borderRadius:6, animation:'pulse 1.5s infinite' }} />
      ) : (
        <div style={{ color:c, fontSize:28, fontWeight:800, lineHeight:1.1 }}>
          {typeof value === 'number' ? value.toFixed(1) : value}{unit}
        </div>
      )}
      {sub && <div style={{ color:T.textHint, fontSize:11 }}>{sub}</div>}
    </div>
  );
}

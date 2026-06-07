import React from 'react';
import { severityColor } from '../../config/theme';

export default function AlertBadge({ severity }) {
  const s = (severity || '').toLowerCase();
  const c = severityColor(s);
  return (
    <span style={{
      fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
      background:`${c}22`, color:c, border:`1px solid ${c}44`,
      textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap',
    }}>{severity || 'unknown'}</span>
  );
}

import React from 'react';
import { T } from '../../config/theme';

const COLORS = { healthy:T.green, running:T.green, warning:T.amber, stopped:T.red, critical:T.red, unknown:T.textHint };

export default function StatusDot({ status, size = 8 }) {
  const c = COLORS[(status||'').toLowerCase()] || T.textHint;
  return <div style={{ width:size, height:size, borderRadius:'50%', background:c, boxShadow:`0 0 ${size}px ${c}`, flexShrink:0 }} />;
}

import React from 'react';
import { T } from '../../config/theme';

export default function LoadingSpinner({ size = 32, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{
        width:size, height:size, borderRadius:'50%',
        border:`3px solid ${T.border}`,
        borderTop:`3px solid ${color || T.green}`,
        animation:'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding:'12px 16px' }}>
          <div style={{ height:14, background:T.bgCardAlt, borderRadius:4, animation:'pulse 1.5s infinite', width: i === 0 ? '60%' : '80%' }} />
        </td>
      ))}
    </tr>
  );
}

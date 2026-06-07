import React from 'react';
import { T } from '../../config/theme';

export default function EmptyState({ icon = '📭', title, message, action, onAction }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', color:T.textMuted, textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      {title && <div style={{ color:T.textPrimary, fontSize:15, fontWeight:600, marginBottom:6 }}>{title}</div>}
      {message && <div style={{ fontSize:13, color:T.textMuted, maxWidth:320 }}>{message}</div>}
      {action && <button onClick={onAction} style={{ marginTop:16, padding:'8px 18px', borderRadius:8, background:T.green, color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>{action}</button>}
    </div>
  );
}

import React from 'react';
import { T, glass } from '../../config/theme';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ ...glass, padding:28, width:400, maxWidth:'90vw' }}>
        <div style={{ color:T.textPrimary, fontSize:16, fontWeight:700, marginBottom:10 }}>{title}</div>
        {message && <div style={{ color:T.textMuted, fontSize:13, marginBottom:24 }}>{message}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding:'8px 18px', borderRadius:8, border:'none', background: danger ? T.red : T.green, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

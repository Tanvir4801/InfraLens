import React, { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser, toggleUser } from '../services/api';
import { T, glass } from '../config/theme';
import ConfirmModal from '../components/ui/ConfirmModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { toast } from 'react-toastify';

const ROLE_COLORS = { admin:'#E24B4A', supervisor:'#EF9F27', operator:'#378ADD', viewer:'#8957E5' };
const ROLES = ['admin','supervisor','operator','viewer'];
const DEFAULT_USERS = [
  { id:'u1', username:'admin',    email:'admin@infralens.io',    role:'admin',    department:'Platform', status:'active',  last_login:'2026-06-07', online:true },
  { id:'u2', username:'operator', email:'ops@infralens.io',      role:'operator', department:'DevOps',   status:'active',  last_login:'2026-06-07', online:true },
  { id:'u3', username:'viewer',   email:'viewer@infralens.io',   role:'viewer',   department:'Finance',  status:'active',  last_login:'2026-06-06', online:false },
];

function UserModal({ open, user, onClose, onSave }) {
  const editing = !!user;
  const [form, setForm] = useState({ username:'', email:'', password:'', role:'viewer', department:'' });
  useEffect(() => { if (user) setForm({ ...user, password:'' }); else setForm({ username:'', email:'', password:'', role:'viewer', department:'' }); }, [user]);
  if (!open) return null;
  const s = { background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'8px 12px', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ ...glass, padding:28, width:460, maxWidth:'90vw' }}>
        <h3 style={{ color:T.textPrimary, fontSize:16, fontWeight:700, margin:'0 0 20px' }}>{editing ? 'Edit User' : 'Add User'}</h3>
        {[['Username','username','text'],['Email','email','email'],['Password','password','password'],['Department','department','text']].map(([l,k,t]) => (
          <div key={k} style={{ marginBottom:14 }}>
            <label style={{ display:'block', color:T.textMuted, fontSize:12, marginBottom:5 }}>{l}{editing && k==='password' ? ' (leave blank to keep)' : ''}</label>
            <input type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={s} />
          </div>
        ))}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', color:T.textMuted, fontSize:12, marginBottom:5 }}>Role</label>
          <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={s}>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted, fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:T.green, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>{editing ? 'Save Changes' : 'Create User'}</button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users,   setUsers]   = useState(DEFAULT_USERS);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchUsers().then(d => { if (Array.isArray(d) && d.length) setUsers(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (form) => {
    try {
      if (form.id) {
        await updateUser(form.id, form).catch(() => form);
        setUsers(p => p.map(u => u.id===form.id ? {...u,...form} : u));
        toast.success('User updated');
      } else {
        const newUser = { ...form, id:`u${Date.now()}`, status:'active', last_login:new Date().toISOString(), online:false };
        await createUser(form).catch(() => {});
        setUsers(p => [...p, newUser]);
        toast.success('User created');
      }
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (id) => {
    try { await deleteUser(id).catch(() => {}); setUsers(p => p.filter(u=>u.id!==id)); toast.success('User deleted'); }
    catch { toast.error('Delete failed'); }
    setConfirm(null);
  };

  const handleToggle = async (id) => {
    try {
      await toggleUser(id).catch(() => {});
      setUsers(p => p.map(u => u.id===id ? {...u,status:u.status==='active'?'inactive':'active'} : u));
      toast.success('User status toggled');
    } catch { toast.error('Toggle failed'); }
  };

  const counts = { total:users.length, active:users.filter(u=>u.status==='active').length, inactive:users.filter(u=>u.status!=='active').length, online:users.filter(u=>u.online).length };

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:0 }}>User Management</h1>
          <p style={{ color:T.textMuted, fontSize:13, margin:'4px 0 0' }}>Manage platform access and roles</p>
        </div>
        <button onClick={() => setModal({})} style={{ padding:'8px 18px', borderRadius:8, background:T.green, border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ Add User</button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[['Total Users',counts.total,T.textPrimary],['Active',counts.active,T.green],['Inactive',counts.inactive,T.red],['Online Now',counts.online,T.blue]].map(([l,v,c]) => (
          <div key={l} style={{ ...glass, padding:'14px 18px' }}><div style={{ color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase' }}>{l}</div><div style={{ color:c, fontSize:26, fontWeight:800, marginTop:4 }}>{v}</div></div>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...glass, overflow:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:750 }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
            {['User','Email','Role','Department','Status','Last Login','Actions'].map(h => (
              <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:T.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding:40 }}><LoadingSpinner /></td></tr>
            : users.length === 0 ? <tr><td colSpan={7}><EmptyState icon="👥" title="No users" /></td></tr>
            : users.map(u => {
              const rc = ROLE_COLORS[u.role] || T.textMuted;
              return (
                <tr key={u.id} style={{ borderBottom:`1px solid ${T.border}22` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bgCardAlt}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:`${rc}22`, border:`1px solid ${rc}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:rc, flexShrink:0 }}>
                        {(u.username||'U').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>{u.username}</div>
                        {u.online && <div style={{ fontSize:9, color:T.green, fontWeight:700 }}>● ONLINE</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{u.email||'—'}</td>
                  <td style={{ padding:'12px 16px' }}><span style={{ fontSize:10, color:rc, background:`${rc}18`, padding:'3px 8px', borderRadius:4, fontWeight:700, textTransform:'uppercase' }}>{u.role}</span></td>
                  <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{u.department||'—'}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:u.status==='active'?T.green:T.red }} />
                      <span style={{ color:u.status==='active'?T.green:T.red, fontSize:12, textTransform:'capitalize' }}>{u.status||'active'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', color:T.textMuted, fontSize:12 }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setModal(u)} style={{ padding:'4px 8px', borderRadius:5, border:`1px solid ${T.blue}44`, background:`${T.blue}14`, color:T.blue, fontSize:10, cursor:'pointer' }}>Edit</button>
                      <button onClick={() => handleToggle(u.id)} style={{ padding:'4px 8px', borderRadius:5, border:`1px solid ${T.amber}44`, background:`${T.amber}14`, color:T.amber, fontSize:10, cursor:'pointer' }}>Toggle</button>
                      <button onClick={() => setConfirm({ id:u.id, label:u.username })} style={{ padding:'4px 8px', borderRadius:5, border:`1px solid ${T.red}44`, background:`${T.red}14`, color:T.red, fontSize:10, cursor:'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserModal open={modal !== null} user={modal?.id ? modal : null} onClose={() => setModal(null)} onSave={handleSave} />
      <ConfirmModal open={!!confirm} title={`Delete ${confirm?.label}?`} message="This action cannot be undone." danger onConfirm={() => handleDelete(confirm.id)} onCancel={() => setConfirm(null)} />
    </div>
  );
}

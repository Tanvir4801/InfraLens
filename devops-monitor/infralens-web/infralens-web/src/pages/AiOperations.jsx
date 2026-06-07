import React, { useState, useEffect, useRef } from 'react';
import { aiChat, fetchAlerts } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { T, glass, metricColor } from '../config/theme';

const CHIPS = [
  'Why is memory high?', 'Which container restarted most?',
  'Show unhealthy services', 'Predict disk usage next hour',
  'What caused the last alert?', 'How can I reduce CPU usage?',
  'Is my system healthy?', 'Summarize recent incidents',
];

function TypeWriter({ text, onDone }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i+1));
      i++;
      if (i >= text.length) { clearInterval(iv); onDone && onDone(); }
    }, 12);
    return () => clearInterval(iv);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span>{displayed}</span>;
}

export default function AiOperations() {
  const { metrics } = useWebSocket();
  const [messages, setMessages] = useState([{ role:'ai', text:'Hello! I\'m InfraLens AI. Ask me anything about your infrastructure.' }]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [alerts,   setAlerts]   = useState([]);
  const [rcaList,  setRcaList]  = useState([]);
  const [tab,      setTab]      = useState('chat');
  const [typing,   setTyping]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { fetchAlerts().then(d=>setAlerts(Array.isArray(d)?d:d?.alerts??[])).catch(()=>{}); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  const send = async (q) => {
    const question = q || input.trim();
    if (!question) return;
    setInput('');
    setMessages(p => [...p, { role:'user', text:question }]);
    setLoading(true);
    try {
      const ctx = { cpu:metrics?.cpu_percent||0, ram:metrics?.ram_percent||0, disk:metrics?.disk_percent||0, alerts_count:alerts.length };
      const r = await aiChat(question, ctx);
      setMessages(p => [...p, { role:'ai', text:r.response, model:r.model, typing:true }]);
    } catch {
      setMessages(p => [...p, { role:'ai', text:'I\'m having trouble connecting to the AI engine right now. Please try again.' }]);
    }
    setLoading(false);
  };

  const cpu  = metrics?.cpu_percent  ?? 0;
  const ram  = metrics?.ram_percent  ?? 0;
  const disk = metrics?.disk_percent ?? 0;

  const MiniGauge = ({ label, value, color }) => (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:T.textMuted, fontSize:11 }}>{label}</span>
        <span style={{ color, fontSize:11, fontWeight:700 }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height:5, background:T.border, borderRadius:3 }}>
        <div style={{ width:`${value}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.5s' }} />
      </div>
    </div>
  );

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%', display:'flex', gap:16 }}>
      {/* Chat area — 60% */}
      <div style={{ flex:3, display:'flex', flexDirection:'column', gap:12 }}>
        {/* Header */}
        <div style={{ ...glass, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>🤖</span>
            <div>
              <div style={{ color:T.textPrimary, fontSize:14, fontWeight:700 }}>DevOps Copilot</div>
              <div style={{ color:T.textHint, fontSize:11 }}>Powered by Gemini / Groq</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {['chat','rca'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${tab===t?T.green:T.border}`, background:tab===t?`${T.green}14`:'transparent', color:tab===t?T.green:T.textMuted, fontSize:11, cursor:'pointer', fontWeight:tab===t?700:400, textTransform:'uppercase' }}>{t==='chat'?'Chat':'RCA Reports'}</button>
            ))}
          </div>
        </div>

        {tab==='chat' && (
          <>
            {/* Suggestion chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {CHIPS.map(c => (
                <button key={c} onClick={() => send(c)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${T.border}`, background:T.bgCard, color:T.textMuted, fontSize:11, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.green;e.currentTarget.style.color=T.green;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textMuted;}}>{c}</button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ ...glass, flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12, minHeight:320 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:8 }}>
                  {m.role==='ai' && <div style={{ width:28, height:28, borderRadius:8, background:`${T.purple}22`, border:`1px solid ${T.purple}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>🤖</div>}
                  <div style={{
                    maxWidth:'75%', padding:'10px 14px', borderRadius:12,
                    background: m.role==='user' ? T.bgCardAlt : `${T.blue}0d`,
                    border: `1px solid ${m.role==='user'?T.border:`${T.blue}22`}`,
                    color:T.textPrimary, fontSize:13, lineHeight:1.6,
                    borderTopRightRadius: m.role==='user'?2:12,
                    borderTopLeftRadius:  m.role==='ai'?2:12,
                  }}>
                    {m.typing ? <TypeWriter text={m.text} /> : m.text}
                    {m.model && <div style={{ color:T.textHint, fontSize:9, marginTop:6, textTransform:'uppercase' }}>via {m.model}</div>}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:`${T.purple}22`, border:`1px solid ${T.purple}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🤖</div>
                  <div style={{ padding:'12px 16px', borderRadius:12, background:`${T.blue}0d`, border:`1px solid ${T.blue}22` }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {[0,1,2].map(d => <div key={d} style={{ width:6, height:6, borderRadius:'50%', background:T.blue, animation:`bounce 1.2s ${d*0.2}s infinite` }} />)}
                    </div>
                    <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ ...glass, padding:12, display:'flex', gap:10 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                placeholder="Ask about your infrastructure…"
                style={{ flex:1, background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'10px 14px', fontSize:13, outline:'none' }} />
              <button onClick={() => send()} disabled={loading||!input.trim()} style={{ padding:'10px 20px', borderRadius:8, background:T.green, border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:loading||!input.trim()?0.5:1 }}>Send</button>
            </div>
          </>
        )}

        {tab==='rca' && (
          <div style={{ ...glass, flex:1, padding:16 }}>
            <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600, marginBottom:16 }}>Recent RCA Reports</div>
            {rcaList.length===0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:T.textHint }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
                <div style={{ fontSize:13 }}>No RCA reports yet. Generate one from the Alert Center.</div>
              </div>
            ) : rcaList.map((r,i) => (
              <div key={i} style={{ ...glass, padding:14, marginBottom:10 }}>
                <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>{r.alert}</div>
                <div style={{ color:T.textHint, fontSize:11, marginBottom:8 }}>{r.timestamp}</div>
                <pre style={{ color:T.blueLight, fontSize:12, whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0 }}>{r.report}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context panel — 40% */}
      <div style={{ flex:2, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ ...glass, padding:18 }}>
          <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600, marginBottom:14 }}>Live System Context</div>
          <MiniGauge label="CPU" value={cpu} color={metricColor(cpu)} />
          <MiniGauge label="RAM" value={ram} color={metricColor(ram)} />
          <MiniGauge label="Disk" value={disk} color={metricColor(disk)} />
          <div style={{ marginTop:12, padding:'10px 12px', borderRadius:8, background:T.bgPrimary, display:'flex', justifyContent:'space-between' }}>
            <span style={{ color:T.textMuted, fontSize:12 }}>Active Alerts</span>
            <span style={{ color:alerts.length?T.red:T.green, fontSize:13, fontWeight:700 }}>{alerts.length}</span>
          </div>
        </div>

        <div style={{ ...glass, padding:18 }}>
          <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600, marginBottom:12 }}>Quick Actions</div>
          {[['🔍 Diagnose CPU spike',   'Why is CPU high right now?'],
            ['💾 Check disk health',    'What is the disk usage and forecast?'],
            ['🚨 Review active alerts', 'Summarize all current alerts'],
            ['📊 System health report', 'Give me a full system health summary'],
          ].map(([label, q]) => (
            <button key={label} onClick={() => { setTab('chat'); send(q); }} style={{
              width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${T.border}`,
              background:T.bgPrimary, color:T.textMuted, fontSize:12, cursor:'pointer', textAlign:'left',
              marginBottom:6, transition:'all 0.15s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.green;e.currentTarget.style.color=T.green;e.currentTarget.style.background=`${T.green}0d`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textMuted;e.currentTarget.style.background=T.bgPrimary;}}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

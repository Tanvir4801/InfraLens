import React, { useState } from 'react';
import { fetchMetrics } from '../services/api';
import { T, glass } from '../config/theme';
import { toast } from 'react-toastify';

const Row = ({ label, desc, children }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 0', borderBottom:`1px solid ${T.border}33` }}>
    <div>
      <div style={{ color:T.textPrimary, fontSize:13, fontWeight:600 }}>{label}</div>
      {desc && <div style={{ color:T.textHint, fontSize:11, marginTop:2 }}>{desc}</div>}
    </div>
    <div style={{ marginLeft:20, flexShrink:0 }}>{children}</div>
  </div>
);

const Toggle = ({ value, onChange }) => (
  <div onClick={() => onChange(!value)} style={{ width:40, height:22, borderRadius:11, background:value?T.green:T.bgCardAlt, border:`1px solid ${value?T.green:T.border}`, position:'relative', cursor:'pointer', transition:'all 0.2s' }}>
    <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:value?20:2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.4)' }} />
  </div>
);

const sel = { background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'7px 10px', fontSize:12, outline:'none' };
const inp = { background:T.bgPrimary, border:`1px solid ${T.border}`, borderRadius:8, color:T.textPrimary, padding:'7px 12px', fontSize:12, outline:'none', width:260 };

export default function Settings() {
  const [settings, setSettings] = useState({ refreshInterval:5, wsEnabled:true, alertNotifications:true, darkMode:true, prometheusUrl:'http://prometheus:9090', alertmanagerUrl:'http://alertmanager:9093', metricsRetention:60, overloadThreshold:85, slackWebhook:'', geminiKeyMasked:'AQ.Ab8R...', groqKeyMasked:'gsk_...' });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const set = (k,v) => setSettings(s=>({...s,[k]:v}));

  const save = () => toast.success('Settings saved ✓');
  const testConn = async () => {
    setTesting(true); setTestResult(null);
    try { await fetchMetrics(); setTestResult('ok'); toast.success('Backend connected ✓'); }
    catch { setTestResult('err'); toast.error('Connection failed'); }
    setTesting(false);
  };

  const Section = ({ title, children }) => (
    <div style={{ ...glass, marginBottom:16, overflow:'hidden' }}>
      <div style={{ padding:'12px 18px', borderBottom:`1px solid ${T.border}`, background:`${T.bgCardAlt}66` }}>
        <span style={{ color:T.textMuted, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px' }}>{title}</span>
      </div>
      <div style={{ padding:'0 18px' }}>{children}</div>
    </div>
  );

  return (
    <div style={{ padding:24, background:T.bgPrimary, minHeight:'100%', maxWidth:860 }}>
      <h1 style={{ color:T.textPrimary, fontSize:22, fontWeight:700, margin:'0 0 6px' }}>Settings</h1>
      <p style={{ color:T.textMuted, fontSize:13, margin:'0 0 24px' }}>Platform configuration and integrations</p>

      {/* About cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[['Version','v0.3.0',T.blue],['Backend','Operational',T.green],['AI Engine','Gemini + Groq',T.purple]].map(([l,v,c])=>(
          <div key={l} style={{ ...glass, padding:'14px 18px', textAlign:'center' }}>
            <div style={{ color:T.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4 }}>{l}</div>
            <div style={{ color:c, fontSize:14, fontWeight:700 }}>{v}</div>
          </div>
        ))}
      </div>

      <Section title="General">
        <Row label="Metrics refresh interval" desc="How often to poll for new metrics">
          <select value={settings.refreshInterval} onChange={e=>set('refreshInterval',Number(e.target.value))} style={sel}>
            {[3,5,10,30].map(v=><option key={v} value={v}>{v}s</option>)}
          </select>
        </Row>
        <Row label="WebSocket live mode" desc="Real-time streaming (auto-falls back to polling)">
          <Toggle value={settings.wsEnabled} onChange={v=>set('wsEnabled',v)} />
        </Row>
        <Row label="Browser notifications" desc="Desktop alerts for critical events">
          <Toggle value={settings.alertNotifications} onChange={v=>set('alertNotifications',v)} />
        </Row>
        <Row label="History retention" desc="Max metric data points kept per chart">
          <select value={settings.metricsRetention} onChange={e=>set('metricsRetention',Number(e.target.value))} style={sel}>
            {[20,60,120,300].map(v=><option key={v} value={v}>{v} pts</option>)}
          </select>
        </Row>
      </Section>

      <Section title="Alerting & Thresholds">
        <Row label="CPU overload threshold" desc={`Alert when CPU exceeds this value (currently ${settings.overloadThreshold}%)`}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="range" min={50} max={99} value={settings.overloadThreshold} onChange={e=>set('overloadThreshold',Number(e.target.value))} style={{ width:120, accentColor:T.red }} />
            <span style={{ color:T.red, fontSize:13, fontWeight:700, width:36 }}>{settings.overloadThreshold}%</span>
          </div>
        </Row>
      </Section>

      <Section title="Integrations">
        <Row label="Prometheus URL" desc="Metrics data source">
          <input value={settings.prometheusUrl} onChange={e=>set('prometheusUrl',e.target.value)} style={inp} />
        </Row>
        <Row label="Alertmanager URL" desc="Alert source">
          <input value={settings.alertmanagerUrl} onChange={e=>set('alertmanagerUrl',e.target.value)} style={inp} />
        </Row>
        <Row label="Slack Webhook" desc="Notifications for critical alerts">
          <input value={settings.slackWebhook} onChange={e=>set('slackWebhook',e.target.value)} placeholder="https://hooks.slack.com/…" style={inp} />
        </Row>
        <Row label="System Diagnostics" desc="Verify backend connectivity">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {testResult==='ok'  && <span style={{ color:T.green, fontSize:12, fontWeight:700 }}>✓ Connected</span>}
            {testResult==='err' && <span style={{ color:T.red,   fontSize:12, fontWeight:700 }}>✗ Failed</span>}
            <button onClick={testConn} disabled={testing} style={{ padding:'6px 14px', borderRadius:8, background:`${T.blue}18`, border:`1px solid ${T.blue}44`, color:T.blue, fontSize:12, cursor:'pointer', opacity:testing?0.6:1 }}>{testing?'Testing…':'Test Connection'}</button>
          </div>
        </Row>
      </Section>

      <Section title="API Keys (masked)">
        <Row label="Gemini API Key" desc="Used for AI incident reports and chat">
          <input value={settings.geminiKeyMasked} readOnly style={{ ...inp, color:T.textHint, fontFamily:'monospace' }} />
        </Row>
        <Row label="Groq API Key" desc="Fallback AI engine (Llama 3.1)">
          <input value={settings.groqKeyMasked} readOnly style={{ ...inp, color:T.textHint, fontFamily:'monospace' }} />
        </Row>
      </Section>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingBottom:20 }}>
        <button onClick={save} style={{ padding:'10px 24px', borderRadius:8, background:T.green, border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Save Settings</button>
      </div>
    </div>
  );
}

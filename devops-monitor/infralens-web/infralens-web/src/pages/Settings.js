import React, { useState } from 'react';

function SettingRow({ label, description, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #21262d' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: '#8b949e', marginTop: 3 }}>{description}</div>}
      </div>
      <div style={{ marginLeft: 20, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 38, height: 20, borderRadius: 10,
        background: value ? '#238636' : '#30363d',
        position: 'relative', cursor: 'pointer', transition: 'background .2s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left .2s',
      }} />
    </div>
  );
}

export default function Settings({ apiBase }) {
  const [settings, setSettings] = useState({
    refreshInterval: 5,
    wsEnabled: true,
    alertNotifications: true,
    darkMode: true,
    prometheusUrl: 'http://prometheus:9090',
    alertmanagerUrl: 'http://alertmanager:9093',
    metricsRetention: 60,
    overloadThreshold: 85,
  });
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Dashboard and monitoring configuration</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
          Data Collection
        </div>

        <SettingRow label="Metrics refresh interval" description="How often to poll the backend for new metrics">
          <select
            value={settings.refreshInterval}
            onChange={e => set('refreshInterval', Number(e.target.value))}
            style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', padding: '5px 10px', borderRadius: 6, fontSize: 13 }}
          >
            {[3, 5, 10, 30].map(v => <option key={v} value={v}>{v}s</option>)}
          </select>
        </SettingRow>

        <SettingRow label="WebSocket live mode" description="Real-time streaming via WebSocket (falls back to polling if unavailable)">
          <Toggle value={settings.wsEnabled} onChange={v => set('wsEnabled', v)} />
        </SettingRow>

        <SettingRow label="History retention" description="Max data points kept per metric for charts">
          <select
            value={settings.metricsRetention}
            onChange={e => set('metricsRetention', Number(e.target.value))}
            style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', padding: '5px 10px', borderRadius: 6, fontSize: 13 }}
          >
            {[20, 60, 120, 300].map(v => <option key={v} value={v}>{v} pts</option>)}
          </select>
        </SettingRow>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
          Alerting
        </div>

        <SettingRow label="Browser notifications" description="Show desktop notifications for critical alerts">
          <Toggle value={settings.alertNotifications} onChange={v => set('alertNotifications', v)} />
        </SettingRow>

        <SettingRow label="CPU overload threshold" description="Alert when predicted CPU exceeds this value">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range" min={50} max={99} value={settings.overloadThreshold}
              onChange={e => set('overloadThreshold', Number(e.target.value))}
              style={{ accentColor: '#f85149' }}
            />
            <span style={{ fontSize: 13, color: '#f85149', fontWeight: 700, width: 36 }}>{settings.overloadThreshold}%</span>
          </div>
        </SettingRow>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
          Integrations
        </div>

        <SettingRow label="Prometheus URL" description="Prometheus server endpoint">
          <input
            value={settings.prometheusUrl}
            onChange={e => set('prometheusUrl', e.target.value)}
            className="search-bar"
            style={{ width: 220 }}
          />
        </SettingRow>

        <SettingRow label="Alertmanager URL" description="Alertmanager server endpoint">
          <input
            value={settings.alertmanagerUrl}
            onChange={e => set('alertmanagerUrl', e.target.value)}
            className="search-bar"
            style={{ width: 220 }}
          />
        </SettingRow>

        <SettingRow label="Backend API base" description="InfraLens backend API endpoint">
          <input
            value={apiBase}
            readOnly
            className="search-bar"
            style={{ width: 220, opacity: .6, cursor: 'not-allowed' }}
          />
        </SettingRow>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => setSaved(false)}>Reset</button>
        <button className="btn btn-primary" onClick={save}>
          {saved ? '✓ Saved!' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

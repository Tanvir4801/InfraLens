import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

function cpuColor(v) {
  if (v > 80) return '#f85149';
  if (v > 60) return '#d29922';
  return '#3fb950';
}
function ramColor(v) {
  if (v > 85) return '#f85149';
  if (v > 65) return '#d29922';
  return '#58a6ff';
}
function formatUptime(s) {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function statusColor(v) {
  if (v > 80) return '#f85149';
  if (v > 60) return '#d29922';
  return '#3fb950';
}

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
      <div style={{ color: '#8b949e' }}>{label}</div>
      <div style={{ color: payload[0].color, fontWeight: 700 }}>{payload[0].value?.toFixed(1)}{unit}</div>
    </div>
  );
};

export default function Dashboard({ metrics, metricsHistory, alerts, apiBase }) {
  const [prediction, setPrediction] = useState(null);
  const [servers, setServers] = useState([]);
  const [history, setHistory] = useState([]);

  // Pull rolling history from ref
  useEffect(() => {
    const interval = setInterval(() => {
      if (metricsHistory?.current) {
        const h = metricsHistory.current.slice(-20).map((m, i) => ({
          t: i,
          cpu: m.cpu_percent,
          ram: m.ram_percent,
        }));
        setHistory(h);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [metricsHistory]);

  // Fetch prediction
  useEffect(() => {
    const fetchPred = async () => {
      try {
        const r = await fetch(`${apiBase}/api/predict`);
        if (r.ok) setPrediction(await r.json());
      } catch {}
    };
    fetchPred();
    const t = setInterval(fetchPred, 30000);
    return () => clearInterval(t);
  }, [apiBase]);

  // Fetch servers
  useEffect(() => {
    const fetchServers = async () => {
      try {
        const r = await fetch(`${apiBase}/api/servers`);
        if (r.ok) setServers(await r.json());
      } catch {}
    };
    fetchServers();
    const t = setInterval(fetchServers, 5000);
    return () => clearInterval(t);
  }, [apiBase]);

  const cpu = metrics?.cpu_percent ?? 0;
  const ram = metrics?.ram_percent ?? 0;
  const uptime = metrics?.uptime_seconds ?? 0;
  const alertCount = alerts?.length ?? 0;
  const criticalAlerts = alerts?.filter(a => {
    const sev = (a.labels?.severity || a.severity || '').toLowerCase();
    return sev === 'critical';
  }).length ?? 0;

  // Simulated alert display
  const displayAlerts = alerts?.length > 0 ? alerts.slice(0, 4).map((a, i) => ({
    id: i,
    severity: (a.labels?.severity || a.severity || 'info').toLowerCase(),
    name: a.annotations?.summary || a.labels?.alertname || a.name || 'Alert',
    firedMinsAgo: Math.floor(Math.random() * 20) + 1,
  })) : [
    { id: 0, severity: 'critical', name: 'High memory on node-2', firedMinsAgo: 4 },
    { id: 1, severity: 'warning', name: 'Disk usage > 75% on node-3', firedMinsAgo: 12 },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">CPU avg</div>
          <div className="stat-value" style={{ color: cpuColor(cpu) }}>{cpu.toFixed(1)}%</div>
          <div className="stat-sub">{servers.length || 3} nodes</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RAM avg</div>
          <div className="stat-value" style={{ color: ramColor(ram) }}>{ram.toFixed(0)}%</div>
          <div className="stat-sub">{(ram * 0.2).toFixed(1)} GB used</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uptime</div>
          <div className="stat-value blue">{formatUptime(uptime)}</div>
          <div className="stat-sub">since last restart</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Alerts</div>
          <div className="stat-value" style={{ color: alertCount > 0 ? '#f85149' : '#3fb950' }}>{alertCount}</div>
          <div className="stat-sub">{criticalAlerts} critical</div>
        </div>
      </div>

      {/* AI Prediction Banner */}
      {prediction && (
        <div className="ai-banner">
          <div className="ai-banner-header">
            <div className="ai-banner-title">✦ AI prediction</div>
            <div className="ai-banner-meta">
              Prophet model · {Math.round((prediction.confidence ?? 0.85) * 100)}% confidence
            </div>
          </div>
          <div className="ai-banner-body">
            {prediction.will_overload ? (
              <>
                <strong>RAM overload predicted in ~{prediction.minutes_until_overload} min.</strong>{' '}
                Memory usage has been climbing. Recommend scaling HPA or restarting high-memory services.
              </>
            ) : (
              <>
                <strong>No overload predicted.</strong>{' '}
                CPU forecast peak: {prediction.predicted_max_cpu?.toFixed(1)}%. System stable.
              </>
            )}
          </div>
        </div>
      )}

      {/* Sparkline Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="chart-header">
            <span className="chart-title">CPU over time</span>
            <span className={cpu > 60 ? 'chart-badge-amber' : 'chart-badge-green'}>
              {servers[0]?.name || 'node-1'}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={history} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Line type="monotone" dataKey="cpu" stroke="#3fb950" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="chart-header">
            <span className="chart-title">RAM over time</span>
            <span className={ram > 65 ? 'chart-badge-amber' : 'chart-badge-green'}>
              {servers[1]?.name || 'node-2'} {ram > 65 && '⚠'}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={history} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Line type="monotone" dataKey="ram" stroke="#d29922" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="bottom-grid">
        {/* Server Health */}
        <div className="card">
          <div className="section-title">Server health</div>
          <div className="server-list">
            {(servers.length > 0 ? servers : [
              { name: 'node-1', role: 'web', cpu: cpu, status: 'healthy' },
              { name: 'node-2', role: 'api', cpu: cpu + 15, status: 'warning' },
              { name: 'node-3', role: 'db', cpu: cpu - 5, status: 'healthy' },
            ]).map((s) => {
              const v = Math.max(0, Math.min(100, s.cpu || 0));
              const color = statusColor(v);
              return (
                <div className="server-row" key={s.name}>
                  <span className="status-dot" style={{ background: s.status === 'warning' ? '#d29922' : color }} />
                  <span className="server-name">{s.name} <span className="muted" style={{ fontSize: 11 }}>({s.role})</span></span>
                  <div className="mini-bar-wrap">
                    <div className="mini-bar" style={{ width: `${v}%`, background: color }} />
                  </div>
                  <span className="bar-pct" style={{ color }}>{v.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="card">
          <div className="section-title">Active alerts</div>
          {displayAlerts.length === 0 ? (
            <div className="no-data">✓ No active alerts</div>
          ) : (
            <div className="alert-list">
              {displayAlerts.map((a) => (
                <div className="alert-row" key={a.id}>
                  <span className={`sev-badge sev-${a.severity}`}>{a.severity}</span>
                  <div>
                    <div className="alert-name">{a.name}</div>
                    <div className="alert-time">fired {a.firedMinsAgo} mins ago</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const WINDOW_OPTIONS = [
  { label: '1m', secs: 60 },
  { label: '5m', secs: 300 },
  { label: '15m', secs: 900 },
  { label: '1h', secs: 3600 },
];

export default function Metrics({ metrics, metricsHistory, apiBase }) {
  const [history, setHistory] = useState([]);
  const [window_, setWindow] = useState(300);

  useEffect(() => {
    const t = setInterval(() => {
      if (metricsHistory?.current) {
        const maxPoints = Math.min(metricsHistory.current.length, Math.floor(window_ / 3));
        const h = metricsHistory.current.slice(-maxPoints).map((m, i) => ({
          t: i,
          cpu: m.cpu_percent,
          ram: m.ram_percent,
          disk: m.disk_percent,
          label: new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }));
        setHistory(h);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [metricsHistory, window_]);

  const cpu = metrics?.cpu_percent ?? 0;
  const ram = metrics?.ram_percent ?? 0;
  const disk = metrics?.disk_percent ?? 0;

  const tooltipStyle = {
    contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 11 },
    labelStyle: { color: '#8b949e' },
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Metrics</div>
        <div className="page-subtitle">System resource utilisation — live feed</div>
      </div>

      {/* Current snapshot */}
      <div className="stat-cards" style={{ marginBottom: 20 }}>
        {[
          { label: 'CPU', value: cpu, color: cpu > 80 ? '#f85149' : cpu > 60 ? '#d29922' : '#3fb950', unit: '%' },
          { label: 'RAM', value: ram, color: ram > 85 ? '#f85149' : ram > 65 ? '#d29922' : '#58a6ff', unit: '%' },
          { label: 'DISK', value: disk, color: disk > 80 ? '#f85149' : disk > 60 ? '#d29922' : '#3fb950', unit: '%' },
          { label: 'Source', value: metrics?.source || 'psutil', color: '#8b949e', isText: true },
        ].map(m => (
          <div className="stat-card" key={m.label}>
            <div className="stat-label">{m.label}</div>
            <div className="stat-value" style={{ color: m.color, fontSize: m.isText ? 18 : 28 }}>
              {m.isText ? m.value : `${m.value.toFixed(1)}${m.unit}`}
            </div>
          </div>
        ))}
      </div>

      {/* Window selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#8b949e', marginRight: 6 }}>Window:</span>
        {WINDOW_OPTIONS.map(w => (
          <button
            key={w.secs}
            onClick={() => setWindow(w.secs)}
            style={{
              background: window_ === w.secs ? '#238636' : '#21262d',
              border: `1px solid ${window_ === w.secs ? '#238636' : '#30363d'}`,
              color: window_ === w.secs ? '#fff' : '#8b949e',
              borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* CPU + RAM combined chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="chart-header">
          <span className="chart-title">CPU & RAM over time</span>
          <span style={{ fontSize: 11, color: '#8b949e' }}>{history.length} data points</span>
        </div>
        {history.length < 2 ? (
          <div className="no-data">Collecting data…</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#484f58' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b949e' }} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v.toFixed(1)}%`, n.toUpperCase()]} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
              <Line type="monotone" dataKey="cpu" stroke="#3fb950" dot={false} strokeWidth={2} name="CPU" isAnimationActive={false} />
              <Line type="monotone" dataKey="ram" stroke="#d29922" dot={false} strokeWidth={2} name="RAM" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Disk chart */}
      <div className="card">
        <div className="chart-header">
          <span className="chart-title">Disk usage over time</span>
        </div>
        {history.length < 2 ? (
          <div className="no-data">Collecting data…</div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={history} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gdisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3fb950" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#484f58' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b949e' }} />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`, 'Disk']} />
              <Area type="monotone" dataKey="disk" stroke="#3fb950" fill="url(#gdisk)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

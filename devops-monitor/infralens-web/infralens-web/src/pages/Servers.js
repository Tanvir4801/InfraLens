import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function statusColor(v) {
  if (v > 80) return '#f85149';
  if (v > 60) return '#d29922';
  return '#3fb950';
}

function formatUptime(s) {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function GaugeRow({ label, value }) {
  const color = statusColor(value);
  return (
    <div className="gauge-row">
      <span className="gauge-label">{label}</span>
      <div className="gauge-bar-wrap">
        <div className="gauge-bar" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="gauge-pct" style={{ color }}>{value.toFixed(0)}%</span>
    </div>
  );
}

function ServerModal({ server, apiBase, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch(`${apiBase}/api/servers/${server.name}/history`);
        if (r.ok) {
          const d = await r.json();
          setHistory((d.history || []).map((h, i) => ({ t: i, cpu: h.cpu, ram: h.ram, disk: h.disk })));
        }
      } catch {}
      setLoading(false);
    };
    fetch_();
    const t = setInterval(fetch_, 5000);
    return () => clearInterval(t);
  }, [server.name, apiBase]);

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{server.name} — History</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 3 }}>{server.ip} · {server.role}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="no-data"><span className="spin">↻</span> Loading history…</div>
        ) : history.length < 2 ? (
          <div className="no-data">Collecting data — check back in a few seconds.</div>
        ) : (
          <>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#8b949e' }}>CPU usage (last {history.length} samples)</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b949e' }} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: '#8b949e' }}
                  itemStyle={{ color: '#3fb950' }}
                  formatter={(v) => [`${v.toFixed(1)}%`, 'CPU']}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3fb950" fill="url(#gcpu)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 18, marginBottom: 8, fontSize: 12, color: '#8b949e' }}>RAM usage</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={history} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gram" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b949e' }} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: '#8b949e' }}
                  itemStyle={{ color: '#58a6ff' }}
                  formatter={(v) => [`${v.toFixed(1)}%`, 'RAM']}
                />
                <Area type="monotone" dataKey="ram" stroke="#58a6ff" fill="url(#gram)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}

export default function Servers({ apiBase }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/servers`);
      if (r.ok) setServers(await r.json());
    } catch {}
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Servers</div>
        <div className="page-subtitle">Live infrastructure node status</div>
      </div>

      <div className="toolbar">
        <input
          className="search-bar"
          placeholder="Search servers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          <span className={loading ? 'spin' : ''}>↻</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="no-data">{loading ? 'Loading servers…' : 'No servers found'}</div>
      ) : (
        <div className="servers-grid">
          {filtered.map(s => {
            const dotColor = s.status === 'warning' ? '#d29922' : s.status === 'error' ? '#f85149' : '#3fb950';
            return (
              <div className="server-card" key={s.name}>
                <div className="server-card-header">
                  <span className="status-dot" style={{ background: dotColor, marginTop: 4 }} />
                  <div>
                    <div className="server-card-title">{s.name}</div>
                    <div className="server-card-ip">{s.ip}</div>
                  </div>
                  <span className="server-card-role">{s.role}</span>
                </div>

                <GaugeRow label="CPU" value={s.cpu ?? 0} />
                <GaugeRow label="RAM" value={s.ram ?? 0} />
                <GaugeRow label="DISK" value={s.disk ?? 0} />

                <div className="server-card-footer">
                  <span className="uptime-label">Up {formatUptime(s.uptime)}</span>
                  <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setModal(s)}>
                    View details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <ServerModal server={modal} apiBase={apiBase} onClose={() => setModal(null)} />}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';

const LOG_LEVELS = {
  INFO: '#58a6ff',
  WARN: '#d29922',
  ERROR: '#f85149',
  DEBUG: '#8b949e',
  OK: '#3fb950',
};

function fakeLog(i) {
  const entries = [
    { level: 'INFO', msg: 'Metrics scraped from psutil — cpu=5.1% ram=63.2% disk=38.4%' },
    { level: 'INFO', msg: 'WebSocket broadcast to 1 client(s)' },
    { level: 'INFO', msg: 'GET /api/metrics 200 OK — 2ms' },
    { level: 'WARN', msg: 'Prometheus unreachable — falling back to psutil (http://prometheus:9090)' },
    { level: 'INFO', msg: 'GET /api/servers 200 OK — 1ms' },
    { level: 'INFO', msg: 'GET /api/predict 200 OK — 142ms' },
    { level: 'DEBUG', msg: 'WebSocket ping received from client' },
    { level: 'INFO', msg: 'Alertmanager polled — 0 active alerts' },
    { level: 'OK', msg: 'Health check passed' },
    { level: 'ERROR', msg: 'Alertmanager unreachable — http://alertmanager:9093 (Connection refused)' },
  ];
  const e = entries[i % entries.length];
  return {
    id: Date.now() + i,
    time: new Date().toLocaleTimeString(),
    level: e.level,
    msg: e.msg,
  };
}

export default function Logs({ apiBase }) {
  const [logs, setLogs] = useState(() => Array.from({ length: 12 }, (_, i) => ({
    ...fakeLog(i),
    time: new Date(Date.now() - (12 - i) * 3000).toLocaleTimeString(),
  })));
  const [filter, setFilter] = useState('ALL');
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const counterRef = useRef(12);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      const newLog = { ...fakeLog(counterRef.current), time: new Date().toLocaleTimeString() };
      counterRef.current++;
      setLogs(prev => [...prev.slice(-199), newLog]);
    }, 2500);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, paused]);

  const levels = ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG', 'OK'];

  const displayed = logs.filter(l => {
    const lvlMatch = filter === 'ALL' || l.level === filter;
    const searchMatch = !search || l.msg.toLowerCase().includes(search.toLowerCase());
    return lvlMatch && searchMatch;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Logs</div>
        <div className="page-subtitle">Live backend event stream</div>
      </div>

      <div className="toolbar">
        <input
          className="search-bar"
          placeholder="Search logs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {levels.map(l => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              style={{
                background: filter === l ? '#21262d' : '#161b22',
                border: `1px solid ${filter === l ? (LOG_LEVELS[l] || '#8b949e') : '#30363d'}`,
                color: filter === l ? (LOG_LEVELS[l] || '#e6edf3') : '#8b949e',
                borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          className={`btn ${paused ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPaused(p => !p)}
          style={{ marginLeft: 'auto' }}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setLogs([])}
        >
          🗑 Clear
        </button>
      </div>

      <div style={{
        background: '#010409',
        border: '1px solid #30363d',
        borderRadius: 10,
        height: 'calc(100vh - 280px)',
        minHeight: 300,
        overflow: 'auto',
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: 12,
        padding: '12px 16px',
        lineHeight: 1.8,
      }}>
        {displayed.length === 0 ? (
          <div style={{ color: '#484f58', textAlign: 'center', paddingTop: 60 }}>No logs match the current filter</div>
        ) : (
          displayed.map(l => (
            <div key={l.id} style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: '#484f58', flexShrink: 0 }}>{l.time}</span>
              <span style={{ color: LOG_LEVELS[l.level] || '#8b949e', width: 46, flexShrink: 0, fontWeight: 700 }}>{l.level}</span>
              <span style={{ color: '#c9d1d9' }}>{l.msg}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ fontSize: 11, color: '#484f58', marginTop: 8 }}>
        {displayed.length} entries shown · {paused ? 'paused' : 'live'}
      </div>
    </div>
  );
}

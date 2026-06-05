import React, { useState } from 'react';

function severityClass(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'sev-critical';
  if (s === 'warning') return 'sev-warning';
  return 'sev-info';
}

function timeAgo(dateStr) {
  if (!dateStr) return 'unknown';
  try {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  } catch {
    return dateStr;
  }
}

const MOCK_ALERTS = [
  { id: 1, severity: 'critical', name: 'High memory on node-2', description: 'RAM usage exceeded 85% threshold', node: 'node-2', firedAt: new Date(Date.now() - 4 * 60000).toISOString() },
  { id: 2, severity: 'warning', name: 'Disk usage > 75% on node-3', description: 'Available disk space falling below safe threshold', node: 'node-3', firedAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 3, severity: 'info', name: 'CPU spike on node-1', description: 'Temporary CPU spike above 70%', node: 'node-1', firedAt: new Date(Date.now() - 35 * 60000).toISOString() },
];

export default function AlertsPage({ alerts, apiBase }) {
  const [filter, setFilter] = useState('all');

  const rawAlerts = alerts?.length > 0
    ? alerts.map((a, i) => ({
        id: i,
        severity: (a.labels?.severity || a.severity || 'info').toLowerCase(),
        name: a.annotations?.summary || a.labels?.alertname || 'Alert',
        description: a.annotations?.description || a.annotations?.message || '',
        node: a.labels?.instance || a.labels?.node || '—',
        firedAt: a.startsAt || a.fired_at,
      }))
    : MOCK_ALERTS;

  const displayed = filter === 'all' ? rawAlerts : rawAlerts.filter(a => a.severity === filter);

  const counts = rawAlerts.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Alerts</div>
        <div className="page-subtitle">Active and recent alerting events</div>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All', count: rawAlerts.length, color: '#8b949e' },
          { key: 'critical', label: 'Critical', count: counts.critical || 0, color: '#f85149' },
          { key: 'warning', label: 'Warning', count: counts.warning || 0, color: '#d29922' },
          { key: 'info', label: 'Info', count: counts.info || 0, color: '#58a6ff' },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: filter === key ? '#21262d' : '#161b22',
              border: `1px solid ${filter === key ? color : '#30363d'}`,
              borderRadius: 6,
              color: filter === key ? color : '#8b949e',
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {label}
            <span style={{ background: '#0d1117', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>{count}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {displayed.length === 0 ? (
          <div className="no-data" style={{ padding: '40px 0' }}>✓ No alerts matching filter</div>
        ) : (
          <table className="alert-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Alert</th>
                <th>Node</th>
                <th>Description</th>
                <th>Fired</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(a => (
                <tr key={a.id}>
                  <td><span className={`sev-badge ${severityClass(a.severity)}`}>{a.severity}</span></td>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td style={{ color: '#8b949e', fontFamily: 'monospace', fontSize: 12 }}>{a.node}</td>
                  <td style={{ color: '#8b949e', maxWidth: 220 }}>{a.description || '—'}</td>
                  <td style={{ color: '#8b949e', whiteSpace: 'nowrap' }}>{timeAgo(a.firedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

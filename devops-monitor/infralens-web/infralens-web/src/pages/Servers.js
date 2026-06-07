import React, { useState, useEffect, useCallback } from 'react';
import { fetchServers, restartContainer, fetchContainerLogs } from '../services/api';
import { toast } from 'react-toastify';

const cpuColor = (v) => {
  if (v >= 80) return '#f85149';
  if (v >= 60) return '#d29922';
  return '#3fb950';
};

const formatUptime = (s) => {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const LogsModal = ({ id, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await fetchContainerLogs(id);
        setLogs(data.logs || []);
      } catch (err) {
        toast.error('Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [id]);

  const filteredLogs = logs.filter(line => line.toLowerCase().includes(search.toLowerCase()));

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([logs.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${id}.log`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 w-full max-w-4xl rounded-lg border border-gray-700 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-lg">Logs: {id}</h3>
          <div className="flex gap-2">
            <button onClick={handleDownload} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Download .log</button>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
        </div>
        <div className="p-4 bg-gray-900 border-b border-gray-700">
           <input 
             type="text" 
             placeholder="Search logs..." 
             className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-300 bg-black">
          {loading ? 'Loading logs...' : filteredLogs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap mb-1">{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Servers() {
  const [servers, setServers] = useState([]);
  const [filter, setFilter] = useState(null);
  const [selectedLogsId, setSelectedLogsId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchServers();
      setServers(data);
      setLastUpdated(0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    const timer = setInterval(() => setLastUpdated(prev => prev + 1), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [load]);

  const handleRestart = async (id) => {
    if (window.confirm(`Restart container ${id}?`)) {
      try {
        await restartContainer(id);
        toast.success(`Restart initiated for ${id}`);
      } catch (err) {
        toast.error('Failed to restart');
      }
    }
  };

  const filteredServers = filter ? servers.filter(s => s.status === filter) : servers;
  
  const stats = {
    total: servers.length,
    healthy: servers.filter(s => s.status === 'healthy').length,
    warning: servers.filter(s => s.status === 'warning').length,
    down: servers.filter(s => s.status === 'down').length,
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Servers</h1>
        <span className="text-sm text-gray-400">Updated {lastUpdated}s ago</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', count: stats.total, value: null, color: 'text-white' },
          { label: 'Healthy', count: stats.healthy, value: 'healthy', color: 'text-green-400' },
          { label: 'Warning', count: stats.warning, value: 'warning', color: 'text-yellow-400' },
          { label: 'Down', count: stats.down, value: 'down', color: 'text-red-400' },
        ].map(s => (
          <button 
            key={s.label}
            onClick={() => setFilter(s.value)}
            className={`p-4 rounded-lg border bg-gray-800 transition-all ${filter === s.value ? 'border-blue-500 scale-105' : 'border-gray-700'}`}
          >
            <div className={`text-sm ${s.color}`}>{s.label}</div>
            <div className="text-3xl font-bold">{s.count}</div>
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-700/50 text-gray-400 uppercase text-xs font-bold">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">CPU</th>
              <th className="px-4 py-3">RAM</th>
              <th className="px-4 py-3">Disk</th>
              <th className="px-4 py-3">Uptime</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredServers.map(s => (
              <tr key={s.name} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3">
                   <div className={`w-3 h-3 rounded-full ${
                     s.status === 'healthy' ? 'bg-green-500 shadow-[0_0_8px_#3fb950]' :
                     s.status === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_#d29922]' :
                     'bg-red-500 shadow-[0_0_8px_#f85149]'
                   }`} />
                </td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-400">{s.role}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.ip}</td>
                <td className="px-4 py-3">
                   <div className="w-16 bg-gray-700 h-1.5 rounded overflow-hidden">
                     <div className="h-full" style={{ width: `${s.cpu}%`, backgroundColor: cpuColor(s.cpu) }} />
                   </div>
                </td>
                <td className="px-4 py-3">
                   <div className="w-16 bg-gray-700 h-1.5 rounded overflow-hidden">
                     <div className="h-full" style={{ width: `${s.ram}%`, backgroundColor: '#58a6ff' }} />
                   </div>
                </td>
                <td className="px-4 py-3">{s.disk}%</td>
                <td className="px-4 py-3 text-gray-400">{formatUptime(s.uptime)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleRestart(s.id || s.name)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Restart</button>
                    <button onClick={() => setSelectedLogsId(s.id || s.name)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Logs</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLogsId && (
        <LogsModal id={selectedLogsId} onClose={() => setSelectedLogsId(null)} />
      )}
    </div>
  );
}

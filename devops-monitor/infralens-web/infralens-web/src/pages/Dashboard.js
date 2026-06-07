import React, { useState, useEffect } from 'react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchServers, fetchAlerts, fetchPrediction, restartContainer, generateRCA } from '../services/api';
import { toast } from 'react-toastify';

const cpuColor = (v) => {
  if (v >= 80) return '#f85149';
  if (v >= 60) return '#d29922';
  return '#3fb950';
};

const ramColor = (v) => {
  if (v >= 85) return '#f85149';
  if (v >= 65) return '#d29922';
  return '#58a6ff';
};

const formatUptime = (s) => {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
      <div style={{ color: '#8b949e' }}>{label}</div>
      <div style={{ color: payload[0].color, fontWeight: 700 }}>{payload[0].value?.toFixed(1)}{unit}</div>
    </div>
  );
};

export default function Dashboard() {
  const { metrics, connectionState, rollingHistory } = useWebSocket();
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sData, aData, pData] = await Promise.all([
          fetchServers(),
          fetchAlerts(),
          fetchPrediction()
        ]);
        setServers(sData);
        setAlerts(aData);
        setPrediction(pData);
        setLastUpdated(0);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };

    loadData();
    const serverInterval = setInterval(async () => {
        const data = await fetchServers();
        setServers(data);
    }, 10000);
    const alertInterval = setInterval(async () => {
        const data = await fetchAlerts();
        setAlerts(data);
    }, 30000);
    
    const timer = setInterval(() => setLastUpdated(prev => prev + 1), 1000);

    return () => {
      clearInterval(serverInterval);
      clearInterval(alertInterval);
      clearInterval(timer);
    };
  }, []);

  const handleRestart = async (id) => {
    if (window.confirm(`Are you sure you want to restart container ${id}?`)) {
      try {
        await restartContainer(id);
        toast.success(`Container ${id} restart initiated`);
      } catch (err) {
        toast.error(`Failed to restart container ${id}`);
      }
    }
  };

  const handleGenerateRCA = async (alert) => {
    try {
      toast.info('Generating RCA...');
      const rca = await generateRCA(alert, metrics);
      alert.rca = rca.report;
      setAlerts([...alerts]);
      toast.success('RCA generated');
    } catch (err) {
      toast.error('Failed to generate RCA');
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `CPU,${metrics?.cpu_percent}%\n`
      + `RAM,${metrics?.ram_percent}%\n`
      + `Disk,${metrics?.disk_percent}%\n`
      + `Uptime,${metrics?.uptime_seconds}s`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "metrics.csv");
    document.body.appendChild(link);
    link.click();
  };

  const cpu = metrics?.cpu_percent ?? 0;
  const ram = metrics?.ram_percent ?? 0;
  const disk = metrics?.disk_percent ?? 0;
  const uptime = metrics?.uptime_seconds ?? 0;
  const alertCount = alerts.length;
  const chartData = rollingHistory.map((val, i) => ({ t: i, cpu: val }));

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Updated {lastUpdated}s ago</span>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            connectionState === 'connected' ? 'bg-green-900 text-green-400' :
            connectionState === 'reconnecting' ? 'bg-yellow-900 text-yellow-400' :
            'bg-red-900 text-red-400'
          }`}>
            {connectionState.toUpperCase()}
          </div>
          <button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <div className="text-gray-400 text-sm">CPU Usage</div>
          <div className="text-2xl font-bold" style={{ color: cpuColor(cpu) }}>{cpu.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">{servers.length} nodes active</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <div className="text-gray-400 text-sm">RAM Usage</div>
          <div className="text-2xl font-bold" style={{ color: ramColor(ram) }}>{ram.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">{(ram * 0.16).toFixed(1)} GB used</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <div className="text-gray-400 text-sm">Disk Usage</div>
          <div className="text-2xl font-bold" style={{ color: disk >= 80 ? '#f85149' : '#3fb950' }}>{disk.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">root partition</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700">
          <div className="text-gray-400 text-sm">Uptime</div>
          <div className="text-2xl font-bold text-blue-400">{formatUptime(uptime)}</div>
          <div className="text-xs text-gray-500">since last boot</div>
        </div>
      </div>

      {/* Network Row */}
      <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 mb-6 flex gap-8 text-sm">
        <div className="flex items-center gap-2">
           <span className="text-gray-400">↓ IN:</span>
           <span className="text-blue-400 font-mono">{(metrics?.network_in_kbps || 0).toFixed(1)} KB/s</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-gray-400">↑ OUT:</span>
           <span className="text-green-400 font-mono">{(metrics?.network_out_kbps || 0).toFixed(1)} KB/s</span>
        </div>
      </div>

      {/* AI Prediction Banner */}
      {prediction && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${prediction.will_overload ? 'bg-red-900/20 border-red-500' : 'bg-blue-900/20 border-blue-500'}`}>
           <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <span className="text-xl">✦</span>
                  AI Prediction
                </h3>
                <p className="mt-1 text-sm">
                  {prediction.will_overload 
                    ? `CPU overload predicted in ~${prediction.minutes_until_overload}min · Confidence ${Math.round(prediction.confidence * 100)}%`
                    : `System stable · No overload predicted · Max CPU expected: ${prediction.predicted_max_cpu?.toFixed(1)}%`
                  }
                </p>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Sparkline */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-4">CPU PERFORMANCE (20 POINTS)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="cpu" stroke="#3fb950" fillOpacity={1} fill="url(#colorCpu)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Server Health List */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-4">SERVER HEALTH</h3>
          <div className="space-y-3">
            {servers.map(s => (
              <div key={s.name} className="flex items-center gap-4 bg-gray-900/50 p-2 rounded">
                <div className={`w-3 h-3 rounded-full ${
                  s.status === 'healthy' ? 'bg-green-500 shadow-[0_0_8px_#3fb950]' :
                  s.status === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_#d29922]' :
                  'bg-red-500 shadow-[0_0_8px_#f85149]'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.role}</div>
                </div>
                <div className="w-24 bg-gray-700 h-2 rounded overflow-hidden">
                   <div className="h-full" style={{ width: `${s.cpu}%`, backgroundColor: cpuColor(s.cpu) }} />
                </div>
                <button 
                  onClick={() => handleRestart(s.id || s.name)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                >
                  Restart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-400">ACTIVE ALERTS</h3>
            <span className="text-xs bg-red-900 text-red-400 px-2 py-0.5 rounded">{alertCount} Active</span>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">✓ No active alerts detected</div>
            ) : (
              alerts.map(a => (
                <div key={a.id} className={`p-3 rounded border-l-4 ${a.severity?.toLowerCase() === 'critical' ? 'bg-red-900/10 border-red-500' : 'bg-yellow-900/10 border-yellow-500'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.description}</div>
                    </div>
                    <button 
                      onClick={() => handleGenerateRCA(a)}
                      className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/50 px-2 py-1 rounded transition-colors"
                    >
                      Generate RCA
                    </button>
                  </div>
                  {a.rca && (
                    <div className="mt-3 p-2 bg-blue-900/20 rounded border border-blue-500/30 text-xs text-blue-100 italic">
                       <strong>AI RCA:</strong> {a.rca}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

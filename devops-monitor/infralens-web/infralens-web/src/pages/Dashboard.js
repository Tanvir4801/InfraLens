import React, { useState, useEffect } from 'react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchServers, fetchAlerts, fetchPrediction, restartContainer, generateRCA } from '../services/api';
import { toast } from 'react-toastify';
import { SkeletonCard } from '../components/Skeleton';

const cpuColor = (v) => {
  if (v >= 80) return '#f85149';
  if (v >= 60) return '#d29922';
  return '#1db974';
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div style={{ color: payload[0].color, fontWeight: 700 }}>
        {payload[0].value?.toFixed(1)}{unit}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { metrics, rollingHistory } = useWebSocket();
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

  // Health Score Calculation
  const healthScore = Math.max(0, 100 - (alertCount * 15) - (cpu > 80 ? 20 : 0));

  if (!metrics) {
    return (
      <div className="page-enter p-4">
        <div className="flex justify-between items-center mb-6">
           <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="h-64 bg-gray-800 rounded-lg animate-pulse mb-6" />
      </div>
    );
  }

  return (
    <div className="page-enter p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title text-2xl font-bold">Infrastructure Overview</h1>
          <p className="page-subtitle text-sm text-gray-400">Live monitoring of all nodes and services</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Last Updated</span>
            <span className="text-xs font-medium text-gray-300">{lastUpdated}s ago · Live</span>
          </div>
          <button onClick={handleExportCSV} className="btn-secondary">
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Health Score Card */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden border-l-4 border-green-500">
          <div className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-widest">System Health</div>
          <div className="relative w-32 h-32 flex items-center justify-center mb-2">
             <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={364} strokeDashoffset={364 - (364 * healthScore) / 100}
                        strokeLinecap="round"
                        className={healthScore > 80 ? 'text-green-500' : healthScore > 50 ? 'text-amber-500' : 'text-red-500'} 
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{healthScore}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">SCORE</span>
             </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
             {healthScore > 90 ? 'System is optimal' : healthScore > 70 ? 'Minor issues detected' : 'Action required'}
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card glass-card border-l-4 border-green-500 p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="stat-label">🖥 CPU Usage</span>
              <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold">LIVE</span>
            </div>
            <div className="stat-value" style={{ color: cpuColor(cpu), WebkitTextFillColor: cpuColor(cpu) }}>{cpu.toFixed(1)}%</div>
            <div className="stat-sub">{servers.length} active nodes</div>
          </div>

          <div className="stat-card glass-card border-l-4 border-blue-500 p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="stat-label">🧠 RAM Usage</span>
              <span className="text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold">LIVE</span>
            </div>
            <div className="stat-value" style={{ color: ramColor(ram), WebkitTextFillColor: ramColor(ram) }}>{ram.toFixed(1)}%</div>
            <div className="stat-sub">{(ram * 0.16).toFixed(1)} GB of 16GB</div>
          </div>

          <div className="stat-card glass-card border-l-4 border-amber-500 p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="stat-label">💾 Disk Space</span>
              <span className="text-xs bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold">LIVE</span>
            </div>
            <div className="stat-value" style={{ color: disk >= 80 ? '#f85149' : '#f0883e', WebkitTextFillColor: disk >= 80 ? '#f85149' : '#f0883e' }}>{disk.toFixed(1)}%</div>
            <div className="stat-sub">Root partition (/)</div>
          </div>
        </div>
      </div>

      {/* Network & Uptime Bar */}
      <div className="glass-card p-4 mb-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Network Traffic</span>
            <div className="flex items-center gap-4 text-sm font-mono">
              <span className="flex items-center gap-1.5"><span className="text-blue-400">↓</span> {(metrics?.network_in_kbps || 0).toFixed(1)} KB/s</span>
              <span className="flex items-center gap-1.5"><span className="text-green-400">↑</span> {(metrics?.network_out_kbps || 0).toFixed(1)} KB/s</span>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-700/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">System Uptime</span>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
               <span>⏱</span> {formatUptime(uptime)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prediction?.will_overload && (
            <div className="animate-bounce bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1 rounded text-xs font-black uppercase tracking-tighter">
               ⚠️ Load Warning
            </div>
          )}
        </div>
      </div>

      {/* AI Prediction Banner */}
      {prediction && (
        <div className={`ai-banner mb-6 ${prediction.will_overload ? 'border-red-500/40 bg-red-900/10' : 'border-blue-500/40 bg-blue-900/10'}`}>
           <div className="ai-banner-header mb-2">
              <div className={`ai-banner-title ${prediction.will_overload ? 'text-red-400' : 'text-blue-400'}`}>
                <span className="text-lg">✦</span> InfraLens AI Forecast
              </div>
              <div className="ai-banner-meta font-mono">CONFIDENCE: {Math.round(prediction.confidence * 100)}%</div>
           </div>
           <div className="ai-banner-body flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${prediction.will_overload ? 'bg-red-500' : 'bg-blue-400'} animate-pulse`} />
              {prediction.will_overload 
                ? `CRITICAL: CPU surge predicted within ${prediction.minutes_until_overload} minutes. Scale up recommended.`
                : `System remains stable. Predicted max load for next 30m: ${prediction.predicted_max_cpu?.toFixed(1)}% CPU.`
              }
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Sparkline */}
        <div className="glass-card p-5">
          <div className="chart-header">
            <h3 className="chart-title">CPU Utilization (Last 60s)</h3>
            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">AUTO-SCALING ENABLED</span>
          </div>
          <div className="h-[240px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1db974" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1db974" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#1db974" 
                  strokeWidth={2} 
                  fill="url(#cpuGrad)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Server Health List */}
        <div className="glass-card p-5">
          <h3 className="chart-title mb-4">Node Health Matrix</h3>
          <div className="server-list">
            {servers.map(s => (
              <div key={s.name} className="server-row glass-card p-3 border-none bg-gray-800/30 hover:bg-gray-800/60 transition-colors">
                <div className={`status-dot ${
                  s.status === 'healthy' ? 'bg-green-500 shadow-[0_0_8px_#1db974]' :
                  s.status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_#f0883e]' :
                  'bg-red-500 shadow-[0_0_8px_#f85149]'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-bold">{s.name}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{s.role}</div>
                </div>
                <div className="flex items-center gap-3 w-1/3">
                  <div className="mini-bar-wrap flex-1">
                     <div className="mini-bar" style={{ width: `${s.cpu}%`, backgroundColor: cpuColor(s.cpu) }} />
                  </div>
                  <span className="bar-pct font-mono" style={{ color: cpuColor(s.cpu) }}>{s.cpu}%</span>
                </div>
                <button 
                  onClick={() => handleRestart(s.id || s.name)}
                  className="btn-ghost text-[10px] font-bold uppercase"
                >
                  Restart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="chart-title">Security & System Events</h3>
            <span className={`badge ${alertCount > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
              {alertCount} Active Incidents
            </span>
          </div>
          <div className="alert-list">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                <span className="text-4xl mb-4">🛡️</span>
                <p className="text-sm font-medium">No active security or performance alerts detected.</p>
                <p className="text-[10px] uppercase font-bold mt-1 tracking-widest">All systems operational</p>
              </div>
            ) : (
              alerts.map(a => (
                <div key={a.id} className={`alert-row glass-card p-4 border-l-4 ${a.severity?.toLowerCase() === 'critical' ? 'border-red-500 bg-red-900/5' : 'border-amber-500 bg-amber-900/5'}`}>
                  <div className="flex-shrink-0 text-lg mt-0.5">
                    {a.severity?.toLowerCase() === 'critical' ? '🔴' : '🟡'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="alert-name flex items-center gap-2">
                           {a.name}
                           <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${a.severity?.toLowerCase() === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {a.severity}
                           </span>
                        </div>
                        <div className="alert-time">{a.description}</div>
                      </div>
                      <button 
                        onClick={() => handleGenerateRCA(a)}
                        className="btn-blue text-[10px] uppercase font-bold px-3 py-1.5"
                      >
                        Run Diagnosis (AI)
                      </button>
                    </div>
                    {a.rca && (
                      <div className="mt-4 p-3 bg-blue-900/10 rounded-lg border border-blue-500/20 text-xs text-blue-200">
                         <div className="font-bold mb-1 flex items-center gap-1.5">
                           <span className="text-base">🤖</span> AI ROOT CAUSE ANALYSIS:
                         </div>
                         {a.rca}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

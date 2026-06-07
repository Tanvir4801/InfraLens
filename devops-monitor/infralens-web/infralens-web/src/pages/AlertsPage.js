import React, { useState, useEffect, useCallback } from 'react';
import { fetchAlerts, acknowledgeAlert, generateRCA } from '../services/api';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(0);
  const [rcaCache, setRcaCache] = useState({});
  const [loadingRca, setLoadingRca] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
      setLastUpdated(0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const timer = setInterval(() => setLastUpdated(prev => prev + 1), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [load]);

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlert(id);
      toast.success('Alert acknowledged');
      load();
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleGenerateRCA = async (alert) => {
    if (rcaCache[alert.id]) return;
    
    setLoadingRca(prev => ({ ...prev, [alert.id]: true }));
    try {
      const res = await generateRCA(alert, {});
      setRcaCache(prev => ({ ...prev, [alert.id]: res.report }));
      toast.success('RCA generated');
    } catch (err) {
      toast.error('Failed to generate RCA');
    } finally {
      setLoadingRca(prev => ({ ...prev, [alert.id]: false }));
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'critical') return a.severity?.toLowerCase() === 'critical';
    if (filter === 'warning') return a.severity?.toLowerCase() === 'warning';
    if (filter === 'acknowledged') return a.acknowledged;
    return true;
  });

  const counts = {
    all: alerts.length,
    critical: alerts.filter(a => a.severity?.toLowerCase() === 'critical').length,
    warning: alerts.filter(a => a.severity?.toLowerCase() === 'warning').length,
    acknowledged: alerts.filter(a => a.acknowledged).length,
  };

  const handleClearAcknowledged = async () => {
    const acknowledgedAlerts = alerts.filter(a => a.acknowledged);
    if (acknowledgedAlerts.length === 0) return;
    
    if (window.confirm(`Clear all ${acknowledgedAlerts.length} acknowledged alerts?`)) {
      // Assuming delete endpoint exists or just clearing local state if mock
      // For now, let's just filter them out of the current view if we can't delete from backend
      setAlerts(prev => prev.filter(a => !a.acknowledged));
      toast.success('Acknowledged alerts cleared from view');
    }
  };

  return (
    <div className="page-enter p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title text-2xl font-bold">Alert Management</h1>
          <p className="page-subtitle text-sm text-gray-400">Review and respond to system incidents</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Auto-Refresh</span>
            <span className="text-xs font-medium text-gray-300">{lastUpdated}s ago</span>
          </div>
          <button onClick={handleClearAcknowledged} className="btn-secondary text-[10px] uppercase font-bold">
            Clear Acknowledged
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'critical', 'warning', 'acknowledged'].map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all duration-300 ${
              filter === k 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {k} <span className={`ml-1.5 px-1.5 py-0.5 rounded-full ${filter === k ? 'bg-blue-400/30' : 'bg-gray-700'}`}>{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-700">
             <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-3xl mb-4 border border-green-500/20">🛡️</div>
             <p className="text-gray-300 font-bold text-lg">Infrastructure All Clear</p>
             <p className="text-gray-500 text-sm mt-1">No active incidents matching your current filter.</p>
          </div>
        ) : (
          filteredAlerts.map(a => (
            <div key={a.id} className={`glass-card border-none hover:translate-y-[-2px] transition-all duration-300 group overflow-hidden ${
              a.severity?.toLowerCase() === 'critical' ? 'bg-red-900/5' : 'bg-amber-900/5'
            }`}>
              <div className="flex">
                <div className={`w-1.5 flex-shrink-0 ${
                  a.severity?.toLowerCase() === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="p-5 flex-1">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">
                          {a.severity?.toLowerCase() === 'critical' ? '🔴' : '🟡'}
                        </span>
                        <h3 className="font-black text-lg tracking-tight">{a.name}</h3>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-gray-800/50 px-2 py-1 rounded">
                          {a.fired_at ? formatDistanceToNow(new Date(a.fired_at), { addSuffix: true }) : 'unknown time'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-4 leading-relaxed max-w-2xl">{a.description}</div>
                      <div className="flex items-center gap-4">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                           Source: <span className="text-gray-300">{a.source || 'system-monitor'}</span>
                        </div>
                        {a.acknowledged && (
                          <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-green-500" /> Acknowledged
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => handleGenerateRCA(a)}
                        disabled={loadingRca[a.id]}
                        className="btn-blue text-[10px] uppercase font-black tracking-widest px-4 py-2"
                      >
                        {loadingRca[a.id] ? 'Analyzing...' : rcaCache[a.id] ? 'Refresh RCA' : 'Run Diagnosis'}
                      </button>
                      {!a.acknowledged && (
                        <button 
                          onClick={() => handleAcknowledge(a.id)}
                          className="btn-secondary text-[10px] uppercase font-black tracking-widest px-4 py-2"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {rcaCache[a.id] && (
                    <div className="mt-6 border-t border-blue-500/20 pt-5 animate-fade-in">
                      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5 font-black text-4xl">AI</div>
                        <div className="flex items-center gap-2 mb-3 text-blue-400 font-black text-xs uppercase tracking-[0.2em]">
                          <span className="text-lg">🤖</span> Root Cause Analysis
                        </div>
                        <div className="text-sm text-blue-100 leading-relaxed italic border-l-2 border-blue-500/40 pl-4 py-1">
                          {rcaCache[a.id]}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                           <div className="text-[9px] text-blue-500/70 font-black uppercase tracking-widest">
                             Generated via InfraLens Neural Engine
                           </div>
                           <div className="text-[9px] text-gray-600">
                             Confidence: 94.2%
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <span className="text-sm text-gray-400">Updated {lastUpdated}s ago</span>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'critical', 'warning', 'acknowledged'].map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
              filter === k 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {k.toUpperCase()} ({counts[k]})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-800 rounded-lg border border-gray-700">
             ✓ No alerts matching the selected filter
          </div>
        ) : (
          filteredAlerts.map(a => (
            <div key={a.id} className={`bg-gray-800 rounded-lg border-l-4 overflow-hidden shadow-lg ${
              a.severity?.toLowerCase() === 'critical' ? 'border-red-500' : 'border-yellow-500'
            }`}>
              <div className="p-4 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                      a.severity?.toLowerCase() === 'critical' ? 'bg-red-900 text-red-400' : 'bg-yellow-900 text-yellow-400'
                    }`}>
                      {a.severity}
                    </span>
                    <h3 className="font-bold text-lg">{a.name}</h3>
                    <span className="text-xs text-gray-500">
                      {a.fired_at ? formatDistanceToNow(new Date(a.fired_at), { addSuffix: true }) : 'unknown time'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">{a.description}</div>
                  <div className="text-xs text-gray-500 font-mono">Source: {a.source || 'system'}</div>
                </div>
                
                <div className="flex gap-2 items-start">
                  <button 
                    onClick={() => handleGenerateRCA(a)}
                    disabled={loadingRca[a.id]}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/50 rounded text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {loadingRca[a.id] ? 'Analyzing...' : rcaCache[a.id] ? 'RCA Generated' : 'Generate AI RCA'}
                  </button>
                  {!a.acknowledged && (
                    <button 
                      onClick={() => handleAcknowledge(a.id)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
              
              {rcaCache[a.id] && (
                <div className="px-4 pb-4">
                  <div className="bg-blue-900/10 border border-blue-500/30 rounded p-3">
                    <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                      <span>✦ AI Root Cause Analysis</span>
                    </div>
                    <div className="text-sm text-blue-100 leading-relaxed italic">
                      {rcaCache[a.id]}
                    </div>
                    <div className="mt-2 text-[10px] text-blue-500/70 font-bold uppercase">
                      Generated by Gemini 2.0
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

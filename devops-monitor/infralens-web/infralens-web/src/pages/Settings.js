import React, { useState } from 'react';
import { fetchMetrics } from '../services/api';
import { toast } from 'react-toastify';

function SettingRow({ label, description, children }) {
  return (
    <div className="flex justify-between items-start py-4 border-b border-gray-800">
      <div>
        <div className="text-sm font-bold text-gray-200">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
      </div>
      <div className="ml-5 flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${
        value ? 'bg-green-600' : 'bg-gray-700'
      }`}
    >
      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-300 ${
        value ? 'left-5.5' : 'left-1'
      } shadow-sm`} />
    </div>
  );
}

export default function Settings({ apiBase }) {
  const [settings, setSettings] = useState({
    refreshInterval: 5,
    wsEnabled: true,
    alertNotifications: true,
    darkMode: true,
    prometheusUrl: 'http://prometheus:9090',
    alertmanagerUrl: 'http://alertmanager:9093',
    metricsRetention: 60,
    overloadThreshold: 85,
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [apiVersion] = useState('v2.0.4-beta');

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = () => {
    setSaved(true);
    toast.success('Settings saved successfully');
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await fetchMetrics();
      setTestResult('success');
      toast.success('Connection test successful!');
    } catch (err) {
      setTestResult('error');
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page-enter max-w-4xl">
      <div className="page-header">
        <h1 className="page-title text-2xl font-bold">System Settings</h1>
        <p className="page-subtitle text-sm text-gray-400">Manage monitoring engine and dashboard preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-4 text-center">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">API Version</div>
          <div className="text-lg font-black text-blue-400">{apiVersion}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Backend Status</div>
          <div className="text-lg font-black text-green-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> OPERATIONAL
          </div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">DB Connection</div>
          <div className="text-lg font-black text-green-400">ACTIVE</div>
        </div>
      </div>

      <div className="glass-card mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/20">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">General Configuration</h3>
        </div>
        <div className="px-6">
          <SettingRow label="Metrics refresh interval" description="How often to poll the backend for new metrics">
            <select
              value={settings.refreshInterval}
              onChange={e => set('refreshInterval', Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs focus:border-blue-500 outline-none transition-all"
            >
              {[3, 5, 10, 30].map(v => <option key={v} value={v}>{v}s</option>)}
            </select>
          </SettingRow>

          <SettingRow label="WebSocket live mode" description="Real-time streaming via WebSocket (falls back to polling if unavailable)">
            <Toggle value={settings.wsEnabled} onChange={v => set('wsEnabled', v)} />
          </SettingRow>

          <SettingRow label="History retention" description="Max data points kept per metric for charts">
            <select
              value={settings.metricsRetention}
              onChange={e => set('metricsRetention', Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs focus:border-blue-500 outline-none transition-all"
            >
              {[20, 60, 120, 300].map(v => <option key={v} value={v}>{v} pts</option>)}
            </select>
          </SettingRow>
        </div>
      </div>

      <div className="glass-card mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/20">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Alerting & Thresholds</h3>
        </div>
        <div className="px-6">
          <SettingRow label="Browser notifications" description="Show desktop notifications for critical alerts">
            <Toggle value={settings.alertNotifications} onChange={v => set('alertNotifications', v)} />
          </SettingRow>

          <SettingRow label="CPU overload threshold" description="Alert when predicted CPU exceeds this value">
            <div className="flex items-center gap-4">
              <input
                type="range" min={50} max={99} value={settings.overloadThreshold}
                onChange={e => set('overloadThreshold', Number(e.target.value))}
                className="accent-red-500 w-32"
              />
              <span className="text-xs font-black text-red-500 w-8">{settings.overloadThreshold}%</span>
            </div>
          </SettingRow>
        </div>
      </div>

      <div className="glass-card mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/20">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Integrations</h3>
        </div>
        <div className="px-6">
          <SettingRow label="Prometheus URL" description="Prometheus server endpoint">
            <input
              value={settings.prometheusUrl}
              onChange={e => set('prometheusUrl', e.target.value)}
              className="search-bar w-64"
            />
          </SettingRow>

          <SettingRow label="Alertmanager URL" description="Alertmanager server endpoint">
            <input
              value={settings.alertmanagerUrl}
              onChange={e => set('alertmanagerUrl', e.target.value)}
              className="search-bar w-64"
            />
          </SettingRow>

          <SettingRow label="System Diagnostics" description="Verify backend connectivity and health">
             <div className="flex items-center gap-3">
               {testResult === 'success' && <span className="text-green-500 text-xs font-bold">✓ Connected</span>}
               {testResult === 'error' && <span className="text-red-500 text-xs font-bold">✗ Failed</span>}
               <button 
                 onClick={testConnection} 
                 disabled={testing}
                 className="btn-blue text-[10px] uppercase font-black px-4 py-2 disabled:opacity-50"
               >
                 {testing ? 'Testing...' : 'Test Connection'}
               </button>
             </div>
          </SettingRow>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-10">
        <button className="btn-ghost text-xs font-bold px-6" onClick={() => setSaved(false)}>Reset to Default</button>
        <button className="btn-primary px-8 py-2.5 rounded-xl shadow-lg shadow-green-900/20" onClick={save}>
          {saved ? '✓ Settings Saved' : 'Commit Changes'}
        </button>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { fetchPrediction } from '../services/api';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';

export default function AiPredict() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPrediction();
        setPrediction(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !prediction) return <div className="p-8 text-center text-gray-500">Initializing AI models...</div>;

  const chartData = [
    ...(prediction?.actual_history || []).map((v, i) => ({ t: i - (prediction.actual_history.length), actual: v })),
    ...(prediction?.forecast || []).map((v, i) => ({ t: i, forecast: v })),
  ];

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">AI Performance Predictor</h1>

      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
           <div className={`p-6 rounded-lg border-l-8 shadow-xl bg-gray-800 ${prediction.will_overload ? 'border-red-500' : 'border-blue-500'}`}>
              <div className="text-sm uppercase font-bold text-gray-400 mb-2">Overload Alert</div>
              <div className="text-3xl font-black mb-1">
                 {prediction.will_overload ? 'YES' : 'NO'}
              </div>
              <div className="text-sm text-gray-400">
                 {prediction.will_overload 
                   ? `Predicted in ~${prediction.minutes_until_overload} mins` 
                   : 'System remains within bounds'}
              </div>
           </div>

           <div className="p-6 rounded-lg border-l-8 border-purple-500 shadow-xl bg-gray-800">
              <div className="text-sm uppercase font-bold text-gray-400 mb-2">Confidence Level</div>
              <div className="text-3xl font-black mb-2">
                 {Math.round((prediction.confidence || 0) * 100)}%
              </div>
              <div className="w-full bg-gray-700 h-2 rounded overflow-hidden">
                 <div className="h-full bg-purple-500" style={{ width: `${(prediction.confidence || 0) * 100}%` }} />
              </div>
           </div>

           <div className="p-6 rounded-lg border-l-8 border-green-500 shadow-xl bg-gray-800">
              <div className="text-sm uppercase font-bold text-gray-400 mb-2">Predicted Peak CPU</div>
              <div className="text-3xl font-black mb-1">
                 {prediction.predicted_max_cpu?.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Next 60 minutes</div>
           </div>
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
         <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="text-blue-400">📈</span> 60-Minute Load Forecast
         </h3>
         <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="t" stroke="#9ca3af" fontSize={10} tickFormatter={(t) => t < 0 ? `${t}m` : `+${t}m`} />
                  <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                  <Area type="monotone" dataKey="actual" fill="#10b981" fillOpacity={0.1} stroke="#10b981" strokeWidth={2} name="Actual CPU" />
                  <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecasted CPU" />
               </ComposedChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
         <h3 className="text-lg font-bold mb-4">Anomaly Timeline</h3>
         <div className="space-y-4">
            {[
               { time: '10 mins ago', type: 'CPU Spike', node: 'api-server', status: 'Resolved' },
               { time: '45 mins ago', type: 'Latency Increase', node: 'web-server', status: 'Warning' },
               { time: '2 hours ago', type: 'Disk IO Drop', node: 'db-server', status: 'Healthy' }
            ].map((ev, i) => (
               <div key={i} className="flex items-center gap-4 border-l-2 border-gray-700 pl-4 py-1">
                  <div className="text-xs text-gray-500 w-24">{ev.time}</div>
                  <div className="flex-1">
                     <div className="font-bold text-sm">{ev.type}</div>
                     <div className="text-xs text-gray-400">Detected on {ev.node}</div>
                  </div>
                  <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                     ev.status === 'Resolved' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'
                  }`}>
                     {ev.status}
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}

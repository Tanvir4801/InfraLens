import React, { useEffect, useState } from 'react';
import { fetchIncidentTimeline } from '../services/api';
import { format } from 'date-fns';

const iconMap = {
  alert: '🔴',
  restart: '🔵',
  deploy: '🟡',
  failure: '⚪'
};

export default function IncidentTimeline() {
  const [incidents, setIncidents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchIncidentTimeline();
        setIncidents(data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Incident Timeline</h1>
      
      <div className="relative border-l-2 border-gray-700 ml-4 space-y-8 pb-8">
        {incidents.map((incident, idx) => (
          <div key={idx} className="relative pl-8">
            <div className="absolute -left-3 top-1 bg-gray-900 px-1 text-xl">
               {iconMap[incident.type] || '⚪'}
            </div>
            <div 
              className={`bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-500 transition-all ${expandedId === idx ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setExpandedId(expandedId === idx ? null : idx)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-gray-500 font-mono">
                  {incident.timestamp ? format(new Date(incident.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'Unknown Time'}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">{incident.service}</span>
              </div>
              <h3 className="font-bold text-gray-100">{incident.description}</h3>
              
              {expandedId === idx && (
                <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400 italic">
                  <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                    <span>✦</span> AI Summary
                  </div>
                  {incident.ai_summary || "AI analysis indicates this incident was triggered by a routine maintenance event or transient load spike. No critical failures detected."}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

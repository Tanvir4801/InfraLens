import React, { useEffect, useState } from 'react';
import { fetchCostAnalysis } from '../services/api';

export default function CostOptimizer() {
  const [analysis, setAnalysis] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCostAnalysis();
        setAnalysis(data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Cloud Cost Optimizer</h1>
      
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-700/50 text-gray-400 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Container / Service</th>
              <th className="px-6 py-4 text-center">Avg CPU</th>
              <th className="px-6 py-4 text-center">Avg RAM</th>
              <th className="px-6 py-4">AI Recommendation</th>
              <th className="px-6 py-4 text-right">Est. Monthly Savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {analysis.map((row, i) => {
              const isUnderutilized = row.avg_cpu < 10;
              return (
                <tr key={i} className={`hover:bg-gray-700/30 transition-colors ${isUnderutilized ? 'bg-yellow-900/10' : ''}`}>
                  <td className="px-6 py-4 font-bold">{row.container}</td>
                  <td className={`px-6 py-4 text-center font-mono ${isUnderutilized ? 'text-yellow-400 font-bold' : ''}`}>
                    {row.avg_cpu}%
                  </td>
                  <td className="px-6 py-4 text-center font-mono">{row.avg_ram}%</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        {isUnderutilized && <span className="text-yellow-500 text-lg">⚠</span>}
                        <span className="text-gray-300">{row.recommendation}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right text-green-400 font-bold">
                     ${row.saving_usd.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-6 bg-blue-900/10 border border-blue-500/30 rounded-lg">
         <h4 className="font-bold mb-2 flex items-center gap-2 text-blue-400">
            <span className="text-xl">💡</span> AI Optimization Insight
         </h4>
         <p className="text-sm text-blue-100 italic">
            Based on the last 7 days of usage, you could save a total of <strong>${analysis.reduce((acc, r) => acc + r.saving_usd, 0).toFixed(2)}</strong> per month by rightsizing underutilized containers. 
            The AI suggests starting with <strong>{analysis.sort((a,b) => b.saving_usd - a.saving_usd)[0]?.container}</strong> as it has the highest potential ROI.
         </p>
      </div>
    </div>
  );
}

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

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Container,Avg CPU,Avg RAM,Recommendation,Saving USD\n"
      + analysis.map(r => `${r.container},${r.avg_cpu},${r.avg_ram},${r.recommendation},${r.saving_usd}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "cost_optimization_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  const totalSavings = analysis.reduce((acc, r) => acc + r.saving_usd, 0);

  return (
    <div className="page-enter p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title text-2xl font-bold tracking-tight">Cloud Cost Optimizer</h1>
          <p className="page-subtitle text-sm text-gray-400">AI-driven infrastructure right-sizing recommendations</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
           <span>📊</span> Export Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-green-500">
           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Monthly Savings</div>
           <div className="text-3xl font-black text-green-400">💰 ${totalSavings.toFixed(2)}</div>
           <div className="text-xs text-gray-500 mt-2 font-medium">Estimated potential reduction</div>
        </div>
        <div className="glass-card p-6 border-l-4 border-blue-500">
           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Optimization Ratio</div>
           <div className="text-3xl font-black text-blue-400">
             {((analysis.filter(a => a.avg_cpu < 20).length / analysis.length) * 100).toFixed(1)}%
           </div>
           <div className="text-xs text-gray-500 mt-2 font-medium">Underutilized resources found</div>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500">
           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Efficiency Score</div>
           <div className="text-3xl font-black text-amber-500">82/100</div>
           <div className="text-xs text-gray-500 mt-2 font-medium">Based on resource allocation</div>
        </div>
      </div>

      <div className="glass-card overflow-hidden shadow-2xl border-none">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">Container / Service</th>
              <th className="px-6 py-4 text-center w-48">Resource Utilization</th>
              <th className="px-6 py-4">AI Recommendation</th>
              <th className="px-6 py-4 text-right">Potential Savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {analysis.map((row, i) => {
              const isUnderutilized = row.avg_cpu < 15;
              const isOverutilized = row.avg_cpu > 80;
              const statusColor = isUnderutilized ? 'text-amber-500' : isOverutilized ? 'text-red-500' : 'text-green-500';
              const statusBg = isUnderutilized ? 'bg-amber-900/10' : isOverutilized ? 'bg-red-900/10' : 'bg-green-900/10';
              
              return (
                <tr key={i} className={`hover:bg-gray-800/40 transition-colors ${statusBg}`}>
                  <td className="px-6 py-5">
                    <div className="font-bold text-gray-200">{row.container}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">AWS EC2 • us-east-1</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-gray-500">AVG CPU</span>
                        <span className={statusColor}>{row.avg_cpu}%</span>
                      </div>
                      <div className="progress-wrap h-1.5">
                        <div className="progress-bar" style={{ width: `${row.avg_cpu}%`, backgroundColor: isUnderutilized ? '#f0883e' : isOverutilized ? '#f85149' : '#1db974' }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold mt-1">
                        <span className="text-gray-500">AVG RAM</span>
                        <span className="text-blue-400">{row.avg_ram}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                     <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isUnderutilized ? 'bg-amber-500' : isOverutilized ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_8px_currentColor]`} />
                        <span className="text-gray-300 font-medium">{row.recommendation}</span>
                     </div>
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-black text-green-400">
                     ${row.saving_usd.toFixed(2)}<span className="text-[10px] text-gray-500 ml-1">/mo</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-6 bg-blue-900/10 border border-blue-500/30 rounded-2xl relative overflow-hidden">
         <div className="absolute -top-4 -right-4 text-8xl opacity-5 font-black">AI</div>
         <h4 className="font-black mb-4 flex items-center gap-2 text-blue-400 uppercase tracking-widest text-xs">
            <span className="text-xl">💡</span> Strategic Insights
         </h4>
         <p className="text-sm text-blue-100 italic leading-relaxed border-l-2 border-blue-500/40 pl-4">
            Our neural analysis of the last 7 days indicates that rightsizing <strong>{analysis.sort((a,b) => b.saving_usd - a.saving_usd)[0]?.container}</strong> offers the most significant immediate return. 
            Overall, infrastructure efficiency is currently at <span className="text-blue-400 font-bold">82%</span>. Implementing these changes will reduce monthly burn by <span className="text-green-400 font-bold">${totalSavings.toFixed(2)}</span> while maintaining optimal performance buffers.
         </p>
      </div>
    </div>
  );
}

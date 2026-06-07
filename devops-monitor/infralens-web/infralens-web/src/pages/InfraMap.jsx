import React, { useEffect, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchTopology } from '../services/api';

const nodeStyles = {
  healthy: { background: 'rgba(22, 27, 34, 0.8)', color: '#fff', border: '1px solid #1db974', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
  warning: { background: 'rgba(22, 27, 34, 0.8)', color: '#fff', border: '1px solid #f0883e', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
  down: { background: 'rgba(22, 27, 34, 0.8)', color: '#fff', border: '1px solid #f85149', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
};

export default function InfraMap() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTopology();
        const flowNodes = data.nodes.map((n, i) => ({
          id: n.id,
          data: { label: n.label, type: n.type, status: n.status },
          position: { x: (i % 3) * 300, y: Math.floor(i / 3) * 200 },
          style: nodeStyles[n.status] || nodeStyles.healthy,
          className: 'font-bold p-4'
        }));
        setNodes(flowNodes);
        setEdges(data.edges.map(e => ({
          ...e,
          animated: true,
          style: { stroke: '#4b5563', strokeWidth: 2 }
        })));
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const onNodeClick = (event, node) => {
    setSelectedNode(node.data);
  };

  return (
    <div className="page-enter flex h-[calc(100vh-48px-48px)] bg-gray-900 text-white overflow-hidden rounded-xl border border-gray-800">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#374151" gap={20} variant="dots" />
          <Controls className="bg-gray-800 border-gray-700 fill-white" />
          <MiniMap 
            nodeColor={(n) => {
              if (n.data?.status === 'healthy') return '#1db974';
              if (n.data?.status === 'warning') return '#f0883e';
              if (n.data?.status === 'down') return '#f85149';
              return '#30363d';
            }} 
            maskColor="rgba(0,0,0,0.6)"
            className="bg-gray-800 border-gray-700"
          />
        </ReactFlow>
        
        {/* Legend */}
        <div className="absolute bottom-4 right-20 glass-card p-3 flex flex-col gap-2 text-[10px] font-bold uppercase tracking-widest z-10 border border-gray-700/50">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1db974]" /> Healthy
           </div>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f0883e]" /> Warning
           </div>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f85149]" /> Down
           </div>
        </div>
      </div>
      
      {selectedNode && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-auto">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold">{selectedNode.label}</h2>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">&times;</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold">Type</label>
              <div className="text-sm">{selectedNode.type}</div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold">Status</label>
              <div className={`text-sm font-bold ${
                selectedNode.status === 'healthy' ? 'text-green-400' : 
                selectedNode.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {selectedNode.status?.toUpperCase()}
              </div>
            </div>
            <div className="pt-4 border-t border-gray-700">
               <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm font-bold transition-colors">
                  View Service Details
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

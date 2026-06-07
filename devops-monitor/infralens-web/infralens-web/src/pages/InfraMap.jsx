import React, { useEffect, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchTopology } from '../services/api';

const nodeStyles = {
  healthy: { background: '#065f46', color: '#fff', border: '1px solid #059669' },
  warning: { background: '#92400e', color: '#fff', border: '1px solid #d97706' },
  down: { background: '#991b1b', color: '#fff', border: '1px solid #dc2626' },
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
          position: { x: (i % 3) * 250, y: Math.floor(i / 3) * 150 },
          style: nodeStyles[n.status] || nodeStyles.healthy,
          className: 'rounded-lg font-bold p-4'
        }));
        setNodes(flowNodes);
        setEdges(data.edges.map(e => ({
          ...e,
          animated: true,
          style: { stroke: '#4b5563' }
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
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#374151" gap={20} />
          <Controls />
          <MiniMap nodeColor={(n) => n.style?.background || '#eee'} />
        </ReactFlow>
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

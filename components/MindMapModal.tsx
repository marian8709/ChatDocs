/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useMemo, useCallback } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import { X, ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react';
import { MindMapData } from '../types';

interface MindMapModalProps {
  data: MindMapData | null;
  onClose: () => void;
  isOpen: boolean;
}

// Custom Node Component for a modern glassmorphism look
const CustomNode = ({ data }: { data: { label: string; details?: string; depth: number } }) => {
  const isRoot = data.depth === 0;
  
  return (
    <div className={`
      relative px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300
      ${isRoot 
        ? 'bg-blue-600/90 border-blue-400 text-white min-w-[150px] text-center' 
        : 'bg-neutral-900/80 border-white/10 hover:border-blue-500/50 hover:bg-neutral-800/90 text-neutral-200 min-w-[120px]'
      }
    `}>
      <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-2 !h-2 !border-none" />
      <div className={`font-semibold ${isRoot ? 'text-lg' : 'text-sm'}`}>
        {data.label}
      </div>
      {data.details && !isRoot && (
        <div className="text-[10px] text-neutral-400 mt-1 leading-tight max-w-[180px]">
          {data.details}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2 !h-2 !border-none" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const MindMapModal: React.FC<MindMapModalProps> = ({ data, onClose, isOpen }) => {
  if (!isOpen || !data) return null;

  // Transform hierarchical JSON to React Flow Nodes & Edges with a simple tree layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let nodeIdCounter = 0;
    
    // Recursive function to position nodes
    const traverse = (
      item: MindMapData, 
      parentId: string | null, 
      depth: number, 
      x: number, 
      y: number, 
      verticalSpacing: number
    ): number => { // returns the next available Y position
      
      const currentId = `node-${nodeIdCounter++}`;
      
      nodes.push({
        id: currentId,
        type: 'custom',
        data: { label: item.label, details: item.details, depth },
        position: { x, y },
      });

      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: 'smoothstep', // 'bezier' or 'smoothstep'
          animated: true,
          style: { stroke: depth === 1 ? '#3b82f6' : '#52525b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: depth === 1 ? '#3b82f6' : '#52525b' },
        });
      }

      let currentY = y;
      const childX = x + 250 + (depth * 20); // Horizontal spacing increases slightly

      if (item.children && item.children.length > 0) {
        // Calculate starting Y for children to center them relative to parent
        // Just simple stacking for now:
        const childVerticalSpacing = verticalSpacing / (depth + 1); 
        // Actually, let's just stack them linearly for simplicity and robustness
        
        item.children.forEach((child, index) => {
           // Provide enough space for sub-trees
           const nextY = traverse(child, currentId, depth + 1, childX, currentY, verticalSpacing);
           // The parent should ideally be centered, but standard tree layout logic is complex.
           // We will shift currentY down based on the subtree size returned.
           currentY = nextY + 20; // 20px padding between subtrees
        });
        
        // Re-center parent? (Optional optimization)
        // Would need a second pass or bottom-up approach. Keeping it simple top-down for now.
        return currentY;
      } else {
        return y + 80; // Leaf node height + padding
      }
    };

    traverse(data, null, 0, 0, 0, 100);

    return { nodes, edges };
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full h-[90vh] bg-[#09090b] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#09090b]/50 absolute top-0 left-0 right-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3 pl-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/40">
              <Maximize size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Mind Map</h2>
              <p className="text-xs text-neutral-400">Generated from Knowledge Base</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Graph Area */}
        <div className="flex-grow w-full h-full bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
          <ReactFlow
            defaultNodes={initialNodes}
            defaultEdges={initialEdges}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
            minZoom={0.1}
            maxZoom={4}
            className="bg-transparent"
          >
            <Background color="#27272a" gap={20} size={1} />
            <Controls className="bg-neutral-800 border-neutral-700 fill-white text-white" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default MindMapModal;

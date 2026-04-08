import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { initialNodes, initialEdges } from '../lib/initial-data';
import { nodeTypes } from './CustomNodes';
import { edgeTypes } from './CustomEdges';
import { TopHeader } from './TopHeader';
import { FloatingUI } from './FloatingUI';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';

import { useWorkflowStore } from '../store/workflow.store';

let id = 0;
const getId = () => `dndnode_${id++}`;

function EditorContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const isLocked = useWorkflowStore((state) => state.isLocked);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (isLocked) return;
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, isLocked]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (isLocked) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    event.dataTransfer.dropEffect = 'move';
  }, [isLocked]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (isLocked) return;

      const type = event.dataTransfer.getData('application/reactflow/type');
      const dataStr = event.dataTransfer.getData('application/reactflow/data');

      if (typeof type === 'undefined' || !type) return;

      const metadata = dataStr ? JSON.parse(dataStr) : {};
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: metadata,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, isLocked]
  );

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary w-full h-screen overflow-hidden relative">
      <TopHeader />
      <Sidebar />
      <main className="ml-64 pt-16 h-full relative overflow-hidden flex">
        <div className="flex-1 canvas-grid relative overflow-hidden bg-surface" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes as any}
            edgeTypes={edgeTypes as any}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            elementsSelectable={!isLocked}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={32} 
              size={1} 
              color="transparent" // Relies on our CSS background
            />
          </ReactFlow>
          <FloatingUI />
        </div>
        <RightPanel />
      </main>
    </div>
  );
}

export default function N8nApp() {
  return (
    <ReactFlowProvider>
      <EditorContent />
    </ReactFlowProvider>
  );
}

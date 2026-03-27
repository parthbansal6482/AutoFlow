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

import { initialNodes, initialEdges } from './lib/initial-data';
import { nodeTypes } from './components/CustomNodes';
import { edgeTypes } from './components/CustomEdges';
import { TopHeader } from './components/TopHeader';
import { FloatingUI } from './components/FloatingUI';
import { Sidebar } from './components/Sidebar';

let id = 0;
const getId = () => `dndnode_${id++}`;

function EditorContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

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
    [screenToFlowPosition, setNodes]
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-stitch-dark font-sans flex flex-col relative">
      <TopHeader />
      
      {/* Main UI */}
      <div className="flex-1 flex overflow-hidden pt-14 flex-row relative">
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={1.5}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={16} 
              size={1} 
              color="rgba(255,255,255,0.06)"
            />
          </ReactFlow>
          <FloatingUI />
        </div>
        {/* Node Sidebar */}
        <Sidebar />
      </div>
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

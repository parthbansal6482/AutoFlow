// apps/web/src/pages/Editor.tsx
import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node as FlowNode,
  Panel,
  OnSelectionChangeParams
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import MonacoEditor from '@monaco-editor/react'
import { useWorkflow, useUpdateWorkflow } from '../hooks/use-workflows'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
// We will create this local registry next
import { nodeTypes, createNodeData } from '../lib/flow-nodes'

// Generate a random 6-char ID
const genId = () => Math.random().toString(36).substring(2, 8)

function EditorContent() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workflow, isLoading, error } = useWorkflow(id!)
  const updateWorkflow = useUpdateWorkflow()

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  
  const [workflowName, setWorkflowName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  
  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    setSelectedNodes(nodes.map((n: FlowNode) => n.id))
  }, [])

  // Initialize flow from database workflow
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name)
      
      // Map DB nodes to React Flow nodes
      const flowNodes: FlowNode[] = workflow.nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          label: n.name,
          parameters: n.parameters,
          type: n.type,
        }
      }))
      
      // Map DB connections to React Flow edges
      const flowEdges: Edge[] = workflow.connections.map(c => ({
        id: `e-${c.source_node_id}-${c.target_node_id}`,
        source: c.source_node_id,
        target: c.target_node_id,
        sourceHandle: c.source_output,
        targetHandle: c.target_input,
        type: 'smoothstep',
        animated: true,
      }))
      
      setNodes(flowNodes)
      setEdges(flowEdges)
    }
  }, [workflow, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds: Edge[]) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)),
    [setEdges],
  )

  const handleSave = async () => {
    if (!workflow) return
    setIsSaving(true)
    
    try {
      // Map back to DB format
      const dbNodes = nodes.map((n: FlowNode) => ({
        id: n.id,
        type: n.data.type as string,
        name: n.data.label as string,
        position: n.position,
        parameters: n.data.parameters as Record<string, unknown>,
        credential_id: n.data.credential_id as string | undefined,
      }))
      
      // We assume React Flow handles are strings of the format 'main', 'error', etc.
      const dbConnections = edges.map((e: Edge) => ({
        source_node_id: e.source,
        source_output: e.sourceHandle || 'main',
        target_node_id: e.target,
        target_input: e.targetHandle || 'main'
      }))
      
      await updateWorkflow.mutateAsync({
        id: workflow.id,
        updates: {
          name: workflowName,
          nodes: dbNodes,
          connections: dbConnections
        }
      })
    } catch (err) {
      console.error('Failed to save', err)
    } finally {
      setIsSaving(false)
    }
  }

  const addNode = (type: string) => {
    const newNode: FlowNode = {
      id: genId(),
      type,
      position: { x: 250, y: 250 },
      data: createNodeData(type),
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const updateNodeData = (nodeId: string, updates: Record<string, any>) => {
    setNodes((nds: FlowNode[]) => nds.map((n: FlowNode) => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: { ...n.data, ...updates }
        }
      }
      return n
    }))
  }

  const selectedNode = selectedNodes.length === 1 ? nodes.find((n: FlowNode) => n.id === selectedNodes[0]) : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[hsl(var(--background))]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="p-8 bg-[hsl(var(--background))] h-screen">
        <h1 className="text-2xl text-[hsl(var(--destructive))]">Error loading workflow</h1>
        <Button onClick={() => navigate('/')} className="mt-4">Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[hsl(var(--background))]">
      {/* Top Header */}
      <header className="h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] flex items-center justify-between px-4 shrink-0 transition-colors">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 w-8 p-0">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="sr-only">Back</span>
          </Button>
          <div className="w-64">
             <Input 
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
                className="h-8 bg-transparent border-transparent hover:border-[hsl(var(--border))] focus:bg-[hsl(var(--background))] px-2 shadow-none font-semibold text-[hsl(var(--foreground))]"
             />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4 text-sm text-[hsl(var(--muted-foreground))]">
            <span className={`relative flex h-3 w-3`}>
              {workflow.active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--primary))] opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${workflow.active ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground))]'}`}></span>
            </span>
            {workflow.active ? 'Active' : 'Inactive'}
          </div>
          <Button variant="secondary" size="sm" onClick={() => console.log('Run triggered')}>
            <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Run API
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={isSaving}>
            Save
          </Button>
        </div>
      </header>
      
      {/* Main Area: Canvas + Sidebar */}
      <div className="flex-1 flex min-h-0 bg-[hsl(var(--background))]">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[hsl(var(--background))]"
            minZoom={0.2}
          >
            <Background color="hsl(var(--border))" gap={16} />
            <Controls className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] shadow-sm rounded-md overflow-hidden text-[hsl(var(--foreground))]" />
            <MiniMap 
               nodeColor="hsl(var(--primary))" 
               maskColor="hsl(var(--background)/0.6)"
               className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-md shadow-sm"
            />
            
            {/* Floating Node Palette */}
            <Panel position="top-left" className="m-4">
              <div className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg shadow-sm p-3 w-64">
                <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Add Node</h3>
                <div className="space-y-1">
                  {[
                    { type: 'webhook-trigger', icon: 'zap', label: 'Webhook Trigger' },
                    { type: 'cron-trigger', icon: 'clock', label: 'Schedule Trigger' },
                    { type: 'http-request', icon: 'globe', label: 'HTTP Request' },
                    { type: 'if', icon: 'git-branch', label: 'If Condition' },
                    { type: 'set', icon: 'edit', label: 'Set fields' },
                    { type: 'code', icon: 'code', label: 'Custom Code' }
                  ].map(node => (
                     <button
                       key={node.type}
                       onClick={() => addNode(node.type)}
                       className="w-full flex items-center gap-2 hover:bg-[hsl(var(--background))] px-2 py-1.5 rounded-md text-sm text-[hsl(var(--foreground))] transition-colors"
                     >
                       {node.label}
                     </button>
                  ))}
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Properties Sidebar */}
        {selectedNode && (
          <aside className="w-80 border-l border-[hsl(var(--border))] bg-[hsl(var(--background))] flex flex-col shrink-0">
            <div className="h-14 border-b border-[hsl(var(--border))] flex items-center px-4 shrink-0 bg-[hsl(var(--secondary)/0.5)]">
              <h2 className="font-semibold text-sm text-[hsl(var(--foreground))]">Node Properties</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Node Name</label>
                <Input 
                  value={selectedNode.data.label as string} 
                  onChange={e => updateNodeData(selectedNode.id, { label: e.target.value })}
                  className="bg-[hsl(var(--secondary)/0.5)]"
                />
              </div>
              
              <div className="pt-2 border-t border-[hsl(var(--border))]">
                {selectedNode.type === 'code' ? (
                  <>
                    <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 block">Script (JavaScript)</label>
                    <div className="border border-[hsl(var(--border))] rounded-md overflow-hidden h-96">
                      <MonacoEditor
                        height="100%"
                        defaultLanguage="javascript"
                        theme="vs-dark"
                        value={(selectedNode.data.parameters as any)?.code as string || ''}
                        onChange={(value) => {
                          updateNodeData(selectedNode.id, { 
                            parameters: { ...(selectedNode.data.parameters as any), code: value }
                          })
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          wordWrap: 'on'
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 block">Parameters (JSON)</label>
                    <textarea
                       className="w-full h-64 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] p-2 text-sm font-mono text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                       value={JSON.stringify(selectedNode.data.parameters, null, 2)}
                       onChange={e => {
                         try {
                           const parsed = JSON.parse(e.target.value)
                           updateNodeData(selectedNode.id, { parameters: parsed })
                         } catch (err) {
                           // Invalid JSON, don't update state yet
                         }
                       }}
                    />
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Edit parameters directly as JSON for now.
                    </p>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorContent />
    </ReactFlowProvider>
  )
}

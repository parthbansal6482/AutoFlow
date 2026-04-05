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
  OnSelectionChangeParams
} from '@xyflow/react'
import MonacoEditor from '@monaco-editor/react'
import { useWorkflow, useUpdateWorkflow } from '../features/workflows/hooks/use-workflows'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { nodeTypes, createNodeData } from '../features/editor/lib/flow-nodes'
import { NodePalette } from '../features/editor/components/NodePalette'
import { NodePropertiesForm } from '../features/editor/components/NodePropertiesForm'

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
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null)

  // Execution results panel
  type ExecutionLog = {
    id: string
    node_id: string
    node_name: string
    status: 'running' | 'success' | 'error'
    input_data: unknown
    output_data: unknown
    error: string | null
    duration_ms: number | null
    started_at: string
  }
  const [execLogs, setExecLogs] = useState<ExecutionLog[]>([])
  const [execPanelOpen, setExecPanelOpen] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const [showJson, setShowJson] = useState(false)

  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [sequenceAnchor, setSequenceAnchor] = useState<{ id: string; handleId: string; position: { x: number; y: number } } | null>(null)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  
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
          onAddSequence: (nodeId: string, handleId: string) => {
            const node = nodes.find(found => found.id === nodeId)
            if (node) {
              setSequenceAnchor({ id: node.id, handleId, position: node.position })
            }
            setIsPaletteOpen(true)
          }
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
      
      if (workflow.nodes.length === 0) {
        // Automatic "Start" node for new workflows
        const startNode: FlowNode = {
          id: genId(),
          type: 'webhook-trigger',
          position: { x: 250, y: 250 },
          data: {
            ...createNodeData('webhook-trigger'),
            label: 'Start (Webhook)',
            onAddSequence: (nodeId: string, handleId: string) => {
              setNodes(currentNodes => {
                const node = currentNodes.find(found => found.id === nodeId)
                if (node) {
                  setSequenceAnchor({ id: node.id, handleId, position: node.position })
                }
                return currentNodes
              })
              setIsPaletteOpen(true)
            }
          }
        }
        setNodes([startNode])
      } else {
        setNodes(flowNodes)
      }
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

  const handleRunWorkflow = async () => {
    if (!workflow) return

    setRunError(null)
    setLastExecutionId(null)
    setIsRunning(true)

    try {
      const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

      // supabase.functions.invoke() in v2.100+ auto-inject the session JWT as
      // Authorization, overriding custom headers and causing 401 on local dev.
      // Raw fetch() gives us full control. The publishable key alone passes the
      // edge runtime auth gate (confirmed by curl). User JWT goes in x-user-token
      // so the edge function can still do ownership checks.
      const callEdgeFunction = async (userToken?: string): Promise<Response> => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publishableKey}`,
          'apikey': publishableKey,
        }
        if (userToken) {
          headers['x-user-token'] = userToken
        }
        return fetch(`${supabaseUrl}/functions/v1/execute-workflow`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            workflow_id: workflow.id,
            triggered_by: 'manual',
            initial_data: {},
          }),
        })
      }

      // Get user token for ownership verification inside the edge function
      let userToken: string | undefined
      try {
        const { data: { session } } = await supabase.auth.getSession()
        userToken = session?.access_token ?? undefined
      } catch { /* proceed without user JWT */ }

      let resp = await callEdgeFunction(userToken)

      // Retry once on 401 after refreshing the user session
      if (resp.status === 401) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        userToken = refreshed?.session?.access_token ?? undefined
        resp = await callEdgeFunction(userToken)
      }

      if (!resp.ok) {
        let bodyMessage = ''
        try {
          const bodyJson = await resp.clone().json() as { error?: string; detail?: string; message?: string }
          bodyMessage = bodyJson.error || bodyJson.message || bodyJson.detail || ''
        } catch {
          try { bodyMessage = await resp.clone().text() } catch { /* ignore */ }
        }
        const hint = resp.status === 401
          ? ' — Verify VITE_SUPABASE_ANON_KEY matches the Publishable key shown by `supabase status`.'
          : ''
        throw new Error(`Edge function failed (${resp.status})${bodyMessage ? `: ${bodyMessage}` : ''}${hint}`)
      }

      const data = await resp.json() as { execution_id?: string; status?: string; error?: string }
      const executionId = typeof data?.execution_id === 'string' ? data.execution_id : null
      setLastExecutionId(executionId)

      // Fetch per-node logs for the results panel
      if (executionId) {
        const { data: logs } = await supabase
          .from('execution_logs')
          .select('*')
          .eq('execution_id', executionId)
          .order('started_at', { ascending: true })
        if (logs) {
          setExecLogs(logs as ExecutionLog[])
          setExecPanelOpen(true)
          setExpandedLog(null)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute workflow'
      setRunError(message)
      console.error('Failed to run workflow', err)
    } finally {
      setIsRunning(false)
    }
  }

  const addNode = (type: string) => {
    const position = sequenceAnchor 
      ? { x: sequenceAnchor.position.x + 350, y: sequenceAnchor.position.y }
      : { x: 250, y: 250 }

    const newNodeId = genId()
    const newNode: FlowNode = {
      id: newNodeId,
      type,
      position,
      data: {
        ...createNodeData(type),
        onAddSequence: (nodeId: string, handleId: string) => {
          setNodes(currentNodes => {
            const node = currentNodes.find(found => found.id === nodeId)
            if (node) {
              setSequenceAnchor({ id: node.id, handleId, position: node.position })
            }
            return currentNodes
          })
          setIsPaletteOpen(true)
        }
      },
    }

    setNodes((nds) => nds.concat(newNode))
    setIsPaletteOpen(false)

    if (sequenceAnchor) {
      const newEdge: Edge = {
        id: `e-${sequenceAnchor.id}-${newNodeId}`,
        source: sequenceAnchor.id,
        sourceHandle: sequenceAnchor.handleId,
        target: newNodeId,
        type: 'smoothstep',
        animated: true,
      }
      setEdges((eds) => addEdge(newEdge, eds))
      setSequenceAnchor(null)
    }
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
      <div className="flex items-center justify-center h-screen bg-surface-container-lowest font-body">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
      </div>
    )
  }

  if (error || !workflow) {
    return (
      <div className="p-8 bg-surface-container-lowest h-screen font-body flex flex-col items-center justify-center">
        <div className="rounded-[2rem] bg-error-container p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold font-headline text-on-error-container mb-4">Error loading workflow</h1>
          <Button onClick={() => navigate('/')} className="mt-4 px-6 font-semibold">Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-container-lowest font-body">
      {/* Top Header */}
      <header className="h-16 bg-surface-container-low flex items-center justify-between px-6 shrink-0 z-10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-10 w-10 p-0 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-full">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="sr-only">Back</span>
          </Button>
          <div className="w-auto min-w-[200px]">
             <Input 
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
                className="h-10 bg-transparent border-transparent hover:bg-surface-container-highest focus:bg-surface-container-highest focus:border-transparent px-3 shadow-none font-bold font-headline text-lg text-on-surface transition-colors"
                autoFocus={false}
             />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {runError && <p className="text-xs text-error font-medium max-w-64 truncate bg-error-container px-3 py-1 rounded-full">{runError}</p>}
          {!runError && lastExecutionId && (
            <p className="text-xs text-on-surface-variant font-mono tracking-wider">
              <span className="text-on-surface/50 uppercase text-[10px] font-bold mr-1">Exec ID</span>
              {lastExecutionId.slice(0, 8)}
            </p>
          )}
          <div className="flex items-center gap-2 mr-2 ml-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-highest px-3 py-1.5 rounded-full shadow-inner">
            <span className={`relative flex h-2 w-2`}>
              {workflow.active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${workflow.active ? 'bg-primary' : 'bg-on-surface-variant/50'}`}></span>
            </span>
            {workflow.active ? 'Active' : 'Inactive'}
          </div>
          <Button variant="ghost" size="sm" onClick={handleRunWorkflow} isLoading={isRunning} className="font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high px-4">
            <svg className="h-4 w-4 mr-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Test Run
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={isSaving} className="font-semibold px-6 shadow-[0_4px_14px_rgba(var(--color-primary),0.4)]">
            Save Changes
          </Button>
        </div>
      </header>
      
      {/* Main Area: Canvas + Sidebar */}
      <div className="flex-1 flex min-h-0 bg-surface-container-lowest relative">
        {/* Canvas */}
        <div className="flex-1 relative flex flex-col">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            className="bg-surface-container-lowest"
            minZoom={0.2}
          >
            <Background color="var(--color-outline-variant)" gap={20} size={1.5} />
            <Controls />
            <MiniMap 
               zoomable
               pannable
            />
            
            {/* Contextual Node Palette overlay */}
            {isPaletteOpen && (
              <div 
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[6px] transition-all duration-300"
                onClick={() => setIsPaletteOpen(false)}
              >
                <div 
                  className="bg-surface-container shadow-[0_32px_80px_rgba(0,0,0,0.7)] rounded-[2.5rem] border border-outline-variant/30 overflow-hidden w-full max-w-[420px] scale-in-center mx-4"
                  onClick={(e) => e.stopPropagation()} 
                >
                  <NodePalette onAddNode={addNode} />
                </div>
              </div>
            )}
          </ReactFlow>

          {/* ── Execution Results Drawer ── */}
          {execPanelOpen && (
            <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col" style={{ maxHeight: '45%' }}>
              {/* Drag handle / header */}
              <div className="bg-surface-container-low border-t border-outline-variant/20 px-5 py-2.5 flex items-center justify-between shrink-0 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {execLogs.every(l => l.status === 'success') ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        All nodes passed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {execLogs.filter(l => l.status === 'error').length} node(s) failed
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-on-surface-variant/50 font-mono">
                    {lastExecutionId?.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/40">
                    {execLogs.length} node{execLogs.length !== 1 ? 's' : ''}
                    {' · '}
                    {execLogs.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0)}ms total
                  </span>
                </div>
                <button
                  onClick={() => setExecPanelOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Log rows */}
              <div className="overflow-y-auto bg-surface-container-lowest">
                {execLogs.map((log, idx) => (
                  <div key={log.id} className="border-b border-outline-variant/10 last:border-0">
                    {/* Row header */}
                    <button
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors text-left"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {/* Step index */}
                      <span className="text-[10px] font-bold text-on-surface-variant/40 w-5 shrink-0 text-center">{idx + 1}</span>

                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        log.status === 'success' ? 'bg-emerald-400' :
                        log.status === 'error'   ? 'bg-red-400' :
                        'bg-yellow-400 animate-pulse'
                      }`} />

                      {/* Node name */}
                      <span className="text-sm font-semibold text-on-surface flex-1 truncate">{log.node_name}</span>

                      {/* Duration */}
                      {log.duration_ms != null && (
                        <span className="text-[11px] text-on-surface-variant/60 font-mono shrink-0">{log.duration_ms}ms</span>
                      )}

                      {/* Error badge */}
                      {log.status === 'error' && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full shrink-0">ERROR</span>
                      )}

                      {/* Expand chevron */}
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        className={`shrink-0 text-on-surface-variant/40 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* Expanded detail */}
                    {expandedLog === log.id && (
                      <div className="px-5 pb-4 pt-1 grid grid-cols-2 gap-3 bg-surface-container-lowest">
                        {log.status === 'error' && log.error && (
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Error</p>
                            <pre className="text-xs text-red-300 bg-red-950/40 rounded-xl p-3 overflow-x-auto font-mono whitespace-pre-wrap">{log.error}</pre>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-1">Input</p>
                          <pre className="text-xs text-on-surface-variant bg-surface-container-high rounded-xl p-3 overflow-x-auto font-mono max-h-48 whitespace-pre-wrap">{JSON.stringify(log.input_data, null, 2)}</pre>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-1">Output</p>
                          <pre className="text-xs text-on-surface-variant bg-surface-container-high rounded-xl p-3 overflow-x-auto font-mono max-h-48 whitespace-pre-wrap">{JSON.stringify(log.output_data, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Properties Sidebar */}
        {selectedNode && (
          <aside className="w-[340px] bg-surface-container relative z-10 flex flex-col shrink-0 shadow-[-12px_0_48px_rgba(0,0,0,0.3)]">
            <div className="h-16 flex items-center px-6 shrink-0 bg-surface-container-high relative z-20">
              <h2 className="font-bold font-headline text-lg text-on-surface">Properties</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1">Node Title</label>
                <Input 
                  value={selectedNode.data.label as string} 
                  onChange={e => updateNodeData(selectedNode.id, { label: e.target.value })}
                  className="bg-surface-container-lowest font-semibold"
                />
              </div>
              
              <div className="pt-4 mt-2 border-t border-outline-variant/30 flex-1 flex flex-col">
                {selectedNode.type === 'code' ? (
                  <>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-1 mb-3 block">Script (JavaScript)</label>
                    <div className="rounded-[1.25rem] overflow-hidden h-[400px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] bg-[#1e1e1e] p-2 ring-1 ring-white/5">
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
                          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          padding: { top: 12, bottom: 12 },
                          renderLineHighlight: 'none',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 px-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                        {showJson ? 'Raw JSON Configuration' : 'Node Settings'}
                      </label>
                      <button 
                        onClick={() => setShowJson(!showJson)}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-container px-2 py-1 rounded-md bg-primary/10 transition-colors"
                      >
                        {showJson ? 'Show Form' : 'Advanced (JSON)'}
                      </button>
                    </div>

                    {showJson ? (
                      <div className="rounded-[1.25rem] overflow-hidden h-[400px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] bg-[#1e1e1e] p-2 ring-1 ring-white/5">
                        <MonacoEditor
                          height="100%"
                          defaultLanguage="json"
                          theme="vs-dark"
                          value={JSON.stringify(selectedNode.data.parameters, null, 2)}
                          onChange={(value) => {
                            try {
                              if (value) {
                                const parsed = JSON.parse(value)
                                updateNodeData(selectedNode.id, { parameters: parsed })
                              }
                            } catch (err) {
                              // Invalid JSON, don't update state yet to allow typing
                            }
                          }}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            padding: { top: 12, bottom: 12 },
                            renderLineHighlight: 'none',
                            formatOnPaste: true,
                          }}
                        />
                      </div>
                    ) : (
                      <NodePropertiesForm 
                        node={selectedNode} 
                        updateNodeData={updateNodeData} 
                      />
                    )}

                    {!showJson && (
                      <p className="text-[11px] font-medium text-on-surface-variant mt-6 pl-1 leading-relaxed opacity-50">
                        Use <code className="bg-surface-container-high px-1 py-0.5 rounded font-mono text-primary/80">{`{{ $input.property }}`}</code> to reference data from previous nodes.
                      </p>
                    )}
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

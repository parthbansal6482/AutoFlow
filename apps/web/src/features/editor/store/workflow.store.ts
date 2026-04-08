import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { WorkflowNode, WorkflowConnection } from '@workflow/types'

interface WorkflowStore {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  selectedNodeId: string | null
  isLocked: boolean
  isDirty: boolean
  setNodes: (nodes: WorkflowNode[]) => void
  setConnections: (connections: WorkflowConnection[]) => void
  selectNode: (id: string | null) => void
  updateNodeParameters: (id: string, parameters: Record<string, unknown>) => void
  markClean: () => void
  toggleLock: () => void
}

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set) => ({
    nodes: [],
    connections: [],
    selectedNodeId: null,
    isLocked: false,
    isDirty: false,
    setNodes: (nodes) => set((state) => { state.nodes = nodes; state.isDirty = true }),
    setConnections: (connections) => set((state) => { state.connections = connections; state.isDirty = true }),
    selectNode: (id) => set((state) => { state.selectedNodeId = id }),
    updateNodeParameters: (id, parameters) => set((state) => {
      const node = state.nodes.find(n => n.id === id)
      if (node) { node.parameters = parameters; state.isDirty = true }
    }),
    markClean: () => set((state) => { state.isDirty = false }),
    toggleLock: () => set((state) => { state.isLocked = !state.isLocked }),
  }))
)

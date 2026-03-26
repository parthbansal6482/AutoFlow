import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
export const useWorkflowStore = create()(immer((set) => ({
    nodes: [],
    connections: [],
    selectedNodeId: null,
    isDirty: false,
    setNodes: (nodes) => set((state) => { state.nodes = nodes; state.isDirty = true; }),
    setConnections: (connections) => set((state) => { state.connections = connections; state.isDirty = true; }),
    selectNode: (id) => set((state) => { state.selectedNodeId = id; }),
    updateNodeParameters: (id, parameters) => set((state) => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            node.parameters = parameters;
            state.isDirty = true;
        }
    }),
    markClean: () => set((state) => { state.isDirty = false; }),
})));

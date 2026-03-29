import { DragEvent, useState } from 'react';
import { Play, Send, Database, Search } from 'lucide-react';

const NODE_TYPES = [
  { type: 'standardAction', label: 'Send Message', icon: Send, defaultData: { title: 'Send Message', icon: 'send' } },
  { type: 'switch', label: 'Router', icon: Search, defaultData: { title: 'Router', icon: 'search', outputs: [{id:'out1', label:'True'}, {id:'out2', label:'False'}] } },
  { type: 'agent', label: 'AI Agent', icon: Play, defaultData: { title: 'AI Agent', tools: ['Search', 'SQL'] } },
  { type: 'resource', label: 'Database', icon: Database, defaultData: { label: 'Database', icon: 'database' } },
];

export function Sidebar() {
  const [showNodes, setShowNodes] = useState(false);

  const onDragStart = (event: DragEvent, nodeType: string, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/data', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container flex flex-col py-6 z-40 border-r border-surface-container-highest">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
          <span className="material-symbols-outlined text-white">automation</span>
        </div>
        <div>
          <p className="font-bold text-white font-body text-sm font-medium leading-none">Main Workspace</p>
          <p className="text-zinc-500 text-xs mt-1">Automation Engine</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        <a className="flex items-center gap-3 px-6 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-surface-container-high transition-colors hover:translate-x-1 transition-transform font-body text-sm font-medium" href="#">
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span>Dashboard</span>
        </a>
        <a className="flex items-center gap-3 px-6 py-3 bg-surface-container-highest text-white rounded-r-full hover:translate-x-1 transition-transform font-body text-sm font-medium" href="#">
          <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
          <span>Library</span>
        </a>
        <a className="flex items-center gap-3 px-6 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-surface-container-high transition-colors hover:translate-x-1 transition-transform font-body text-sm font-medium" href="#">
          <span className="material-symbols-outlined" data-icon="terminal">terminal</span>
          <span>Executions</span>
        </a>
        <a className="flex items-center gap-3 px-6 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-surface-container-high transition-colors hover:translate-x-1 transition-transform font-body text-sm font-medium" href="#">
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
          <span>Settings</span>
        </a>
        <a className="flex items-center gap-3 px-6 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-surface-container-high transition-colors hover:translate-x-1 transition-transform font-body text-sm font-medium" href="#">
          <span className="material-symbols-outlined" data-icon="payments">payments</span>
          <span>Billing</span>
        </a>
      </nav>
      <div className="px-6 mt-auto space-y-1 relative">
        {showNodes && (
          <div className="absolute bottom-full mb-2 left-6 right-6 bg-surface-container-highest rounded-xl p-3 shadow-xl border border-surface-container-lowest z-50">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Drag to Canvas</h4>
            <div className="space-y-2">
              {NODE_TYPES.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.label}
                    onDragStart={(e) => {
                      onDragStart(e, node.type, node.defaultData);
                      setShowNodes(false);
                    }}
                    draggable
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low cursor-grab transition-colors"
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center text-zinc-400">
                      <Icon size={14} />
                    </div>
                    <span className="text-sm font-medium text-zinc-200">{node.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowNodes(!showNodes)}
          className="w-full bg-white text-on-primary py-3 rounded-xl font-bold mb-6 hover:scale-[1.02] active:scale-95 transition-all relative z-10"
        >
          {showNodes ? 'Close Menu' : 'New Node'}
        </button>
        <a className="flex items-center gap-3 py-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm" href="#">
          <span className="material-symbols-outlined" data-icon="contact_support">contact_support</span>
          <span>Support</span>
        </a>
        <a className="flex items-center gap-3 py-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm" href="#">
          <span className="material-symbols-outlined" data-icon="menu_book">menu_book</span>
          <span>Docs</span>
        </a>
      </div>
    </aside>
  );
}

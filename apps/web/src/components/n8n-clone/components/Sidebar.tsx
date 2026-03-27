import { DragEvent } from 'react';
import { Play, Send, Database, Search } from 'lucide-react';

const NODE_TYPES = [
  { type: 'standardAction', label: 'Send Message', icon: Send, defaultData: { title: 'Send Message', icon: 'send' } },
  { type: 'switch', label: 'Router', icon: Search, defaultData: { title: 'Router', icon: 'search', outputs: [{id:'out1', label:'True'}, {id:'out2', label:'False'}] } },
  { type: 'agent', label: 'AI Agent', icon: Play, defaultData: { title: 'AI Agent', tools: ['Search', 'SQL'] } },
  { type: 'resource', label: 'Database', icon: Database, defaultData: { label: 'Database', icon: 'database' } },
];

export function Sidebar() {
  const onDragStart = (event: DragEvent, nodeType: string, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/data', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 h-full bg-stitch-purple-900/60 backdrop-blur-2xl border-l border-white/10 flex flex-col z-20 shadow-[-10px_0_40px_rgba(0,0,0,0.5)]">
      <div className="p-5 border-b border-white/5">
        <h3 className="text-sm font-bold text-white tracking-wide uppercase">Nodes Library</h3>
        <p className="text-xs text-gray-400 mt-1">Drag and drop nodes</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {NODE_TYPES.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.label}
              onDragStart={(e) => onDragStart(e, node.type, node.defaultData)}
              draggable
              className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 cursor-grab hover:bg-stitch-blue-accent/20 hover:border-stitch-blue-accent/40 shadow-glass transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-lg bg-black/20 border border-white/5 flex items-center justify-center text-gray-300 group-hover:text-stitch-blue-accent shadow-[inset_0_1px_rgba(255,255,255,0.1)] transition-colors">
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{node.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

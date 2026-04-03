import { Handle, Position, NodeProps, type Node } from '@xyflow/react';

// Typed node data shapes
interface NodeData extends Record<string, unknown> {
  icon?: string;
  title?: string;
  subtitle?: string;
  tooltip?: string;
  label?: string;
  outputs?: { id: string; label: string }[];
  tools?: string[];
  isTrigger?: boolean;
}

// Map logical names to material symbols
const IconMap: Record<string, string> = {
  telegram: 'send',
  'git-branch': 'fork_right',
  download: 'download',
  mic: 'mic',
  'file-text': 'description',
  send: 'send',
  openai: 'smart_toy',
  search: 'search',
  calculator: 'calculate',
  mail: 'mail',
  calendar: 'calendar_month',
  database: 'database',
  default: 'text_snippet',
  schedule: 'schedule'
};

const defaultInputHandleClass = "w-4 h-4 rounded-full bg-surface-container-highest border-4 border-surface -ml-0.5";
const defaultOutputHandleClass = "w-4 h-4 rounded-full bg-surface-container-highest border-4 border-surface -mr-0.5";
const triggerOutputHandleClass = "w-4 h-4 rounded-full bg-primary border-4 border-surface ring-4 ring-primary-container/20 -mr-0.5";

// 1. StandardActionNode (Can act as Action or Trigger)
export function StandardActionNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const iconName = IconMap[data.icon ?? 'default'] || IconMap.default;
  const isTrigger = data.isTrigger === true;

  return (
    <div className={`w-64 bg-surface-container-low rounded-xl p-5 transition-shadow ${selected ? 'node-active' : ''} ${isTrigger ? 'border-l-4 border-primary' : ''}`}>
      {!isTrigger && (
        <Handle type="target" position={Position.Left} className={defaultInputHandleClass} />
      )}
      
      {/* Tooltip */}
      {data.tooltip != null && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-container-highest border border-surface-container-lowest text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10">
          {data.tooltip}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold tracking-widest uppercase ${isTrigger ? 'text-primary' : 'text-zinc-400'}`}>
          {isTrigger ? 'Trigger' : 'Action'}
        </span>
        <span className="material-symbols-outlined text-zinc-500 text-sm">more_vert</span>
      </div>

      {/* Body */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center">
          <span className={`material-symbols-outlined text-xl ${isTrigger ? 'text-primary' : 'text-on-surface'}`}>
            {iconName}
          </span>
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm text-on-surface leading-tight">{data.title || 'Action'}</h3>
          {data.subtitle ? (
            <p className="text-xs text-zinc-500 mt-0.5">{data.subtitle}</p>
          ) : (
             <p className="text-xs text-zinc-500 mt-0.5">Not configured</p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className={isTrigger ? triggerOutputHandleClass : defaultOutputHandleClass} />
    </div>
  );
}

// 2. SwitchNode (Routing)
export function SwitchNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const iconName = IconMap[data.icon ?? 'default'] || IconMap.default;
  const outputs = data.outputs ?? [];

  return (
    <div className={`w-64 bg-surface-container-low rounded-xl p-5 transition-shadow ${selected ? 'node-active' : ''}`}>
      <Handle type="target" position={Position.Left} className={defaultInputHandleClass} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
          Router
        </span>
        <span className="material-symbols-outlined text-zinc-500 text-sm">more_vert</span>
      </div>

      {/* Body */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface text-xl">
            {iconName}
          </span>
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm text-on-surface leading-tight">{data.title || 'Switch Router'}</h3>
        </div>
      </div>

      {/* Output Handles container */}
      <div className="flex flex-col gap-2 relative w-full pt-2">
        {outputs.map((output, index) => (
          <div key={output.id} className="relative flex justify-end items-center pr-2 text-xs font-semibold text-zinc-500 h-6 bg-surface-container-highest/50 rounded-md px-2">
            <span>{output.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              style={{ top: 12 + (index * 32), right: -21 }} // crude manual positioning if typical row-height
              className={`${defaultOutputHandleClass} absolute right-[-24px]`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. AgentNode
export function AgentNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const tools = data.tools ?? [];

  return (
    <div className={`w-72 bg-surface-container-low rounded-xl p-5 transition-shadow border-t-4 border-primary-container ${selected ? 'node-active' : ''}`}>
      <Handle type="target" position={Position.Left} className={defaultInputHandleClass} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold tracking-widest text-primary-fixed-dim uppercase">
          AI Agent
        </span>
        <span className="material-symbols-outlined text-zinc-500 text-sm">more_vert</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-container">
          <span className="material-symbols-outlined text-2xl">smart_toy</span>
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm text-on-surface leading-tight">{data.title || 'AI Agent'}</h3>
          {data.subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5">{data.subtitle}</p>
          )}
        </div>
      </div>

      {/* Bottom handles container */}
      <div className="pt-3 border-t border-surface-container-highest flex flex-col gap-2 relative">
         <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Resources</p>
         
         <div className="flex flex-wrap gap-2">
            <div className="bg-surface-container-highest px-2 py-1 flex items-center justify-center rounded text-xs text-zinc-300 relative border border-surface-container shadow-sm">
                Chat Model
                <Handle type="target" position={Position.Bottom} id="Chat Model" className="w-2.5 h-2.5 rounded-full bg-surface border-2 border-surface-container-highest absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
            </div>
            
            <div className="bg-surface-container-highest px-2 py-1 flex items-center justify-center rounded text-xs text-zinc-300 relative border border-surface-container shadow-sm">
                Memory
                <Handle type="target" position={Position.Bottom} id="Memory" className="w-2.5 h-2.5 rounded-full bg-surface border-2 border-surface-container-highest absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
            </div>
            
            {tools.map((tool) => (
             <div key={tool} className="bg-surface-container-highest px-2 py-1 flex items-center justify-center rounded text-xs text-zinc-300 relative border border-surface-container shadow-sm">
                 {tool}
                 <Handle type="target" position={Position.Bottom} id={tool} className="w-2.5 h-2.5 rounded-full bg-surface border-2 border-surface-container-highest absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
             </div>
            ))}
         </div>
      </div>

      <Handle type="source" position={Position.Right} className={defaultOutputHandleClass} />
    </div>
  );
}

// 4. ResourceNode
export function ResourceNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const iconName = IconMap[data.icon ?? 'default'] || IconMap.default;

  return (
    <div className={`relative flex flex-col items-center justify-center w-24 group ${selected ? 'opacity-100' : 'opacity-80'}`}>
      <Handle type="source" position={Position.Top} className="w-3 h-3 rounded-full bg-surface-container-highest border-2 border-surface -mt-1.5" />
      
      <div className="w-14 h-14 bg-surface-container-low border border-surface-container-highest rounded-full flex items-center justify-center mb-2 hover:bg-surface-container-highest hover:border-outline-variant transition-all duration-300 cursor-pointer shadow-lg">
        <span className="material-symbols-outlined text-zinc-300 text-2xl group-hover:text-primary transition-colors">
            {iconName}
        </span>
      </div>
      
      <span className="text-on-surface text-xs text-center font-bold leading-tight max-w-[100px] break-words group-hover:text-primary transition-colors">
        {data.label}
      </span>
    </div>
  );
}

export const nodeTypes = {
  standardAction: StandardActionNode,
  switch: SwitchNode,
  agent: AgentNode,
  resource: ResourceNode,
};

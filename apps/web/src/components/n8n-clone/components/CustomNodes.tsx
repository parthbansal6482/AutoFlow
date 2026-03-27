import { type ComponentType, type SVGAttributes } from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import {
  Send,
  GitBranch,
  Download,
  Mic,
  FileText,
  Bot,
  Search,
  Calculator,
  Mail,
  Calendar,
  Database,
  Type,
} from 'lucide-react';

type LucideIcon = ComponentType<SVGAttributes<SVGElement> & { size?: number | string }>;

// Typed node data shapes
interface NodeData extends Record<string, unknown> {
  icon?: string;
  title?: string;
  subtitle?: string;
  tooltip?: string;
  label?: string;
  outputs?: { id: string; label: string }[];
  tools?: string[];
}

// Help map string icon names to actual Lucide components
const IconMap: Record<string, LucideIcon> = {
  telegram: Send,
  'git-branch': GitBranch,
  download: Download,
  mic: Mic,
  'file-text': FileText,
  send: Send,
  openai: Bot,
  search: Search,
  calculator: Calculator,
  mail: Mail,
  calendar: Calendar,
  database: Database,
  default: Type,
};

// Common handle class
const handleClass = "w-3 h-3 bg-white border border-stitch-blue-accent/50 shadow-[0_0_10px_rgba(43,110,245,0.4)] hover:scale-125 transition-transform";

// 1. StandardActionNode
export function StandardActionNode({ data }: NodeProps<Node<NodeData>>) {
  const Icon = IconMap[data.icon ?? 'default'] || IconMap.default;

  return (
    <div className="relative group flex items-center bg-[#181223]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)] min-w-[200px] hover:border-stitch-blue-accent/50 transition-colors">
      <Handle type="target" position={Position.Left} className={handleClass} />
      
      {/* Tooltip */}
      {data.tooltip != null && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stitch-purple-900 border border-white/10 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-glass z-10">
          {data.tooltip}
        </div>
      )}

      {/* Icon Wrapper */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-stitch-blue-accent/10 flex items-center justify-center mr-3 border border-stitch-blue-accent/20 text-stitch-blue-accent shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
        <Icon size={20} strokeWidth={2.5} />
      </div>

      {/* Text Wrapper */}
      <div className="flex flex-col flex-1">
        <span className="text-white font-semibold text-sm leading-tight">
          {data.title}
        </span>
        {data.subtitle != null && (
          <span className="text-gray-400 text-xs mt-0.5 font-medium">
            {data.subtitle}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  );
}

// 2. SwitchNode (Routing)
export function SwitchNode({ data }: NodeProps<Node<NodeData>>) {
  const Icon = IconMap[data.icon ?? 'default'] || IconMap.default;
  const outputs = data.outputs ?? [];

  return (
    <div className="relative flex items-center bg-[#181223]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)] min-w-[220px] hover:border-purple-500/50 transition-colors">
      <Handle type="target" position={Position.Left} className={handleClass} />

      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mr-3 border border-purple-500/20 text-purple-400 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
        <Icon size={20} strokeWidth={2.5} />
      </div>

      <div className="flex flex-col flex-1 pb-1">
        <span className="text-white font-semibold text-sm leading-tight mt-1 mb-2">
          {data.title}
        </span>
        
        {/* Output Handles container */}
        <div className="flex flex-col gap-2 relative w-full border-t border-white/5 pt-2">
          {outputs.map((output) => (
            <div key={output.id} className="relative flex justify-end items-center pr-2 text-xs font-semibold text-gray-400 h-6">
              <span>{output.label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                style={{ top: '50%', transform: 'translateY(-50%)', right: -21 }}
                className={handleClass}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. AgentNode
export function AgentNode({ data }: NodeProps<Node<NodeData>>) {
  const tools = data.tools ?? [];

  return (
    <div className="relative flex flex-col pt-4 pb-2 bg-[#181223]/90 backdrop-blur-md border-2 border-indigo-500/50 rounded-xl shadow-[0_8px_30px_rgba(99,102,241,0.2)] w-[320px]">
      <Handle type="target" position={Position.Left} className={handleClass} />
      
      {/* Header */}
      <div className="flex items-center px-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-4 text-white shadow-lg ring-2 ring-white/10 shadow-indigo-500/30">
          <Bot size={26} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-bold text-lg">
            {data.title}
          </span>
          <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mt-0.5">
            {data.subtitle}
          </span>
        </div>
      </div>

      {/* Bottom handles container */}
      <div className="px-2 pt-3 pb-1 border-t border-white/10 flex flex-wrap gap-x-2 gap-y-7 justify-center mt-2 relative bg-black/20 rounded-b-xl">
        <div className="flex flex-col items-center relative mx-2">
          <span className="text-[9px] text-gray-400 uppercase font-bold absolute -top-5 whitespace-nowrap">Chat Model*</span>
          <Handle type="target" position={Position.Bottom} id="Chat Model*" style={{ left: '50%', bottom: -12, transform: 'translateX(-50%)' }} className={handleClass} />
        </div>
        
        <div className="flex flex-col items-center relative mx-2">
          <span className="text-[9px] text-gray-400 uppercase font-bold absolute -top-5 whitespace-nowrap">Memory</span>
          <Handle type="target" position={Position.Bottom} id="Memory" style={{ left: '50%', bottom: -12, transform: 'translateX(-50%)' }} className={handleClass} />
        </div>

        {tools.map((tool) => (
          <div key={tool} className="flex flex-col items-center relative mx-2">
            <span className="text-[9px] text-gray-400 uppercase font-bold absolute -top-5 whitespace-nowrap">{tool}</span>
            <Handle
              type="target"
              position={Position.Bottom}
              id={tool}
              style={{ left: '50%', bottom: -12, transform: 'translateX(-50%)' }}
              className={handleClass}
            />
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  );
}

// 4. ResourceNode
export function ResourceNode({ data }: NodeProps<Node<NodeData>>) {
  const Icon = IconMap[data.icon ?? 'default'] || IconMap.default;

  return (
    <div className="relative flex flex-col items-center justify-center w-24 group">
      <Handle type="source" position={Position.Top} className={handleClass} />
      
      <div className="w-14 h-14 bg-[#181223]/90 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-gray-200 shadow-[0_8px_20px_rgb(0,0,0,0.5)] mb-2 hover:bg-stitch-blue-accent/20 hover:border-stitch-blue-accent/50 hover:text-white transition-all duration-300 cursor-pointer">
        <Icon size={24} />
      </div>
      
      <span className="text-white text-xs text-center font-semibold leading-tight max-w-[100px] break-words group-hover:text-stitch-blue-accent transition-colors">
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

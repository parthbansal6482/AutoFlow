// apps/web/src/lib/flow-nodes.tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'

export function BaseNode({
  data,
  isConnectable,
  icon,
  colorClass,
}: NodeProps & { icon: React.ReactNode; colorClass: string }) {
  // Triggers don't have inputs
  const isTrigger = data.type === 'webhook-trigger' || data.type === 'cron-trigger'
  
  return (
    <div className={`rounded-[1.5rem] bg-surface-container shadow-[0_12px_32px_rgba(0,0,0,0.4)] min-w-[220px] overflow-hidden transition-all duration-300 ${data.selected ? 'ring-2 ring-primary shadow-[0_0_24px_rgba(var(--color-primary),0.4)] scale-[1.02]' : ''}`}>
      
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="main"
          isConnectable={isConnectable}
          className="w-4 h-4 bg-surface-container-highest border-[3px] border-surface transition-all group-hover:bg-primary"
        />
      )}

      <div className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-[1rem] flex items-center justify-center text-white ${colorClass}`}>
          {icon}
        </div>
        <div className="font-semibold font-headline text-base text-on-surface">
          {data.label as string}
        </div>
      </div>
      
      <div className="px-4 pb-4 pt-1">
        <p className="text-[11px] font-medium text-on-surface-variant font-mono tracking-wider truncate">
          {data.type === 'http-request' && (data.parameters as any)?.method ? `${(data.parameters as any).method} Request` : 'Configure parameters...'}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="main"
        isConnectable={isConnectable}
        className="w-4 h-4 bg-primary border-[3px] border-surface shadow-[0_0_10px_rgba(var(--color-primary),0.5)]"
      />
      
      {data.type === 'if' && (
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ top: '75%' }}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-error border-[3px] border-surface shadow-[0_0_10px_rgba(var(--color-error),0.5)]"
        />
      )}
      
      {data.type === 'switch' && Array.isArray((data.parameters as any)?.rules) && (
        (data.parameters as any).rules.map((_: any, idx: number) => (
          <Handle
            key={idx}
            type="source"
            position={Position.Right}
            id={idx.toString()}
            style={{ top: `${(idx + 1) * (100 / ((data.parameters as any).rules.length + 1))}%` }}
            isConnectable={isConnectable}
            className="w-4 h-4 bg-amber-400 border-[3px] border-surface shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          />
        ))
      )}
      
      {data.type === 'switch' && !((data.parameters as any)?.rules?.length) && (
        <Handle
          type="source"
          position={Position.Right}
          id="fallback"
          isConnectable={isConnectable}
          className="w-4 h-4 bg-amber-400 border-[3px] border-surface shadow-[0_0_10px_rgba(251,191,36,0.5)]"
        />
      )}
      
      {data.type === 'code' && (
        <Handle
          type="source"
          position={Position.Right}
          id="error"
          style={{ top: '75%' }}
          isConnectable={isConnectable}
          className="w-4 h-4 bg-error border-[3px] border-surface shadow-[0_0_10px_rgba(var(--color-error),0.5)]"
        />
      )}
    </div>
  )
}

// Icon SVG helpers
const IconWebhook = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IconClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconHttp = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
const IconIf = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
const IconSet = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconCode = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
const IconSwitch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
const IconMerge = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>

// Specific node components
export const WebhookNode = (props: NodeProps) => <BaseNode {...props} icon={<IconWebhook />} colorClass="bg-primary/20 text-primary" />
export const CronNode = (props: NodeProps) => <BaseNode {...props} icon={<IconClock />} colorClass="bg-primary/20 text-primary" />
export const HttpNode = (props: NodeProps) => <BaseNode {...props} icon={<IconHttp />} colorClass="bg-primary/20 text-primary" />
export const IfNode = (props: NodeProps) => <BaseNode {...props} icon={<IconIf />} colorClass="bg-amber-500/20 text-amber-500" />
export const SetNode = (props: NodeProps) => <BaseNode {...props} icon={<IconSet />} colorClass="bg-emerald-500/20 text-emerald-500" />
export const CodeNode = (props: NodeProps) => <BaseNode {...props} icon={<IconCode />} colorClass="bg-indigo-500/20 text-indigo-500" />
export const SwitchNode = (props: NodeProps) => <BaseNode {...props} icon={<IconSwitch />} colorClass="bg-orange-500/20 text-orange-500" />
export const MergeNode = (props: NodeProps) => <BaseNode {...props} icon={<IconMerge />} colorClass="bg-teal-500/20 text-teal-500" />

export const nodeTypes = {
  'webhook-trigger': WebhookNode,
  'cron-trigger': CronNode,
  'http-request': HttpNode,
  'if': IfNode,
  'set': SetNode,
  'code': CodeNode,
  'switch': SwitchNode,
  'merge': MergeNode,
}

// Generate default data when dropping a new node onto the canvas
export function createNodeData(type: string) {
  const base = { type, parameters: {} }
  
  switch (type) {
    case 'webhook-trigger':
      return { ...base, label: 'Webhook', parameters: { method: 'POST', path: `wh-${Math.random().toString(36).substring(2, 8)}` } }
    case 'cron-trigger':
      return { ...base, label: 'Schedule', parameters: { cron: '0 * * * *', timezone: 'UTC' } }
    case 'http-request':
      return { ...base, label: 'HTTP Request', parameters: { method: 'GET', url: 'https://api.github.com' } }
    case 'if':
      return { ...base, label: 'If', parameters: { field: '', operator: 'equals', value: '' } }
    case 'set':
      return { ...base, label: 'Set', parameters: { fields: '{\n  "key": "value"\n}' } }
    case 'code':
      return { ...base, label: 'Code', parameters: { code: '// Access input data via $input\nreturn $input.all();' } }
    case 'switch':
      return { ...base, label: 'Switch', parameters: { rules: [{ field: '', operator: 'equals', value: '' }] } }
    case 'merge':
      return { ...base, label: 'Merge', parameters: { mode: 'wait', property: '' } }
    default:
      return { ...base, label: 'Unknown' }
  }
}

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
    <div className={`rounded-xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm min-w-[200px] overflow-hidden ${data.selected ? 'border-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]' : ''}`}>
      
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="main"
          isConnectable={isConnectable}
          className="w-3 h-3 bg-[hsl(var(--muted-foreground))] border-2 border-[hsl(var(--background))]"
        />
      )}

      <div className={`p-3 flex items-center gap-3 border-b border-[hsl(var(--border))] ${colorClass}`}>
        <div className="text-white">
          {icon}
        </div>
        <div className="font-semibold text-sm text-foreground">
          {data.label as string}
        </div>
      </div>
      
      <div className="p-3 bg-[hsl(var(--secondary)/0.3)]">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {data.type === 'http-request' && (data.parameters as any)?.method ? `${(data.parameters as any).method} Request` : 'Configure parameters in sidebar'}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="main"
        isConnectable={isConnectable}
        className="w-3 h-3 bg-[hsl(var(--primary))] border-2 border-[hsl(var(--background))]"
      />
      
      {data.type === 'if' && (
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ top: '75%' }}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-[hsl(var(--destructive))] border-2 border-[hsl(var(--background))]"
        />
      )}
      
      {data.type === 'code' && (
        <Handle
          type="source"
          position={Position.Right}
          id="error"
          style={{ top: '75%' }}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-[hsl(var(--destructive))] border-2 border-[hsl(var(--background))]"
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

// Specific node components
export const WebhookNode = (props: NodeProps) => <BaseNode {...props} icon={<IconWebhook />} colorClass="bg-purple-600" />
export const CronNode = (props: NodeProps) => <BaseNode {...props} icon={<IconClock />} colorClass="bg-purple-600" />
export const HttpNode = (props: NodeProps) => <BaseNode {...props} icon={<IconHttp />} colorClass="bg-blue-600" />
export const IfNode = (props: NodeProps) => <BaseNode {...props} icon={<IconIf />} colorClass="bg-amber-600" />
export const SetNode = (props: NodeProps) => <BaseNode {...props} icon={<IconSet />} colorClass="bg-emerald-600" />
export const CodeNode = (props: NodeProps) => <BaseNode {...props} icon={<IconCode />} colorClass="bg-slate-700" />

export const nodeTypes = {
  'webhook-trigger': WebhookNode,
  'cron-trigger': CronNode,
  'http-request': HttpNode,
  'if': IfNode,
  'set': SetNode,
  'code': CodeNode,
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
    default:
      return { ...base, label: 'Unknown' }
  }
}

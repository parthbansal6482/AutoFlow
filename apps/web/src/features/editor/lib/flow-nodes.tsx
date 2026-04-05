import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CompanyLogo } from '../../../components/shared/CompanyLogo'

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
        {data.domain ? (
          <div className="w-11 h-11 flex items-center justify-center transition-all shrink-0">
            <CompanyLogo 
              domain={data.domain as string} 
              size={80} 
              theme="dark"
              className="w-8 h-8"
              fallbackIcon={
                <div className={`w-11 h-11 rounded-[1rem] flex items-center justify-center text-white shrink-0 ${colorClass}`}>
                  {icon}
                </div>
              }
            />
          </div>
        ) : (
          <div className={`w-11 h-11 rounded-[1rem] flex items-center justify-center text-white shrink-0 ${colorClass}`}>
            <div className="w-6 h-6 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
        <div className="font-semibold font-headline text-base text-on-surface truncate">
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

import { 
  Zap, Clock, Globe, GitBranch, Shuffle, GitMerge, Edit, Code, Bot, 
  Sparkles, Brain, Database, Calendar, 
  Filter, SortAsc, Sigma, Play, 
  FileText, Variable, MessageSquare, Mail, Layers,
  UserCheck, Settings
} from 'lucide-react'

// Specific node components using BaseNode and matching icons from Palette
export const WebhookNode = (props: NodeProps) => <BaseNode {...props} icon={<Zap size={20} />} colorClass="bg-primary/20 text-primary" />
export const CronNode = (props: NodeProps) => <BaseNode {...props} icon={<Clock size={20} />} colorClass="bg-primary/20 text-primary" />
export const HttpNode = (props: NodeProps) => <BaseNode {...props} icon={<Globe size={20} />} colorClass="bg-blue-500/20 text-blue-500" />
export const IfNode = (props: NodeProps) => <BaseNode {...props} icon={<GitBranch size={20} />} colorClass="bg-amber-500/20 text-amber-500" />
export const SetNode = (props: NodeProps) => <BaseNode {...props} icon={<Edit size={20} />} colorClass="bg-emerald-500/20 text-emerald-500" />
export const CodeNode = (props: NodeProps) => <BaseNode {...props} icon={<Code size={20} />} colorClass="bg-indigo-500/20 text-indigo-500" />
export const SwitchNode = (props: NodeProps) => <BaseNode {...props} icon={<Shuffle size={20} />} colorClass="bg-orange-500/20 text-orange-500" />
export const MergeNode = (props: NodeProps) => <BaseNode {...props} icon={<GitMerge size={20} />} colorClass="bg-teal-500/20 text-teal-500" />

export const GeminiNode = (props: NodeProps) => <BaseNode {...props} icon={<Sparkles size={20} />} colorClass="bg-blue-500/20 text-blue-500" />
export const OpenAINode = (props: NodeProps) => <BaseNode {...props} icon={<Bot size={20} />} colorClass="bg-emerald-500/20 text-emerald-500" />
export const AnthropicNode = (props: NodeProps) => <BaseNode {...props} icon={<Brain size={20} />} colorClass="bg-orange-500/20 text-orange-500" />
export const SlackNode = (props: NodeProps) => <BaseNode {...props} icon={<MessageSquare size={20} />} colorClass="bg-purple-500/20 text-purple-500" />
export const GitHubNode = (props: NodeProps) => <BaseNode {...props} icon={<Globe size={20} />} colorClass="bg-slate-500/20 text-slate-500" />
export const SheetsNode = (props: NodeProps) => <BaseNode {...props} icon={<Database size={20} />} colorClass="bg-green-500/20 text-green-500" />
export const CalendarNode = (props: NodeProps) => <BaseNode {...props} icon={<Calendar size={20} />} colorClass="bg-blue-400/20 text-blue-400" />
export const EmailNode = (props: NodeProps) => <BaseNode {...props} icon={<Mail size={20} />} colorClass="bg-red-500/20 text-red-500" />
export const DiscordNode = (props: NodeProps) => <BaseNode {...props} icon={<MessageSquare size={20} />} colorClass="bg-indigo-500/20 text-indigo-500" />
export const ImageGenNode = (props: NodeProps) => <BaseNode {...props} icon={<Layers size={20} />} colorClass="bg-fuchsia-500/20 text-fuchsia-500" />

export const FilterNode = (props: NodeProps) => <BaseNode {...props} icon={<Filter size={20} />} colorClass="bg-amber-500/20 text-amber-500" />
export const SortNode = (props: NodeProps) => <BaseNode {...props} icon={<SortAsc size={20} />} colorClass="bg-teal-500/20 text-teal-500" />
export const AggregateNode = (props: NodeProps) => <BaseNode {...props} icon={<Sigma size={20} />} colorClass="bg-rose-500/20 text-rose-500" />
export const EditFieldsNode = (props: NodeProps) => <BaseNode {...props} icon={<Layers size={20} />} colorClass="bg-sky-500/20 text-sky-500" />
export const WaitNode = (props: NodeProps) => <BaseNode {...props} icon={<Clock size={20} />} colorClass="bg-slate-500/20 text-slate-500" />
export const VariableNode = (props: NodeProps) => <BaseNode {...props} icon={<Variable size={20} />} colorClass="bg-slate-400/20 text-slate-400" />
export const SubWorkflowNode = (props: NodeProps) => <BaseNode {...props} icon={<Play size={20} />} colorClass="bg-indigo-400/20 text-indigo-400" />
export const HumanApprovalNode = (props: NodeProps) => <BaseNode {...props} icon={<UserCheck size={20} />} colorClass="bg-rose-500/20 text-rose-500" />
export const FormNode = (props: NodeProps) => <BaseNode {...props} icon={<FileText size={20} />} colorClass="bg-blue-500/20 text-blue-500" />
export const ConfigNode = (props: NodeProps) => <BaseNode {...props} icon={<Settings size={20} />} colorClass="bg-slate-500/20 text-slate-500" />

export const nodeTypes = {
  'webhook-trigger': WebhookNode,
  'cron-trigger': CronNode,
  'http-request': HttpNode,
  'if': IfNode,
  'set': SetNode,
  'code': CodeNode,
  'switch': SwitchNode,
  'merge': MergeNode,
  'google-gemini': GeminiNode,
  'openai': OpenAINode,
  'anthropic': AnthropicNode,
  'slack': SlackNode,
  'github': GitHubNode,
  'google-sheets': SheetsNode,
  'google-calendar': CalendarNode,
  'email': EmailNode,
  'discord': DiscordNode,
  'image-gen': ImageGenNode,
  'filter': FilterNode,
  'sort': SortNode,
  'aggregate': AggregateNode,
  'edit-fields': EditFieldsNode,
  'wait': WaitNode,
  'variable': VariableNode,
  'execute-workflow': SubWorkflowNode,
  'human-approval': HumanApprovalNode,
  'form': FormNode,
  'config': ConfigNode,
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
      return { ...base, label: 'Set Fields', parameters: { fields: '{\n  "status": "active"\n}' } }
    case 'code':
      return { ...base, label: 'Code', parameters: { code: '// Access input data via $input\nreturn $input.all();' } }
    case 'switch':
      return { ...base, label: 'Switch', parameters: { rules: [{ field: '', operator: 'equals', value: '' }] } }
    case 'merge':
      return { ...base, label: 'Merge', parameters: { mode: 'wait', property: '' } }
    case 'ai-agent':
      return { ...base, label: 'AI Agent', parameters: { model: 'gpt-4', prompt: '' } }
    case 'human-approval':
      return { ...base, label: 'Approval', parameters: { message: 'Approve this step' } }
    case 'wait':
      return { ...base, label: 'Wait', parameters: { duration: 5, unit: 'seconds' } }
    case 'config':
      return { ...base, label: 'Config', parameters: { variables: {} } }
    case 'google-gemini':
      return { ...base, label: 'Gemini', domain: 'google.com', parameters: { model: 'gemini-1.5-pro', prompt: '' } }
    case 'openai':
      return { ...base, label: 'OpenAI', domain: 'openai.com', parameters: { model: 'gpt-4o', prompt: '' } }
    case 'anthropic':
      return { ...base, label: 'Claude', domain: 'anthropic.com', parameters: { model: 'claude-3-5-sonnet', prompt: '' } }
    case 'image-gen':
      return { ...base, label: 'AI Image', domain: 'openai.com', parameters: { provider: 'dall-e-3', prompt: '' } }
    case 'slack':
      return { ...base, label: 'Slack', domain: 'slack.com', parameters: { channel: '', message: '' } }
    case 'github':
      return { ...base, label: 'GitHub', domain: 'github.com', parameters: { repo: '', action: 'get_issue' } }
    case 'google-sheets':
      return { ...base, label: 'Sheets', domain: 'google.com', parameters: { spreadsheetId: '', range: 'A1' } }
    case 'google-calendar':
      return { ...base, label: 'Calendar', domain: 'google.com', parameters: { calendarId: 'primary', event: '' } }
    case 'email':
      return { ...base, label: 'Email', domain: 'google.com', parameters: { to: '', subject: '', body: '' } }
    case 'discord':
      return { ...base, label: 'Discord', domain: 'discord.com', parameters: { channelCode: '' } }
    case 'filter':
      return { ...base, label: 'Filter', parameters: { field: '', operator: 'equals', value: '', caseSensitive: false } }
    case 'sort':
      return { ...base, label: 'Sort', parameters: { field: '', order: 'asc', numeric: false, caseSensitive: false } }
    case 'aggregate':
      return { ...base, label: 'Aggregate', parameters: { field: '', operation: 'count', separator: ', ' } }
    case 'edit-fields':
      return { ...base, label: 'Edit Fields', parameters: { mode: 'manual', set: '{}', rename: '{}', strict: false } }
    case 'execute-workflow':
      return { ...base, label: 'Sub-Workflow', parameters: { workflowId: '' } }
    case 'variable':
      return { ...base, label: 'Variable', parameters: { name: '', value: '' } }
    case 'form':
      return { ...base, label: 'Form', parameters: { fields: [] } }
    default:
      return { ...base, label: 'Unknown' }
  }
}

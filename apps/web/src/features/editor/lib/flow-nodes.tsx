import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CompanyLogo } from '../../../components/shared/CompanyLogo'

const SequenceHandle = ({ 
  type, 
  position, 
  id, 
  style, 
  className, 
  isConnectable, 
  nodeId, 
  onAddSequence,
  buttonColor = 'bg-primary'
}: any) => {
  const isSource = type === 'source';
  const mergedStyle = isSource ? { top: '50%', ...style } : style;

  return (
    <>
      <Handle
        type={type}
        position={position}
        id={id}
        isConnectable={isConnectable}
        style={mergedStyle}
        className={className}
      />
      {isSource && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (typeof onAddSequence === 'function') {
              onAddSequence(nodeId, id)
            }
          }}
          style={mergedStyle}
          className={`absolute -right-8 w-6 h-6 rounded-full ${buttonColor} border-2 border-surface flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 z-50 pointer-events-auto -translate-y-1/2 hover:scale-125 transition-all`}
          title="Add node after this port"
        >
          <span className="material-symbols-outlined text-[16px] leading-none text-slate-900 font-black">add</span>
        </button>
      )}
    </>
  )
}

export function BaseNode({
  id,
  data,
  isConnectable,
  icon,
  colorClass,
}: NodeProps & { icon: React.ReactNode; colorClass: string }) {
  // Triggers don't have inputs
  const isTrigger = data.type === 'webhook-trigger' || data.type === 'cron-trigger'
  
  return (
    <div className={`group rounded-[1.5rem] bg-surface-container shadow-[0_12px_32px_rgba(0,0,0,0.4)] min-w-[220px] overflow-hidden transition-all duration-300 ${data.selected ? 'ring-2 ring-primary shadow-[0_0_24px_rgba(var(--color-primary),0.4)] scale-[1.02]' : ''}`}>
      
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
          <CompanyLogo 
            domain={data.domain as string} 
            size={120} 
            theme="dark"
            className="w-11 h-11 shrink-0"
            fallbackIcon={
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 ${colorClass}`}>
                {icon}
              </div>
            }
          />
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

      <SequenceHandle
        type="source"
        position={Position.Right}
        id="main"
        nodeId={id}
        onAddSequence={data.onAddSequence}
        isConnectable={isConnectable}
        buttonColor="bg-primary"
        className="w-4 h-4 bg-primary border-[3px] border-surface shadow-[0_0_10px_rgba(var(--color-primary),0.5)]"
      />
      
      {data.type === 'if' && (
        <SequenceHandle
          type="source"
          position={Position.Right}
          id="false"
          nodeId={id}
          onAddSequence={data.onAddSequence}
          isConnectable={isConnectable}
          buttonColor="bg-error"
          style={{ top: '75%' }}
          className="w-4 h-4 bg-error border-[3px] border-surface shadow-[0_0_10px_rgba(var(--color-error),0.5)]"
        />
      )}
      
      {data.type === 'switch' && Array.isArray((data.parameters as any)?.rules) && (
        (data.parameters as any).rules.map((_: any, idx: number) => (
          <SequenceHandle
            key={idx}
            type="source"
            position={Position.Right}
            id={idx.toString()}
            nodeId={id}
            onAddSequence={data.onAddSequence}
            isConnectable={isConnectable}
            buttonColor="bg-amber-500"
            style={{ top: `${(idx + 1) * (100 / ((data.parameters as any).rules.length + 1))}%` }}
            className="w-4 h-4 bg-amber-400 border-[3px] border-surface shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          />
        ))
      )}
      
      {data.type === 'switch' && !((data.parameters as any)?.rules?.length) && (
        <SequenceHandle
          type="source"
          position={Position.Right}
          id="fallback"
          nodeId={id}
          onAddSequence={data.onAddSequence}
          isConnectable={isConnectable}
          buttonColor="bg-amber-500"
          className="w-4 h-4 bg-amber-400 border-[3px] border-surface shadow-[0_0_10px_rgba(251,191,36,0.5)]"
        />
      )}
      
      {data.type === 'code' && (
        <SequenceHandle
          type="source"
          position={Position.Right}
          id="error"
          nodeId={id}
          onAddSequence={data.onAddSequence}
          isConnectable={isConnectable}
          buttonColor="bg-error"
          style={{ top: '75%' }}
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
  UserCheck, Settings, Send, StickyNote, ListTodo, Users, Cloud,
  CreditCard, ShoppingBag, Share2, HardDrive, Table, Activity, Terminal, Camera
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
export const TelegramNode = (props: NodeProps) => <BaseNode {...props} icon={<Send size={20} />} colorClass="bg-sky-400/20 text-sky-400" />
export const WhatsAppNode = (props: NodeProps) => <BaseNode {...props} icon={<MessageSquare size={20} />} colorClass="bg-emerald-500/20 text-emerald-500" />
export const TeamsNode = (props: NodeProps) => <BaseNode {...props} icon={<MessageSquare size={20} />} colorClass="bg-indigo-400/20 text-indigo-400" />
export const NotionNode = (props: NodeProps) => <BaseNode {...props} icon={<StickyNote size={20} />} colorClass="bg-slate-200/20 text-slate-200" />
export const TrelloNode = (props: NodeProps) => <BaseNode {...props} icon={<HardDrive size={20} />} colorClass="bg-blue-500/20 text-blue-500" />
export const AirtableNode = (props: NodeProps) => <BaseNode {...props} icon={<Table size={20} />} colorClass="bg-blue-400/20 text-blue-400" />
export const AsanaNode = (props: NodeProps) => <BaseNode {...props} icon={<ListTodo size={20} />} colorClass="bg-rose-400/20 text-rose-400" />
export const ClickUpNode = (props: NodeProps) => <BaseNode {...props} icon={<HardDrive size={20} />} colorClass="bg-violet-500/20 text-violet-500" />
export const DriveNode = (props: NodeProps) => <BaseNode {...props} icon={<HardDrive size={20} />} colorClass="bg-amber-500/20 text-amber-500" />
export const HubSpotNode = (props: NodeProps) => <BaseNode {...props} icon={<Users size={20} />} colorClass="bg-orange-500/20 text-orange-500" />
export const SalesforceNode = (props: NodeProps) => <BaseNode {...props} icon={<Cloud size={20} />} colorClass="bg-sky-500/20 text-sky-500" />
export const PipedriveNode = (props: NodeProps) => <BaseNode {...props} icon={<Activity size={20} />} colorClass="bg-emerald-600/20 text-emerald-600" />
export const StripeNode = (props: NodeProps) => <BaseNode {...props} icon={<CreditCard size={20} />} colorClass="bg-indigo-400/20 text-indigo-400" />
export const ShopifyNode = (props: NodeProps) => <BaseNode {...props} icon={<ShoppingBag size={20} />} colorClass="bg-emerald-400/20 text-emerald-400" />
export const WooCommerceNode = (props: NodeProps) => <BaseNode {...props} icon={<ShoppingBag size={20} />} colorClass="bg-purple-600/20 text-purple-600" />
export const MailchimpNode = (props: NodeProps) => <BaseNode {...props} icon={<Mail size={20} />} colorClass="bg-yellow-400/20 text-yellow-400" />
export const TwitterNode = (props: NodeProps) => <BaseNode {...props} icon={<Send size={20} />} colorClass="bg-slate-100/20 text-slate-100" />
export const LinkedinNode = (props: NodeProps) => <BaseNode {...props} icon={<Share2 size={20} />} colorClass="bg-blue-600/20 text-blue-600" />
export const InstagramNode = (props: NodeProps) => <BaseNode {...props} icon={<Camera size={20} />} colorClass="bg-fuchsia-500/20 text-fuchsia-500" />
export const SupabaseNode = (props: NodeProps) => <BaseNode {...props} icon={<Database size={20} />} colorClass="bg-emerald-500/20 text-emerald-500" />
export const PostgreSQLNode = (props: NodeProps) => <BaseNode {...props} icon={<Database size={20} />} colorClass="bg-sky-600/20 text-sky-600" />
export const MySQLNode = (props: NodeProps) => <BaseNode {...props} icon={<Database size={20} />} colorClass="bg-blue-400/20 text-blue-400" />
export const MongoDBNode = (props: NodeProps) => <BaseNode {...props} icon={<Database size={20} />} colorClass="bg-green-600/20 text-green-600" />
export const RedisNode = (props: NodeProps) => <BaseNode {...props} icon={<Activity size={20} />} colorClass="bg-red-600/20 text-red-600" />
export const S3Node = (props: NodeProps) => <BaseNode {...props} icon={<HardDrive size={20} />} colorClass="bg-orange-400/20 text-orange-400" />
export const LambdaNode = (props: NodeProps) => <BaseNode {...props} icon={<Terminal size={20} />} colorClass="bg-orange-600/20 text-orange-600" />

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
  'telegram': TelegramNode,
  'whatsapp': WhatsAppNode,
  'ms-teams': TeamsNode,
  'notion': NotionNode,
  'trello': TrelloNode,
  'airtable': AirtableNode,
  'asana': AsanaNode,
  'clickup': ClickUpNode,
  'google-drive': DriveNode,
  'hubspot': HubSpotNode,
  'salesforce': SalesforceNode,
  'pipedrive': PipedriveNode,
  'stripe': StripeNode,
  'shopify': ShopifyNode,
  'woocommerce': WooCommerceNode,
  'mailchimp': MailchimpNode,
  'twitter': TwitterNode,
  'linkedin': LinkedinNode,
  'instagram': InstagramNode,
  'supabase': SupabaseNode,
  'postgresql': PostgreSQLNode,
  'mysql': MySQLNode,
  'mongodb': MongoDBNode,
  'redis': RedisNode,
  'aws-s3': S3Node,
  'aws-lambda': LambdaNode,
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
    case 'telegram':
      return { ...base, label: 'Telegram', domain: 'telegram.org', parameters: { chatId: '', text: '' } }
    case 'whatsapp':
      return { ...base, label: 'WhatsApp', domain: 'whatsapp.com', parameters: { to: '', message: '' } }
    case 'ms-teams':
      return { ...base, label: 'MS Teams', domain: 'microsoft.com', parameters: { channelId: '', content: '' } }
    case 'notion':
      return { ...base, label: 'Notion', domain: 'notion.so', parameters: { pageId: '', content: '' } }
    case 'trello':
      return { ...base, label: 'Trello', domain: 'trello.com', parameters: { listId: '', cardName: '', cardDesc: '' } }
    case 'airtable':
      return { ...base, label: 'Airtable', domain: 'airtable.com', parameters: { baseId: '', tableId: '', fields: '{}' } }
    case 'asana':
      return { ...base, label: 'Asana', domain: 'asana.com', parameters: { projectId: '', taskName: '' } }
    case 'clickup':
      return { ...base, label: 'ClickUp', domain: 'clickup.com', parameters: { listId: '', taskName: '' } }
    case 'google-drive':
      return { ...base, label: 'Google Drive', domain: 'google.com', parameters: { folderId: 'root', fileName: '', content: '' } }
    case 'hubspot':
      return { ...base, label: 'HubSpot', domain: 'hubspot.com', parameters: { objectType: 'contacts', fields: '{}' } }
    case 'salesforce':
      return { ...base, label: 'Salesforce', domain: 'salesforce.com', parameters: { objectType: 'Contact', fields: '{}' } }
    case 'pipedrive':
      return { ...base, label: 'Pipedrive', domain: 'pipedrive.com', parameters: { objectType: 'persons', fields: '{}' } }
    case 'stripe':
      return { ...base, label: 'Stripe', domain: 'stripe.com', parameters: { action: 'create_customer', data: '{}' } }
    case 'shopify':
      return { ...base, label: 'Shopify', domain: 'shopify.com', parameters: { resource: 'products', action: 'create', data: '{}' } }
    case 'woocommerce':
      return { ...base, label: 'WooCommerce', domain: 'woocommerce.com', parameters: { resource: 'orders', action: 'create', data: '{}' } }
    case 'mailchimp':
      return { ...base, label: 'Mailchimp', domain: 'mailchimp.com', parameters: { listId: '', email: '' } }
    case 'twitter':
      return { ...base, label: 'Twitter', domain: 'twitter.com', parameters: { text: '' } }
    case 'linkedin':
      return { ...base, label: 'LinkedIn', domain: 'linkedin.com', parameters: { text: '' } }
    case 'instagram':
      return { ...base, label: 'Instagram', domain: 'instagram.com', parameters: { caption: '', mediaUrl: '' } }
    case 'supabase':
      return { ...base, label: 'Supabase', domain: 'supabase.com', parameters: { table: '', action: 'select', data: '{}' } }
    case 'postgresql':
      return { ...base, label: 'PostgreSQL', parameters: { query: 'SELECT * FROM users LIMIT 10;' } }
    case 'mysql':
      return { ...base, label: 'MySQL', parameters: { query: 'SELECT * FROM users LIMIT 10;' } }
    case 'mongodb':
      return { ...base, label: 'MongoDB', domain: 'mongodb.com', parameters: { collection: '', query: '{}' } }
    case 'redis':
      return { ...base, label: 'Redis', domain: 'redis.io', parameters: { command: 'SET', key: '', value: '' } }
    case 'aws-s3':
      return { ...base, label: 'AWS S3', domain: 'aws.amazon.com', parameters: { bucket: '', key: '', content: '' } }
    case 'aws-lambda':
      return { ...base, label: 'AWS Lambda', domain: 'aws.amazon.com', parameters: { functionName: '', payload: '{}' } }
    default:
      return { 
        ...base, 
        label: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ') 
      }
  }
}

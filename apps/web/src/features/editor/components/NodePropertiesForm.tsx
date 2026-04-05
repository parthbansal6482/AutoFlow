import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Switch } from '../../../components/ui/Switch'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/Select'
import { Node as FlowNode } from '@xyflow/react'
import { useCredentials } from '../../credentials/hooks/use-credentials'

interface FieldDefinition {
  name: string
  label: string
  type: 'text' | 'select' | 'textarea' | 'number' | 'credential' | 'boolean' | 'json'
  options?: { label: string; value: string }[]
  placeholder?: string
  hint?: string
  showIf?: (parameters: Record<string, any>) => boolean
}

const AI_MODELS = {
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  ],
  gemini: [
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  ],
  anthropic: [
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
    { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
  ]
}

const NODE_SCHEMAS: Record<string, FieldDefinition[]> = {
  'webhook-trigger': [
    { 
      name: 'method', 
      label: 'HTTP Method', 
      type: 'select', 
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' }
      ] 
    },
    { name: 'path', label: 'Webhook Path', type: 'text', placeholder: 'wh-abc123' },
  ],
  'cron-trigger': [
    { name: 'cron', label: 'Cron Expression', type: 'text', placeholder: '* * * * *', hint: 'Standard crontab format' },
    { name: 'timezone', label: 'Timezone', type: 'text', placeholder: 'UTC' },
  ],
  'http-request': [
    { 
      name: 'method', 
      label: 'Method', 
      type: 'select', 
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' }
      ] 
    },
    { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com' },
    { name: 'credentialId', label: 'Authentication', type: 'credential' },
  ],
  'if': [
    { name: 'field', label: 'Field to Check', type: 'text', placeholder: 'e.g. data.status' },
    { 
      name: 'operator', 
      label: 'Operator', 
      type: 'select', 
      options: [
        { label: 'Equals', value: 'equals' },
        { label: 'Not Equals', value: 'not_equals' },
        { label: 'Contains', value: 'contains' },
        { label: 'Greater Than', value: 'gt' },
        { label: 'Less Than', value: 'lt' }
      ] 
    },
    { name: 'value', label: 'Value', type: 'text', placeholder: 'Value to compare' },
  ],
  'slack': [
    { name: 'credentialId', label: 'Slack Credential', type: 'credential' },
    { name: 'channel', label: 'Channel ID / Name', type: 'text', placeholder: 'C01234567' },
    { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Hello from AutoFlow!' },
  ],
  'discord': [
    { name: 'credentialId', label: 'Discord Bot Credential', type: 'credential' },
    { name: 'channelCode', label: 'Channel ID', type: 'text' },
  ],
  'github': [
    { name: 'credentialId', label: 'GitHub Credential', type: 'credential' },
    { name: 'repo', label: 'Repository', type: 'text', placeholder: 'owner/repo' },
    { 
      name: 'action', 
      label: 'Action', 
      type: 'select', 
      options: [
        { label: 'Get Issue', value: 'get_issue' },
        { label: 'Create Issue', value: 'create_issue' },
        { label: 'List Pull Requests', value: 'list_prs' }
      ] 
    },
  ],
  'google-gemini': [
    { name: 'credentialId', label: 'Google Credential', type: 'credential' },
    { name: 'model', label: 'Model', type: 'select', options: AI_MODELS.gemini },
    { name: 'prompt', label: 'Prompt', type: 'textarea' },
  ],
  'openai': [
    { name: 'credentialId', label: 'OpenAI Credential', type: 'credential' },
    { name: 'model', label: 'Model', type: 'select', options: AI_MODELS.openai },
    { name: 'prompt', label: 'Prompt', type: 'textarea' },
  ],
  'anthropic': [
    { name: 'credentialId', label: 'Anthropic Credential', type: 'credential' },
    { name: 'model', label: 'Model', type: 'select', options: AI_MODELS.anthropic },
    { name: 'prompt', label: 'Prompt', type: 'textarea' },
  ],
  'email': [
    { name: 'credentialId', label: 'Google Email Credential', type: 'credential' },
    { name: 'to', label: 'To', type: 'text' },
    { name: 'subject', label: 'Subject', type: 'text' },
    { name: 'body', label: 'Body', type: 'textarea' },
  ],
  'google-sheets': [
    { name: 'credentialId', label: 'Google Sheets Credential', type: 'credential' },
    { name: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text' },
    { name: 'range', label: 'Range', type: 'text', placeholder: 'Sheet1!A1:B10' },
  ],
  'google-calendar': [
    { name: 'credentialId', label: 'Google Calendar Credential', type: 'credential' },
    { name: 'calendarId', label: 'Calendar ID', type: 'text', placeholder: 'primary' },
    { name: 'event', label: 'Event Details', type: 'text' },
  ],
  'set': [
    { name: 'fields', label: 'Fields to Set', type: 'json', placeholder: '{"id": 1, "status": "active"}' },
  ],
  'filter': [
    { name: 'field', label: 'Field to Filter', type: 'text', placeholder: 'e.g. status' },
    { 
      name: 'operator', 
      label: 'Operator', 
      type: 'select', 
      options: [
        { label: 'Equals', value: 'equals' },
        { label: 'Not Equals', value: 'not_equals' },
        { label: 'Contains', value: 'contains' },
        { label: 'Not Contains', value: 'not_contains' },
        { label: 'Greater Than', value: 'gt' },
        { label: 'Greater Than or Equal', value: 'gte' },
        { label: 'Less Than', value: 'lt' },
        { label: 'Less Than or Equal', value: 'lte' },
        { label: 'Exists', value: 'exists' },
        { label: 'Not Exists', value: 'not_exists' }
      ] 
    },
    { name: 'value', label: 'Value', type: 'text', placeholder: 'Comparison value' },
    { name: 'caseSensitive', label: 'Case Sensitive', type: 'boolean' },
  ],
  'sort': [
    { name: 'field', label: 'Field to Sort By', type: 'text', placeholder: 'e.g. createdAt' },
    { 
      name: 'order', 
      label: 'Order', 
      type: 'select', 
      options: [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' }
      ] 
    },
    { name: 'numeric', label: 'Numeric Sort', type: 'boolean' },
    { name: 'caseSensitive', label: 'Case Sensitive', type: 'boolean' },
  ],
  'aggregate': [
    { name: 'field', label: 'Field Path', type: 'text', placeholder: 'e.g. price' },
    { 
      name: 'operation', 
      label: 'Operation', 
      type: 'select', 
      options: [
        { label: 'Count', value: 'count' },
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'avg' },
        { label: 'Minimum', value: 'min' },
        { label: 'Maximum', value: 'max' },
        { label: 'Concatenate', value: 'concat' }
      ] 
    },
    { 
      name: 'separator', 
      label: 'Separator (for Concat)', 
      type: 'text', 
      placeholder: ', ',
      showIf: (params) => params.operation === 'concat'
    },
  ],
  'switch': [
    { name: 'field', label: 'Field to Switch On', type: 'text', placeholder: 'e.g. type' },
    { name: 'cases', label: 'Rules (JSON)', type: 'json', placeholder: '[{"operator": "equals", "value": "A", "output": "case-1"}]' },
    { 
      name: 'fallbackOutput', 
      label: 'Fallback Output', 
      type: 'select', 
      options: [
        { label: 'Case 1', value: 'case-1' },
        { label: 'Case 2', value: 'case-2' },
        { label: 'Case 3', value: 'case-3' },
        { label: 'Default', value: 'default' }
      ] 
    },
  ],
  'merge': [
    { 
      name: 'mode', 
      label: 'Merge Mode', 
      type: 'select', 
      options: [
        { label: 'Append (Concat)', value: 'append' },
        { label: 'Index (Join side-by-side)', value: 'index' }
      ] 
    },
    { name: 'keepUnpaired', label: 'Keep Unpaired Items', type: 'boolean' },
    { 
      name: 'prefer', 
      label: 'Collision Priority', 
      type: 'select', 
      options: [
        { label: 'Prefer Second Input (Right)', value: 'right' },
        { label: 'Prefer First Input (Left)', value: 'left' }
      ] 
    }
  ],
  'edit-fields': [
    { 
      name: 'mode', 
      label: 'Edit Mode', 
      type: 'select', 
      options: [
        { label: 'Manual Mapping', value: 'manual' },
        { label: 'Keep Only Specific Fields', value: 'keepOnly' },
        { label: 'Remove Specific Fields', value: 'remove' }
      ] 
    },
    { 
      name: 'set', 
      label: 'Set / Replace Fields (JSON)', 
      type: 'json',
      showIf: (params) => params.mode === 'manual'
    },
    { 
      name: 'rename', 
      label: 'Rename Fields (JSON)', 
      type: 'json',
      showIf: (params) => params.mode === 'manual'
    },
    { 
      name: 'keep', 
      label: 'Keep Fields (Array)', 
      type: 'json',
      showIf: (params) => params.mode === 'keepOnly'
    },
    { 
      name: 'remove', 
      label: 'Remove Fields (Array)', 
      type: 'json',
      showIf: (params) => params.mode === 'remove'
    },
    { name: 'strict', label: 'Strict Mode', type: 'boolean' },
  ],
  'execute-workflow': [
    { name: 'workflowId', label: 'Sub-Workflow', type: 'text', placeholder: 'Enter Workflow ID' },
  ],
  'image-gen': [
    { name: 'credentialId', label: 'AI Credential', type: 'credential' },
    { name: 'prompt', label: 'Image Prompt', type: 'textarea' },
    { 
      name: 'size', 
      label: 'Size', 
      type: 'select', 
      options: [
        { label: '1024x1024', value: '1024x1024' },
        { label: '512x512', value: '512x512' }
      ] 
    },
  ],
  'config': [
    { name: 'timezone', label: 'Workflow Timezone', type: 'text', placeholder: 'UTC' },
    { name: 'maxRetries', label: 'Max Retries', type: 'number' },
  ],
  'human-approval': [
    { name: 'message', label: 'Approval Message', type: 'text', placeholder: 'Please approve this step' },
    { name: 'timeoutHours', label: 'Timeout (Hours)', type: 'number' },
  ],
  'form': [
    { name: 'title', label: 'Form Title', type: 'text' },
    { name: 'fields', label: 'Fields (JSON)', type: 'textarea', placeholder: '[{"label": "Email", "type": "text"}]' },
  ],
  'variable': [
    { name: 'name', label: 'Variable Name', type: 'text' },
    { name: 'value', label: 'Value', type: 'text' },
  ],
  'wait': [
    { name: 'duration', label: 'Duration', type: 'number' },
    { 
      name: 'unit', 
      label: 'Unit', 
      type: 'select', 
      options: [
        { label: 'Seconds', value: 'seconds' },
        { label: 'Minutes', value: 'minutes' },
        { label: 'Hours', value: 'hours' }
      ] 
    },
  ]
}

// Map node types/domains to credential types
const NODE_TO_CREDENTIAL_TYPE: Record<string, string> = {
  'openai': 'openai',
  'google-gemini': 'google',
  'anthropic': 'anthropic',
  'slack': 'slack',
  'github': 'github',
  'google-sheets': 'google',
  'google-calendar': 'google',
  'email': 'google',
  'discord': 'discord',
}

interface NodePropertiesFormProps {
  node: FlowNode
  updateNodeData: (nodeId: string, updates: Record<string, any>) => void
}

export function NodePropertiesForm({ node, updateNodeData }: NodePropertiesFormProps) {
  const schema = NODE_SCHEMAS[node.type as string]
  const parameters = (node.data.parameters as Record<string, any>) || {}
  const { data: credentials, isLoading } = useCredentials()

  const handleChange = (name: string, value: any) => {
    updateNodeData(node.id, {
      parameters: {
        ...parameters,
        [name]: value
      }
    })
  }

  const getCredentialOptions = () => {
    if (!credentials) return []
    
    // Determine the required credential type for this node
    const requiredType = NODE_TO_CREDENTIAL_TYPE[node.type as string]
    
    return credentials
      .filter(c => {
        // Exact service-type match (e.g. c.type === 'google' for google-gemini node)
        if (requiredType && c.type === requiredType) return true
        
        // Always allow generic 'apiKey' and 'http' credentials as fallbacks
        if (c.type === 'apiKey' || c.type === 'http') return true
        
        // If the node doesn't have a specific requirement, show everything
        if (!requiredType) return true
        
        return false
      })
      .map(c => ({
        label: c.name,
        value: c.id
      }))
  }

  if (!schema) {
    return (
      <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 text-center">
        <p className="text-sm text-on-surface-variant italic">No specialized form available for this node type.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {schema.filter(field => !field.showIf || field.showIf(parameters)).map((field) => (
        <div key={field.name}>
          {field.type === 'select' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant font-label px-1">
                {field.label}
              </label>
              <Select 
                value={parameters[field.name] || ''} 
                onValueChange={(val) => handleChange(field.name, val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : field.type === 'credential' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant font-label px-1">
                {field.label}
              </label>
              <Select 
                value={parameters[field.name] || ''} 
                onValueChange={(val) => handleChange(field.name, val)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoading ? "Loading credentials..." : "Select a credential"} />
                </SelectTrigger>
                <SelectContent>
                  {getCredentialOptions().length > 0 ? (
                    getCredentialOptions().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No credentials found for this service
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {getCredentialOptions().length === 0 && !isLoading && (
                <p className="text-[10px] text-primary font-medium pl-1">
                  Connect a new account in the <span className="underline cursor-pointer" onClick={() => window.location.href='/credentials'}>Credentials</span> page.
                </p>
              )}
            </div>
          ) : field.type === 'boolean' ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 h-11">
              <label className="text-sm font-medium text-on-surface cursor-pointer select-none" onClick={() => handleChange(field.name, !parameters[field.name])}>
                {field.label}
              </label>
              <Switch 
                checked={!!parameters[field.name]} 
                onCheckedChange={(val) => handleChange(field.name, val)}
              />
            </div>
          ) : field.type === 'json' ? (
            <Textarea
              label={field.label}
              placeholder={field.placeholder}
              value={typeof parameters[field.name] === 'object' ? JSON.stringify(parameters[field.name], null, 2) : parameters[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              hint={field.hint || 'JSON object or array'}
              className="min-h-[100px] font-mono text-xs"
            />
          ) : field.type === 'textarea' ? (
            <Textarea
              label={field.label}
              placeholder={field.placeholder}
              value={parameters[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              hint={field.hint}
              className="min-h-[120px]"
            />
          ) : (
            <Input
              label={field.label}
              type={field.type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder}
              value={parameters[field.name] || ''}
              onChange={(e) => handleChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
              hint={field.hint}
            />
          )}

        </div>
      ))}
    </div>
  )
}

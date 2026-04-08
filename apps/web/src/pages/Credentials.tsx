import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Key, Plus, Trash2, Lock, Share2, Link as LinkIcon } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useCredentials, useCreateCredential, useDeleteCredential } from '../features/credentials/hooks/use-credentials'
import { useShareCredential } from '../features/credentials/hooks/use-credential-shares'
import { useWorkspaceMembers } from '../features/workflows/hooks/use-workspace-members'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog'
import type { CredentialType } from '@workflow/types'

interface CredentialField {
  name: string
  label: string
  type: 'text' | 'password'
  placeholder?: string
}

const CREDENTIAL_SCHEMAS: Record<string, { fields: CredentialField[] }> = {
  apiKey: { fields: [{ name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your API Key' }] },
  http: { fields: [{ name: 'Authorization', label: 'Authorization (Bearer token)', type: 'password', placeholder: 'Bearer sk-...' }] },
  basic: {
    fields: [
      { name: 'username', label: 'Username', type: 'text' },
      { name: 'password', label: 'Password', type: 'password' }
    ]
  },
  oauth2: { fields: [{ name: 'access_token', label: 'Access Token', type: 'password' }] },
  google: { fields: [{ name: 'apiKey', label: 'Google API Key', type: 'password', placeholder: 'AIza...' }] },
  openai: { fields: [{ name: 'apiKey', label: 'OpenAI API Key', type: 'password', placeholder: 'sk-...' }] },
  anthropic: { fields: [{ name: 'apiKey', label: 'Anthropic API Key', type: 'password', placeholder: 'sk-ant-...' }] },
  slack: { fields: [{ name: 'token', label: 'Slack Bot Token', type: 'password', placeholder: 'xoxb-...' }] },
  discord: { fields: [{ name: 'token', label: 'Discord Bot Token', type: 'password', placeholder: 'MTIz...' }] },
  telegram: { fields: [{ name: 'token', label: 'Telegram Bot Token', type: 'password' }] },
  whatsapp: { 
    fields: [
      { name: 'accountSid', label: 'Twilio Account SID', type: 'text', placeholder: 'AC...' },
      { name: 'authToken', label: 'Twilio Auth Token', type: 'password' },
      { name: 'from', label: 'Twilio From Number', type: 'text', placeholder: '+1...' }
    ] 
  },
  notion: { fields: [{ name: 'token', label: 'Notion Integration Token', type: 'password', placeholder: 'secret_...' }] },
  github: { fields: [{ name: 'token', label: 'GitHub Personal Access Token', type: 'password', placeholder: 'github_pat_...' }] },
  asana: { fields: [{ name: 'token', label: 'Asana Access Token', type: 'password' }] },
  clickup: { fields: [{ name: 'token', label: 'ClickUp Access Token', type: 'password', placeholder: 'pk_...' }] },
  hubspot: { fields: [{ name: 'token', label: 'HubSpot Private App Access Token', type: 'password', placeholder: 'pat-na1-...' }] },
  salesforce: { fields: [{ name: 'token', label: 'Salesforce Token', type: 'password' }] },
  pipedrive: { fields: [{ name: 'token', label: 'Pipedrive API Token', type: 'password' }] },
  twitter: { fields: [{ name: 'token', label: 'Twitter Bearer Token', type: 'password' }] },
  linkedin: { fields: [{ name: 'token', label: 'LinkedIn Access Token', type: 'password' }] },
  instagram: { fields: [{ name: 'token', label: 'Instagram Graph API Token', type: 'password' }] },
  aws: {
    fields: [
      { name: 'accessKeyId', label: 'AWS Access Key ID', type: 'text' },
      { name: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password' },
      { name: 'region', label: 'AWS Region', type: 'text', placeholder: 'us-east-1' }
    ]
  },
  postgres: { fields: [{ name: 'connectionString', label: 'PostgreSQL Connection String', type: 'text', placeholder: 'postgresql://user:pass@host/db' }] },
  mysql: { fields: [{ name: 'connectionString', label: 'MySQL Connection String', type: 'text', placeholder: 'mysql://user:pass@host:3306/db' }] },
  mongodb: { fields: [{ name: 'connectionString', label: 'MongoDB Connection String', type: 'text', placeholder: 'mongodb+srv://...' }] },
  redis: { fields: [{ name: 'connectionString', label: 'Redis Connection String', type: 'text', placeholder: 'redis://...' }] },
  smtp: {
    fields: [
      { name: 'host', label: 'SMTP Host', type: 'text' },
      { name: 'port', label: 'SMTP Port', type: 'text', placeholder: '587' },
      { name: 'user', label: 'SMTP User', type: 'text' },
      { name: 'password', label: 'SMTP Password', type: 'password' }
    ]
  },
}

export default function Credentials() {
  const { data: credentials, isLoading, error } = useCredentials()
  const createCred = useCreateCredential()
  const deleteCred = useDeleteCredential()

  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<CredentialType>('apiKey')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [createError, setCreateError] = useState('')

  const [shareOpen, setShareOpen] = useState(false)
  const [selectedCred, setSelectedCred] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState('')
  
  const shareCred = useShareCredential()
  const { data: members } = useWorkspaceMembers()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    
    if (!name.trim()) {
      setCreateError('Credential name is required')
      return
    }

    const schema = CREDENTIAL_SCHEMAS[type]
    const missing = schema.fields.find(f => !formData[f.name]?.trim())
    if (missing) {
      setCreateError(`${missing.label} is required`)
      return
    }

    try {
      await createCred.mutateAsync({
        name,
        type,
        data: formData
      })
      setIsOpen(false)
      setName('')
      setType('apiKey')
      setFormData({})
    } catch (err: any) {
      setCreateError(err.message || 'Failed to encrypt credential')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential? Nodes using it will fail.')) return
    try {
      await deleteCred.mutateAsync(id)
    } catch (err) {
      console.error('Failed to delete', err)
    }
  }

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCred || !selectedMember) return
    try {
      await shareCred.mutateAsync({ credentialId: selectedCred.id, memberId: selectedMember })
      setShareOpen(false)
      setSelectedCred(null)
      setSelectedMember('')
    } catch (err) {
      console.error('Failed to share', err)
    }
  }

  if (error) {
    return (
      <div className="p-8 font-body">
        <div className="rounded-2xl bg-error-container p-6 flex flex-col items-center justify-center">
          <p className="text-on-error-container font-medium">Failed to load credentials: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto min-h-screen font-body">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold font-headline tracking-tighter text-on-surface flex items-center gap-3">
            <div className="p-2 bg-surface-container-highest rounded-xl text-primary">
              <Key size={28} strokeWidth={2.5} />
            </div>
            Credentials
          </h1>
          <p className="text-on-surface-variant mt-2 tracking-wide font-medium">Stored securely. Plaintext secrets are never written to the database.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-5 font-semibold">
          <Plus size={18} strokeWidth={2.5} />
          Add Credential
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
        </div>
      ) : credentials?.length === 0 ? (
        <div className="rounded-[2rem] bg-surface-container p-16 text-center flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-[1.5rem] bg-surface-container-highest flex items-center justify-center text-on-surface-variant mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
            <Lock size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-semibold font-headline text-on-surface tracking-tight">No credentials yet</h3>
          <p className="mt-3 text-on-surface-variant font-medium text-lg max-w-sm mx-auto">Before nodes can authenticate, you need to securely store their credentials here.</p>
          <div className="mt-10">
            <Button onClick={() => setIsOpen(true)} className="px-8 py-5 text-base font-semibold">Add Credential</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-[2.5rem] bg-surface-container overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-surface-container-highest/50 text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs">Name</th>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs">Type</th>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs">Created At</th>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {credentials?.map((cred) => (
                <tr key={cred.id} className="hover:bg-surface-container-highest/30 transition-colors duration-200 group">
                  <td className="px-8 py-5 font-bold text-on-surface flex items-center gap-4 text-base">
                    <div className="h-12 w-12 rounded-[1rem] bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                      <Key size={20} />
                    </div>
                    {cred.name}
                  </td>
                  <td className="px-8 py-5 text-on-surface-variant font-semibold uppercase tracking-wide">{cred.type}</td>
                  <td className="px-8 py-5 text-on-surface-variant font-medium">
                    {formatDistanceToNow(new Date(cred.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {cred.type === 'oauth2' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-on-surface-variant hover:text-primary hover:bg-surface-container-highest p-2 rounded-xl"
                          onClick={() => window.alert('OAuth redirect handler would trigger here.')}
                          title="Connect OAuth"
                        >
                          <LinkIcon size={18} />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-on-surface-variant hover:text-primary hover:bg-surface-container-highest p-2 rounded-xl" 
                        onClick={() => {
                          setSelectedCred(cred)
                          setShareOpen(true)
                        }}
                        title="Share Credential"
                      >
                        <Share2 size={18} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-error hover:text-on-error-container hover:bg-error-container p-2 rounded-xl" 
                        onClick={() => handleDelete(cred.id)} 
                        disabled={deleteCred.isPending}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-semibold font-headline text-on-surface">
                <div className="p-2 bg-surface-container-highest rounded-xl text-primary">
                  <Lock strokeWidth={2.5} size={24} />
                </div>
                Add Credential
              </DialogTitle>
              <DialogDescription className="mt-2 text-on-surface-variant font-medium">
                Secrets are encrypted via AES-256-GCM globally on edge nodes. The database cannot decrypt them.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-6">
              {createError && (
                <div className="p-4 bg-error-container rounded-[1rem] text-error text-sm font-semibold text-center">
                  {createError}
                </div>
              )}
              
              <Input
                autoFocus
                label="Credential Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Stripe API Key"
                disabled={createCred.isPending}
              />

              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Credential Type</label>
                <Select value={type} onValueChange={(value) => {
                    const t = value as CredentialType
                    setType(t)
                    setFormData({})
                  }} disabled={createCred.isPending}>
                  <SelectTrigger className="bg-surface-container-lowest">
                    <SelectValue placeholder="Select credential type" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">General</div>
                    <SelectItem value="apiKey">API Key (Generic)</SelectItem>
                    <SelectItem value="http">HTTP / Bearer Token</SelectItem>
                    <SelectItem value="oauth2">OAuth2</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>

                    <div className="px-2 py-1.5 mt-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">AI & Communication</div>
                    <SelectItem value="google">Google / Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp (Twilio)</SelectItem>

                    <div className="px-2 py-1.5 mt-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Productivity & CRM</div>
                    <SelectItem value="notion">Notion</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="asana">Asana</SelectItem>
                    <SelectItem value="clickup">ClickUp</SelectItem>
                    <SelectItem value="hubspot">HubSpot</SelectItem>
                    <SelectItem value="salesforce">Salesforce</SelectItem>
                    <SelectItem value="pipedrive">Pipedrive</SelectItem>

                    <div className="px-2 py-1.5 mt-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Marketing & Social</div>
                    <SelectItem value="mailchimp">Mailchimp</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>

                    <div className="px-2 py-1.5 mt-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Infrastructure</div>
                    <SelectItem value="aws">AWS</SelectItem>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                    <SelectItem value="redis">Redis</SelectItem>
                    <SelectItem value="smtp">SMTP (Email)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4 pt-2">
                {CREDENTIAL_SCHEMAS[type].fields.map((field) => (
                  <Input
                    key={field.name}
                    label={field.label}
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    disabled={createCred.isPending}
                    className={field.type === 'password' ? "font-mono tracking-wider" : ""}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-outline-variant/30">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={createCred.isPending} className="text-on-surface hover:bg-surface-container-highest font-semibold px-5">
                Cancel
              </Button>
              <Button type="submit" isLoading={createCred.isPending} className="font-semibold px-6">
                Encrypt & Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <form onSubmit={handleShare}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-semibold font-headline text-on-surface">
                <div className="p-2 bg-surface-container-highest rounded-xl text-primary">
                  <Share2 strokeWidth={2.5} size={24} />
                </div>
                Share "{selectedCred?.name}"
              </DialogTitle>
              <DialogDescription className="mt-2 text-on-surface-variant font-medium">
                Allow a workspace member to use this credential in their workflows. They will not be able to view the raw secret.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Select Member</label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="bg-surface-container-lowest">
                    <SelectValue placeholder="Choose a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.email} ({m.role})
                      </SelectItem>
                    ))}
                    {(!members || members.length === 0) && (
                      <SelectItem value="none" disabled>No other workspace members.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-outline-variant/30">
              <Button type="button" variant="ghost" onClick={() => setShareOpen(false)} className="text-on-surface hover:bg-surface-container-highest font-semibold px-5">
                Cancel
              </Button>
              <Button type="submit" isLoading={shareCred.isPending} disabled={!selectedMember || selectedMember === 'none'} className="font-semibold px-6">
                Share Secret
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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

export default function Credentials() {
  const { data: credentials, isLoading, error } = useCredentials()
  const createCred = useCreateCredential()
  const deleteCred = useDeleteCredential()

  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<CredentialType>('apiKey')
  // For simplicity, we just take one key/value pair right now.
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [createError, setCreateError] = useState('')

  const [shareOpen, setShareOpen] = useState(false)
  const [selectedCred, setSelectedCred] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState('')
  
  const shareCred = useShareCredential()
  const { data: members } = useWorkspaceMembers()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    
    if (!name.trim() || !key.trim() || !value.trim()) {
      setCreateError('All fields are required')
      return
    }

    try {
      await createCred.mutateAsync({
        name,
        type,
        data: { [key]: value }
      })
      setIsOpen(false)
      setName('')
      setType('apiKey')
      setKey('')
      setValue('')
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
                <Select value={type} onValueChange={(value) => setType(value as CredentialType)} disabled={createCred.isPending}>
                  <SelectTrigger className="bg-surface-container-lowest">
                    <SelectValue placeholder="Select credential type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apiKey">API Key</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="oauth2">OAuth2</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="postgres">Postgres</SelectItem>
                    <SelectItem value="smtp">SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g. Authorization"
                  disabled={createCred.isPending}
                />
                <Input
                  label="Secret Value"
                  type="password"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. Bearer sk_test_..."
                  disabled={createCred.isPending}
                  className="font-mono tracking-wider"
                />
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

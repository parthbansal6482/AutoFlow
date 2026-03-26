import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useCredentials, useCreateCredential, useDeleteCredential } from '../hooks/use-credentials'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog'

export default function Credentials() {
  const { data: credentials, isLoading, error } = useCredentials()
  const createCred = useCreateCredential()
  const deleteCred = useDeleteCredential()

  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  // For simplicity, we just take one key/value pair right now.
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [createError, setCreateError] = useState('')

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
        secretData: { [key]: value }
      })
      setIsOpen(false)
      setName('')
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

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-[hsl(var(--destructive)/0.1)] p-4 border border-[hsl(var(--destructive)/0.2)]">
          <p className="text-[hsl(var(--destructive))]">Failed to load credentials: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Credentials</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Stored securely. Plaintext secrets are never written to the database.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Credential
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
        </div>
      ) : credentials?.length === 0 ? (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))] opacity-50 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          </div>
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">No credentials yet</h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Before nodes can authenticate, you need to store their credentials here.</p>
          <div className="mt-6">
            <Button onClick={() => setIsOpen(true)}>Add Credential</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-[hsl(var(--secondary)/0.5)] text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Created At</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {credentials?.map((cred) => (
                <tr key={cred.id} className="hover:bg-[hsl(var(--secondary)/0.3)] transition-colors">
                  <td className="px-6 py-4 font-medium text-[hsl(var(--foreground))] flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    </div>
                    {cred.name}
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">
                    {formatDistanceToNow(new Date(cred.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]" onClick={() => handleDelete(cred.id)} disabled={deleteCred.isPending}>
                      Delete
                    </Button>
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
              <DialogTitle>Add Credential</DialogTitle>
              <DialogDescription>
                Secrets are encrypted via AES-256-GCM globally on edge nodes. The database cannot decrypt them.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              {createError && (
                <div className="p-3 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] rounded text-[hsl(var(--destructive))] text-sm">
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={createCred.isPending}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createCred.isPending}>
                Encrypt & Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Key, Plus, Trash2, Lock } from 'lucide-react'
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
        <div className="rounded-xl bg-red-500/10 p-6 border border-red-500/20 backdrop-blur-md">
          <p className="text-red-400 font-medium">Failed to load credentials: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Key className="text-stitch-blue-accent" size={28} />
            Credentials
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Stored securely. Plaintext secrets are never written to the database.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="flex items-center gap-2">
          <Plus size={18} />
          Add Credential
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-stitch-blue-accent border-t-transparent shadow-[0_0_15px_rgba(43,110,245,0.5)]" />
        </div>
      ) : credentials?.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-16 text-center shadow-glass flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-6 shadow-inner">
            <Lock size={32} />
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">No credentials yet</h3>
          <p className="mt-2 text-gray-400 font-medium max-w-sm mx-auto">Before nodes can authenticate, you need to securely store their credentials here.</p>
          <div className="mt-8">
            <Button onClick={() => setIsOpen(true)} className="px-8 py-6 text-lg">Add Credential</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#16111e]/80 backdrop-blur-xl overflow-hidden shadow-glass">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-black/40 text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Name</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Created At</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {credentials?.map((cred) => (
                <tr key={cred.id} className="hover:bg-white/5 transition-colors duration-200 group">
                  <td className="px-6 py-5 font-bold text-white flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                      <Key size={18} />
                    </div>
                    {cred.name}
                  </td>
                  <td className="px-6 py-5 text-gray-400 font-medium">
                    {formatDistanceToNow(new Date(cred.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-white hover:bg-red-500/20 h-9 w-9 p-0 rounded-lg" onClick={() => handleDelete(cred.id)} disabled={deleteCred.isPending}>
                      <span className="sr-only">Delete</span>
                      <Trash2 size={16} />
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
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Lock className="text-stitch-blue-accent" size={24} />
                Add Credential
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-400">
                Secrets are encrypted via AES-256-GCM globally on edge nodes. The database cannot decrypt them.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-5">
              {createError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
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
                className="bg-black/20"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g. Authorization"
                  disabled={createCred.isPending}
                  className="bg-black/20"
                />
                <Input
                  label="Secret Value"
                  type="password"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. Bearer sk_test_..."
                  disabled={createCred.isPending}
                  className="bg-black/20 font-mono tracking-wider"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={createCred.isPending} className="hover:bg-white/10 text-gray-300">
                Cancel
              </Button>
              <Button type="submit" isLoading={createCred.isPending} className="bg-stitch-blue-accent hover:bg-blue-600 shadow-[0_0_20px_rgba(43,110,245,0.4)]">
                Encrypt & Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

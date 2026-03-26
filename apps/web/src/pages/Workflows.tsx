import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow, useUpdateWorkflow } from '../hooks/use-workflows'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog'

export default function Workflows() {
  const navigate = useNavigate()
  const { data: workflows, isLoading, error } = useWorkflows()
  const createWorkflow = useCreateWorkflow()
  const deleteWorkflow = useDeleteWorkflow()
  const updateWorkflow = useUpdateWorkflow()

  // Create workflow modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newBgName, setNewBgName] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBgName.trim()) return
    
    try {
      const newWf = await createWorkflow.mutateAsync(newBgName)
      setIsCreateOpen(false)
      setNewBgName('')
      navigate(`/workflow/${newWf.id}`)
    } catch (err) {
      console.error('Failed to create workflow', err)
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateWorkflow.mutateAsync({ id, updates: { active: !currentActive } })
    } catch (err) {
      console.error('Failed to toggle workflow active state', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return
    try {
      await deleteWorkflow.mutateAsync(id)
    } catch (err) {
      console.error('Failed to delete workflow', err)
    }
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-[hsl(var(--destructive)/0.1)] p-4 border border-[hsl(var(--destructive)/0.2)]">
          <p className="text-[hsl(var(--destructive))]">Failed to load workflows: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Workflows</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Manage and monitor your automated workflows.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
        </div>
      ) : workflows?.length === 0 ? (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))] opacity-50 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
          </div>
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">No workflows found</h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Get started by creating a new workflow.</p>
          <div className="mt-6">
            <Button onClick={() => setIsCreateOpen(true)}>Create Workflow</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows?.map((wf) => (
            <div key={wf.id} className="group relative flex flex-col rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary)/0.5)] transition-colors overflow-hidden shadow-sm">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex items-center justify-center">
                    <svg className="h-5 w-5 text-[hsl(var(--foreground))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                  </div>
                  
                  {/* Status toggle */}
                  <button 
                    onClick={() => toggleActive(wf.id, wf.active)}
                    title={wf.active ? "Deactivate" : "Activate"}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 ${wf.active ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`}
                  >
                    <span className="sr-only">Use setting</span>
                    <span aria-hidden="true" className={`pointer-events-none absolute left-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${wf.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <Link to={`/workflow/${wf.id}`} className="hover:underline focus:outline-none">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] line-clamp-1">{wf.name}</h3>
                </Link>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {wf.nodes?.length || 0} nodes
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] px-5 py-3">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Edited {formatDistanceToNow(new Date(wf.updated_at), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/workflow/${wf.id}`)}>
                    <span className="sr-only">Edit</span>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]" onClick={() => handleDelete(wf.id)}>
                    <span className="sr-only">Delete</span>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>
                Give your new workflow a descriptive name.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <Input
                autoFocus
                label="Workflow Name"
                value={newBgName}
                onChange={(e) => setNewBgName(e.target.value)}
                placeholder="e.g. Sync Shopify to Airtable"
                disabled={createWorkflow.isPending}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={createWorkflow.isPending}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createWorkflow.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

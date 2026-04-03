import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Workflow, Plus, Trash2, Settings, Activity } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow, useUpdateWorkflow } from '../features/workflows/hooks/use-workflows'
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
        <div className="rounded-2xl bg-error-container p-6 flex flex-col items-center justify-center">
          <p className="text-on-error-container font-medium">Failed to load workflows: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen font-body">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold font-headline tracking-tighter text-on-surface flex items-center gap-3">
            <div className="p-2 bg-surface-container-highest rounded-xl text-primary">
              <Workflow size={28} strokeWidth={2.5} />
            </div>
            Workflows
          </h1>
          <p className="text-on-surface-variant mt-2 font-medium tracking-wide">Manage and monitor your automated workflows.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 px-5 font-semibold">
          <Plus size={18} strokeWidth={2.5} />
          New Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
        </div>
      ) : workflows?.length === 0 ? (
        <div className="rounded-[2rem] bg-surface-container p-16 text-center flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-[1.5rem] bg-surface-container-highest flex items-center justify-center text-on-surface-variant mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
            <Workflow size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-semibold font-headline text-on-surface tracking-tight">No workflows found</h3>
          <p className="mt-3 text-on-surface-variant font-medium text-lg">Get started by creating a new automated workflow.</p>
          <div className="mt-10">
            <Button onClick={() => setIsCreateOpen(true)} className="px-8 py-5 text-base font-semibold">Create Workflow</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {workflows?.map((wf) => (
            <div key={wf.id} className="group relative flex flex-col rounded-[1.5rem] bg-surface-container transition-all duration-300 overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.5)] hover:-translate-y-1">
              <div className="p-7 flex-1 relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-14 w-14 rounded-[1.25rem] bg-surface-container-highest flex items-center justify-center text-primary">
                    <Activity size={26} strokeWidth={2} />
                  </div>
                  
                  {/* Status Toggle */}
                  <div className="flex items-center gap-3 bg-surface-container-lowest px-3 py-2 rounded-full shadow-inner">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${wf.active ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {wf.active ? 'Active' : 'Inactive'}
                    </span>
                    <button 
                      onClick={() => toggleActive(wf.id, wf.active)}
                      title={wf.active ? "Deactivate" : "Activate"}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 border border-transparent ${wf.active ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    >
                      <span className={`pointer-events-none absolute left-0.5 top-0.5 inline-block h-4 w-4 transform rounded-full bg-on-primary transition-transform duration-300 ease-in-out shadow-sm ${wf.active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <Link to={`/workflow/${wf.id}`} className="inline-block hover:text-primary transition-colors focus:outline-none rounded-md mt-2">
                  <h3 className="text-2xl font-semibold font-headline text-on-surface line-clamp-1">{wf.name}</h3>
                </Link>
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {wf.nodes?.length || 0} nodes
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between bg-surface-container-low px-7 py-5 relative z-10 border-t border-outline-variant/30">
                <p className="text-xs font-medium text-on-surface-variant">
                  Edited {formatDistanceToNow(new Date(wf.updated_at), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  <Button variant="ghost" className="h-10 w-10 p-0 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded-full" onClick={() => navigate(`/workflow/${wf.id}`)}>
                    <Settings size={18} />
                  </Button>
                  <Button variant="ghost" className="h-10 w-10 p-0 text-error hover:bg-error-container hover:text-on-error-container rounded-full" onClick={() => handleDelete(wf.id)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
              
              {/* Subtle gradient glow inside card */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 rounded-full bg-primary/5 blur-[50px] pointer-events-none z-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
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
                Give your new workflow a descriptive name to get started.
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
                className="bg-black/20"
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

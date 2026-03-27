import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Workflow, Plus, Trash2, Settings, Activity } from 'lucide-react'
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
        <div className="rounded-xl bg-red-500/10 p-6 border border-red-500/20 backdrop-blur-md">
          <p className="text-red-400 font-medium">Failed to load workflows: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Workflow className="text-stitch-blue-accent" size={28} />
            Workflows
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Manage and monitor your automated workflows.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus size={18} />
          New Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-stitch-blue-accent border-t-transparent shadow-[0_0_15px_rgba(43,110,245,0.5)]" />
        </div>
      ) : workflows?.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-16 text-center shadow-glass flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-6 shadow-inner">
            <Workflow size={32} />
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">No workflows found</h3>
          <p className="mt-2 text-gray-400 font-medium">Get started by creating a new automated workflow.</p>
          <div className="mt-8">
            <Button onClick={() => setIsCreateOpen(true)} className="px-8 py-6 text-lg">Create Workflow</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {workflows?.map((wf) => (
            <div key={wf.id} className="group relative flex flex-col rounded-2xl border border-white/10 bg-[#16111e]/80 backdrop-blur-md hover:border-stitch-blue-accent/50 transition-all duration-300 overflow-hidden shadow-glass hover:shadow-[0_8px_30px_rgba(43,110,245,0.15)]">
              <div className="p-6 flex-1 relative z-10">
                <div className="flex justify-between items-start mb-5">
                  <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-stitch-blue-accent shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
                    <Activity size={24} />
                  </div>
                  
                  {/* Status Toggle */}
                  <div className="flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${wf.active ? 'text-green-400' : 'text-gray-500'}`}>
                      {wf.active ? 'Active' : 'Inactive'}
                    </span>
                    <button 
                      onClick={() => toggleActive(wf.id, wf.active)}
                      title={wf.active ? "Deactivate" : "Activate"}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-300 border border-transparent ${wf.active ? 'bg-stitch-blue-accent shadow-[0_0_10px_rgba(43,110,245,0.4)]' : 'bg-gray-700'}`}
                    >
                      <span className={`pointer-events-none absolute left-0.5 top-0.5 inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out shadow-sm ${wf.active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <Link to={`/workflow/${wf.id}`} className="inline-block hover:text-stitch-blue-accent transition-colors focus:outline-none focus:ring-2 focus:ring-stitch-blue-accent rounded-md">
                  <h3 className="text-xl font-bold text-white line-clamp-1">{wf.name}</h3>
                </Link>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-stitch-blue-accent/10 text-stitch-blue-accent border border-stitch-blue-accent/20">
                    {wf.nodes?.length || 0} nodes
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-6 py-4 relative z-10">
                <p className="text-xs font-medium text-gray-500">
                  Edited {formatDistanceToNow(new Date(wf.updated_at), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10 text-gray-400 hover:text-white" onClick={() => navigate(`/workflow/${wf.id}`)}>
                    <Settings size={16} />
                  </Button>
                  <Button variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-white hover:bg-red-500/20" onClick={() => handleDelete(wf.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              
              {/* Subtle gradient glow inside card */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-stitch-blue-accent/5 blur-[50px] pointer-events-none z-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
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

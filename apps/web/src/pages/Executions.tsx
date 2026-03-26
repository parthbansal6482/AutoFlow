import { format, formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { useExecutions } from '../hooks/use-executions'

export default function Executions() {
  const { data: executions, isLoading, error } = useExecutions()

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-[hsl(var(--destructive)/0.1)] p-4 border border-[hsl(var(--destructive)/0.2)]">
          <p className="text-[hsl(var(--destructive))]">Failed to load executions: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Executions</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">History and logs of your past workflow runs.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
        </div>
      ) : executions?.length === 0 ? (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))] opacity-50 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">No past executions</h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">This list will populate when you run your workflows manually or via triggers.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-[hsl(var(--secondary)/0.5)] text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Workflow</th>
                <th className="px-6 py-4 font-medium">Started</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium text-right">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {executions?.map((exec) => {
                const start = new Date(exec.started_at)
                const end = exec.completed_at ? new Date(exec.completed_at) : null
                const durationMs = end ? end.getTime() - start.getTime() : null
                
                return (
                  <tr key={exec.id} className="hover:bg-[hsl(var(--secondary)/0.3)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {exec.status === 'completed' && <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]"></span>}
                        {exec.status === 'failed' && <span className="h-2 w-2 rounded-full bg-[hsl(var(--destructive))]"></span>}
                        {exec.status === 'running' && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>}
                        {exec.status === 'pending' && <span className="h-2 w-2 rounded-full bg-gray-400"></span>}
                        <span className="capitalize font-medium text-[hsl(var(--foreground))]">{exec.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <Link to={`/workflow/${exec.workflow_id}`} className="text-[hsl(var(--foreground))] hover:underline">
                        {exec.workflow?.name || 'Unknown Workflow'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">
                      {format(start, 'MMM d, HH:mm:ss')}
                      <div className="text-xs opacity-70">{formatDistanceToNow(start, { addSuffix: true })}</div>
                    </td>
                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))] font-mono">
                      {durationMs !== null ? `${durationMs}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center rounded-md bg-[hsl(var(--secondary))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] ring-1 ring-inset ring-[hsl(var(--border))]">
                        {exec.trigger_type}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

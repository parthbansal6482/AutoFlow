import { format, formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { Activity, Clock, PlayCircle, CheckCircle2, XCircle, Ban } from 'lucide-react'
import { useExecutions } from '../hooks/use-executions'

export default function Executions() {
  const { data: executions, isLoading, error } = useExecutions()

  if (error) {
    return (
      <div className="p-8 font-body">
        <div className="rounded-2xl bg-error-container p-6 flex flex-col items-center justify-center">
          <p className="text-on-error-container font-medium">Failed to load executions: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto min-h-screen font-body">
      <div>
        <h1 className="text-4xl font-semibold font-headline tracking-tighter text-on-surface flex items-center gap-3">
          <div className="p-2 bg-surface-container-highest rounded-xl text-primary">
            <Activity size={28} strokeWidth={2.5} />
          </div>
          Executions
        </h1>
        <p className="text-on-surface-variant mt-2 font-medium tracking-wide">History and logs of your past workflow runs.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
        </div>
      ) : executions?.length === 0 ? (
        <div className="rounded-[2rem] bg-surface-container p-16 text-center flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-[1.5rem] bg-surface-container-highest flex items-center justify-center text-on-surface-variant mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
            <Clock size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-semibold font-headline text-on-surface tracking-tight">No past executions</h3>
          <p className="mt-3 text-on-surface-variant font-medium text-lg max-w-sm mx-auto">This list will populate when you run your workflows manually or via triggers.</p>
        </div>
      ) : (
        <div className="rounded-[2.5rem] bg-surface-container overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-surface-container-highest/50 text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs">Status</th>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs">Workflow</th>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs">Started</th>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs">Duration</th>
                <th className="px-8 py-6 font-bold uppercase tracking-wider text-xs text-right">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {executions?.map((exec) => {
                const start = new Date(exec.started_at)
                const end = exec.finished_at ? new Date(exec.finished_at) : null
                const durationMs = end ? end.getTime() - start.getTime() : null
                
                return (
                  <tr key={exec.id} className="hover:bg-surface-container-highest/30 transition-colors duration-200 group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        {exec.status === 'success' && <CheckCircle2 size={18} className="text-emerald-400 stroke-[2.5]" />}
                        {exec.status === 'error' && <XCircle size={18} className="text-error stroke-[2.5]" />}
                        {exec.status === 'running' && <PlayCircle size={18} className="text-primary animate-pulse stroke-[2.5]" />}
                        {exec.status === 'pending' && <Clock size={18} className="text-on-surface-variant stroke-[2.5]" />}
                        {exec.status === 'cancelled' && <Ban size={18} className="text-orange-400 stroke-[2.5]" />}
                        <span className="capitalize font-bold text-on-surface tracking-wide text-sm">{exec.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-semibold">
                      <Link to={`/workflow/${exec.workflow_id}`} className="text-on-surface hover:text-primary transition-colors text-base line-clamp-1">
                        {exec.workflow?.name || 'Unknown Workflow'}
                      </Link>
                    </td>
                    <td className="px-8 py-5 text-on-surface-variant font-medium">
                      {format(start, 'MMM d, HH:mm:ss')}
                      <div className="text-xs text-on-surface-variant/70 mt-1">{formatDistanceToNow(start, { addSuffix: true })}</div>
                    </td>
                    <td className="px-8 py-5 text-on-surface-variant font-mono text-sm font-semibold">
                      {durationMs !== null ? `${durationMs}ms` : '-'}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="inline-flex items-center rounded-lg bg-surface-container-highest px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-on-surface">
                        {exec.triggered_by}
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

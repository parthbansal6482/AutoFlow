import { format, formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { Activity, Clock, PlayCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useExecutions } from '../hooks/use-executions'

export default function Executions() {
  const { data: executions, isLoading, error } = useExecutions()

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl bg-red-500/10 p-6 border border-red-500/20 backdrop-blur-md">
          <p className="text-red-400 font-medium">Failed to load executions: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Activity className="text-stitch-blue-accent" size={28} />
          Executions
        </h1>
        <p className="text-gray-400 mt-2 font-medium">History and logs of your past workflow runs.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-stitch-blue-accent border-t-transparent shadow-[0_0_15px_rgba(43,110,245,0.5)]" />
        </div>
      ) : executions?.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-16 text-center shadow-glass flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-6 shadow-inner">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">No past executions</h3>
          <p className="mt-2 text-gray-400 font-medium max-w-sm mx-auto">This list will populate when you run your workflows manually or via triggers.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#16111e]/80 backdrop-blur-xl overflow-hidden shadow-glass">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-black/40 text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Workflow</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Started</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Duration</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs text-right">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {executions?.map((exec) => {
                const start = new Date(exec.started_at)
                const end = exec.completed_at ? new Date(exec.completed_at) : null
                const durationMs = end ? end.getTime() - start.getTime() : null
                
                return (
                  <tr key={exec.id} className="hover:bg-white/5 transition-colors duration-200 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {exec.status === 'completed' && <CheckCircle2 size={16} className="text-green-400" />}
                        {exec.status === 'failed' && <XCircle size={16} className="text-red-400" />}
                        {exec.status === 'running' && <PlayCircle size={16} className="text-stitch-blue-accent animate-pulse" />}
                        {exec.status === 'pending' && <Clock size={16} className="text-gray-400" />}
                        <span className="capitalize font-bold text-white tracking-wide text-xs">{exec.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      <Link to={`/workflow/${exec.workflow_id}`} className="text-gray-200 hover:text-stitch-blue-accent transition-colors">
                        {exec.workflow?.name || 'Unknown Workflow'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-medium">
                      {format(start, 'MMM d, HH:mm:ss')}
                      <div className="text-xs text-gray-500 mt-0.5">{formatDistanceToNow(start, { addSuffix: true })}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs font-semibold">
                      {durationMs !== null ? `${durationMs}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-300">
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

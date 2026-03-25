export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled'

export interface Execution {
  id: string
  workflow_id: string
  status: ExecutionStatus
  triggered_by: 'manual' | 'webhook' | 'cron'
  started_at: string
  finished_at?: string
  error?: string
}

export interface ExecutionLog {
  id: string
  execution_id: string
  node_id: string
  node_name: string
  status: ExecutionStatus
  input_data: unknown
  output_data: unknown
  error?: string
  started_at: string
  finished_at?: string
  duration_ms?: number
}

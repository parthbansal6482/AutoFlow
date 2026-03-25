export interface Workflow {
  id: string
  name: string
  description?: string
  active: boolean
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  settings: WorkflowSettings
  created_at: string
  updated_at: string
  user_id: string
  workspace_id: string
}

export interface WorkflowNode {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  parameters: Record<string, unknown>
  credential_id?: string
}

export interface WorkflowConnection {
  source_node_id: string
  source_output: string
  target_node_id: string
  target_input: string
}

export interface WorkflowSettings {
  timezone: string
  error_workflow_id?: string
  save_execution_progress: boolean
  max_retries: number
}

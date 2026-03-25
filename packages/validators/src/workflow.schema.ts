import { z } from 'zod'

export const WorkflowNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  name: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  parameters: z.record(z.unknown()),
  credential_id: z.string().uuid().optional(),
})

export const WorkflowConnectionSchema = z.object({
  source_node_id: z.string().uuid(),
  source_output: z.string(),
  target_node_id: z.string().uuid(),
  target_input: z.string(),
})

export const WorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  nodes: z.array(WorkflowNodeSchema),
  connections: z.array(WorkflowConnectionSchema),
  settings: z.object({
    timezone: z.string().default('UTC'),
    save_execution_progress: z.boolean().default(true),
    max_retries: z.number().min(0).max(10).default(0),
  }),
})

export type WorkflowInput = z.infer<typeof WorkflowSchema>

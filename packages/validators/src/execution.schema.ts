import { z } from 'zod'

export const TriggerExecutionSchema = z.object({
  workflow_id: z.string().uuid(),
  trigger_data: z.record(z.unknown()).optional(),
})

export type TriggerExecutionInput = z.infer<typeof TriggerExecutionSchema>

import type { NodeDefinition } from '@workflow/types'

export const cronTriggerNode: NodeDefinition = {
  type: 'cron-trigger',
  name: 'Schedule',
  description: 'Starts the workflow on a schedule',
  category: 'trigger',
  icon: 'clock',
  version: 1,
  inputs: [],
  outputs: [{ name: 'main', label: 'Output', type: 'main' }],
  parameters: [
    { name: 'cron', label: 'Cron expression', type: 'string', required: true, default: '0 * * * *' },
    { name: 'timezone', label: 'Timezone', type: 'string', required: false, default: 'UTC' },
  ],
}

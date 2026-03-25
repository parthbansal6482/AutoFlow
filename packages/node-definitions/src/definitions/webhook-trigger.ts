import type { NodeDefinition } from '@workflow/types'

export const webhookTriggerNode: NodeDefinition = {
  type: 'webhook-trigger',
  name: 'Webhook',
  description: 'Starts the workflow when a webhook is received',
  category: 'trigger',
  icon: 'webhook',
  version: 1,
  inputs: [],
  outputs: [{ name: 'main', label: 'Output', type: 'main' }],
  parameters: [
    { name: 'path', label: 'Webhook path', type: 'string', required: true },
    {
      name: 'method',
      label: 'HTTP method',
      type: 'options',
      required: true,
      default: 'POST',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ],
    },
  ],
}

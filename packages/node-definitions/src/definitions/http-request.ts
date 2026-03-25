import type { NodeDefinition } from '@workflow/types'

export const httpRequestNode: NodeDefinition = {
  type: 'http-request',
  name: 'HTTP Request',
  description: 'Make HTTP requests to any URL',
  category: 'action',
  icon: 'globe',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [
    { name: 'main', label: 'Output', type: 'main' },
    { name: 'error', label: 'Error', type: 'error' },
  ],
  parameters: [
    {
      name: 'method',
      label: 'Method',
      type: 'options',
      required: true,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' },
      ],
    },
    { name: 'url', label: 'URL', type: 'string', required: true },
    { name: 'headers', label: 'Headers', type: 'json', required: false },
    { name: 'body', label: 'Body', type: 'json', required: false },
  ],
}

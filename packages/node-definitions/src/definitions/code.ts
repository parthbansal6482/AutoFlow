import type { NodeDefinition } from '@workflow/types'

export const codeNode: NodeDefinition = {
  type: 'code',
  name: 'Code',
  description: 'Run custom JavaScript code',
  category: 'transform',
  icon: 'code',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [
    { name: 'main', label: 'Output', type: 'main' },
    { name: 'error', label: 'Error', type: 'error' },
  ],
  parameters: [
    {
      name: 'code',
      label: 'JavaScript code',
      type: 'code',
      required: true,
      default: '// Access input data via $input\n// Return an array of items\nreturn $input.all()',
    },
  ],
}

import type { NodeDefinition } from '@workflow/types'

export const setNode: NodeDefinition = {
  type: 'set',
  name: 'Set',
  description: 'Set, add or remove fields on items',
  category: 'transform',
  icon: 'edit',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [{ name: 'main', label: 'Output', type: 'main' }],
  parameters: [
    { name: 'fields', label: 'Fields to set', type: 'json', required: true },
  ],
}

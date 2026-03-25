import type { NodeDefinition } from '@workflow/types'

export const ifNode: NodeDefinition = {
  type: 'if',
  name: 'IF',
  description: 'Routes data based on a condition',
  category: 'logic',
  icon: 'git-branch',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [
    { name: 'true', label: 'True', type: 'main' },
    { name: 'false', label: 'False', type: 'main' },
  ],
  parameters: [
    { name: 'condition', label: 'Condition', type: 'string', required: true },
  ],
}

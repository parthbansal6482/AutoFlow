import type { NodeDefinition } from '@workflow/types'

export const functionItemNode: NodeDefinition = {
  type: 'function-item',
  name: 'Function Item',
  description: 'Legacy node: run custom JavaScript for each input item',
  category: 'transform',
  icon: 'file-code',
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
      default:
        '// Legacy Function Item style\n' +
        '// Current item is available as $input.item(0) when called per item\n' +
        '// Return the transformed item json object or full item\n' +
        'return $input.first()',
      description:
        'Runs JavaScript for item-level transformation. Prefer Code node for new workflows.',
    },
  ],
}

import type { NodeDefinition } from '@workflow/types'

export const sortNode: NodeDefinition = {
  type: 'sort',
  name: 'Sort',
  description: 'Sort incoming items by a field value',
  category: 'transform',
  icon: 'arrow-up-down',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [{ name: 'main', label: 'Output', type: 'main' }],
  parameters: [
    {
      name: 'field',
      label: 'Field',
      type: 'string',
      required: true,
      description: 'Field path to sort by (supports dot notation)',
    },
    {
      name: 'order',
      label: 'Order',
      type: 'options',
      required: true,
      default: 'asc',
      options: [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' },
      ],
    },
    {
      name: 'numeric',
      label: 'Numeric Sort',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Interpret sortable values as numbers when possible',
    },
    {
      name: 'caseSensitive',
      label: 'Case Sensitive',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable case-sensitive string sorting',
    },
  ],
}

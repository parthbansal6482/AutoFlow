import type { NodeDefinition } from '@workflow/types'

export const aggregateNode: NodeDefinition = {
  type: 'aggregate',
  name: 'Aggregate',
  description: 'Aggregate multiple items into a summary output',
  category: 'transform',
  icon: 'sigma',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [{ name: 'main', label: 'Output', type: 'main' }],
  parameters: [
    {
      name: 'operation',
      label: 'Operation',
      type: 'options',
      required: true,
      default: 'count',
      options: [
        { label: 'Count', value: 'count' },
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'avg' },
        { label: 'Minimum', value: 'min' },
        { label: 'Maximum', value: 'max' },
        { label: 'Concatenate', value: 'concat' },
      ],
      description: 'Aggregate operation to apply to all input items',
    },
    {
      name: 'field',
      label: 'Field',
      type: 'string',
      required: false,
      default: '',
      description: 'Field path for non-count operations (supports dot notation)',
    },
    {
      name: 'separator',
      label: 'Separator',
      type: 'string',
      required: false,
      default: ', ',
      description: 'Used only for concat operation',
    },
  ],
}

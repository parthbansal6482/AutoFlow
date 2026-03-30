import type { NodeDefinition } from '@workflow/types'

export const mergeNode: NodeDefinition = {
  type: 'merge',
  name: 'Merge',
  description: 'Merge two input branches into a single output',
  category: 'logic',
  icon: 'merge',
  version: 1,
  inputs: [
    { name: 'input1', label: 'Input 1', type: 'main' },
    { name: 'input2', label: 'Input 2', type: 'main' },
  ],
  outputs: [{ name: 'main', label: 'Output', type: 'main' }],
  parameters: [
    {
      name: 'mode',
      label: 'Mode',
      type: 'options',
      required: true,
      default: 'append',
      description:
        'Append combines all items from both inputs. Index merges items by their position.',
      options: [
        { label: 'Append', value: 'append' },
        { label: 'Merge by Index', value: 'index' },
      ],
    },
    {
      name: 'keepUnpaired',
      label: 'Keep Unpaired Items',
      type: 'boolean',
      required: false,
      default: true,
      description:
        'In index mode, include items that do not have a matching item on the other input.',
    },
  ],
}

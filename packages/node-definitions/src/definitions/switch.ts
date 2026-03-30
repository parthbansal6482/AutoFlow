import type { NodeDefinition } from '@workflow/types'

export const switchNode: NodeDefinition = {
  type: 'switch',
  name: 'Switch',
  description: 'Route items to different outputs based on matching cases',
  category: 'logic',
  icon: 'git-fork',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [
    { name: 'case-1', label: 'Case 1', type: 'main' },
    { name: 'case-2', label: 'Case 2', type: 'main' },
    { name: 'case-3', label: 'Case 3', type: 'main' },
    { name: 'default', label: 'Default', type: 'main' },
  ],
  parameters: [
    {
      name: 'field',
      label: 'Field',
      type: 'string',
      required: true,
      description: 'Dot path to evaluate (e.g. status, body.type, $json.status)',
    },
    {
      name: 'cases',
      label: 'Cases',
      type: 'json',
      required: true,
      default: [
        { output: 'case-1', operator: 'equals', value: 'value-1' },
        { output: 'case-2', operator: 'equals', value: 'value-2' },
      ],
      description:
        'Array of case rules. Each rule should include output, operator, and value.',
    },
    {
      name: 'fallbackOutput',
      label: 'Fallback Output',
      type: 'options',
      required: true,
      default: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Case 1', value: 'case-1' },
        { label: 'Case 2', value: 'case-2' },
        { label: 'Case 3', value: 'case-3' },
      ],
      description: 'Output used when no case matches.',
    },
  ],
}

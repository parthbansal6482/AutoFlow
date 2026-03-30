import type { NodeDefinition } from '@workflow/types'

export const editFieldsNode: NodeDefinition = {
  type: 'edit-fields',
  name: 'Edit Fields',
  description: 'Rename, keep, remove, and set fields on incoming items',
  category: 'transform',
  icon: 'sliders-horizontal',
  version: 1,
  inputs: [{ name: 'main', label: 'Input', type: 'main' }],
  outputs: [{ name: 'main', label: 'Output', type: 'main' }],
  parameters: [
    {
      name: 'mode',
      label: 'Mode',
      type: 'options',
      required: true,
      default: 'manual',
      options: [
        { label: 'Manual Mapping', value: 'manual' },
        { label: 'Keep Only', value: 'keepOnly' },
        { label: 'Remove', value: 'remove' },
      ],
      description: 'Choose how fields should be edited on each item',
    },
    {
      name: 'set',
      label: 'Set / Replace Fields',
      type: 'json',
      required: false,
      default: {},
      description:
        'Object map of fields to set. Example: { "status": "active", "count": 1 }',
    },
    {
      name: 'rename',
      label: 'Rename Fields',
      type: 'json',
      required: false,
      default: {},
      description:
        'Object map of old field name to new field name. Example: { "fname": "firstName" }',
    },
    {
      name: 'keep',
      label: 'Keep Fields',
      type: 'json',
      required: false,
      default: [],
      description:
        'Array of field names to keep (all other fields are removed). Example: ["id","email"]',
    },
    {
      name: 'remove',
      label: 'Remove Fields',
      type: 'json',
      required: false,
      default: [],
      description:
        'Array of field names to remove from each item. Example: ["password","token"]',
    },
    {
      name: 'strict',
      label: 'Strict Mode',
      type: 'boolean',
      required: false,
      default: false,
      description:
        'When enabled, fails if requested fields to rename/keep/remove do not exist',
    },
  ],
}

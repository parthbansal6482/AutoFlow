export type NodeCategory = 'trigger' | 'action' | 'logic' | 'transform'

export interface NodeDefinition {
  type: string
  name: string
  description: string
  category: NodeCategory
  icon: string
  version: number
  inputs: NodePort[]
  outputs: NodePort[]
  parameters: NodeParameter[]
  credential_type?: string
}

export interface NodePort {
  name: string
  label: string
  type: 'main' | 'error'
}

export interface NodeParameter {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'code' | 'options' | 'credential'
  required: boolean
  default?: unknown
  options?: { label: string; value: string }[]
  description?: string
}

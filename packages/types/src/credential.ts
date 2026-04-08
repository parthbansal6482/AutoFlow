export type CredentialType =
  | 'http'
  | 'oauth2'
  | 'apiKey'
  | 'basic'
  | 'postgres'
  | 'smtp'
  | 'google'
  | 'openai'
  | 'anthropic'
  | 'slack'
  | 'github'
  | 'discord'
  | 'notion'
  | 'asana'
  | 'clickup'
  | 'hubspot'
  | 'salesforce'
  | 'pipedrive'
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'whatsapp'
  | 'aws'
  | 'mysql'
  | 'mongodb'
  | 'redis'

export interface Credential {
  id: string
  name: string
  type: CredentialType
  user_id: string
  workspace_id: string
  created_at: string
  updated_at: string
}

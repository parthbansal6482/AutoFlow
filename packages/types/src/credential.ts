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

export interface Credential {
  id: string
  name: string
  type: CredentialType
  user_id: string
  workspace_id: string
  created_at: string
  updated_at: string
}

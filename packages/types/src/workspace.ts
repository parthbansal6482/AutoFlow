export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_by?: string | null
  created_at: string
  updated_at: string
}

export interface CredentialShare {
  id: string
  credential_id: string
  workspace_id: string
  shared_by: string
  shared_with?: string | null // null => workspace-wide share
  can_edit: boolean
  created_at: string
  updated_at: string
}

export interface CreateWorkspaceMemberInput {
  workspace_id: string
  user_id: string
  role?: WorkspaceRole
  invited_by?: string
}

export interface UpdateWorkspaceMemberInput {
  role?: WorkspaceRole
}

export interface CreateCredentialShareInput {
  credential_id: string
  workspace_id: string
  shared_with?: string | null
  can_edit?: boolean
}

export interface UpdateCredentialShareInput {
  can_edit?: boolean
}

import { z } from 'zod'

export const WorkspaceRoleSchema = z.enum(['owner', 'admin', 'member'])

export const WorkspaceMemberSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: WorkspaceRoleSchema,
  invited_by: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export const AddWorkspaceMemberSchema = z.object({
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: WorkspaceRoleSchema.refine((role) => role !== 'owner', {
    message: 'role cannot be owner when adding a member',
  }),
})

export const UpdateWorkspaceMemberSchema = z.object({
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: WorkspaceRoleSchema.refine((role) => role !== 'owner', {
    message: 'role cannot be owner via update payload',
  }),
})

export const RemoveWorkspaceMemberSchema = z.object({
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
})

export const CredentialShareSchema = z.object({
  id: z.string().uuid(),
  credential_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  shared_by: z.string().uuid(),
  shared_with: z.string().uuid().nullable().optional(),
  can_edit: z.boolean().default(false),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export const ShareCredentialSchema = z
  .object({
    credential_id: z.string().uuid(),
    workspace_id: z.string().uuid(),
    shared_with: z.string().uuid().nullable().optional(),
    can_edit: z.boolean().default(false),
  })
  .refine(
    (value) => !(value.shared_with === null && value.can_edit),
    {
      message: 'workspace-wide shares cannot set can_edit=true',
      path: ['can_edit'],
    },
  )

export const UpdateCredentialShareSchema = z
  .object({
    share_id: z.string().uuid(),
    can_edit: z.boolean().optional(),
  })
  .refine((value) => value.can_edit !== undefined, {
    message: 'at least one field must be provided for update',
  })

export const UnshareCredentialSchema = z.object({
  share_id: z.string().uuid(),
})

export const ListWorkspaceMembersSchema = z.object({
  workspace_id: z.string().uuid(),
})

export const ListCredentialSharesSchema = z.object({
  credential_id: z.string().uuid(),
  workspace_id: z.string().uuid().optional(),
})

export type WorkspaceRoleInput = z.infer<typeof WorkspaceRoleSchema>
export type WorkspaceMemberInput = z.infer<typeof WorkspaceMemberSchema>
export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>
export type UpdateWorkspaceMemberInput = z.infer<typeof UpdateWorkspaceMemberSchema>
export type RemoveWorkspaceMemberInput = z.infer<typeof RemoveWorkspaceMemberSchema>

export type CredentialShareInput = z.infer<typeof CredentialShareSchema>
export type ShareCredentialInput = z.infer<typeof ShareCredentialSchema>
export type UpdateCredentialShareInput = z.infer<typeof UpdateCredentialShareSchema>
export type UnshareCredentialInput = z.infer<typeof UnshareCredentialSchema>

export type ListWorkspaceMembersInput = z.infer<typeof ListWorkspaceMembersSchema>
export type ListCredentialSharesInput = z.infer<typeof ListCredentialSharesSchema>

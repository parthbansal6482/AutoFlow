// apps/web/src/hooks/use-credentials.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../features/auth/store/auth.store'
import type { CredentialType } from '@workflow/types'

// Important: Secret plaintext is NEVER returned by the DB. We only see the metadata.
export interface CredentialMetadata {
  id: string
  name: string
  type: CredentialType
  created_at: string
}

export function useCredentials() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['credentials', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('credentials')
        .select('id, name, type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as CredentialMetadata[]
    },
    enabled: !!user,
  })
}

export function useCreateCredential() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      name,
      type,
      data: credentialData,
    }: {
      name: string
      type: CredentialType
      data: Record<string, string>
    }) => {
      if (!user) throw new Error('You must be logged in to create a credential')

      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (wsError) throw wsError

      // Call the secure encrypt-credential edge function.
      // This ensures we never INSERT plaintext into Supabase directly from the client.
      const { data, error } = await supabase.functions.invoke('encrypt-credential', {
        body: {
          name,
          type,
          workspace_id: workspace.id,
          data: credentialData,
        },
      })

      if (error) throw new Error(error.message || 'Failed to encrypt credential')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
    },
  })
}

export function useDeleteCredential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { user } = useAuthStore.getState()
      if (!user) throw new Error('You must be logged in to delete a credential')

      const { error } = await supabase.from('credentials').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
    },
  })
}

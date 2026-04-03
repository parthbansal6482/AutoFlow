import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../features/auth/store/auth.store'

export interface WorkspaceMember {
  id: string
  user_id: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  created_at: string
}

export function useWorkspaceMembers() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['workspace_members', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase.functions.invoke('manage-workspace-members', {
        body: { action: 'list' }
      })

      if (error) throw error
      return (data || []) as WorkspaceMember[]
    },
    enabled: !!user,
  })
}

export function useAddWorkspaceMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, role }: { email: string, role: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-workspace-members', {
        body: { action: 'add', email, role }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members'] })
    }
  })
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-workspace-members', {
        body: { action: 'remove', memberId }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members'] })
    }
  })
}

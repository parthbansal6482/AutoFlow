// apps/web/src/hooks/use-workflows.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth.store'
import type { Workflow } from '@workflow/types'

export function useWorkflows() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['workflows', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as Workflow[]
    },
    enabled: !!user,
  })
}

export function useWorkflow(id: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['workflow', id, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('You must be logged in to load a workflow')

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data as Workflow
    },
    enabled: !!user && !!id,
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('You must be logged in to create a workflow')

      // In a real app the workspace_id would come from context.
      // For now we'll put it in a default workspace tied to the user.
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (wsError) throw wsError

      const newWorkflow = {
        name,
        user_id: user.id,
        workspace_id: workspace.id,
        active: false,
        nodes: [],
        connections: [],
        settings: {
          timezone: 'UTC',
          save_execution_progress: true,
          max_retries: 0,
        },
      }

      const { data, error } = await supabase
        .from('workflows')
        .insert(newWorkflow)
        .select('*')
        .single()

      if (error) throw error
      return data as Workflow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('You must be logged in to delete a workflow')

      const { error } = await supabase.from('workflows').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Workflow> }) => {
      if (!user) throw new Error('You must be logged in to update a workflow')

      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (error) throw error
      return data as Workflow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', data.id] })
    },
  })
}

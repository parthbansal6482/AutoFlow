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
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
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
    queryKey: ['workflow', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
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
      // In a real app the workspace_id would come from context.
      // For now we'll put it in a default workspace tied to the user.
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .single()

      if (wsError) throw wsError

      const newWorkflow = {
        name,
        user_id: user!.id,
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflows').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Workflow> }) => {
      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
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

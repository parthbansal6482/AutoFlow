// apps/web/src/hooks/use-executions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../features/auth/store/auth.store'
import type { ExecutionStatus } from '@workflow/types'

export interface WorkflowExecution {
  id: string
  workflow_id: string
  status: ExecutionStatus
  started_at: string
  finished_at: string | null
  triggered_by: 'manual' | 'webhook' | 'cron'
  error: string | null
  // Related
  workflow?: {
    name: string
  }
}

interface WorkflowExecutionRow extends Omit<WorkflowExecution, 'workflow'> {
  workflow: { name: string } | { name: string }[] | null
}

export function useExecutions() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['executions', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('executions')
        .select(`
          id,
          workflow_id,
          status,
          started_at,
          finished_at,
          triggered_by,
          error,
          workflow:workflows(name)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return ((data ?? []) as WorkflowExecutionRow[]).map((row) => ({
        ...row,
        workflow: Array.isArray(row.workflow) ? row.workflow[0] : row.workflow ?? undefined,
      }))
    },
    enabled: !!user,
  })
}

export function useDeleteExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase.functions.invoke('delete-execution', {
        body: { executionId }
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] })
    }
  })
}

export function useRerunExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke('rerun-execution', {
        body: { executionId }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] })
    }
  })
}

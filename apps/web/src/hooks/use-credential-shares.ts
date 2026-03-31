import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useShareCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ credentialId, memberId }: { credentialId: string, memberId: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-credential-shares', {
        body: { action: 'share', credentialId, memberId }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
    }
  })
}

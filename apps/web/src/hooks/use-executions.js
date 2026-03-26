// apps/web/src/hooks/use-executions.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth.store';
export function useExecutions() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['executions', user?.id],
        queryFn: async () => {
            // In a real multi-tenant app we would filter by workspace.
            // For now we just get all executions for workflows owned by the user.
            const { data, error } = await supabase
                .from('workflow_executions')
                .select(`
          *,
          workflow:workflows(name, user_id)
        `)
                .order('started_at', { ascending: false })
                .limit(50);
            if (error)
                throw error;
            // Filter out executions where workflow doesn't belong to user
            // A more complex RLS policy could do this automatically, but doing it manual here for safety
            return data.filter(e => e.workflow?.user_id === user.id);
        },
        enabled: !!user,
    });
}

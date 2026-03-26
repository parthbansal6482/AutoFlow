// apps/web/src/hooks/use-credentials.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth.store';
export function useCredentials() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['credentials', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('credentials')
                .select('id, name, created_at')
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
}
export function useCreateCredential() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    return useMutation({
        mutationFn: async ({ name, secretData }) => {
            const { data: workspace, error: wsError } = await supabase
                .from('workspaces')
                .select('id')
                .single();
            if (wsError)
                throw wsError;
            // Call the secure encrypt-credential edge function.
            // This ensures we never INSERT plaintext into Supabase directly from the client.
            const { data, error } = await supabase.functions.invoke('encrypt-credential', {
                body: {
                    name,
                    workspaceId: workspace.id,
                    userId: user.id,
                    secretData
                }
            });
            if (error)
                throw new Error(error.message || 'Failed to encrypt credential');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credentials'] });
        },
    });
}
export function useDeleteCredential() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('credentials').delete().eq('id', id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credentials'] });
        },
    });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MentionableUser } from '@/types/notification';

export function useMentionableUsers() {
  return useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payees')
        .select('user_id, payee_name, email')
        .eq('is_internal', true)
        .eq('is_active', true)
        .not('user_id', 'is', null)
        .order('payee_name');

      if (error) throw error;

      return (data || []).map((p): MentionableUser => ({
        user_id: p.user_id!,
        display_name: p.payee_name,
        email: p.email,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — employee list rarely changes
  });
}

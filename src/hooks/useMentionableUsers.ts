import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MentionableUser } from '@/types/notification';

/**
 * Returns every role-holder who can be @mentioned in a project note.
 *
 * Source of truth: the `get_mentionable_employees()` SECURITY DEFINER RPC, which
 * joins auth.users + user_roles + profiles + payees. Using an RPC is necessary
 * because field workers cannot read other users' profiles/auth rows under RLS,
 * but they still need to @mention admins. See Architectural Rule 11 in CLAUDE.md.
 *
 * Display name falls back payee_name → profile.full_name → email local-part, so
 * a user with a role but no linked internal payee is still mentionable.
 */
export function useMentionableUsers() {
  return useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_mentionable_employees');
      if (error) throw error;

      return (data || []).map((row): MentionableUser => ({
        user_id: row.user_id,
        display_name: row.display_name,
        email: row.email,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — employee list rarely changes
  });
}

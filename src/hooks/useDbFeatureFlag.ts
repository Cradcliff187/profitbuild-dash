import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Per-user database-backed feature flag resolution.
 *
 * Resolution semantics: a flag is enabled for the current user when their
 * `feature_flag_user_overrides` row exists (the override's `enabled` wins),
 * otherwise the global `feature_flags.enabled` applies. Missing flag row
 * resolves to `false`.
 *
 * Notes on house rules:
 * - User comes from the in-memory `useAuth()` context — NEVER
 *   `supabase.auth.getUser()` on a mount path (Gotcha #63: it serializes every
 *   concurrent data query behind an auth round-trip).
 * - No realtime subscription (Gotcha #53: nothing realtime on the post-login
 *   critical path). staleTime keeps this cheap; admin mutations invalidate the
 *   `['db-feature-flag']` prefix so consumers refresh without a reload.
 * - Errors are destructured and thrown per Gotcha #16.
 */
export function useDbFeatureFlag(flagName: string): { enabled: boolean; isLoading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['db-feature-flag', flagName, userId],
    queryFn: async () => {
      const [flagRes, overrideRes] = await Promise.all([
        supabase
          .from('feature_flags')
          .select('enabled')
          .eq('flag_name', flagName)
          .maybeSingle(),
        supabase
          .from('feature_flag_user_overrides')
          .select('enabled, feature_flags!inner(flag_name)')
          .eq('feature_flags.flag_name', flagName)
          .eq('user_id', userId!)
          .maybeSingle(),
      ]);

      if (flagRes.error) throw flagRes.error;
      if (overrideRes.error) throw overrideRes.error;

      // Override-wins resolution. override.enabled is NOT NULL when the row
      // exists; the global column is nullable — treat null as disabled.
      if (overrideRes.data) return overrideRes.data.enabled;
      return flagRes.data?.enabled ?? false;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return {
    enabled: query.data ?? false,
    // A disabled query (no user yet) reports isLoading=false in TanStack v5,
    // so fold auth bootstrap into the loading signal — consumers gating UI on
    // isLoading won't flash the flag-off state during startup.
    isLoading: authLoading || query.isLoading,
  };
}

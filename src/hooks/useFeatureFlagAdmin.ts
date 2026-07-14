import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
import { toast } from 'sonner';

/**
 * Admin-side queries + mutations for the /settings/feature-flags page.
 *
 * The audit table (`feature_flag_audit`) is written by a DB trigger on every
 * flag/override change — the client NEVER inserts into it; we only invalidate
 * its query key after mutations so the "Recent changes" list refreshes.
 *
 * Cache fanout (Gotcha #27): every mutation invalidates
 *   ['feature-flags']          — the admin page's global list
 *   ['db-feature-flag']        — prefix-matches every useDbFeatureFlag consumer
 *   ['feature-flag-audit']     — the trigger just appended a row
 * and override mutations additionally invalidate ['feature-flag-overrides'].
 */

export interface FeatureFlagRow {
  id: string;
  flag_name: string;
  enabled: boolean | null;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface FeatureFlagOverrideRow {
  id: string;
  flag_id: string;
  user_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface FeatureFlagAuditRow {
  id: string;
  flag_id: string;
  flag_name: string;
  target_user_id: string | null;
  old_enabled: boolean | null;
  new_enabled: boolean | null;
  changed_by: string | null;
  changed_at: string;
}

export interface FlagUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
}

function invalidateFlagCaches(queryClient: QueryClient, includeOverrides: boolean) {
  queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
  // Prefix-matches ['db-feature-flag', flagName, userId] for every consumer.
  queryClient.invalidateQueries({ queryKey: ['db-feature-flag'] });
  queryClient.invalidateQueries({ queryKey: ['feature-flag-audit'] });
  if (includeOverrides) {
    queryClient.invalidateQueries({ queryKey: ['feature-flag-overrides'] });
  }
}

/** All feature flags, alphabetical. SELECT is RLS-open but the page is admin-gated. */
export function useFeatureFlags() {
  const { isAdmin } = useRoles();

  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, flag_name, enabled, description, updated_at, updated_by')
        .order('flag_name');
      if (error) throw error;
      return (data ?? []) as FeatureFlagRow[];
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Every override row (all flags). The table is tiny — one row per (flag, user)
 * pair — so a single fetch grouped client-side beats N per-flag queries. If it
 * ever approaches PostgREST's 1,000-row cap (Gotcha #23), paginate here.
 */
export function useFeatureFlagOverrides() {
  const { isAdmin } = useRoles();

  return useQuery({
    queryKey: ['feature-flag-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flag_user_overrides')
        .select('id, flag_id, user_id, enabled, created_at, updated_at, updated_by')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeatureFlagOverrideRow[];
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });
}

/** Last 50 audit rows, newest first. Read-only — rows are trigger-written. */
export function useFeatureFlagAudit() {
  const { isAdmin } = useRoles();

  return useQuery({
    queryKey: ['feature-flag-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flag_audit')
        .select('id, flag_id, flag_name, target_user_id, old_enabled, new_enabled, changed_by, changed_at')
        .order('changed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as FeatureFlagAuditRow[];
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Admin user directory for the override picker + name resolution.
 * Reuses the same `get_user_auth_status` RPC that /role-management uses
 * (read-only). Falls back to a plain `profiles` read if the RPC errors so the
 * page still renders names.
 */
export function useFlagUserDirectory() {
  const { isAdmin } = useRoles();

  return useQuery({
    queryKey: ['feature-flag-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_auth_status');
      if (!error && data) {
        return data.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          is_active: u.is_active,
        })) as FlagUserRow[];
      }

      // Fallback: profiles (admins can read all rows).
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active');
      if (profilesError) throw profilesError;
      return (profiles ?? []) as FlagUserRow[];
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });
}

/** Toggle a flag's GLOBAL enabled state. */
export function useSetGlobalFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ flagId, enabled }: { flagId: string; flagName: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          enabled,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      invalidateFlagCaches(queryClient, false);
      toast.success(
        `${variables.flagName} ${variables.enabled ? 'enabled' : 'disabled'} globally`
      );
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update flag: ${message}`);
    },
  });
}

/** Create or flip a per-user override (upsert on the (flag_id, user_id) unique key). */
export function useUpsertFlagOverride() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ flagId, userId, enabled }: { flagId: string; userId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flag_user_overrides')
        .upsert(
          {
            flag_id: flagId,
            user_id: userId,
            enabled,
            updated_by: user?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'flag_id,user_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      invalidateFlagCaches(queryClient, true);
      toast.success(`Override saved: ${variables.enabled ? 'On' : 'Off'} for this user`);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to save override: ${message}`);
    },
  });
}

/** Remove an override — the user falls back to the flag's global state. */
export function useRemoveFlagOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from('feature_flag_user_overrides')
        .delete()
        .eq('id', overrideId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFlagCaches(queryClient, true);
      toast.success('Override removed — user follows the global setting');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to remove override: ${message}`);
    },
  });
}

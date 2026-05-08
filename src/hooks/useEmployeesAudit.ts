import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRoles } from '@/contexts/RoleContext';
import { toast } from 'sonner';

export type LinkageStatus =
  | 'OK'
  | 'NO_PAYEE'
  | 'PAYEE_NOT_LINKED'
  | 'PAYEE_INACTIVE'
  | 'OTHER';

export interface EmployeeAuditRow {
  user_id: string;
  email: string;
  full_name: string | null;
  profile_is_active: boolean;
  roles: string[] | null;
  payee_id: string | null;
  payee_name: string | null;
  payee_is_active: boolean | null;
  payee_user_id: string | null;
  provides_labor: boolean | null;
  linkage_status: LinkageStatus;
  can_be_mentioned: boolean;
}

/**
 * Admin-only read: every role-holder with their internal-payee linkage status.
 * Backed by the `get_employees_audit()` SECURITY DEFINER RPC (raises 42501 if caller
 * is not admin). See Architectural Rule 11 in CLAUDE.md.
 */
export function useEmployeesAudit() {
  const { isAdmin } = useRoles();

  return useQuery({
    queryKey: ['employees-audit'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employees_audit');
      if (error) throw error;
      return (data || []) as EmployeeAuditRow[];
    },
    enabled: isAdmin, // defense-in-depth; RPC also enforces
    staleTime: 60 * 1000,
  });
}

/**
 * Worker-type selector for `useCreateLinkedPayee` when called for a field worker.
 *  - 'internal'      → W2 employee (is_internal=true, payee_type='internal_labor')
 *  - 'subcontractor' → labor-providing sub (is_internal=false, payee_type='subcontractor',
 *                      provides_labor=true). Time entries land as category='subcontractors'
 *                      with amount=0 via the enforce_time_entry_category_from_payee trigger.
 *
 * For admin / manager users this is ignored — they always get the internal shape on
 * demand (no Worker Type prompt; their use case is rare and conservative is fine).
 *
 * See Architectural Rule 11 in CLAUDE.md.
 */
export type FieldWorkerPayeeType = 'internal' | 'subcontractor';

/**
 * Create a linked payee for a role-holder that has no payee row yet.
 *
 * Field workers can be backed by EITHER an internal employee OR a labor-providing
 * subcontractor — the second `workerType` argument distinguishes the two. Defaults
 * to 'internal' so admin/manager calls remain a single-arg call without breakage.
 *
 * Pre-May 8 2026 this hook hard-coded `is_internal: true, payee_type: 'internal_labor'`
 * — which silently miscategorized any subcontractor user whose auto-payee creation
 * had failed at create-time and was being retried via Role Management's "Enable"
 * button. Their first time entry would then post as labor_internal × $75/hr instead
 * of subcontractors × $0. Net effect: phantom labor cost on the project.
 */
export function useCreateLinkedPayee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ row, workerType = 'internal' }: { row: EmployeeAuditRow; workerType?: FieldWorkerPayeeType }) => {
      const isFieldWorker = (row.roles ?? []).includes('field_worker');
      const isInternal = workerType === 'internal';
      const displayName =
        row.full_name?.trim() || row.email.split('@')[0];

      const { error } = await supabase.from('payees').insert({
        user_id: row.user_id,
        payee_name: displayName,
        email: row.email,
        is_internal: isInternal,
        is_active: true,
        // Field workers always log labor regardless of W2/sub flavor.
        // Admin/manager-on-demand payees (workerType defaults to 'internal') do not.
        provides_labor: isFieldWorker,
        payee_type: isInternal ? 'internal_labor' : 'subcontractor',
        // W2 employees get the standard $75/hr default that PayeeForm uses; sub
        // labor providers don't have a system rate (their cost flows via real bills,
        // not via clocked time × rate; the DB trigger zeros out their entry amount).
        hourly_rate: isInternal ? 75 : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
      queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
      toast.success('Expense & time setup enabled');
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string })?.code;
      // 23505 = unique_violation; someone else already created it — treat as success
      if (code === '23505') {
        queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
        queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
        toast.info('Already enabled');
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to enable: ${message}`);
    },
  });
}

/**
 * Link an existing unlinked internal payee to the role-holder with the matching email.
 */
export function useLinkExistingPayee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (row: EmployeeAuditRow) => {
      if (!row.payee_id) {
        throw new Error('No payee row to link');
      }
      const { error } = await supabase
        .from('payees')
        .update({ user_id: row.user_id })
        .eq('id', row.payee_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
      queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
      toast.success('Record attached');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to attach: ${message}`);
    },
  });
}

/**
 * Deactivate an existing payee (e.g. an unlinked legacy record the admin doesn't want to use).
 * Respects the golden rule: never delete payees — they're referenced by expense history.
 */
export function useDeactivatePayee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payeeId: string) => {
      const { error } = await supabase
        .from('payees')
        .update({ is_active: false })
        .eq('id', payeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
      queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
      toast.success('Retired');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to retire record: ${message}`);
    },
  });
}

/**
 * Toggle whether a user appears in the @mention autocomplete.
 * Admin-only on the server (set_user_can_be_mentioned RPC enforces).
 * On success invalidates both the audit (for the Messages chip) and the
 * mentionable-users query (so the @mention dropdown refreshes within seconds).
 */
export function useToggleMentionable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, canBeMentioned }: { userId: string; canBeMentioned: boolean }) => {
      const { error } = await supabase.rpc('set_user_can_be_mentioned', {
        target_user_id: userId,
        value: canBeMentioned,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
      queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
      toast.success(variables.canBeMentioned ? 'Mentions turned on' : 'Mentions turned off');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update: ${message}`);
    },
  });
}

/**
 * Hard-delete a payee row. Will fail at the DB level (FK constraint 23503) if anything
 * in expenses, contracts, quotes, receipts, change_order_line_items, pending_payee_reviews,
 * or projects.owner_id still references this payee. In that case we translate the error
 * into a plain-language toast suggesting Retire instead.
 *
 * This lets Postgres be the source of truth on "is it safe to delete?" — no pre-check
 * needed, no race condition between check and delete. See Architectural Rule 11.
 */
export function useHardDeletePayee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payeeId: string) => {
      const { error } = await supabase.from('payees').delete().eq('id', payeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
      queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
      queryClient.invalidateQueries({ queryKey: ['payees'] });
      toast.success('Record deleted');
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string })?.code;
      if (code === '23503') {
        toast.error(
          'Cannot delete — this record is referenced by existing history (expenses, contracts, quotes, etc.). Use Retire instead to keep the history intact.'
        );
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to delete record: ${message}`);
    },
  });
}

/**
 * Reactivate an inactive internal payee.
 */
export function useReactivatePayee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payeeId: string) => {
      const { error } = await supabase
        .from('payees')
        .update({ is_active: true })
        .eq('id', payeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
      queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
      toast.success('Restored');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to restore record: ${message}`);
    },
  });
}

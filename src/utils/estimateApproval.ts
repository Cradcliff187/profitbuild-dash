import { supabase } from "@/integrations/supabase/client";

/**
 * Side effects of approving an estimate that are NOT handled by DB triggers.
 *
 * Covered by triggers (do NOT duplicate here):
 *   - Un-approving competing estimates → `sync_contract_on_estimate_status` trigger
 *   - Advancing project.status from 'estimating' → 'approved' → same trigger
 *   - `is_current_version` cleanup on siblings → `ensure_single_current_version` trigger
 *   - `projects.contingency_amount` sync → `update_contingency_on_estimate_change` trigger
 *   - Project margin recalc → `calculate_margins_on_estimate_change` trigger
 *
 * NOT covered by triggers — must be written here:
 *   - `projects.contracted_amount` — must be set to the approved estimate's total
 *   - Project status advance for early stages that aren't exactly 'estimating'
 *     (belt-and-suspenders with the trigger; keeps parity with the pre-refactor
 *     behavior in EstimateStatusActions)
 *
 * GOTCHA #26: the estimate row's `status='approved' AND is_current_version=true`
 * MUST be written atomically in a SINGLE `.update()` BEFORE calling this helper.
 * The contingency trigger silently no-ops if the two fields aren't set together.
 */
export async function approveEstimateSideEffects(
  projectId: string,
  totalAmount: number
): Promise<void> {
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();

  if (fetchError) throw fetchError;

  const earlyStages = ["draft", "pending", "estimating"];
  const shouldAdvanceStatus = project && earlyStages.includes(project.status);

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      contracted_amount: totalAmount,
      ...(shouldAdvanceStatus ? { status: "approved" as const } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (updateError) throw updateError;
}

/**
 * Side effects of REVERTING an approved estimate back to non-approved status
 * (e.g. reopen-as-draft, reject, expire). Clears `contracted_amount` and
 * reverts project status if safe.
 *
 * Not used by the new form buttons (the form only writes forward statuses),
 * but kept here so `EstimateStatusActions` can share the logic.
 */
export async function unapproveEstimateSideEffects(projectId: string): Promise<void> {
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();

  if (fetchError) throw fetchError;

  const safeToRevert = project && ["in_progress", "approved"].includes(project.status);

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      contracted_amount: null,
      ...(safeToRevert ? { status: "estimating" as const } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (updateError) throw updateError;
}

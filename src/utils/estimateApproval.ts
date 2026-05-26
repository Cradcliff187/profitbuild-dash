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
 *     (belt-and-suspenders with the trigger)
 *
 * The contract figure is read from the estimate's trigger-computed `total_amount`
 * (which already has the header discount applied per Rule 26) — NOT from a
 * frontend-computed value. Trusting a caller-supplied total previously wrote the
 * PRE-discount subtotal here, leaving `contracted_amount` (and every margin
 * derived from it) too high by the discount amount.
 *
 * GOTCHA #26: the estimate row's `status='approved' AND is_current_version=true`
 * MUST be written atomically in a SINGLE `.update()` BEFORE calling this helper.
 * The contingency trigger silently no-ops if the two fields aren't set together.
 */
export async function approveEstimateSideEffects(
  projectId: string,
  estimateId: string
): Promise<void> {
  // Authoritative, discount-aware contract figure — the DB totals trigger has
  // already written the discounted total to `total_amount` by this point.
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("total_amount")
    .eq("id", estimateId)
    .single();

  if (estimateError) throw estimateError;

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
      contracted_amount: estimate.total_amount ?? 0,
      ...(shouldAdvanceStatus ? { status: "approved" as const } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (updateError) throw updateError;
}


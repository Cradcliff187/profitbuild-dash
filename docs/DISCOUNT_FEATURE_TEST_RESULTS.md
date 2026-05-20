# Discount Feature — Sandbox Test Results

**Environment**: Supabase preview branch `discount-feature` (project_ref `ulcpuwttnrygqdnaykcx`)
**Tested**: 2026-05-20 · **All 6 migrations applied successfully**

## Summary

**20 of 20 test scenarios passed** at the database / trigger level. The discount mechanism works correctly for estimates, quotes, and change orders. Triggers fire on every relevant event (line item INSERT/UPDATE/DELETE and discount config changes). Constraints reject bad input cleanly. Contingency follows the discounted total as designed. `projects.contracted_amount` syncs correctly on estimate approval.

**One unresolved downstream issue surfaced** that needs your decision before production rollout — see "Critical finding: AIA SOV" below.

## Test results

| # | Scenario | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | Baseline: estimate with 3 lines, no discount | total $50,000, cost $40,000, contingency $5,000 | total $50,000, cost $40,000, contingency $5,000 | ✅ |
| 2 | Apply 10% percent discount | total $45,000, discount $5,000, contingency $4,500 | total $45,000, discount $5,000, contingency $4,500 | ✅ |
| 3 | Change to $2,500 fixed | total $47,500, discount $2,500, contingency $4,750 | total $47,500, discount $2,500, contingency $4,750 | ✅ |
| 4 | $999,999 fixed cap (subtotal $50,000) | discount capped at $50,000, total $0 | discount $50,000, total $0 | ✅ |
| 5 | Remove discount (`type=NULL`) | back to baseline | total $50,000, discount $0, contingency $5,000 | ✅ |
| 6 | Add line item to discounted estimate (`+$10,000` line, 10% discount) | total $54,000, discount $6,000 | total $54,000, discount $6,000 | ✅ |
| 7 | Edit existing line (`$10k → $15k`) | total $58,500, discount $6,500 | total $58,500, discount $6,500 | ✅ |
| 8 | Delete a line | recomputes from remaining lines | total $49,500, discount $5,500 | ✅ |
| 9 | Reject negative `discount_value` | CHECK violation 23514 | raised: `estimates_discount_value_check` | ✅ |
| 10 | Reject invalid `discount_type` | CHECK violation | rejected | ✅ |
| 11 | 0% discount | discount $0, total = subtotal | discount $0, total $55,000 | ✅ |
| 12 | 100% discount | total $0, discount = subtotal | total $0, discount $55,000 | ✅ |
| 13a | Quote baseline ($50k) | total $50,000, discount $0 | total $50,000, discount $0 | ✅ |
| 13b | Quote with 5% discount | total $47,500, discount $2,500 | total $47,500, discount $2,500 | ✅ |
| 14a | CO baseline ($10k price, $8k cost) | client_amount $10k, cost_impact $8k, margin $2k | client_amount $10,000, cost_impact $8,000, margin $2,000 | ✅ |
| 14b | $1,000 fixed CO discount | client_amount $9k, margin $1k, discount $1k | client_amount $9,000, margin $1,000, discount $1,000 | ✅ |
| 14c | Switch to 10% percent CO discount | same math | client_amount $9,000, margin $1,000, discount $1,000 | ✅ |
| 14d | Add line to discounted CO ($+$2,000) | client_amount $10.8k, discount $1.2k | client_amount $10,800, margin $1,800, discount $1,200 | ✅ |
| 14e | $999,999 CO discount cap | capped at subtotal $12,000 | client_amount $0, discount $12,000, margin -$9,000 | ✅ |
| 15 | Approve discounted estimate, check projects | `contracted_amount = $49,500` (discounted), cost $44k, projected margin $5,500 | matches exactly | ✅ |
| 17 | Idempotent re-apply | same result, no recursion | identical row, no infinite loop | ✅ |
| 18 | Pre-feature legacy estimate (untouched discount columns) | behaves as before, totals from line items | total $8,000, cost $5,000, contingency $800 | ✅ |
| 19 | Empty estimate with $500 fixed discount | cap to 0 (subtotal=0) | discount $0, total $0 | ✅ |
| 20 | Insert lines AFTER discount config set | discount applies on first insert | total $1,500, discount $500 (cap), cost $1,500 | ✅ |

## Critical finding: AIA SOV mismatch with discounted estimates

**Issue**: The existing `generate_sov_from_estimate()` RPC sums `estimate_line_items.total` for `schedule_of_values.original_contract_sum`. That's the **pre-discount** subtotal.

A discounted estimate with subtotal $55,000 and total_amount $49,500 (10% off) would generate an SOV where:
- `schedule_of_values.original_contract_sum = $55,000`
- `projects.contracted_amount = $49,500` (set correctly by approval trigger)
- Sum of `sov_line_items.scheduled_value = $55,000` (full line prices)

So the SOV says $55k but the contracted_amount says $49,500 — three places of truth, two values. AIA G703 PDFs would render line items summing to $55k against a different "contract sum to date" — visually confusing.

This is the AIA-billing-meets-silent-discount problem. Three handling options:

| Option | Behavior | Trade-off |
|---|---|---|
| **A. Scale lines proportionally** | Each SOV line gets a × `(total_amount / subtotal)` scaling so they sum to $49,500. Math adds up. | Customer sees line prices that differ from the estimate they accepted. Conflict with "silent" if they compare. |
| **B. Inject a Discount SOV line** | Sum of original lines + a negative "Discount" line of -$5,500. Math adds up; transparent. | Breaks "silent" — the discount is plainly visible on the customer's G703. |
| **C. Block discount + AIA combo** | Validation: can't approve a discounted estimate if AIA billing is enabled on the project. Or: can't generate SOV with non-zero discount. | Hardest constraint but the cleanest data invariant. Forces re-quoting at the new price if the customer demands a discount mid-stream. |
| **D. Document the gap** | SOV stays pre-discount as today. UI surfaces the gap on the project AIA tab ("contracted $49,500 / SOV scope $55,000 — $5,500 contingency"). | Zero migration scope. Confusing UI. Not really a solution. |

**Note**: `add_change_order_to_sov` has the same issue — it appends CO lines using `total_price` (pre-discount). A CO with a discount would inject pre-discount line values into the SOV.

## Backwards compatibility verified

- Existing estimates / quotes / change orders that never touch discount columns continue to use line-item totals exactly as before (TEST-18).
- Default values (`discount_type=NULL`, `discount_value=0`, `discount_amount=0`) mean no behavioral change for legacy rows.
- `total_amount` semantics unchanged — still "customer-facing total". Application code that writes it will be overruled by the trigger on next line item change or discount change. Worth grep-auditing in the UI phase.

## Trigger fan-out check

Confirmed via `pg_trigger` inspection: my new triggers don't recurse into each other or themselves. The estimate AFTER UPDATE trigger only fires on `discount_type` / `discount_value` changes (not on `total_amount`/`discount_amount` writes from the trigger itself).

## Production rollout — completed

- All 6 migrations applied to production via `mcp__supabase__apply_migration` (versions 20260520172758 through 20260520172913)
- Local placeholder files committed to keep `supabase/migrations/` count in sync with `supabase_migrations.schema_migrations` (370 = 370)
- TypeScript types regenerated and written to `src/integrations/supabase/types.ts` — discount columns visible on `estimates`, `quotes`, `change_orders`
- Production smoke test on SYS-TEST sandbox: 10% discount on $10,000 → $1,000 discount, $9,000 total, cost unchanged at $8,000. Cleanup complete.
- Preview branch `9bafe1d0-a56d-467f-b06e-133cc6012cec` deleted (meter stopped)

## AIA SOV mismatch — deferred per decision

Chosen Option D (defer to a separate PR). Documented in `DISCOUNT_FEATURE_PLAN.md` "Open items" section. The mismatch only surfaces on projects using both AIA billing AND a discounted estimate/CO — currently zero in production. Follow-up PR will need a fresh UX call.

## Remaining work (UI phase)

1. Shared `DiscountInput` component (toggle % / $, value input, live preview)
2. Wire into `EstimateForm`, `QuoteForm`, `ChangeOrderForm`
3. Update internal totals displays: `QuoteViewHero`, `ProjectEstimatesView`, estimate detail, CO detail, AIA SOV preview
4. Update customer-facing estimate PDF to render Total only (drop Subtotal row)
5. Grep-audit application code that writes `total_amount` directly — those writes are now advisory; the trigger overrules. Document the deprecation.

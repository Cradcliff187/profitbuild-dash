# Discount Feature — Implementation Plan

**Status:** Planning · **Branch:** `claude/discount-feature-planning-FGd1o` · **Owner:** RCG

## Goal

Let RCG apply a header-level discount to estimates, quotes, and change orders. Discount is silent on customer-facing PDFs (customer sees line items at full price + a final total that already reflects the discount). Internal RCG surfaces show the discount explicitly so the team knows what was conceded.

## Decisions locked in planning conversation

| Decision | Choice |
|---|---|
| Lifecycle stage | Estimates **and** quotes **and** change orders |
| Granularity | Header-level only (per-line not implemented in this pass) |
| Discount type | Either percentage **or** fixed dollar (user picks per discount) |
| Margin treatment | Customer price only — cost unchanged, margin compresses |
| Customer PDF | Line items + final Total only; no subtotal row, no discount line |
| Contingency math | Follows discounted total (contingency = `total × pct%`, smaller after discount) |
| Math location | DB triggers (Rule 1 compliance — bring estimates/quotes into line with how CO totals already work) |

## Schema changes

Three columns added to each of `estimates`, `quotes`, `change_orders`:

```sql
ALTER TABLE <table>
  ADD COLUMN discount_type   text CHECK (discount_type IN ('percent','fixed')),
  ADD COLUMN discount_value  numeric DEFAULT 0  CHECK (discount_value >= 0),
  ADD COLUMN discount_amount numeric DEFAULT 0  CHECK (discount_amount >= 0);
```

- `discount_type` — null means "no discount" (default). When set, must be one of two enum-like values.
- `discount_value` — raw user input: `10` for 10%, or `2500` for $2,500.
- `discount_amount` — always in dollars; maintained by trigger. This is the column downstream consumers read.

No new tables, no foreign keys, no enum type changes.

## Trigger changes

### Estimates and quotes (new triggers — these tables currently set `total_amount` from application code, a Rule 1 deviation)

**New function** `compute_estimate_totals()`:

```sql
CREATE OR REPLACE FUNCTION public.compute_estimate_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  subtotal numeric;
  est_id uuid;
BEGIN
  est_id := COALESCE(NEW.estimate_id, OLD.estimate_id);

  -- Pre-discount subtotal from line items
  SELECT COALESCE(SUM(total), 0) INTO subtotal
  FROM estimate_line_items WHERE estimate_id = est_id;

  -- Pull current discount config + apply
  UPDATE estimates SET
    discount_amount = CASE
      WHEN discount_type = 'percent' THEN ROUND(subtotal * (COALESCE(discount_value, 0) / 100.0), 2)
      WHEN discount_type = 'fixed'   THEN LEAST(COALESCE(discount_value, 0), subtotal)  -- cap so total never goes negative
      ELSE 0
    END,
    total_amount = subtotal - CASE
      WHEN discount_type = 'percent' THEN ROUND(subtotal * (COALESCE(discount_value, 0) / 100.0), 2)
      WHEN discount_type = 'fixed'   THEN LEAST(COALESCE(discount_value, 0), subtotal)
      ELSE 0
    END,
    total_cost = (SELECT COALESCE(SUM(total_cost), 0) FROM estimate_line_items WHERE estimate_id = est_id)
  WHERE id = est_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
```

**Triggers wiring it up:**

```sql
-- Recompute when line items change
CREATE TRIGGER recompute_estimate_totals_on_line_item_change
AFTER INSERT OR UPDATE OR DELETE ON estimate_line_items
FOR EACH ROW EXECUTE FUNCTION compute_estimate_totals();

-- Recompute when discount fields change on the parent
CREATE TRIGGER recompute_estimate_totals_on_discount_change
AFTER UPDATE OF discount_type, discount_value ON estimates
FOR EACH ROW
WHEN (OLD.discount_type IS DISTINCT FROM NEW.discount_type
   OR OLD.discount_value IS DISTINCT FROM NEW.discount_value)
EXECUTE FUNCTION public.recompute_estimate_after_discount_change();  -- thin wrapper that sets est_id from NEW.id
```

(Symmetric pair for `quotes` / `quote_line_items`.)

### Change orders (extend existing trigger)

`sync_change_order_totals()` already computes `cost_impact`, `client_amount`, `margin_impact` from line items. Extend it to apply discount to the client side:

```sql
-- Inside sync_change_order_totals(), after computing total_price_sum:
SELECT discount_type, discount_value INTO co_discount_type, co_discount_value
FROM change_orders WHERE id = co_id;

discount_amt := CASE
  WHEN co_discount_type = 'percent' THEN ROUND(total_price_sum * (COALESCE(co_discount_value,0) / 100.0), 2)
  WHEN co_discount_type = 'fixed'   THEN LEAST(COALESCE(co_discount_value,0), total_price_sum)
  ELSE 0
END;

UPDATE change_orders SET
  cost_impact    = total_cost_sum,
  client_amount  = total_price_sum - discount_amt,
  discount_amount = discount_amt,
  margin_impact  = (total_price_sum - discount_amt) - total_cost_sum,
  updated_at = now()
WHERE id = co_id;
```

Plus an `AFTER UPDATE OF discount_type, discount_value ON change_orders` trigger that re-fires the same logic when the discount itself changes (no line item change).

### Existing triggers that don't need changes

- `calculate_contingency_amount` — reads `total_amount × contingency_percent`. After our trigger writes the discounted total, contingency naturally shrinks. ✓ Matches the decision.
- `calculate_project_margins` (called via `trigger_calculate_project_margins`) — reads `estimates.total_amount` to compute `projects.contracted_amount`. Reads `change_orders.client_amount`. Both now reflect the discount. ✓
- `add_change_order_to_sov` — appends CO lines to SOV. CO's `client_amount` (post-discount) is what gets propagated. ✓
- `update_contingency_remaining` — reads `projects.contingency_amount` which already reflects discount via the chain above. ✓

## UI changes

### New shared component: `src/components/forms/DiscountInput.tsx`

Props: `{ type: 'percent' | 'fixed' | null, value: number, onChange, subtotal }`. Renders a compact toggle (% / $) + value input + live computed-dollar preview ("= $1,250.00"). Used by all three forms below.

### Form integration

- `src/components/EstimateForm.tsx` — add Discount row above the Total block (between line items and total)
- `src/components/QuoteForm.tsx` — same
- `src/components/change-orders/ChangeOrderForm.tsx` — same

In each, on save, the form writes `discount_type` + `discount_value` to the parent record. The DB trigger handles `discount_amount` and `total_amount`/`client_amount` computation.

### Internal display surfaces (show the discount explicitly)

- `QuoteViewHero` (Rule 16) — extend totals block: "Subtotal · Discount (label) · Total"
- `ProjectEstimatesView` — same totals block extension on estimate cards
- Estimate detail / view mode — same
- `change-orders/ChangeOrderDetail` — same
- AIA `SOVPreview` — verify SOV row sum equals discounted contract sum (it will, but worth confirming visually)

### Customer-facing surfaces (silent)

- Estimate proposal PDF (`src/utils/estimatePdf.ts` or similar — to be located during implementation) — render line items at their full prices, then render the Total as `total_amount` (already discounted). **Omit any "Subtotal" row.**
- `generate-contract` edge function — uses `contracts.subcontract_price` set from quote total at contract-creation time. Already discounted upstream. No edge function change.
- `generate-invoice` edge function — uses `project_revenues.amount` directly. No estimate breakdown rendered. No change.

## Verification matrix (run during sandbox testing)

| Scenario | Expected behavior |
|---|---|
| Create estimate with no discount | `discount_type` null, `discount_amount` 0, `total_amount` = sum of lines. Identical to current behavior. |
| Add 10% discount to $50,000 estimate | `discount_amount` = $5,000, `total_amount` = $45,000. Contingency drops if contingency_percent > 0. |
| Add $2,500 fixed discount to $50,000 estimate | `discount_amount` = $2,500, `total_amount` = $47,500. |
| Add $999,999 fixed discount to $50,000 estimate | `discount_amount` capped at $50,000 (LEAST() clause). `total_amount` = $0. Doesn't go negative. |
| Remove discount (set type to null) | `discount_amount` resets to 0, `total_amount` returns to subtotal. |
| Approve estimate with discount → check projects | `projects.contracted_amount` matches discounted total. `actual_margin` reflects compression. |
| Generate SOV from approved discounted estimate | `schedule_of_values.original_contract_sum` matches discounted total. |
| Add line item to discounted estimate | `total_amount` recomputes with discount applied to new subtotal. |
| Edit line item on discounted estimate | Same — discount stays applied, totals refresh. |
| Approved CO with $1,000 discount on $10,000 of work | CO `client_amount` = $9,000. `cost_impact` unchanged. `margin_impact` reduced by $1,000. |
| Generate invoice for project with discounted estimate | Invoice template renders no discount line. Invoice amount unchanged (invoice amount is independent — comes from `project_revenues`). |

## Execution sequence

1. **Create Supabase preview branch** via MCP `create_branch`
2. **Apply migrations to preview branch ONLY** (`apply_migration` with `branch_id`):
   - Migration 1: add 3 columns to `estimates`
   - Migration 2: add 3 columns to `quotes`
   - Migration 3: add 3 columns to `change_orders`
   - Migration 4: create `compute_estimate_totals()` + triggers on estimates/estimate_line_items
   - Migration 5: create equivalent compute function + triggers on quotes/quote_line_items
   - Migration 6: extend `sync_change_order_totals()` + add discount-change trigger on change_orders
3. **Regen TypeScript types** from preview branch via MCP `generate_typescript_types`
4. **Switch `.env.local`** to point at preview branch URL + anon key (preview branch gives its own URL)
5. **Build UI changes** on this git branch
6. **Run dev server** (`npm run dev`, port 5225)
7. **Test against SYS-TEST sandbox project** (project ID `c63b4dea-4a69-448b-b27b-da7b41179a05`):
   - Seed an estimate with a few line items via SQL
   - Run the verification matrix above
   - Capture SQL outputs + UI screenshots
8. **Report results** to user
9. **On approval**: apply migrations to production, create placeholder files locally, commit everything, push, open PR
10. **Delete preview branch** to stop the $0.01344/hr meter

## Rollback plan

Each migration is reversible:

```sql
-- Reverse migration 1 (and 2, 3 symmetrically)
ALTER TABLE estimates DROP COLUMN discount_type, DROP COLUMN discount_value, DROP COLUMN discount_amount;

-- Reverse migration 4 (and 5, 6 symmetrically)
DROP TRIGGER IF EXISTS recompute_estimate_totals_on_line_item_change ON estimate_line_items;
DROP TRIGGER IF EXISTS recompute_estimate_totals_on_discount_change ON estimates;
DROP FUNCTION IF EXISTS compute_estimate_totals();
```

Drop the new triggers before dropping the columns. Existing rows have `discount_amount = 0` so removing the columns affects no live financial state.

## Open items deferred to a future pass

- **Per-line discounts** — explicitly out of scope. If needed, add `discount_value` + `discount_type` to `estimate_line_items` later. The line item rollup trigger would need to subtract the per-line discount when computing `total`.
- **Discount on invoices** (post-acceptance courtesy / early-pay) — invoices today come from `project_revenues`, not from estimate totals. A separate pass.
- **Audit log** of discount changes — would be nice for accountability ("who reduced the discount by $3K?") but not blocking. Activity logging is already wired for status changes on estimates/quotes/COs; can be extended.
- **Approval guard rails** — if discount drops margin below `projects.minimum_margin_threshold`, the existing margin validation warning will fire. Verify in testing.

## Risk register

| Risk | Mitigation |
|---|---|
| Trigger breaks existing estimate saves | Test on preview branch with realistic scenarios before production apply. Migration is fully reversible. |
| `total_amount` semantics shift surprises consumer code | Stays the same — `total_amount` remains "customer-facing total". Just now computed by trigger instead of app. Drop-in. |
| Application code still writes `total_amount` directly | Trigger will overwrite it on next line item change or discount change. Application writes become advisory. Worth grep-auditing forms post-migration. |
| Contingency feeling wrong | User locked in "contingency follows discount". If this proves wrong in practice, follow-up adds a `subtotal_amount` column and points `calculate_contingency_amount` at it. |
| Customer PDF math gap visible to client | Decision: show only Total, no subtotal row. Update PDF template accordingly. |

# Cost Tracking Redesign — Pass 1 Plan

**Status**: ✅ SHIPPED May 21, 2026 — PR #99 (squash `0a5abf0`). Implemented + extended beyond
Pass 1: EFC model, **labor cushion as a 2nd margin**, and the Forecast/Detail tabs **merged into
one Cost Analysis page** (action strip + sort + export + per-line drill-in). See CLAUDE.md **Rule
28** for the as-built reference. The plan below is preserved as the original design record.
**Branch**: `feat/cost-tracking-efc-redesign` (merged to `main`)
**Surface**: `/projects/:id/control` — **single Cost Analysis page** (Buckets/Detail tabs retired)

---

## The goal

Reframe Cost Tracking from "actuals vs cost budget" to **"where will this job land?"**.

The GC owner's real question is profitability projection, not spend recap. Today the page leads with "$X spent of $Y target." The redesign leads with "this job is heading for a $X margin (vs. a planned $Y margin)" — with the bucket breakdown as the supporting evidence.

### Concrete user story (project 225-073, today)

**Today's page**: PMs see four buckets, every category is "Over" by some red number, the per-line "spent" column is all $0 because nobody has correlated expenses to lines, and the page silently hides $96,643 of unallocated spend inside category roll-ups. There's no contract/margin context anywhere in the math.

**Post-redesign**: PM opens the page and reads, in 5 seconds:
> "Contract $82,001. Heading for $98,531 cost. **Projected margin: −$16,530, vs. planned +$18,924.** Subs are the story ($88,868 spent against $49,778 planned). $88,868 is currently unassigned to specific subcontractor lines — auto-suggest can fix most of it."

That's the deliverable.

---

## The model — Expected Final Cost (EFC)

Per-line EFC is auto-derived:

```
EFC = max(actual_to_date, sum(accepted_quote_costs), estimate_cost)
```

Mapping to the real world:

- **No actuals, no quote**: EFC = estimate. The bid is the projection.
- **Accepted quote exists, no actuals**: EFC = sum of accepted quotes. Quotes are commitments and replace the estimate as the projection.
- **Actuals are partial** (actual ≤ commitment): EFC = commitment. The line is in progress; the rest of the bill is expected.
- **Actuals exceed the commitment**: EFC = actual. Reality wins. PM sees the overrun and the original side-by-side.
- **Multi-quote** (more than one accepted on the same line): sum them all. If the sum exceeds the estimate, surface as "committed over plan."
- **PM marks line "Final"** (Pass 2): locks EFC to actual regardless of formula. Lets the PM say "this is done."

### Why max() and not "estimate until proven otherwise"

Because the page must NEVER under-project costs. If you've spent $30K on a $25K line, the projection IS $30K — pretending otherwise just delays the bad news. The Plan number stays visible alongside so the PM sees the gap.

### Status pills (auto-derived from per-line state)

| Pill | Condition |
|---|---|
| 🟦 **Plan** | No commitments, no actuals. Default state. |
| 🔵 **Committed** | Quote(s) accepted, actuals ≤ committed. Common mid-procurement. |
| 🟡 **In Progress** | Actuals present, < EFC. Progress billing in motion. |
| 🟢 **Complete** | PM marked Final OR actuals ≈ EFC and line is not labor. (Pass 2 introduces the explicit mark.) |
| 🔴 **Overrun** | Actuals > committed/estimated with no CO covering it. Demands action. |

### Labor (special handling)

Labor has a budget in **hours** AND **dollars**, plus a cushion concept (Rule 13). Per-line treatment:

| State | Condition | Visual |
|---|---|---|
| 🟢 **Cushion intact** | `actual_hours ≤ estimate_hours` | Green pill, "X hours left at plan, Y hours of cushion behind it" |
| 🟡 **In cushion** | `estimate_hours < actual_hours ≤ capacity_hours` | Amber pill, "$X of cushion consumed, $Y left before real overrun" |
| 🔴 **Over capacity** | `actual_hours > capacity_hours` | Red pill, "$X of real labor cost overrun" |

The project-level "Labor Opportunity" tally sums per-line cushion state into one number — the running margin opportunity from labor.

---

## Scope — what's in Pass 1

**In:**
- `useProjectEFC(projectId)` hook composing existing data sources
- New header card: P&L at projection (Contract / Expected Cost / Projected Margin)
- New per-line view (Plan / Committed / Actual / EFC / Status / Variance) for both Buckets and Detail tabs
- Status pills (auto-derived; no PM override in Pass 1)
- Dedicated Labor Opportunity panel
- Unallocated row per category (the data-hygiene signal)
- Mobile/desktop responsive per existing patterns
- Routing unchanged; tab toggle preserved

**Out (Pass 2):**
- Auto-allocate by payee → line (the killer feature). Backed by a new RPC + sheet UI.
- Action queue at page bottom (the "3 things to do" panel)
- Per-line "Mark Final" toggle (Pass 1 treats Final as auto-detected only)
- CSV export from Detail tab (existing export still works in Pass 1)

**Not changing:**
- Database schema (zero migrations)
- Routes / URLs
- Tab toggle behavior
- Field-worker access rules
- The Detail tab's existing per-line correlation widget — Pass 1 adds EFC columns but doesn't remove existing affordances

---

## Data model

### New hook: `useProjectEFC(projectId)`

Composes (no new fetches):

- `useProjectData(projectId)` → contract amount, project status, contingency, approved COs
- `useLineItemControl(projectId, project)` → line items (estimate + CO), accepted quotes, allocated amounts
- `useProjectCostBuckets(projectId, project)` → category spend, labor cushion state, unallocated spend per category

Outputs:

```ts
interface ProjectEFC {
  projectPL: {
    contract: { base: number; changeOrders: number; total: number };
    expectedCost: { fromPlan: number; overrun: number; total: number };
    projectedMargin: { dollars: number; percent: number };
    plannedMargin: { dollars: number; percent: number };
    deltaMargin: { dollars: number; percent: number };
  };

  laborOpportunity: {
    cushionTotal: number;
    cushionRemaining: number;
    cushionStatus: 'intact' | 'eroding' | 'consumed';
    hoursBudgeted: number;
    hoursUsed: number;
    hoursRemaining: number;
    dollarsBudgeted: number;
    dollarsSpent: number;
    dollarsRemaining: number;
  };

  categories: Array<{
    category: ExpenseCategory;
    displayName: string;
    isInternal: boolean;
    lines: Array<LineEFC>;
    unallocated: { amount: number; expenseCount: number } | null;
    subtotals: { plan: number; committed: number; actual: number; efc: number };
  }>;
}

interface LineEFC {
  id: string;
  description: string;
  source: 'estimate' | 'change_order';

  plan: number;             // cost from estimate or CO
  committedTotal: number;   // sum of accepted_quote costs on this line
  acceptedQuotes: Array<{ id: string; vendor: string; cost: number }>;
  actualTotal: number;      // allocated cost from correlated expenses
  efc: number;              // computed: max(actualTotal, committedTotal, plan)
  variance: number;         // efc - plan
  variancePercent: number;

  status: 'plan' | 'committed' | 'in_progress' | 'complete' | 'overrun';

  // Labor-only fields (undefined for non-labor)
  laborHours?: { budgeted: number; used: number; capacity: number; remaining: number };
  laborCushion?: { amount: number; consumed: number; remaining: number; status: 'intact' | 'eroding' | 'consumed' };
}
```

Pure derivation. No new DB reads.

### Status pill derivation

```ts
function deriveStatus(line: LineEFC): LineEFC['status'] {
  if (line.laborHours) {
    // Labor has its own status from cushion zones
    return mapLaborCushionToStatus(line.laborCushion);
  }
  if (line.actualTotal > line.committedTotal && line.actualTotal > line.plan) return 'overrun';
  if (line.actualTotal > 0) return 'in_progress';
  if (line.committedTotal > 0) return 'committed';
  return 'plan';
}
```

### Unallocated row math

```ts
unallocated = max(0, categorySpend - sum(line.actualTotal for line in category))
```

If positive, render the amber "Unassigned" row with the spend amount + expense count.

---

## Components

### New files

| File | Role |
|---|---|
| `src/hooks/useProjectEFC.ts` | Composer hook (~150 lines) |
| `src/components/cost-tracking/ProjectPLHeader.tsx` | 3-number header card |
| `src/components/cost-tracking/StatusPill.tsx` | 5-state pill, shared |
| `src/components/cost-tracking/LineRow.tsx` | Desktop table row per line |
| `src/components/cost-tracking/LineCard.tsx` | Mobile card per line |
| `src/components/cost-tracking/UnallocatedRow.tsx` | Amber per-category unallocated indicator (both viewports) |
| `src/components/cost-tracking/LaborOpportunityPanel.tsx` | Dedicated labor block |
| `src/components/cost-tracking/CategorySection.tsx` | Collapsible category group, composes LineRow/LineCard + UnallocatedRow + subtotal row |
| `src/components/cost-tracking/ProjectEFCView.tsx` | Top-level composer for the Buckets tab — replaces CostBucketView mount |

### Modified

| File | Changes |
|---|---|
| `src/components/LineItemControlDashboard.tsx` (Detail tab) | Add EFC + Status pill columns. Keep existing per-line correlation widget. Keep existing column-toggle preferences. |
| `src/pages/ProjectControl.tsx` (or wherever the tab mount lives) | Swap `<CostBucketView>` for `<ProjectEFCView>` on the Buckets path. Detail tab path unchanged at the route level, just internal changes. |

### Deprecated (but not deleted yet)

| File | Status |
|---|---|
| `src/components/cost-tracking/CostBucketView.tsx` | Kept until ProjectEFCView ships and is verified. Then removed in Pass 2 cleanup commit. |
| `src/components/cost-tracking/CostBucketSummaryStrip.tsx` | Replaced by ProjectPLHeader at the top of both tabs. Pass 2 cleanup. |
| `src/components/cost-tracking/BucketEmptyState.tsx` | Folded into UnallocatedRow's amber treatment. Pass 2 cleanup. |

`useProjectCostBuckets` itself stays — `useProjectEFC` builds on top of it. The bucket data is still relevant, just composed differently for display.

---

## Mobile / desktop split

Per existing app patterns:

| Component | Desktop | Mobile |
|---|---|---|
| `ProjectPLHeader` | 3-column horizontal card | Stacked: margin leads (biggest), contract+expected side-by-side |
| `CategorySection` | Real table with header row + rows + subtotal row | Sticky section header + card list + subtotal card |
| `LineRow` / `LineCard` | Table row, 6 columns | Card: line name + status pill at top, EFC big number, Plan/Committed/Actual small below, caption sentence |
| `UnallocatedRow` | Indented sub-row, amber bg, button at right | Full-width amber card, 44px button |
| `LaborOpportunityPanel` | Panel with progress bar + per-line stats side-by-side | Stacked vertically, progress bar full-width |
| Tab toggle Buckets/Detail | Rounded pill, orange-500 active | `MobileTabSelector` dropdown |
| Sheet actions (Pass 2: allocate) | Right-side slide-out (Sheet pattern) | Bottom Sheet |

All breakpoints via `useIsMobile()` (768px), not Tailwind `sm:` — per Gotcha #38.

Touch targets ≥44px per Rule 14.

---

## Page anatomy (visual reference)

### Desktop, Buckets tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ [PL HEADER CARD: Contract · Expected Cost · Projected Margin]       │
├─────────────────────────────────────────────────────────────────────┤
│ ▼ LABOR (INTERNAL)         [🟢]   Plan $11,800   EFC $11,800        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [LABOR OPPORTUNITY PANEL]                                       │ │
│ │ 25 / 157 hrs · $1,888 / $11,800 · Cushion $6,293 intact         │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ Demo     · Plan $4,800 · — · Spent $1,888 · EFC $4,800 · 🟡    │ │
│ │ Framing  · Plan $7,000 · — · — · EFC $7,000 · 🟦                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ▼ SUBCONTRACTORS           [🔴]   Plan $49,778   EFC $88,868        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Storefront · Plan $24,890 · — · — · EFC $24,890 · 🟦            │ │
│ │ Electric   · Plan $5,000 · — · — · EFC $5,000 · 🟦              │ │
│ │ Sprinkler  · Plan $1,500 · — · — · EFC $1,500 · 🟦              │ │
│ │ Flooring   · Plan $12,888 · — · — · EFC $12,888 · 🟦            │ │
│ │ Paint      · Plan $5,500 · — · — · EFC $5,500 · 🟦              │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ ⚠️ $88,868 unassigned (17 expenses)         [Allocate to lines] │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ▶ MATERIALS                [🔴]   Plan $1,500   EFC $7,178          │
│ ▶ OTHER                    [⚠️]    Plan $0       Spend $598          │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile, Buckets tab

```
┌───────────────────────────┐
│ Projected Margin          │
│ -$16,530  (-20%)          │
│ ↓ from planned $18,924    │
├───────────────────────────┤
│ Contract    Expected      │
│ $82,001     $98,531       │
└───────────────────────────┘

🟢 LABOR (INTERNAL)
   Plan $11,800 / EFC $11,800

   [LABOR OPPORTUNITY PANEL]
   25 / 157 hrs
   ████░░░░░░ 16%
   $9,912 of budget left
   Cushion: $6,293 intact

   ┌─ Demo ─────────── 🟡 In Progress ─┐
   │ Heading for $4,800                │
   │ Plan $4,800 / Committed — / Spent │
   │ $1,888                            │
   │ "25 of 64 hrs used. 39 to go."    │
   └───────────────────────────────────┘

   ┌─ Framing ──────── 🟦 Plan ────────┐
   │ Heading for $7,000                │
   │ Plan $7,000 / 93 hrs              │
   └───────────────────────────────────┘

🔴 SUBCONTRACTORS
   Plan $49,778 / EFC $88,868

   [5 line cards — Storefront, Electric, ...]

   ┌─ ⚠️ ─────────────────────────────┐
   │ $88,868 unassigned (17 expenses)│
   │                                  │
   │ ┌─────────────────────────────┐ │
   │ │     Allocate to lines →     │ │
   │ └─────────────────────────────┘ │
   └──────────────────────────────────┘
```

### Detail tab (both viewports)

Same `ProjectPLHeader` at the top.

Below: existing LineItemControlDashboard table, but with two new columns inserted:
- **EFC** (between Estimate Cost and Quoted Cost)
- **Status** (rightmost before the actions column)

All existing column-toggle preferences preserved. Existing per-line correlation widget unchanged. Existing CSV export unchanged.

---

## Edge cases

| Case | Behavior |
|---|---|
| Project has no approved estimate | Header shows "No baseline" for Expected Cost; category sections render but with empty Plan columns. Actuals still flow to Unallocated rows. |
| Approved CO adds new lines | Lines appear in the relevant category with `source: 'change_order'`, a small CO badge, and Plan = CO's `client_amount`. Contract header shows CO contribution. |
| Project has zero expenses yet | All EFC = Plan, all status pills 🟦, projected margin = planned margin, header is "On track." |
| Line has accepted quote AND actuals exceed it | EFC = actuals. Status = 🔴 Overrun. Caption: "+$X over committed amount — write a CO or absorb." |
| Multi-quote (Gotcha #57 case) | Committed column shows the sum + a "(N quotes)" badge. If sum > plan, line auto-gets Committed-Over treatment. |
| Labor line with no `labor_hours` set | Render as non-labor (no hours column, no cushion treatment). Defensive. |
| Project with all internal labor and zero external | Page renders just Labor section + an empty external state with "No subcontractor or material lines in this estimate." |

---

## TanStack Query invalidation

New query keys:
- `['project-efc', projectId]` — main hook key, 30s staleTime, refetch on focus

Invalidate `['project-efc', projectId]` whenever any of these mutate (Gotcha #27):
- `useExpensesQuery` mutation paths (already invalidates `['expenses-search']` + `['project-data']`)
- `useProjectCostBuckets` invalidation surfaces (already cover the underlying queries)
- New per-line allocation mutations in Pass 2 (must invalidate this too)

Because `useProjectEFC` composes existing hooks via TanStack, downstream invalidations propagate. The new key just gives consumers a stable entry point.

---

## Test plan

### Manual verification (mandatory before merge)

1. **SYS-TEST sandbox**: smoke test the page renders, no console errors, headers compute, sections collapse/expand, mobile and desktop both render.
2. **225-073 (the canonical "broken" project)**: confirm the page tells the correct story — Contract $82K, Expected $98.5K, projected loss of $16.5K. Unallocated row shows $88,868 in subs.
3. **A clean project** (e.g. 225-005): confirm normal-state rendering — all green, no unallocated rows, healthy margin.
4. **Project with all-internal-labor** (e.g. an overhead project): Labor panel front and center, no empty-states elsewhere.
5. **Project with multi-quote line** (e.g. 225-037 Flooring): confirm the multi-quote badge, the "Committed-Over-Plan" treatment.
6. **Mobile breakpoint** (~390px viewport, real iPhone safari ideally): every section reflows, no horizontal scroll, touch targets ≥44px.
7. **Detail tab parity**: EFC + Status columns appear, existing affordances still work, column toggles still respected.

### Build / type check

- `npm run pre-deploy` clean
- `npm run type-check` clean
- `npm run lint` clean (no NEW errors; existing `any` debt is fine)

### Regression watch

- Existing `CostBucketView` route still mounts on legacy projects with no estimate (defensive — should never happen but worth checking)
- `useProjectCostBuckets` consumers unchanged (since we add to it, don't replace it)
- Field-worker role gating unchanged (no project sub-route gain or loss)

---

## File-by-file effort estimate

| File | Lines | Days |
|---|---|---|
| `useProjectEFC.ts` | ~150 | 0.5 |
| `ProjectPLHeader.tsx` | ~120 (desktop + mobile) | 0.5 |
| `StatusPill.tsx` | ~40 | 0.1 |
| `LineRow.tsx` + `LineCard.tsx` | ~250 combined | 0.7 |
| `UnallocatedRow.tsx` | ~80 | 0.2 |
| `LaborOpportunityPanel.tsx` | ~150 | 0.4 |
| `CategorySection.tsx` | ~120 | 0.3 |
| `ProjectEFCView.tsx` (composer) | ~80 | 0.2 |
| `LineItemControlDashboard.tsx` (Detail tab) | +60 lines | 0.3 |
| Tab mount swap | minor | 0.1 |
| Test + polish + manual QA | — | 0.7 |
| **Total** | **~1,150 new + 60 modified** | **~3 days** |

---

## Risks

1. **Visual regression on the dense Detail tab**: adding two columns to a wide table on a small laptop screen could push it past horizontal scroll. Mitigation: confirm `min-w-0` cells + horizontal scroll wrapper, test at 1280px and 1440px.

2. **EFC math edge case on labor**: labor's "cushion intact" status needs to feed through to the line's EFC. If a labor line is 🟢, EFC should equal plan (the cushion is the buffer, not extra cost). If 🟡, EFC bumps proportionally. If 🔴, EFC is the actual capacity overrun. I'll document this carefully in the labor section of the hook.

3. **Multi-line allocation discovery**: When unallocated spend exists for a category with multiple lines, "Allocate to lines" needs a thoughtful sheet UX. That's Pass 2, but the Pass 1 button is a stub that opens a placeholder sheet with the current `BulkExpenseAllocationSheet`. Acceptable interim.

4. **Tab-switching cache pressure**: Composing the new hook on top of existing ones could cause double-fetches if the consumer toggles between Buckets and Detail rapidly. Mitigation: both tabs mount inside one query client; staleTime 30s prevents thrash.

---

## Open questions

1. **Header card on Detail tab**: Yes/no? My current plan says yes — it's the anchor for both views and the cost is small. Want explicit confirmation.

2. **Action queue at bottom of page** (Pass 2): Sticky at the bottom of mobile viewport (like FieldQuickActionBar), or inline at the end of the scroll? My instinct: inline. The bar pattern is for capture; this is for review-and-act.

3. **Where does "Mark Final" live** (Pass 2): Per-line in the card menu? A bulk action from the Detail tab? Both?

4. **Contract drill-in**: should clicking the Contract header number open the estimate(s) + COs detail? Low-effort, useful for sanity check. Probably yes.

5. **Naming**: I called the new view "ProjectEFCView" internally. The user-facing labels stay "Buckets" / "Detail" (no change). If we want to rename the tabs to something like "Forecast" / "Detail" that's a separate discussion — happy to defer.

---

## Pass 2 preview (out of scope here)

- **Auto-allocate by payee**: backend RPC `suggest_expense_allocations(project_id)` returns proposed `(expense_id → line_id)` pairs based on payee → accepted-quote-vendor matches, payee → line description fuzzy matches, and category alignment. Frontend sheet renders proposals with confidence scores, one-click accept-all or per-row.
- **Action queue**: aggregates "things to do" — unallocated bucket spend, missing quotes, uncategorized expenses, lines flagged for CO. Each entry has a one-click CTA.
- **Mark Final per line**: PM override on EFC. UI in line menu.
- **Cleanup**: delete `CostBucketView` and `CostBucketSummaryStrip` after Pass 1 ships and bakes in production for a week.

---

## Checkpoint plan

1. **Plan approved** (this doc) ← we are here
2. **Hook + types built**, no UI yet. Verify against 225-073 and SYS-TEST data via a small unit-style harness or a `console.log` injection.
3. **ProjectPLHeader shipped first** as a standalone visible card above the existing Buckets view. Lets the user see the headline answer in production before the full reshape.
4. **LineRow/LineCard + CategorySection + LaborOpportunityPanel** as the second drop. Replaces the bucket card body.
5. **UnallocatedRow + Detail tab EFC columns** as the third drop.
6. **Polish + QA + draft PR to ready** as the fourth.

Each checkpoint can ship to main independently if needed (the page degrades gracefully — header without body, body without unallocated, etc).

# Cost Tracking — Calculations & Measures Reference

**Status:** Authoritative (May 22, 2026 · PR #105)
**Surface:** `/projects/:id/control` (Overview) + `/projects/:id/control/:lineId` (per-line detail)
**See also:** CLAUDE.md Architectural Rule 28.

This is the single source of truth for every number shown on the Cost Tracking surfaces. All of it
is **frontend derivation over existing data** — there is **no Cost-Tracking-specific DB column,
view, or RPC**. Nothing here is queried by the AI report assistant (see
[§ Relationship to the KPI catalog](#relationship-to-the-kpi-catalog)).

---

## 1. Data chain (where the numbers come from)

```
useProjectEFC                      ← derives every measure below (pure, memoized; no query)
  └─ useProjectCostBuckets         ← per-category buckets + labor cushion state
       └─ useLineItemControl       ← estimate/CO line items + accepted quotes + correlated expenses
            ├─ estimate_line_items (current-version, else approved, else latest estimate)
            ├─ change_order_line_items (approved COs)
            ├─ quotes + quote_line_items (status='accepted')
            └─ expense_line_item_correlations → expenses (+ payees, + splits)
```

- **No new query for the detail page.** `CostLineDetailRoute` finds the line by id inside the
  already-loaded `useProjectEFC.categories` (mirrors how `QuoteViewRoute` resolves a quote).
- **Quote correlations resolve to their estimate line** in `useLineItemControl` (Rule 28 / Rule 27).
- Labor "hours" everywhere is **paid hours** = `expenses.hours` (post-lunch deduction), **never**
  `gross_hours` (CLAUDE.md Gotcha #17).

---

## 2. Per-line measures (`EFCLine`, in `useProjectEFC.ts`)

| Measure | Formula / source |
|---|---|
| **plan** | estimate (or CO) line cost = `cost_per_unit × quantity` (`li.target`) |
| **committed** | Σ cost of **accepted** quotes on the line (`li.quotedCost`); `0` if none |
| **actual** (Spent) | Σ cost of **allocated** expenses on the line (correlations; `li.allocatedAmount`) |
| **efc** | `max(actual, committed, plan)` — Expected Final Cost; never under-projects |
| **variance** (Δ) | `efc − plan` (positive = over the original estimate) |
| **status** | see below |

**Status (`deriveStatus`)** — `baseline = max(committed, plan)`:
1. `actual > 0 && actual > baseline` → **overrun**
2. `actual > 0` → **in_progress**
3. `committed > 0` → **committed**
4. else → **plan**

---

## 3. Per-category & project roll-ups (`EFCCategory`, `pl`)

| Measure | Formula |
|---|---|
| **subtotal.plan / committed / actual / efc** | Σ of the category's line values |
| **categorySpend** | total actual spend in the category (allocated **+** unallocated) = `bucket.spent` |
| **allocatedSpend** | Σ line `actual` |
| **unallocated** | `max(0, categorySpend − allocatedSpend)` — spend not yet tied to a line |
| **expectedCost** (category) | `max(categorySpend, Σ lineEFC)` — unallocated spend counts, never double-counted |
| **plannedCost** (project) | `Σ category.subtotal.plan` |
| **expectedCost** (project) | `Σ category.expectedCost` |
| **plannedMargin** | `contract − plannedCost` |
| **projectedMargin** | `contract − expectedCost` |
| **marginDelta** | `projectedMargin − plannedMargin` (negative = margin compression) |
| **marginWithOpp** | `projectedMargin + cushionRemaining` (see § Labor cushion) |
| **issuesCount** | count of lines with `status === 'overrun'` (the "Issues" KPI / action chip) |

`contract` = `projects.contracted_amount` (revenue incl. approved COs).

---

## 4. Labor cushion (`LaborCushionState` → `EFCLaborOpportunity`)

The cushion is the margin opportunity from the spread between the **billed labor rate** and the
**actual cost rate** — i.e. every estimated hour finished cheaper than estimated becomes margin.

- **bakedIn** = `estimate_financial_summary.total_labor_cushion` (computed at estimate finalization).
- **remaining** (eroding) — by `actualHours` vs `estHours` vs `capacityHours`:
  - `actualHours ≤ estHours` → **under_est** (intact): `remaining = bakedIn`
  - `estHours < actualHours ≤ capacityHours` → **in_cushion** (eroding):
    `remaining = bakedIn − (actualHours − estHours) × actualCostRate`
  - `actualHours > capacityHours` → **over_capacity**: `remaining = 0` (excess hours are real loss)
- **Margin + Labor Opp = projectedMargin + remaining.** The cushion is **NOT** part of the
  projected margin; it's the optimistic upper bound, realized only if labor lands at the actual
  rate. As hours are consumed, `remaining` shrinks → `marginWithOpp` slides down toward
  `projectedMargin`. **Use `remaining`, never `bakedIn`** (or it stops decreasing).
- `laborOpportunity` also exposes: `estHours`, `actualHours`, `capacityHours`,
  `hoursRemaining = max(0, estHours − actualHours)`, `dollarsBudgeted` (labor subtotal.plan),
  `dollarsSpent` (labor subtotal.actual), `dollarsRemaining = max(0, plan − actual)`.

> **Why the line's "X of Y hrs used" differs from "Spent ÷ rate":** the subtitle shows **actual
> logged paid hours**, while spend ÷ estimate-rate would re-express dollars as hours. When the crew
> costs less than the estimate rate, those diverge — and that gap *is* the cushion. The subtitle
> deliberately reports real hours so it doesn't overstate remaining capacity.

---

## 5. Presentation helpers (`lineDisplay.ts`)

**`lineDisplayStatus`** — refines the 4-state status into the 5 shown on the surfaces:

| Display | Condition | Pill | Left border |
|---|---|---|---|
| **Over** | `overrun` | red | red |
| **On plan** | `in_progress` AND `actual ≥ baseline` (fully billed, at/under budget) | green | green |
| **In prog** | `in_progress` (partial) | amber | amber |
| **Committed** | `committed` | blue | blue |
| **Plan** | `plan` | slate | slate |

**`lineSubtitle`** (one line under the name):
- **Labor:** actual logged paid hours vs estimate — `"{used} of {est} hrs · {n} to go"`, or
  `"{n} over"` past estimate, or `"{est} hrs budgeted"` when not started. Falls back to
  cost-equivalent hours **only** when no hours were logged.
- **overrun:** `"[No quote · ]{actual/plan}% of plan"` (the "No quote · " prefix when `committed === 0`).
- **in_progress, fully billed** (`actual ≥ baseline`): `"Billed in full"`.
- **in_progress, partial:** `"{actual/baseline}% billed · {baseline − actual} to go"`.
- **committed:** `"Committed {committed}"`.

**`lineVendor`** — accepted-quote payee, else the payee carrying the most allocated spend.
**`rollupByEmployee`** — groups a labor line's correlated expenses by payee, summing **paid hours**
and amount, sorted by hours desc (the per-employee table on a labor line's detail page).

---

## 6. Overview KPI strip (`CostKpiStrip`)

| Tile | Value | Sub-line |
|---|---|---|
| **Contract** | `pl.contract` | — |
| **EFC** | `pl.expectedCost` | `+{over} over` where `over = expectedCost − plannedCost` (else "on plan") |
| **Margin** | `pl.projectedMargin` (red if negative) | `pl.projectedMarginPct` |
| **Labor Opp** | `+{pl.cushionRemaining}` (only when `pl.hasCushion`) | "Cushion" |
| **Issues** | `issuesCount` (# overrun lines) | "over budget" / "on track" |

`pct = margin / contract × 100`. The strip is 5 tiles with a cushion, 4 without.

---

## 7. Per-line detail page (`CostLineDetail`)

**KPI tiles:** Plan (`line.plan`), Spent (`line.actual`, sub `"{N} invoices/entries"` where
`N = correlatedExpenses.length`), EFC (`line.efc`, sub `"{remaining} to go"` /
`"No to-go"` where `remaining = max(0, max(committed,plan) − actual)`), Variance (`line.variance`,
red if over, sub `"{actual/plan}% of plan"`).

**Budget-vs-actual bar:** green `planPortion = plan`, red `overPortion = max(0, efc − plan)`;
green width `= plan / (plan + over)`.

**Flags** (derived across the whole project — no extra query):
- **No accepted quote on file** — `!isLabor && committed === 0 && actual > 0`.
- **Largest single overrun** — `isOver && overruns.length > 1 && variance ≥ max(overrun variances)`;
  shows `pctOfOverage = variance / Σ(overrun variances) × 100` ("drives N% of total project overage").

**Contract & Vendor cards:** Vendor (`lineVendor`), Quote status (accepted quote `#` + committed $,
else "None on file"), Estimate line ("Linked to estimate" / "From change order"), Category.

**Tabs:** *Overview* (everything above + a top-5 recent list) and a detail tab —
`"By employee (N)"` for labor (the `rollupByEmployee` table) or `"Invoices & bills (N)"` for
external lines (date · payee · amount of each correlated expense).

---

## 8. Allocation (shared matcher — financials-critical)

`ProjectLineAllocationSheet` and the two existing sheets (`ExpenseAllocationSheet`,
`BulkExpenseAllocationSheet`) all use [`matchExpenseToLine`](../src/utils/expenseAllocation.ts).
It **suggests, never silent-writes** — tiers:

| Confidence | Rule |
|---|---|
| 95 | payee matches an accepted quote on a line |
| 85 | the only line in the expense's category |
| 65 | payee ↔ line-description keyword match |
| — | ambiguous → manual pick required |

Gated by `isProjectVisibleByCategory(project)` (construction projects + the SYS-TEST sandbox;
overhead projects are category-locked and get no Allocate). Allocations must stay human-confirmed.

---

## Relationship to the KPI catalog

The Cost Tracking measures are **deliberately not** in `src/lib/kpi-definitions` (the catalog that
feeds the `/kpi-guide` page and the AI report assistant's SQL generation). Reasons:

1. **They have no DB column.** EFC, projected margin (this page's), the cushion, per-line
   variance/status are computed live per project from line items + correlations + quotes. There is
   nothing for the AI to `SELECT`.
2. **"Projected Margin" here ≠ the catalog's.** The page shows `Contract − EFC` (a live forecast).
   The catalog's reportable forecast margin is **`adjusted_est_margin`** (a DB-view column:
   "expected final margin based on current estimates, adjusted for accepted quotes + COs"). The
   deprecated `projects.projected_margin` column is **not** this page's value either. When someone
   asks the AI/report for "projected margin," `adjusted_est_margin` is the correct answer — **not**
   the Cost Tracking page number.
3. **Hours.** Per-employee labor here is **paid hours** (`expenses.hours`); the catalog's hours KPIs
   are "Paid Hours" / "Gross Hours" per Gotcha #17 — same `expenses.hours` source, consistent.

If these ever need to be reportable cross-project (not just a per-project page), the right move is a
DB view/RPC + a catalog entry (then `npm run sync:edge-kpis` to regenerate the AI context) — **not**
adding frontend-derived measures to the SQL catalog.

---

## Deferred (not in v1 — need new data)

| Feature | Why it's deferred |
|---|---|
| Cost codes (e.g. "08 41 13") | no column on `estimate_line_items` |
| Per-line Documents | `project_documents` is project-scoped, not line-scoped |
| Paid/Pending **payment** status on invoices | `expenses.approval_status` is approval, not payment |
| Per-line Activity feed | the activity feed is project-level |

# Phase 2: Project Overview Redesign — ProjectOperationalDashboard
**Date:** February 3, 2026
**Risk Level:** Medium — Significant UI changes to one component, but no data source or calculation changes
**Estimated Effort:** 3-4 sessions
**Guiding Principle:** QuickBooks handles all bookkeeping. RCG Work = project operations only.

---

## Pre-Implementation Checklist

### What We Are NOT Touching
- All email edge functions (Resend)
- All database migrations, triggers, functions
- The `reporting.project_financials` view
- `src/utils/projectDashboard.ts` calculation functions
- `ProjectsList.tsx` / `ProjectsTableView.tsx` / `WorkOrdersTableView.tsx`
- All route components in `src/components/project-routes/` (except reading `ProjectOverviewRoute.tsx` to understand props)
- All CRUD operations on estimates, expenses, change orders, time entries
- `ProjectNotesTimeline` component (used as-is)

### Props Available (from ProjectOverviewRoute.tsx)
```typescript
// These are already passed to ProjectOperationalDashboard:
project         // Full project object with all DB fields
estimates       // Array of estimates
quotes          // Array of quotes
expenses        // Array of expenses
changeOrders    // Array of change orders
pendingTimeEntries  // number
pendingReceipts     // number
mediaCounts     // Media counts object
documentCount   // number
```

No new props are needed. All new sections use data already available via these props or via direct project fields from the database.

---

## 2.1 Enhanced Needs Attention Section

**File:** `src/components/ProjectOperationalDashboard.tsx`

The existing `needsAttention` useMemo already handles:
- Pending time entries
- Pending receipts
- Pending change orders
- Expiring quotes (via `getExpiringQuotes()`)

### Add: DNE Warning

Add inside the `needsAttention` useMemo, after the existing items:

```typescript
// DNE Warning — check if expenses approaching do_not_exceed
if (project.do_not_exceed && project.do_not_exceed > 0) {
  const totalExpenses = (project as any).total_expenses ?? 0;
  const utilizationPct = (totalExpenses / project.do_not_exceed) * 100;
  if (utilizationPct >= 80) {
    const remaining = project.do_not_exceed - totalExpenses;
    items.push({
      type: 'dne_warning',
      label: `DNE: ${formatCurrency(remaining)} of ${formatCurrency(project.do_not_exceed)} remaining (${utilizationPct.toFixed(0)}% used)`,
      count: 1,
      color: utilizationPct >= 95 ? 'red' : 'orange',
      icon: AlertTriangle,
      onClick: () => navigate(`/projects/${project.id}/expenses`),
    });
  }
}
```

**Data source:** `project.do_not_exceed` is a direct field on the projects table. `total_expenses` comes from the reporting view data already enriched on the project object.

### Add: Contingency Warning

```typescript
// Contingency Warning
const contingencyAmount = project.contingency_amount ?? 0;
const contingencyRemaining = project.contingency_remaining ?? 0;
if (contingencyAmount > 0) {
  const remainingPct = (contingencyRemaining / contingencyAmount) * 100;
  if (remainingPct <= 25) {
    items.push({
      type: 'contingency_warning',
      label: `Contingency: ${formatCurrency(contingencyRemaining)} left (${remainingPct.toFixed(0)}%)`,
      count: 1,
      color: remainingPct <= 10 ? 'red' : 'orange',
      icon: AlertTriangle,
      onClick: () => navigate(`/projects/${project.id}/change-orders`),
    });
  }
}
```

**Data source:** `project.contingency_amount` and `project.contingency_remaining` are direct DB fields maintained by triggers when change orders are approved.

### Add: Data Freshness Warning

This requires a new `useEffect` + state, placed alongside the existing `scheduleDates` state:

```typescript
// Data freshness tracking
const [dataFreshness, setDataFreshness] = useState<{
  lastExpenseDays: number | null;
  lastTimeDays: number | null;
}>({ lastExpenseDays: null, lastTimeDays: null });

useEffect(() => {
  async function checkFreshness() {
    if (!project.id) return;

    // Last non-labor expense by expense_date (not created_at)
    const { data: lastExpense } = await supabase
      .from('expenses')
      .select('expense_date')
      .eq('project_id', project.id)
      .neq('category', 'labor_internal')
      .order('expense_date', { ascending: false })
      .limit(1)
      .single();

    // Last time entry (labor_internal expense) by expense_date
    const { data: lastTime } = await supabase
      .from('expenses')
      .select('expense_date')
      .eq('project_id', project.id)
      .eq('category', 'labor_internal')
      .order('expense_date', { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    setDataFreshness({
      lastExpenseDays: lastExpense?.expense_date
        ? Math.floor((now.getTime() - new Date(lastExpense.expense_date).getTime()) / 86400000)
        : null,
      lastTimeDays: lastTime?.expense_date
        ? Math.floor((now.getTime() - new Date(lastTime.expense_date).getTime()) / 86400000)
        : null,
    });
  }

  // Only check freshness for active projects — irrelevant for estimating/complete
  if (['in_progress', 'approved'].includes(project.status)) {
    checkFreshness();
  }
}, [project.id, project.status]);
```

Then in the `needsAttention` useMemo, add `dataFreshness` to the dependency array and:

```typescript
// Data Freshness Warning — only for active projects with stale data
if (['in_progress', 'approved'].includes(project.status)) {
  if (dataFreshness.lastExpenseDays !== null && dataFreshness.lastExpenseDays > 14) {
    items.push({
      type: 'stale_expenses',
      label: `No expenses logged in ${dataFreshness.lastExpenseDays} days`,
      count: 1,
      color: 'orange',
      icon: Clock,
      onClick: () => navigate(`/projects/${project.id}/expenses`),
    });
  }
  if (dataFreshness.lastTimeDays !== null && dataFreshness.lastTimeDays > 7) {
    items.push({
      type: 'stale_time',
      label: `No time logged in ${dataFreshness.lastTimeDays} days`,
      count: 1,
      color: 'orange',
      icon: Clock,
      onClick: () => navigate('/time-entries'),
    });
  }
}
```

**Note:** Using 14 days for expenses (less frequent) and 7 days for time entries (should be daily/weekly). These thresholds are conservative — they can be tightened later.

**Important:** The `needsAttention` useMemo dependency array must be updated to include `dataFreshness`:
```typescript
}, [pendingTimeEntries, pendingReceipts, changeOrders, quotes, project, navigate, dataFreshness]);
```

---

## 2.2 Contract Narrative Section (NEW)

Add a new section below Needs Attention, above Financial Summary.

### Data Calculation

Add a new useMemo:

```typescript
const contractNarrative = useMemo(() => {
  const currentContract = project.contracted_amount ?? 0;

  // Derive change order impact from the changeOrders prop
  const approvedCOs = changeOrders.filter(co => co.status === 'approved');
  const coCount = approvedCOs.length;
  const coRevenue = approvedCOs.reduce((sum, co) => sum + (co.client_amount ?? 0), 0);

  // Original contract = current contract minus CO revenue additions
  // This works because contracted_amount is updated by DB triggers when COs are approved
  const baseContract = currentContract - coRevenue;

  return {
    baseContract,
    changeOrderCount: coCount,
    changeOrderRevenue: coRevenue,
    currentContract,
    showNarrative: currentContract > 0,
  };
}, [project.contracted_amount, changeOrders]);
```

### Rendering

Add this JSX in the render, after Needs Attention and before Financial Summary:

```tsx
{/* Contract Narrative */}
{contractNarrative.showNarrative && (
  <Card className="p-3">
    <div className="flex items-center gap-2 mb-2">
      <FileSignature className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Contract
      </span>
    </div>
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Original Contract</span>
        <span className="font-mono font-semibold">
          {formatCurrency(contractNarrative.baseContract)}
        </span>
      </div>
      {contractNarrative.changeOrderCount > 0 && (
        <>
          <div className="flex justify-between text-muted-foreground">
            <span>+ Change Orders ({contractNarrative.changeOrderCount})</span>
            <span className="font-mono">
              {formatCurrency(contractNarrative.changeOrderRevenue)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Current Contract</span>
            <span className="font-mono">
              {formatCurrency(contractNarrative.currentContract)}
            </span>
          </div>
        </>
      )}
    </div>
  </Card>
)}
```

**What's NOT here:** No invoicing progress bar. No "% billed." No billing lag. That's QuickBooks territory.

**Import needed:** `FileSignature` from `lucide-react`, `Separator` from `@/components/ui/separator` (both likely already imported or easily added).

---

## 2.3 Labor Section (NEW)

### Data Source

The project object already has `estimated_hours` and `actual_hours` fields (confirmed in KPI definitions: `projects.estimated_hours`, `projects.actual_hours`). We also use the `dataFreshness.lastTimeDays` calculated in 2.1.

### Rendering

Add after the Financial Summary / Budget Status grid:

```tsx
{/* Labor — only show for active projects with estimated hours */}
{['approved', 'in_progress'].includes(project.status) &&
  (project.estimated_hours ?? 0) > 0 && (
  <Card className="p-3">
    <div className="flex items-center gap-2 mb-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Labor
      </span>
    </div>
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-muted-foreground">Estimated</div>
          <div className="text-sm font-semibold">
            {(project.estimated_hours ?? 0).toFixed(0)}h
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Actual</div>
          <div className="text-sm font-semibold">
            {(project.actual_hours ?? 0).toFixed(0)}h
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Remaining</div>
          <div className="text-sm font-semibold">
            {Math.max(0, (project.estimated_hours ?? 0) - (project.actual_hours ?? 0)).toFixed(0)}h
          </div>
        </div>
      </div>
      {(project.estimated_hours ?? 0) > 0 && (
        <Progress
          value={Math.min(
            100,
            ((project.actual_hours ?? 0) / (project.estimated_hours ?? 0)) * 100
          )}
          className="h-2"
        />
      )}
      {dataFreshness.lastTimeDays !== null && (
        <div className="text-xs text-muted-foreground">
          Last time entry:{' '}
          {dataFreshness.lastTimeDays === 0
            ? 'Today'
            : `${dataFreshness.lastTimeDays}d ago`}
        </div>
      )}
    </div>
  </Card>
)}
```

**What's NOT here:** No labor cost calculations. Hours are an operations metric. The dollar conversion happens in the database via expense records when time entries are approved.

**Import needed:** `Progress` from `@/components/ui/progress` (likely already imported for budget bar).

---

## 2.4 Enhanced Budget Status with Contingency

The existing Budget Status card already shows budget utilization via `calculateBudgetStatus()`. Add a contingency sub-section inside it.

**Location:** Inside the existing Budget Status card rendering, after the budget progress bar:

```tsx
{/* Contingency — inside Budget Status card, below existing progress bar */}
{(project.contingency_amount ?? 0) > 0 && (
  <div className="mt-2 pt-2 border-t">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">Contingency</span>
      <span
        className={getContingencyColor(
          ((project.contingency_remaining ?? 0) /
            (project.contingency_amount ?? 0)) *
            100
        )}
      >
        {formatCurrency(project.contingency_remaining ?? 0)} left
      </span>
    </div>
    <Progress
      value={
        ((project.contingency_remaining ?? 0) /
          (project.contingency_amount ?? 0)) *
        100
      }
      className="h-1.5"
    />
  </div>
)}
```

**Import needed:** `getContingencyColor` from `@/utils/financialColors` (created in Phase 1).

---

## 2.5 Section Reordering

The current render order in `ProjectOperationalDashboard` is approximately:
1. Needs Attention
2. Financial Summary (4-metric grid)
3. Budget Status + Schedule (side by side)
4. Change Order Summary
5. Quick Stats (media counts, documents)
6. Project Notes Timeline

**New render order:**

```
1. Needs Attention (EXISTING — enhanced with DNE, contingency, freshness warnings)
2. Contract Narrative (NEW — section 2.2)
3. Financial Summary grid (EXISTING — unchanged)
4. Margin Status (EXISTING — unchanged)
5. Budget Status + Contingency (EXISTING — enhanced per 2.4)
6. Labor + Schedule (LABOR is NEW per 2.3, Schedule EXISTING — side by side on desktop)
7. Change Order Summary (EXISTING — unchanged)
8. Quick Stats (EXISTING — unchanged for now; Phase 3 replaces with actionable metrics)
9. Project Notes Timeline (EXISTING — unchanged)
```

**Layout for sections 6 (Labor + Schedule):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {/* Labor Card (2.3) — only if applicable */}
  {laborCardJSX}
  
  {/* Schedule Card (existing) — unchanged */}
  {scheduleCardJSX}
</div>
```

If the Labor card doesn't render (estimating projects, or no estimated hours), the Schedule card should span full width:
```tsx
<div className={cn(
  "grid gap-3",
  showLaborCard ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
)}>
```

---

## Complete New Import List

Add these imports to `ProjectOperationalDashboard.tsx` if not already present:

```typescript
import { FileSignature } from 'lucide-react';       // For Contract Narrative header
import { Separator } from '@/components/ui/separator'; // For Contract Narrative divider
import { Progress } from '@/components/ui/progress';   // For Labor + Contingency bars
import { getContingencyColor } from '@/utils/financialColors'; // From Phase 1
```

`Clock`, `AlertTriangle`, `FileText`, `FileEdit` are already imported in the current component.

---

## Status-Specific Rendering Rules

The new sections should respect project status. Here's the visibility matrix:

| Section | estimating | approved | in_progress | complete | on_hold | cancelled |
|---------|-----------|----------|-------------|----------|---------|-----------|
| Needs Attention | ✓ (limited) | ✓ | ✓ (all warnings) | ✗ | ✓ (limited) | ✗ |
| Contract Narrative | ✓ (if contract > 0) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Financial Summary | ✓ | ✓ | ✓ | ✓ (actuals) | ✓ | ✓ (actuals) |
| Budget + Contingency | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Labor | ✗ | ✓ (if hours set) | ✓ (if hours set) | ✗ | ✗ | ✗ |
| Data Freshness | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| DNE Warning | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Contingency Warning | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Schedule | ✓ | ✓ | ✓ | ✓ (as completed) | ✓ | ✗ |

These rules are already enforced by the conditional rendering (`['in_progress', 'approved'].includes(project.status)`, `project.estimated_hours > 0`, etc.).

---

## Validation Checklist — Phase 2

### Core Rendering
- [ ] Overview renders without errors for all 6 project statuses
- [ ] Needs Attention shows correctly enhanced warnings
- [ ] Needs Attention doesn't render empty container when no items exist
- [ ] Contract Narrative shows Original → +COs → Current correctly
- [ ] Contract Narrative shows just "Original Contract" when zero COs exist (no divider)
- [ ] Contract Narrative hidden when `contracted_amount` is 0 or null
- [ ] Labor section shows Estimated/Actual/Remaining with progress bar
- [ ] Labor section hidden when `estimated_hours` is null or 0
- [ ] Labor section hidden for estimating/complete projects
- [ ] Budget Status contingency sub-section renders with correct colors
- [ ] Budget Status contingency hidden when `contingency_amount` is 0
- [ ] Data freshness queries fire only for approved/in_progress projects
- [ ] Data freshness uses `expense_date` not `created_at`

### Mobile Layout
- [ ] All sections stack single-column on mobile
- [ ] Contract Narrative + Needs Attention visible without scrolling on most devices
- [ ] No horizontal overflow on 320px screens
- [ ] All interactive elements maintain ≥ 44px touch targets

### Data Accuracy
- [ ] Contract narrative math: `baseContract = contracted_amount - sum(approved_COs.client_amount)`
- [ ] Labor hours match what's shown in Time Entries tab
- [ ] Contingency remaining matches what's shown in Change Orders area
- [ ] DNE warning threshold fires at 80% utilization
- [ ] Contingency warning threshold fires at 25% remaining

### No Regressions
- [ ] Existing Financial Summary section unchanged
- [ ] Margin status section unchanged
- [ ] Schedule card unchanged
- [ ] Change order summary unchanged
- [ ] Quick Stats section unchanged
- [ ] ProjectNotesTimeline unchanged
- [ ] All existing props to `ProjectOperationalDashboard` still work
- [ ] Email functions: zero changes (`git diff supabase/functions/` should be empty)
- [ ] All sidebar navigation from ProjectDetailView works
- [ ] Project list cards not affected

---

## Files Changed — Phase 2 Summary

| Action | File | Change |
|--------|------|--------|
| Edit (major) | `src/components/ProjectOperationalDashboard.tsx` | New sections, enhanced needsAttention, reorder |

**That's it — one file.** All new sections use existing data from props or direct project fields. The `financialColors.ts` utility was created in Phase 1.

## Files NEVER Modified
| File | Reason |
|------|--------|
| `supabase/functions/*` | Email system |
| `supabase/migrations/*` | No schema changes |
| `src/utils/projectDashboard.ts` | Calculation logic unchanged |
| `src/components/project-routes/ProjectOverviewRoute.tsx` | Already passes all needed props |
| `src/components/ProjectsList.tsx` | Card-level display (Phase 1) |
| `src/components/ProjectNotesTimeline.tsx` | Used as-is |
| `src/lib/kpi-definitions/*` | Reference only |

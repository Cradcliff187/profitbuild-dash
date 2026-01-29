

# Add "Total Invoiced" Metric to Dashboard

## Overview
Add a new "Total Invoiced" metric to both the Project Status Card and Work Order Status Card on the dashboard. This metric shows the actual revenue received (invoiced) for active and completed projects/work orders, displayed directly below the "Completed Value" row.

## Data Source

According to the KPI Guide (`src/lib/kpi-definitions/revenue-kpis.ts` and `project-kpis.ts`):
- **Field**: `reporting.project_financials.total_invoiced`
- **Formula**: `SUM(project_revenues.amount) for direct + SUM(revenue_splits.split_amount) for splits`
- **Purpose**: Shows actual revenue received (not contract value)

For the dashboard, we'll query `project_revenues` table directly with `is_split = false` to get direct invoices, since split revenues are allocated to specific projects via `revenue_splits`.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add state variables, update queries, pass new props |
| `src/components/dashboard/ProjectStatusCard.tsx` | Add new prop and display row |
| `src/components/dashboard/WorkOrderStatusCard.tsx` | Add new prop and display row |

---

## Changes by File

### 1. Dashboard.tsx

**Add new state variables** (around line 55):
```typescript
const [totalInvoiced, setTotalInvoiced] = useState(0);
const [workOrderTotalInvoiced, setWorkOrderTotalInvoiced] = useState(0);
```

**Update `loadFinancialMetrics()` function** (around line 329):

After fetching active and completed projects, query `project_revenues` to get total invoiced amounts:

```typescript
// Get all construction project IDs (active + completed)
const allProjectIds = [
  ...(activeProjects?.map(p => p.id) || []),
  ...(completedProjects?.map(p => p.id) || [])
];

if (allProjectIds.length > 0) {
  // Query direct revenues (not split)
  const { data: revenues, error: revenueError } = await supabase
    .from('project_revenues')
    .select('amount')
    .in('project_id', allProjectIds)
    .eq('is_split', false);

  if (!revenueError && revenues) {
    const totalInvoicedAmount = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    setTotalInvoiced(totalInvoicedAmount);
  }
}
```

**Update `loadWorkOrderStatusCounts()` function** (around line 175):

Add similar query for work order invoiced amounts:

```typescript
// After loading work order data, calculate total invoiced
const workOrderIds = data?.map(wo => wo.id) || [];
if (workOrderIds.length > 0) {
  const { data: woRevenues, error: woRevenueError } = await supabase
    .from('project_revenues')
    .select('amount')
    .in('project_id', workOrderIds)
    .eq('is_split', false);

  if (!woRevenueError && woRevenues) {
    const woInvoicedTotal = woRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    setWorkOrderTotalInvoiced(woInvoicedTotal);
  }
}
```

**Pass new props to status cards** (around line 429-445):
```tsx
<ProjectStatusCard 
  // ... existing props
  totalInvoiced={totalInvoiced}
/>

<WorkOrderStatusCard
  // ... existing props
  totalInvoiced={workOrderTotalInvoiced}
/>
```

---

### 2. ProjectStatusCard.tsx

**Update interface** (line 12):
```typescript
interface ProjectStatusCardProps {
  statusCounts: ProjectStatusCount[];
  activeContractValue: number;
  activeEstimatedCosts: number;
  completedContractValue: number;
  activeProjectedMargin: number;
  activeProjectedMarginPercent: number;
  totalInvoiced: number;  // ← ADD
}
```

**Add display row after "Completed Value"** (after line 93):
```tsx
<div className="flex items-start gap-1.5">
  <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
  <div className="flex-1 min-w-0">
    <div className="text-[10px] text-muted-foreground">Total Invoiced</div>
    <div className="text-xs font-semibold truncate">{formatCurrency(totalInvoiced)}</div>
  </div>
</div>
```

---

### 3. WorkOrderStatusCard.tsx

Same pattern as ProjectStatusCard:
- Add `totalInvoiced: number` to props interface
- Add display row after "Completed WO Value"

---

## Visual Result

The Project Status card will display:

```
Active Contract Value       $XXX,XXX
Active Est. Costs           $XXX,XXX
Active Projected Margin     $XXX,XXX (XX.X%)
Completed Value             $XXX,XXX ← green
Total Invoiced              $XXX,XXX ← NEW
```

Same pattern for Work Order Status card.

---

## Technical Notes

- Queries `project_revenues` directly with `is_split = false` filter
- Aggregates invoiced amounts for all construction projects (active + completed)
- No RPC call needed - simple table query with `.in()` filter
- Consistent with existing dashboard query patterns


# Phase 3: Frontend Component Updates

This document provides detailed instructions for updating frontend components
to use database fields directly instead of `projectFinancials.ts` calculations.

---

## Overview of Changes

| Component | Current State | Target State |
|-----------|---------------|--------------|
| `Projects.tsx` | Calls `calculateMultipleProjectFinancials()` | Direct DB query with view |
| `ProjectsTableView.tsx` | Uses `ProjectWithFinancials` type + inline calcs | Use DB fields directly |
| `WorkOrders.tsx` | References `current_margin`, `projected_margin` | Update to `actual_margin`, `adjusted_est_margin` |
| `WorkOrdersTableView.tsx` | Same as above | Same as above |
| `ProjectOperationalDashboard.tsx` | Calculates metrics inline | Use DB fields |
| `ProjectDetailView.tsx` | Uses `ProjectWithFinancials` type | Update type, use DB fields |
| `profitCalculations.ts` | Uses `current_margin` | Use `actual_margin` |
| `margin.ts` | `calculateProjectMargin()` function | Remove/deprecate |

---

## 1. Update `src/pages/Projects.tsx`

### Current Code (Lines ~180-200):
```typescript
// Enrich projects with line item counts (estimate + change order line items)
const enrichedProjects = await calculateMultipleProjectFinancials(
  formattedProjects as any[],
  formattedEstimates,
  displayableExpenses
);

setProjects(enrichedProjects);
```

### Updated Code:
```typescript
// Projects already have financial fields from database triggers
// Just add any display-only enrichment (line item counts)
const enrichedProjects = formattedProjects.map(project => {
  // Line item counts are display-only, can stay in frontend
  const projectEstimates = formattedEstimates.filter(e => e.project_id === project.id);
  const approvedEstimate = projectEstimates.find(e => 
    e.status === 'approved' && e.is_current_version
  ) || projectEstimates.find(e => e.status === 'approved');
  
  return {
    ...project,
    // These display-only fields can stay as frontend calculations
    totalLineItemCount: approvedEstimate?.line_items?.length || 0,
    // All financial fields come directly from project record
    // No need to recalculate - triggers keep them in sync
  };
});

setProjects(enrichedProjects);
```

### Also Update Import:
```typescript
// REMOVE this import:
// import { ProjectWithFinancials, calculateMultipleProjectFinancials } from "@/utils/projectFinancials";

// ADD this type (or update ProjectWithFinancials to extend Project):
import { Project } from "@/types/project";

// The Project type should already have all financial fields from Supabase types
type ProjectWithDisplayFields = Project & {
  totalLineItemCount?: number;
  // Any other display-only fields
};
```

---

## 2. Update `src/components/ProjectsTableView.tsx`

### Key Changes:
1. Use `adjusted_est_margin` instead of `projected_margin` (during transition, both exist)
2. Remove inline margin calculations - use DB values
3. Keep tooltip breakdowns but source from DB fields

### Current Code (Projected Margin column, ~Lines 280-340):
```typescript
{
  key: 'projected_margin',
  label: 'Projected Margin ($)',
  align: 'right' as const,
  sortable: true,
  getSortValue: (project) => project.projected_margin || 0,
  render: (project: ProjectWithFinancials) => {
    // Compute inline for transparency
    const contract = project.contracted_amount || 0;
    const adjustedCosts = project.adjusted_est_costs || 0;
    const derivedMargin = contract - adjustedCosts;  // <-- REMOVE THIS
    
    // Use database value
    const dbMargin = project.projected_margin || 0;
    // ... rest of render
```

### Updated Code:
```typescript
{
  key: 'adjusted_est_margin',  // RENAMED
  label: 'Adjusted Est. Margin ($)',  // RENAMED
  align: 'right' as const,
  sortable: true,
  getSortValue: (project) => project.adjusted_est_margin || project.projected_margin || 0,
  render: (project: Project) => {  // Use Project type directly
    // Use database values ONLY - no frontend calculation
    const margin = project.adjusted_est_margin || project.projected_margin || 0;
    const contract = project.contracted_amount || 0;
    const isPositive = margin >= 0;
    
    // For tooltip breakdown, use DB fields
    const originalMargin = project.original_margin || 0;
    
    // Change order impact from DB (if available) or calculate
    // NOTE: Consider adding these to the view/project record
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-right cursor-help">
            <div className={`font-medium text-xs font-mono tabular-nums ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(margin)}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p className="font-semibold border-b pb-1">Margin Breakdown</p>
            <div className="space-y-1 font-mono tabular-nums">
              <div className="flex justify-between gap-4">
                <span>Contract Value:</span>
                <span>{formatCurrency(contract)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>- Adjusted Est. Costs:</span>
                <span>{formatCurrency(project.adjusted_est_costs || 0)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
                <span>= Adjusted Est. Margin:</span>
                <span>{formatCurrency(margin)}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
},
```

### Also Update Margin Percentage Column:
```typescript
{
  key: 'margin_percentage',
  label: 'Adj. Est. Margin %',  // RENAMED for clarity
  align: 'right' as const,
  sortable: true,
  getSortValue: (project) => project.margin_percentage || 0,
  render: (project: Project) => {
    // Use DB value directly
    const marginPct = project.margin_percentage || 0;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-right cursor-help">
            {getMarginBadge(marginPct, project.target_margin, project.minimum_margin_threshold)}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Adjusted Est. Margin: {marginPct.toFixed(1)}%</p>
        </TooltipContent>
      </Tooltip>
    );
  }
},
```

---

## 3. Update `src/pages/WorkOrders.tsx` and `WorkOrdersTableView.tsx`

### Column Definition Updates:

```typescript
// BEFORE:
const ALL_COLUMNS = [
  // ...
  { key: "projected_margin", label: "Projected Margin ($)", required: false, sortable: true },
  { key: "current_margin", label: "Current Margin ($)", required: false, sortable: true },
  { key: "margin_percentage", label: "Projected Margin %", required: false, sortable: true },
  // ...
];

// AFTER:
const ALL_COLUMNS = [
  // ...
  { key: "adjusted_est_margin", label: "Adj. Est. Margin ($)", required: false, sortable: true },
  { key: "actual_margin", label: "Actual Margin ($)", required: false, sortable: true },
  { key: "margin_percentage", label: "Adj. Est. Margin %", required: false, sortable: true },
  // ...
];
```

### Label Updates:

```typescript
// BEFORE:
const labels: Record<string, string> = {
  projected_margin: "Projected Margin ($)",
  current_margin: "Current Margin ($)",
  // ...
};

// AFTER:
const labels: Record<string, string> = {
  adjusted_est_margin: "Adj. Est. Margin ($)",
  actual_margin: "Actual Margin ($)",
  // ...
};
```

---

## 4. Update `src/components/ProjectOperationalDashboard.tsx`

### Current Code (useMemo block ~Lines 30-70):
```typescript
const financialMetrics = useMemo(() => {
  // Status-specific display logic
  if (['complete', 'cancelled'].includes(project.status || '')) {
    // For completed projects, show actual values
    const contractValue = project.contracted_amount
      ?? (project as any).total_invoiced
      ?? 0;
    const actualExpenses = (project as any).total_expenses
      ?? expenses?.reduce((sum, e) => sum + ((e as any).display_amount ?? e.amount ?? 0), 0)
      ?? 0;
    const actualMargin = (project as any).actual_margin ?? contractValue - actualExpenses;  // <-- Use DB value
    // ...
  }
  // ...
}, [project, estimates, expenses]);
```

### Updated Code:
```typescript
const financialMetrics = useMemo(() => {
  // Status-specific display logic
  if (['complete', 'cancelled'].includes(project.status || '')) {
    // For completed projects, show actual values from DB
    return {
      label1: 'Total Invoiced',
      value1: project.total_invoiced ?? 0,  // Use from view/project
      label2: 'Total Expenses',
      value2: project.total_expenses ?? 0,  // Use from view/project
      marginLabel: 'Actual Margin',
      marginValue: project.actual_margin ?? 0,  // Direct DB value
      marginPct: project.actual_margin && project.total_invoiced 
        ? (project.actual_margin / project.total_invoiced) * 100 
        : 0,
      showBudgetStatus: true,
      showVariance: true,
      varianceAmount: (project.actual_margin ?? 0) - (project.original_margin ?? 0),
      variancePct: project.original_margin 
        ? (((project.actual_margin ?? 0) - project.original_margin) / Math.abs(project.original_margin)) * 100 
        : 0,
      originalMargin: project.original_margin ?? 0,
    };
  }

  // For in-progress projects, show projected values from DB
  return {
    label1: 'Contract Value',
    value1: project.contracted_amount ?? 0,
    label2: 'Adjusted Est. Costs',
    value2: project.adjusted_est_costs ?? 0,
    marginLabel: 'Adjusted Est. Margin',
    marginValue: project.adjusted_est_margin ?? project.projected_margin ?? 0,
    marginPct: project.margin_percentage ?? 0,
    showBudgetStatus: true,
    showVariance: false,
  };
}, [project]);
```

---

## 5. Update `src/utils/profitCalculations.ts`

### Current Code:
```typescript
export function calculateProjectProfit(
  // ...
  storedProjectData?: {
    contracted_amount?: number | null;
    current_margin?: number | null;  // <-- DEPRECATED
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }
): ProjectProfitData {
  // ...
  const actualProfit = storedProjectData?.current_margin ?? (quoteTotal - actualExpenses);
  // ...
}
```

### Updated Code:
```typescript
export function calculateProjectProfit(
  // ...
  storedProjectData?: {
    contracted_amount?: number | null;
    actual_margin?: number | null;  // UPDATED
    adjusted_est_margin?: number | null;  // ADDED
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }
): ProjectProfitData {
  // ...
  // Use actual_margin (invoiced - expenses) for realized profit
  const actualProfit = storedProjectData?.actual_margin ?? (quoteTotal - actualExpenses);
  // ...
}
```

---

## 6. Deprecate `src/types/margin.ts`

### Current File:
The file contains `calculateProjectMargin()` function that duplicates DB logic.

### Action:
Move to `src/types/deprecated/margin.ts` with deprecation notice:

```typescript
/**
 * @deprecated This file is deprecated. Use database fields directly.
 * 
 * Margin calculations are now handled by PostgreSQL triggers.
 * Access margins directly from project records:
 * - project.actual_margin
 * - project.adjusted_est_margin
 * - project.original_margin
 * - project.margin_percentage
 * 
 * See src/docs/financial-calculations.md for details.
 */

// Keep interface for backward compatibility during transition
export interface ProjectMargin {
  project_id: string;
  contracted_amount: number;
  // ... rest of interface
}

/**
 * @deprecated Use project.actual_margin and project.adjusted_est_margin directly
 */
export const calculateProjectMargin = (/* ... */): ProjectMargin => {
  console.warn(
    'calculateProjectMargin is deprecated. Use database fields directly. ' +
    'See src/docs/financial-calculations.md'
  );
  // ... existing implementation for backward compatibility
};
```

---

## 7. Update Type Definitions

### Add to `src/types/project.ts` (or verify these exist from Supabase types):

```typescript
export interface Project {
  // ... existing fields
  
  // Financial fields (from DB triggers)
  contracted_amount: number | null;
  original_est_costs: number | null;
  adjusted_est_costs: number | null;
  original_margin: number | null;
  adjusted_est_margin: number | null;  // NEW - replaces projected_margin
  projected_margin: number | null;      // DEPRECATED - kept for compatibility
  actual_margin: number | null;
  current_margin: number | null;        // DEPRECATED
  margin_percentage: number | null;
  contingency_remaining: number | null;
  
  // View fields (when joining with reporting.project_financials)
  total_expenses?: number;
  total_invoiced?: number;
  cost_variance?: number;
  budget_utilization_percent?: number;
}
```

---

## Testing Checklist

After making changes, verify:

- [ ] Projects page loads without errors
- [ ] Project table shows correct margin values
- [ ] Margin values match database values (no frontend recalculation)
- [ ] Work Orders page loads without errors
- [ ] Column names updated to new terminology
- [ ] Tooltips show correct breakdown
- [ ] Sort/filter works on new column names
- [ ] Profit Analysis page works with new field names
- [ ] No console errors about missing fields

---

## Cursor Prompts for Implementation

### Prompt 1: Update Projects.tsx
```
In src/pages/Projects.tsx:
1. Remove the import of calculateMultipleProjectFinancials from projectFinancials
2. Replace the call to calculateMultipleProjectFinancials with direct project mapping
3. Keep only display-only enrichment (line item counts)
4. All financial fields should come from the project record directly
```

### Prompt 2: Update ProjectsTableView.tsx
```
In src/components/ProjectsTableView.tsx:
1. Rename projected_margin column to adjusted_est_margin
2. Update label to "Adj. Est. Margin ($)"
3. Remove inline margin calculations (const derivedMargin = contract - adjustedCosts)
4. Use project.adjusted_est_margin || project.projected_margin directly
5. Update tooltip text to match new terminology
6. Update margin_percentage label to "Adj. Est. Margin %"
```

### Prompt 3: Update WorkOrders
```
In src/pages/WorkOrders.tsx and src/components/WorkOrdersTableView.tsx:
1. Replace "projected_margin" with "adjusted_est_margin" in column definitions
2. Replace "current_margin" with "actual_margin" in column definitions
3. Update labels to use new terminology
4. Update any references in render functions
```

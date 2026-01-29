# Implementation Plan: Status-Aware KPIs & Mobile Header Improvements

**Created:** 2026-01-28  
**Priority:** High  
**Estimated Effort:** 2-3 hours  

---

## Overview

This implementation improves the mobile UX for construction managers by:
1. Displaying **status-appropriate KPIs** on project cards (instead of showing all metrics regardless of project phase)
2. Adding **project context to the mobile header** in ProjectDetailView (currently shows only "Project Details" with no identifying information)

---

## Part 1: Status-Aware KPI Display in ProjectsList

### File to Modify
`src/components/ProjectsList.tsx`

### Current Problem
The mobile project cards display the same financial grid regardless of project status. This creates information overload and shows irrelevant metrics (e.g., showing "Actual Expenses" for a project still in estimating phase).

### Solution
Implement conditional rendering based on `project.status` to show only the KPIs that matter for each phase.

### KPI Mapping by Status

| Status | Primary KPIs | Secondary KPIs | Contextual Info |
|--------|-------------|----------------|-----------------|
| `estimating` | Estimate Value, Estimated Costs, Estimated Margin % | — | — |
| `approved` | Contract Value, Adjusted Est. Costs, Projected Margin % | — | — |
| `in_progress` | Contract Value, Adjusted Est. Costs, Projected Margin % | Budget Utilization %, Contingency Remaining | — |
| `complete` | Contract Value, Actual Expenses, Actual Margin % | — | vs Original Margin (variance) |
| `on_hold` | Contract Value, Spent to Date, Projected Margin % | — | — |
| `cancelled` | Contract Value, Actual Expenses | — | — |

### Data Sources (All Exist in Database/Views)

```typescript
// Estimating phase - use estimate data
const estimateValue = currentEstimate?.total_amount ?? 0;
const estimatedCosts = currentEstimate?.total_cost ?? 0;
const estimatedMargin = estimateValue - estimatedCosts;
const estimatedMarginPct = estimateValue > 0 ? (estimatedMargin / estimateValue) * 100 : 0;

// In Progress / Approved phase - use project adjusted data
const contractValue = project.contracted_amount ?? 0;
const adjustedEstCosts = project.adjusted_est_costs ?? 0;
const projectedMargin = project.projected_margin ?? 0;
const projectedMarginPct = contractValue > 0 ? (projectedMargin / contractValue) * 100 : 0;
const budgetUtilization = project.budget_utilization_percent ?? 0; // From view
const contingencyRemaining = project.contingency_remaining ?? 0;

// Complete phase - use actuals
const actualExpenses = project.total_expenses ?? 0; // From view
const actualMargin = project.actual_margin ?? 0;
const actualMarginPct = contractValue > 0 ? (actualMargin / contractValue) * 100 : 0;
const originalMargin = project.original_margin ?? 0;
const marginVariance = actualMargin - originalMargin;
const marginVariancePct = originalMargin !== 0 ? ((actualMargin - originalMargin) / Math.abs(originalMargin)) * 100 : 0;
```

### Implementation Steps

#### Step 1: Create Helper Function for Status-Based KPI Selection

Add this function near the top of `ProjectsList.tsx` (after imports, before component):

```typescript
interface StatusKPIs {
  primary: {
    label1: string;
    value1: number;
    label2: string;
    value2: number;
    label3: string;
    value3: number;
    isPercent3: boolean;
  };
  secondary?: {
    budgetUtilization?: number;
    contingencyRemaining?: number;
    varianceAmount?: number;
    variancePct?: number;
    varianceLabel?: string;
  };
}

const getStatusKPIs = (
  project: ProjectWithVariance,
  currentEstimate: Estimate | null
): StatusKPIs => {
  const status = project.status;
  
  // Estimate phase data
  const estimateValue = currentEstimate?.total_amount ?? 0;
  const estimatedCosts = currentEstimate?.total_cost ?? 0;
  const estimatedMarginPct = estimateValue > 0 
    ? ((estimateValue - estimatedCosts) / estimateValue) * 100 
    : 0;
  
  // Project phase data
  const contractValue = project.contracted_amount ?? 0;
  const adjustedEstCosts = project.adjusted_est_costs ?? 0;
  const projectedMarginPct = contractValue > 0 
    ? ((project.projected_margin ?? 0) / contractValue) * 100 
    : 0;
  
  // Actuals data
  const actualExpenses = project.total_expenses ?? 0;
  const actualMarginPct = contractValue > 0 
    ? ((project.actual_margin ?? 0) / contractValue) * 100 
    : 0;
  
  switch (status) {
    case 'estimating':
      return {
        primary: {
          label1: 'Estimate',
          value1: estimateValue,
          label2: 'Est. Costs',
          value2: estimatedCosts,
          label3: 'Margin',
          value3: estimatedMarginPct,
          isPercent3: true,
        },
      };
      
    case 'approved':
      return {
        primary: {
          label1: 'Contract',
          value1: contractValue,
          label2: 'Est. Costs',
          value2: adjustedEstCosts,
          label3: 'Margin',
          value3: projectedMarginPct,
          isPercent3: true,
        },
      };
      
    case 'in_progress':
      return {
        primary: {
          label1: 'Contract',
          value1: contractValue,
          label2: 'Est. Costs',
          value2: adjustedEstCosts,
          label3: 'Margin',
          value3: projectedMarginPct,
          isPercent3: true,
        },
        secondary: {
          budgetUtilization: project.budget_utilization_percent ?? 0,
          contingencyRemaining: project.contingency_remaining ?? 0,
        },
      };
      
    case 'complete':
      const originalMargin = project.original_margin ?? 0;
      const actualMargin = project.actual_margin ?? 0;
      const varianceAmt = actualMargin - originalMargin;
      const variancePct = originalMargin !== 0 
        ? ((actualMargin - originalMargin) / Math.abs(originalMargin)) * 100 
        : 0;
      
      return {
        primary: {
          label1: 'Contract',
          value1: contractValue,
          label2: 'Actual Costs',
          value2: actualExpenses,
          label3: 'Margin',
          value3: actualMarginPct,
          isPercent3: true,
        },
        secondary: {
          varianceAmount: varianceAmt,
          variancePct: variancePct,
          varianceLabel: 'vs Original',
        },
      };
      
    case 'on_hold':
      return {
        primary: {
          label1: 'Contract',
          value1: contractValue,
          label2: 'Spent',
          value2: actualExpenses,
          label3: 'Margin',
          value3: projectedMarginPct,
          isPercent3: true,
        },
      };
      
    case 'cancelled':
      return {
        primary: {
          label1: 'Contract',
          value1: contractValue,
          label2: 'Spent',
          value2: actualExpenses,
          label3: 'Loss',
          value3: actualExpenses,
          isPercent3: false,
        },
      };
      
    default:
      return {
        primary: {
          label1: 'Contract',
          value1: contractValue,
          label2: 'Est. Costs',
          value2: adjustedEstCosts,
          label3: 'Margin',
          value3: projectedMarginPct,
          isPercent3: true,
        },
      };
  }
};
```

#### Step 2: Create Reusable KPI Card Component

Add this component inside `ProjectsList.tsx` or create a new file `src/components/ui/project-kpi-card.tsx`:

```typescript
interface ProjectKPIDisplayProps {
  kpis: StatusKPIs;
  status: string;
}

const ProjectKPIDisplay = ({ kpis, status }: ProjectKPIDisplayProps) => {
  const { primary, secondary } = kpis;
  
  return (
    <div className="space-y-2">
      {/* Primary 3-Column Grid */}
      <div className="grid grid-cols-3 gap-2 text-label bg-muted/30 p-3 rounded-lg">
        <div className="text-center">
          <div className="text-muted-foreground text-[10px]">{primary.label1}</div>
          <div className="font-mono font-semibold text-sm">
            {formatCurrency(primary.value1)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-[10px]">{primary.label2}</div>
          <div className="font-mono font-semibold text-sm">
            {formatCurrency(primary.value2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-[10px]">{primary.label3}</div>
          <div className={cn(
            "font-mono font-semibold text-sm",
            primary.isPercent3 
              ? primary.value3 >= 20 ? "text-green-600" : primary.value3 >= 10 ? "text-yellow-600" : "text-red-600"
              : ""
          )}>
            {primary.isPercent3 ? `${primary.value3.toFixed(1)}%` : formatCurrency(primary.value3)}
          </div>
        </div>
      </div>
      
      {/* Secondary Info - Budget Utilization Bar (in_progress only) */}
      {secondary?.budgetUtilization !== undefined && status === 'in_progress' && (
        <div className="px-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Budget Utilized</span>
            <span className="font-mono">{secondary.budgetUtilization.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                secondary.budgetUtilization > 100 ? "bg-red-500" :
                secondary.budgetUtilization > 80 ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min(secondary.budgetUtilization, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Secondary Info - Contingency (in_progress only, if > 0) */}
      {secondary?.contingencyRemaining !== undefined && secondary.contingencyRemaining > 0 && status === 'in_progress' && (
        <div className="flex justify-between text-[10px] px-1">
          <span className="text-muted-foreground">Contingency</span>
          <span className="font-mono text-blue-600">{formatCurrency(secondary.contingencyRemaining)}</span>
        </div>
      )}
      
      {/* Secondary Info - Variance (complete only) */}
      {secondary?.varianceLabel && status === 'complete' && (
        <div className="flex justify-between items-center text-[10px] px-1 pt-1 border-t border-border/50">
          <span className="text-muted-foreground">{secondary.varianceLabel}</span>
          <span className={cn(
            "font-mono font-medium",
            (secondary.varianceAmount ?? 0) >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {(secondary.varianceAmount ?? 0) >= 0 ? '+' : ''}
            {formatCurrency(secondary.varianceAmount ?? 0)}
            <span className="text-[9px] ml-1">
              ({(secondary.variancePct ?? 0) >= 0 ? '+' : ''}{(secondary.variancePct ?? 0).toFixed(1)}%)
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
```

#### Step 3: Replace Existing Card Content

In the mobile card rendering section (look for `// MOBILE:` comments), replace the existing financial grid with:

```typescript
{/* Status-Aware Financial KPIs */}
{(() => {
  const kpis = getStatusKPIs(project, currentEstimate);
  return <ProjectKPIDisplay kpis={kpis} status={project.status} />;
})()}
```

#### Step 4: Ensure Required Fields are Fetched

Verify that the Projects page query includes these fields (check `src/pages/Projects.tsx`):
- `budget_utilization_percent` (from view or calculate)
- `total_expenses` (from view)
- `actual_margin` (from database)
- `original_margin` (from database)
- `contingency_remaining` (from database)

If using the `reporting.project_financials` view, these should already be available. If not, update the query to join with the view or add these fields.

### Acceptance Criteria - Part 1

- [ ] Estimating projects show: Estimate Value, Estimated Costs, Estimated Margin %
- [ ] In Progress projects show: Contract, Est. Costs, Margin %, Budget Utilization bar, Contingency (if > 0)
- [ ] Complete projects show: Contract, Actual Costs, Actual Margin %, vs Original variance
- [ ] On Hold projects show: Contract, Spent to Date, Margin %
- [ ] Cancelled projects show: Contract, Spent
- [ ] Margin % is color-coded: green (≥20%), yellow (10-19%), red (<10%)
- [ ] Budget utilization bar is color-coded: green (<80%), yellow (80-100%), red (>100%)
- [ ] No TypeScript errors
- [ ] Mobile cards render correctly on 375px width viewport

---

## Part 2: Mobile Header Improvements in ProjectDetailView

### File to Modify
`src/components/ProjectDetailView.tsx`

### Current Problem
The mobile header shows only "Project Details" text with no identifying information:
```tsx
<header className="flex items-center gap-2 p-3 border-b bg-background">
  <Sheet>...</Sheet>
  <span className="font-semibold truncate">Project Details</span>
</header>
```

Construction managers in the field cannot identify which project they're viewing without scrolling.

### Solution
Add project context to the mobile header: project number, name, client, address (with Maps link), and status badge.

### Implementation Steps

#### Step 1: Locate the Mobile Header Section

Find this code block in `ProjectDetailView.tsx` (around line 280-300):

```typescript
// Mobile: Use Sheet for navigation
if (isMobile) {
  return (
    <div className="flex flex-col h-full">
      {/* Mobile Project Header */}
      <header className="flex items-center gap-2 p-3 border-b bg-background">
        ...
      </header>
```

#### Step 2: Replace Mobile Header with Enhanced Version

Replace the existing mobile header with:

```typescript
{/* Mobile Project Header - Enhanced */}
<header className="border-b bg-background">
  {/* Top Row: Nav + Project Identifier */}
  <div className="flex items-center gap-2 p-3 pb-2">
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <NavContent />
      </SheetContent>
    </Sheet>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-muted-foreground">
          {project.project_number}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 capitalize",
            project.status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
            project.status === 'estimating' && 'border-gray-200 text-gray-700 bg-gray-50',
            project.status === 'in_progress' && 'border-purple-200 text-purple-700 bg-purple-50',
            project.status === 'complete' && 'border-green-200 text-green-700 bg-green-50',
            project.status === 'on_hold' && 'border-yellow-200 text-yellow-700 bg-yellow-50',
            project.status === 'cancelled' && 'border-red-200 text-red-700 bg-red-50'
          )}
        >
          {project.status?.replace(/_/g, ' ')}
        </Badge>
      </div>
      <div className="text-sm font-medium truncate">{project.project_name}</div>
    </div>
  </div>
  
  {/* Bottom Row: Client + Address */}
  <div className="flex items-center gap-3 px-3 pb-3 text-xs text-muted-foreground">
    <span className="truncate max-w-[150px]">{project.client_name}</span>
    
    {project.address && (
      <>
        <span className="text-border">•</span>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline active:text-primary/80 min-w-0"
        >
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate max-w-[120px]">{project.address}</span>
        </a>
      </>
    )}
  </div>
</header>
```

#### Step 3: Add Missing Import

Ensure `Menu` icon is imported from lucide-react:

```typescript
import { 
  // ... existing imports
  Menu,
  MapPin,
  // ... 
} from "lucide-react";
```

#### Step 4: Update Touch Target Sizes

Ensure the nav button meets 48px minimum touch target:
```typescript
<Button variant="ghost" size="icon" className="h-12 w-12 flex-shrink-0">
```

### Acceptance Criteria - Part 2

- [ ] Mobile header displays project number (mono font)
- [ ] Mobile header displays project name (truncated if long)
- [ ] Mobile header displays client name (truncated)
- [ ] Mobile header displays status badge with correct color
- [ ] Mobile header displays address with MapPin icon (if address exists)
- [ ] Address is clickable and opens Google Maps in new tab
- [ ] Nav menu button is at least 48px touch target
- [ ] Header doesn't wrap awkwardly on 375px viewport
- [ ] No TypeScript errors

---

## Testing Checklist

### Mobile Viewport Testing (375px width)

1. **Projects List Page**
   - [ ] Create a test project in each status (estimating, approved, in_progress, complete, on_hold)
   - [ ] Verify each shows appropriate KPIs
   - [ ] Verify margin % color coding works
   - [ ] Verify budget utilization bar appears only for in_progress
   - [ ] Verify contingency shows only when > 0
   - [ ] Verify "vs Original" variance shows only for complete

2. **Project Detail Page**
   - [ ] Navigate to any project on mobile
   - [ ] Verify header shows project number, name, status
   - [ ] Verify client name displays
   - [ ] Verify address displays and links to Google Maps
   - [ ] Verify nav menu opens correctly
   - [ ] Test with project that has no address (should gracefully hide)

### Desktop Regression Testing

- [ ] Verify desktop ProjectsList still functions correctly
- [ ] Verify desktop ProjectDetailView header unchanged
- [ ] Verify no console errors

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/components/ProjectsList.tsx` | Add `getStatusKPIs()` helper, add `ProjectKPIDisplay` component, update mobile card rendering |
| `src/components/ProjectDetailView.tsx` | Replace mobile header with enhanced version |

---

## Notes for Implementation

1. **Do not modify** the desktop rendering paths - only mobile (`isMobile` conditional blocks)
2. **Preserve existing functionality** - this is additive, not a rewrite
3. **Use existing utility functions** like `formatCurrency()` from `@/lib/utils`
4. **Use existing color utilities** like `getMarginColor()` if available, or create consistent ones
5. **Test offline** - ensure PWA functionality isn't affected
6. All KPI fields referenced are already defined in the KPI guide (`src/lib/kpi-definitions/project-kpis.ts`)

---

## Rollback Plan

If issues arise:
1. Revert changes to `ProjectsList.tsx` and `ProjectDetailView.tsx`
2. Changes are isolated to these two files only
3. No database or API changes required

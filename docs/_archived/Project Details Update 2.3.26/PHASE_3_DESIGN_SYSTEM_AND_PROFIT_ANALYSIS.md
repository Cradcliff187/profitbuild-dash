# Phase 3: Design System Consolidation + Profit Analysis
**Date:** February 3, 2026
**Risk Level:** Medium — Multiple component edits + tab restructuring
**Estimated Effort:** 2-3 sessions
**Depends on:** Phase 1 (financialColors.ts utility) and Phase 2 (overview patterns established)
**Guiding Principle:** QuickBooks handles all bookkeeping. RCG Work = project operations only.

---

## Pre-Implementation Checklist

### What We Are NOT Touching
- All email edge functions (Resend)
- All database migrations, triggers, functions
- `reporting.project_financials` view
- `src/utils/projectDashboard.ts` calculation functions
- `ProjectsList.tsx` / `ProjectOperationalDashboard.tsx` (completed in Phases 1-2)
- All CRUD operations on estimates, expenses, change orders
- All route components, sidebar navigation
- `ProjectNotesTimeline`, `ProjectCostBreakdown` (used as-is)
- `BillingProgressTable` component itself (just removed from default tab position)

---

## 3.1 Financial Color Consolidation

**Goal:** Replace all inline color logic across financial components with the `financialColors.ts` utility created in Phase 1. This is a targeted find-and-replace — no new behavior.

### 3.1.1 MarginDashboard.tsx

**File:** `src/components/MarginDashboard.tsx`

**Current inline functions to replace:**

```typescript
// CURRENT — inline in MarginDashboard
const getMarginColorClass = (percentage: number): string => {
  if (percentage >= 20) return 'text-green-600';
  if (percentage >= 10) return 'text-yellow-600';
  return 'text-red-600';
};

const getContingencyUsageColorClass = (usagePercent: number): string => {
  if (usagePercent >= 80) return 'hsl(var(--destructive))';
  if (usagePercent >= 50) return 'hsl(var(--warning))';
  return 'hsl(var(--success))';
};
```

**Replace with:**
```typescript
import { getMarginColor, getContingencyColor, getFinancialHealthHSL, getFinancialHealth } from '@/utils/financialColors';

// Then replace usage:
// getMarginColorClass(percentage) → getMarginColor(percentage, project.minimum_margin_threshold, project.target_margin)
// getContingencyUsageColorClass(usagePercent) → getFinancialHealthHSL(getFinancialHealth(100 - usagePercent, 40, 20, false))
```

**Note on contingency conversion:** `getContingencyUsageColorClass` takes usage percent (higher = worse), while `getContingencyColor` takes remaining percent (lower = worse). The conversion is: `remainingPct = 100 - usagePct`. Alternatively, use `getFinancialHealth(usagePct, 50, 80, true)` which treats higher as worse directly.

**Validation:**
- [ ] Margin colors unchanged for values at 5%, 12%, 25% (visual check)
- [ ] Contingency colors unchanged for values at 30%, 60%, 90% usage
- [ ] Remove the inline function definitions after replacing all usage
- [ ] No other components import from MarginDashboard's color functions

### 3.1.2 ProjectProfitMargin.tsx

**File:** `src/components/ProjectProfitMargin.tsx`

**Current inline patterns:**
```typescript
// Scattered through the component:
className={`font-semibold text-2xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
// and:
className={`h-2 rounded-full transition-all ${
  marginData.current_margin >= 0 ? 'bg-green-500' : 'bg-red-500'
}`}
// and:
className={`h-2 rounded-full transition-all ${
  actualCosts <= displayContractAmount ? 'bg-green-500' : 'bg-red-500'
}`}
```

**Replace with:**
```typescript
import { getMarginColor, getFinancialHealth, getFinancialHealthColor } from '@/utils/financialColors';

// Profit/loss color:
// profit >= 0 ? 'text-green-600' : 'text-red-600'
// → getFinancialHealthColor(profit >= 0 ? 'healthy' : 'critical')
// (or keep the simple ternary — this is a binary profit/loss, not a threshold)
```

**Decision point:** For simple profit/loss (positive = green, negative = red), the inline ternary is arguably clearer than a utility call. The utility shines for threshold-based coloring (margins, contingency, budget). Only replace the **threshold-based** patterns:

- Threshold information section → use `getMarginColor(profitPercentage, minimumThreshold, targetThreshold)`
- Simple profit/loss binary → **keep inline** for readability

**Validation:**
- [ ] All margin percentage displays use correct threshold colors
- [ ] Simple profit/loss binary (green/red) stays as inline ternary
- [ ] Component renders identically to current state

### 3.1.3 Card Density Audit

While editing `MarginDashboard.tsx` and `ProjectProfitMargin.tsx`, verify that card styling follows the established density standard from MobileListCard:

| Property | Standard | Current MarginDashboard | Current ProjectProfitMargin |
|----------|----------|------------------------|----------------------------|
| Card padding | `p-3` | `CardHeader p-3 pb-2` ✓ | Standard Card ✗ |
| Header text | `text-sm font-semibold` | `CardTitle` ✓ | `CardTitle` ✓ |
| Data values | `text-sm font-mono` | Mixed ✓ | Mixed ✗ |
| Labels | `text-xs text-muted-foreground` | ✓ | ✓ |
| Touch targets | ≥ 44px (mobile) | N/A (display-only) | N/A |

**Changes for ProjectProfitMargin density alignment:**
- Add `className="p-3"` to CardContent if not present
- Ensure font-mono on all financial values
- Ensure text-sm (not text-base or text-lg) on metric values to match Overview

**Changes for ProfitSummaryCards density alignment:**
- `src/components/profit-analysis/ProfitSummaryCards.tsx` — verify consistent card padding, font sizing
- These cards appear at the top of ProfitAnalysis page and should match the overall financial card pattern

---

## 3.2 Replace Billing Tab with Budget Health

**File:** `src/pages/ProfitAnalysis.tsx`

### Problem
The first tab in ProfitAnalysis is "Billing Progress" which imports `BillingProgressTable`. This tab shows invoicing progress — which is QuickBooks territory, not project operations. It should be replaced with a "Budget Health" tab that shows operational metrics.

### Current State
```typescript
const tabOptions = [
  { value: 'billing', label: 'Billing Progress' },  // ← replace this
  { value: 'margins', label: 'Margin Analysis' },
  { value: 'costs', label: 'Cost Analysis' },
];

// Default tab:
const [activeTab, setActiveTab] = useState<string>('billing');

// Imports:
import { BillingProgressTable } from '@/components/profit-analysis/BillingProgressTable';
```

### Changes

**Step 1: Update tab options:**
```typescript
const tabOptions = [
  { value: 'budget', label: 'Budget Health' },   // ← renamed
  { value: 'margins', label: 'Margin Analysis' },
  { value: 'costs', label: 'Cost Analysis' },
];

const [activeTab, setActiveTab] = useState<string>('budget');
```

**Step 2: Create the Budget Health tab content.**

This tab replaces `BillingProgressTable` with a project-level budget health view. The data is already available from `useProfitAnalysisData()` which returns `ProfitAnalysisProject[]` with all needed fields:

```typescript
// Fields already available per project from useProfitAnalysisData:
//   adjusted_est_costs, total_expenses, cost_variance, cost_variance_percent,
//   budget_utilization_percent, contingency_amount, contingency_used, contingency_remaining
```

**New component:** `src/components/profit-analysis/BudgetHealthTable.tsx`

```tsx
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProfitAnalysisProject } from '@/types/profitAnalysis';
import { formatCurrency } from '@/lib/utils';
import { getBudgetUtilizationColor, getCostVarianceColor, getContingencyColor } from '@/utils/financialColors';

interface BudgetHealthTableProps {
  data: ProfitAnalysisProject[] | undefined;
  isLoading: boolean;
  onProjectSelect?: (projectId: string) => void;
}

export function BudgetHealthTable({ data, isLoading, onProjectSelect }: BudgetHealthTableProps) {
  const sortedData = useMemo(() => {
    if (!data) return [];
    // Sort by budget utilization descending — most consumed first (needs attention)
    return [...data].sort((a, b) =>
      (b.budget_utilization_percent ?? 0) - (a.budget_utilization_percent ?? 0)
    );
  }, [data]);

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold">Budget Health by Project</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs text-right">Budget</TableHead>
                <TableHead className="text-xs text-right">Spent</TableHead>
                <TableHead className="text-xs text-right">Remaining</TableHead>
                <TableHead className="text-xs w-[100px]">Utilization</TableHead>
                <TableHead className="text-xs text-right">Variance</TableHead>
                <TableHead className="text-xs text-right">Contingency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((project) => {
                const budget = project.adjusted_est_costs ?? 0;
                const spent = project.total_expenses ?? 0;
                const remaining = budget - spent;
                const utilPct = project.budget_utilization_percent ?? 0;
                const variancePct = project.cost_variance_percent ?? 0;
                const contingencyAmt = project.contingency_amount ?? 0;
                const contingencyRemPct = contingencyAmt > 0
                  ? ((project.contingency_remaining ?? 0) / contingencyAmt) * 100
                  : null;

                return (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onProjectSelect?.(project.id)}
                  >
                    <TableCell>
                      <div className="text-sm font-medium">{project.project_name}</div>
                      <div className="text-xs text-muted-foreground">{project.project_number}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(budget)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(spent)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${remaining < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(remaining)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(utilPct, 100)} className="h-2 flex-1" />
                        <span className={`text-xs font-mono ${getBudgetUtilizationColor(utilPct)}`}>
                          {utilPct.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${getCostVarianceColor(variancePct)}`}>
                      {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {contingencyAmt > 0 ? (
                        <span className={`font-mono text-sm ${getContingencyColor(contingencyRemPct)}`}>
                          {formatCurrency(project.contingency_remaining ?? 0)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Wire it up in ProfitAnalysis.tsx:**
```typescript
// Replace import:
// import { BillingProgressTable } from '@/components/profit-analysis/BillingProgressTable';
import { BudgetHealthTable } from '@/components/profit-analysis/BudgetHealthTable';

// Replace TabsContent:
// <TabsContent value="billing">
//   <BillingProgressTable ... />
// </TabsContent>
// becomes:
<TabsContent value="budget">
  <BudgetHealthTable
    data={data}
    isLoading={isLoading}
    onProjectSelect={(id) => setSelectedProjectId(id)}
  />
</TabsContent>
```

**Step 4: Update the barrel export:**
```typescript
// src/components/profit-analysis/index.ts — add:
export { BudgetHealthTable } from './BudgetHealthTable';
// Leave BillingProgressTable export for now (not deleted, just not default-shown)
```

**What about BillingProgressTable?** Don't delete it. It's still valid as a drill-down view. It can be accessed through a future "Billing" sub-view or kept for admin users who need to reconcile with QuickBooks. For now, it's just removed from the default tab rotation.

**Validation:**
- [ ] ProfitAnalysis loads with "Budget Health" as the default first tab
- [ ] Budget Health table renders all projects with correct data
- [ ] Utilization progress bars show correct colors (green/yellow/red)
- [ ] Cost variance shows signed percentage with correct colors
- [ ] Contingency shows remaining amount with color, or "—" if none
- [ ] Clicking a project row sets `selectedProjectId` (triggers ProjectCostBreakdown)
- [ ] "Margin Analysis" and "Cost Analysis" tabs still work identically
- [ ] Mobile dropdown shows "Budget Health" instead of "Billing Progress"

---

## 3.3 MobileResponsiveTabs Migration

**File:** `src/pages/ProfitAnalysis.tsx`

### Current Pattern (Custom)

ProfitAnalysis currently uses a split pattern:
```tsx
{/* Mobile: Select dropdown */}
<div className="sm:hidden mb-4">
  <Select value={activeTab} onValueChange={setActiveTab}>
    <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {tabOptions.map((tab) => (
        <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{/* Desktop: TabsList */}
<TabsList className="hidden sm:flex">
  {tabOptions.map((tab) => (
    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
  ))}
</TabsList>

{/* Content */}
<TabsContent value="budget">...</TabsContent>
<TabsContent value="margins">...</TabsContent>
<TabsContent value="costs">...</TabsContent>
```

### Target Pattern (MobileResponsiveTabs)

The `MobileResponsiveTabs` component expects a `tabs` array where each tab includes its `content`:

```typescript
interface TabDefinition {
  value: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  showOnMobile?: boolean;
}
```

### Migration

**Step 1: Import the component:**
```typescript
import { MobileResponsiveTabs } from '@/components/ui/mobile-responsive-tabs';
```

**Step 2: Define tabs with content:**
```tsx
const tabs: TabDefinition[] = [
  {
    value: 'budget',
    label: 'Budget Health',
    content: (
      <BudgetHealthTable
        data={data}
        isLoading={isLoading}
        onProjectSelect={(id) => setSelectedProjectId(id)}
      />
    ),
  },
  {
    value: 'margins',
    label: 'Margin Analysis',
    content: (
      <MarginAnalysisTable
        data={data}
        isLoading={isLoading}
        onProjectSelect={(id) => setSelectedProjectId(id)}
      />
    ),
  },
  {
    value: 'costs',
    label: 'Cost Analysis',
    content: (
      <CostAnalysisTable
        data={data}
        isLoading={isLoading}
        onProjectSelect={(id) => setSelectedProjectId(id)}
      />
    ),
  },
];
```

**Step 3: Replace the entire Tabs section:**
```tsx
// Remove: <Tabs value={activeTab} onValueChange={setActiveTab}>
// Remove: Mobile <Select> block
// Remove: Desktop <TabsList> block
// Remove: All <TabsContent> blocks
// Replace with:

<MobileResponsiveTabs
  tabs={tabs}
  defaultTab="budget"
  maxMobileTabs={3}  // Show all 3 since there are only 3
/>
```

**Step 4: Clean up removed imports:**
```typescript
// Remove if no longer used:
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

**Note:** Check if `Select` is still needed for the status filter at the top of the page. It is — the status filter uses `Select`. Only remove `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` imports.

**Step 5: Remove the `activeTab` state if MobileResponsiveTabs manages its own:**
```typescript
// Remove: const [activeTab, setActiveTab] = useState<string>('budget');
// Remove: const tabOptions = [...];
// MobileResponsiveTabs manages its own state internally via useState(defaultValue)
```

### API Compatibility Note

The `MobileResponsiveTabs` component uses its own internal `activeTab` state. If the parent needs to know which tab is active (e.g., for analytics or conditional rendering), the component would need an `onTabChange` callback — which it doesn't currently have. For ProfitAnalysis, this isn't needed since `selectedProjectId` is independent of tab state.

If external tab control IS needed later, either:
1. Add `onValueChange?: (value: string) => void` to `MobileResponsiveTabsProps` (minor component edit)
2. Or keep the external state approach with a controlled `value` prop

For now, no changes to `mobile-responsive-tabs.tsx` are needed.

**Validation:**
- [ ] All 3 tabs visible on desktop as inline triggers
- [ ] Mobile shows all 3 tabs inline (maxMobileTabs=3 with 3 tabs = no overflow menu)
- [ ] Clicking tabs switches content correctly
- [ ] No horizontal scroll on mobile (320px)
- [ ] Status filter above tabs still works
- [ ] ProfitSummaryCards above tabs still render
- [ ] ProjectCostBreakdown below tabs still responds to project selection
- [ ] No console errors about unused state/imports
- [ ] `npm run build` succeeds

---

## 3.4 Optional: Fix Cancelled Status Label in ProjectsList

**File:** `src/components/ProjectsList.tsx`

This was identified during Phase 1 QA and can optionally be addressed here.

### Problem
The `cancelled` case in `getStatusKPIs()`:
```typescript
case 'cancelled':
  return {
    primary: {
      label1: 'Contract',
      value1: contractValue,
      label2: 'Spent',
      value2: actualExpenses,
      label3: 'Loss',
      value3: actualExpenses,  // ← shows raw expenses, not actual loss amount
      isPercent3: false,
    },
  };
```

Shows "Loss: $12,500" where $12,500 is the total expenses — but that's not the loss. The loss is `contractValue - actualExpenses` (if contract exists) or just `actualExpenses` (if no contract, all spending is loss).

### Fix
```typescript
case 'cancelled': {
  // Calculate actual loss: what was spent minus any contract value
  // If no contract, all spending is loss
  const lossAmount = contractValue > 0
    ? Math.max(0, actualExpenses - contractValue)  // Over-spend beyond contract
    : actualExpenses;  // No contract = all spending is loss
  
  return {
    primary: {
      label1: contractValue > 0 ? 'Contract' : 'No Contract',
      value1: contractValue,
      label2: 'Spent',
      value2: actualExpenses,
      label3: 'Net Loss',
      value3: lossAmount,
      isPercent3: false,
    },
  };
}
```

**Alternative approach:** Show margin (which could be negative) instead of "loss" to be consistent with how `complete` status shows margin:
```typescript
case 'cancelled':
  return {
    primary: {
      label1: contractValue > 0 ? 'Contract' : 'Spent',
      value1: contractValue || actualExpenses,
      label2: 'Actual Costs',
      value2: actualExpenses,
      label3: 'Margin',
      value3: actualMarginPct,  // Will be negative for losses
      isPercent3: true,
    },
  };
```

This aligns cancelled with complete, which also shows margin %. A negative margin % clearly communicates loss without a separate "Loss" field.

**Validation:**
- [ ] Cancelled projects show correct loss/margin value
- [ ] Value is calculated, not raw expenses
- [ ] Desktop table shows consistent data

---

## Files Changed — Phase 3 Summary

| Action | File | Change |
|--------|------|--------|
| Edit | `src/components/MarginDashboard.tsx` | Replace inline color functions with financialColors.ts |
| Edit | `src/components/ProjectProfitMargin.tsx` | Replace threshold color patterns, density alignment |
| Create | `src/components/profit-analysis/BudgetHealthTable.tsx` | New Budget Health component |
| Edit | `src/components/profit-analysis/index.ts` | Add BudgetHealthTable export |
| Edit | `src/pages/ProfitAnalysis.tsx` | Replace billing tab, migrate to MobileResponsiveTabs |
| Edit (optional) | `src/components/ProjectsList.tsx` | Fix cancelled status label |

## Files NEVER Modified
| File | Reason |
|------|--------|
| `supabase/functions/*` | Email system |
| `supabase/migrations/*` | No schema changes |
| `src/components/profit-analysis/BillingProgressTable.tsx` | Kept, just not default tab |
| `src/components/profit-analysis/MarginAnalysisTable.tsx` | Unchanged |
| `src/components/profit-analysis/CostAnalysisTable.tsx` | Unchanged |
| `src/components/profit-analysis/ProjectCostBreakdown.tsx` | Unchanged |
| `src/components/ui/mobile-responsive-tabs.tsx` | Used as-is, no changes |
| `src/utils/financialColors.ts` | Created in Phase 1, consumed here |
| `src/utils/thresholdUtils.ts` | Unchanged |
| `src/components/ProjectOperationalDashboard.tsx` | Completed in Phase 2 |

---

## Regression Testing — Phase 3

### Must Not Break
- [ ] ProfitAnalysis page loads without errors
- [ ] All 3 tabs render correct content
- [ ] Project selection from any table triggers ProjectCostBreakdown
- [ ] Status filter works across all tabs
- [ ] ProfitSummaryCards render correctly
- [ ] MarginDashboard renders with correct colors (compare before/after screenshots)
- [ ] ProjectProfitMargin renders identically
- [ ] Project list cards still render (if 3.4 applied)
- [ ] Email system: zero changes
- [ ] `npm run build` succeeds
- [ ] No console errors on ProfitAnalysis page

### Mobile Specific
- [ ] MobileResponsiveTabs shows all 3 tabs correctly
- [ ] No horizontal scroll on any viewport
- [ ] Budget Health table scrolls horizontally within its container (not page-level)
- [ ] Touch targets ≥ 44px on all interactive elements

### Financial Color Accuracy
- [ ] Margin 5% → red
- [ ] Margin 12% → yellow
- [ ] Margin 22% → green
- [ ] Budget utilization 70% → green
- [ ] Budget utilization 85% → yellow
- [ ] Budget utilization 97% → red
- [ ] Contingency remaining 50% → green
- [ ] Contingency remaining 30% → yellow
- [ ] Contingency remaining 10% → red

# Profit Analysis Page - Build Specification

## Overview

Build a new profit analysis page at `/profit-analysis` that displays financial performance data for construction projects. This page answers the core business questions:

1. **"How much money is still out there?"** - Billing progress and remaining revenue
2. **"What should we have made vs. what we're actually making?"** - Margin health
3. **"Where did the money go?"** - Cost variance analysis

---

## Critical References

### Database Source
**Use the existing `reporting.project_financials` view** - this is the authoritative data source with all calculated fields.

### KPI Guide Reference
**All field definitions are in `src/pages/KPIGuide.tsx`** - DO NOT create new calculations. Use database fields directly per the KPI guide.

### Formatting Utilities
**Use existing utilities from `src/lib/utils.ts`:**
```typescript
import { formatCurrency, cn } from '@/lib/utils';
```

### Deprecated Code Warning
**DO NOT use `src/utils/projectFinancials.ts`** - this file is deprecated. All financial metrics come from database fields.

---

## Tech Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- shadcn-ui components (already installed)
- Supabase for data fetching
- TanStack Query (React Query) for data management
- Recharts for visualizations (if charts needed)

---

## File Structure

```
src/
├── pages/
│   └── ProfitAnalysis.tsx                    # Main page component
├── components/
│   └── profit-analysis/
│       ├── index.ts                          # Barrel export
│       ├── ProfitSummaryCards.tsx            # KPI summary cards
│       ├── BillingProgressTable.tsx          # Billing/invoicing table
│       ├── MarginAnalysisTable.tsx           # Margin comparison table
│       ├── CostAnalysisTable.tsx             # Cost variance table
│       ├── ProjectCostBreakdown.tsx          # Sheet with project details
│       ├── ProfitTrendsChart.tsx             # Time-series chart (optional)
│       └── hooks/
│           └── useProfitAnalysisData.ts      # Data fetching hook
```

---

## Database Fields Reference

### From `reporting.project_financials` View

These fields are pre-calculated by the database. Reference `src/pages/KPIGuide.tsx` for full definitions.

#### Revenue/Billing Fields
| Field | Type | KPI Guide Reference | Description |
|-------|------|---------------------|-------------|
| `contracted_amount` | currency | `projects.contracted_amount` | Total contract value (base + approved change orders) |
| `total_invoiced` | currency | `project_financial_summary.total_invoiced` | Sum of all invoiced revenue (handles splits) |
| `invoice_count` | number | `project_financial_summary.invoice_count` | Number of invoices |
| `change_order_revenue` | currency | `change_orders.client_amount` (sum) | Revenue from approved change orders |

#### Margin Fields
| Field | Type | KPI Guide Reference | Description |
|-------|------|---------------------|-------------|
| `original_margin` | currency | `projects.original_margin` | Margin from original approved estimate |
| `projected_margin` | currency | `projects.projected_margin` | Expected final margin (with accepted quotes) |
| `current_margin` | currency | `projects.current_margin` | Contracted Amount - Total Actual Costs |
| `margin_percentage` | percent | `projects.current_margin_percent` | (Current Margin / Contracted Amount) × 100 |

#### Cost Fields
| Field | Type | KPI Guide Reference | Description |
|-------|------|---------------------|-------------|
| `original_est_costs` | currency | `projects.original_est_costs` | Original estimated costs from approved estimate |
| `adjusted_est_costs` | currency | `projects.adjusted_est_costs` | Costs adjusted for accepted quotes |
| `total_expenses` | currency | aggregated | Sum of all expenses (handles splits correctly) |
| `cost_variance` | currency | calculated in view | `total_expenses - adjusted_est_costs` |
| `cost_variance_percent` | percent | calculated in view | Cost variance as percentage |
| `budget_utilization_percent` | percent | calculated in view | Percentage of budget spent |

#### Quote & Change Order Fields
| Field | Type | Description |
|-------|------|-------------|
| `total_accepted_quotes` | currency | Sum of accepted quote amounts |
| `accepted_quote_count` | number | Count of accepted quotes |
| `change_order_cost` | currency | Cost impact from approved change orders |
| `change_order_count` | number | Count of approved change orders |

#### Contingency Fields
| Field | Type | KPI Guide Reference | Description |
|-------|------|---------------------|-------------|
| `contingency_amount` | currency | `estimates.contingency_amount` | Total contingency allocated |
| `contingency_used` | currency | `estimates.contingency_used` | Contingency already used |
| `contingency_remaining` | currency | `projects.contingency_remaining` | Unused contingency |

#### Category Breakdown
| Field | Type | Description |
|-------|------|-------------|
| `expenses_by_category` | jsonb | `{ "materials": 50000, "labor": 30000, ... }` |

---

## Data Fetching

### Option 1: Direct View Query (if Supabase allows)

```typescript
const { data, error } = await supabase
  .from('reporting.project_financials')
  .select('*')
  .in('status', ['approved', 'in_progress', 'complete'])
  .order('contracted_amount', { ascending: false });
```

### Option 2: RPC Function (recommended)

Use existing `execute_simple_report` RPC or create a dedicated function:

```sql
-- Create RPC function in Supabase
CREATE OR REPLACE FUNCTION get_profit_analysis_data(
  status_filter text[] DEFAULT ARRAY['approved', 'in_progress', 'complete']
)
RETURNS TABLE (
  id uuid,
  project_number text,
  project_name text,
  client_name text,
  status text,
  job_type text,
  start_date date,
  end_date date,
  contracted_amount numeric,
  total_invoiced numeric,
  invoice_count integer,
  change_order_revenue numeric,
  original_margin numeric,
  projected_margin numeric,
  current_margin numeric,
  margin_percentage numeric,
  original_est_costs numeric,
  adjusted_est_costs numeric,
  total_expenses numeric,
  cost_variance numeric,
  cost_variance_percent numeric,
  budget_utilization_percent numeric,
  total_accepted_quotes numeric,
  accepted_quote_count integer,
  change_order_cost numeric,
  change_order_count integer,
  contingency_amount numeric,
  contingency_used numeric,
  contingency_remaining numeric,
  expenses_by_category jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    id,
    project_number,
    project_name,
    client_name,
    status,
    job_type,
    start_date,
    end_date,
    COALESCE(contracted_amount, 0),
    COALESCE(total_invoiced, 0),
    COALESCE(invoice_count, 0),
    COALESCE(change_order_revenue, 0),
    COALESCE(original_margin, 0),
    COALESCE(projected_margin, 0),
    COALESCE(current_margin, 0),
    COALESCE(margin_percentage, 0),
    COALESCE(original_est_costs, 0),
    COALESCE(adjusted_est_costs, 0),
    COALESCE(total_expenses, 0),
    COALESCE(cost_variance, 0),
    COALESCE(cost_variance_percent, 0),
    COALESCE(budget_utilization_percent, 0),
    COALESCE(total_accepted_quotes, 0),
    COALESCE(accepted_quote_count, 0),
    COALESCE(change_order_cost, 0),
    COALESCE(change_order_count, 0),
    COALESCE(contingency_amount, 0),
    COALESCE(contingency_used, 0),
    COALESCE(contingency_remaining, 0),
    COALESCE(expenses_by_category, '{}'::jsonb)
  FROM reporting.project_financials
  WHERE status = ANY(status_filter)
  ORDER BY contracted_amount DESC;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_profit_analysis_data TO authenticated;
```

Then call via:
```typescript
const { data, error } = await supabase.rpc('get_profit_analysis_data', { 
  status_filter: ['approved', 'in_progress', 'complete'] 
});
```

---

## TypeScript Interfaces

Create in `src/types/profitAnalysis.ts`:

```typescript
export interface ProfitAnalysisProject {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string | null;
  status: 'approved' | 'in_progress' | 'complete';
  job_type: string | null;
  start_date: string | null;
  end_date: string | null;
  
  // Revenue/Billing - from database
  contracted_amount: number;
  total_invoiced: number;
  invoice_count: number;
  change_order_revenue: number;
  
  // Margins - from database
  original_margin: number;
  projected_margin: number;
  current_margin: number;
  margin_percentage: number;
  
  // Costs - from database
  original_est_costs: number;
  adjusted_est_costs: number;
  total_expenses: number;
  cost_variance: number;
  cost_variance_percent: number;
  budget_utilization_percent: number;
  
  // Quotes - from database
  total_accepted_quotes: number;
  accepted_quote_count: number;
  
  // Change Orders - from database
  change_order_cost: number;
  change_order_count: number;
  
  // Contingency - from database
  contingency_amount: number;
  contingency_used: number;
  contingency_remaining: number;
  
  // Category breakdown (JSONB from database)
  expenses_by_category: Record<string, number>;
}

export interface ProfitSummaryTotals {
  totalContractValue: number;
  totalInvoiced: number;
  totalRemainingToBill: number;
  totalProjectedMargin: number;
  totalCurrentMargin: number;
  totalOriginalEstCosts: number;
  totalAdjustedEstCosts: number;
  totalActualExpenses: number;
  aggregateMarginPercent: number;
  projectCount: number;
}
```

---

## Component Specifications

### 1. ProfitAnalysis.tsx (Main Page)

**Location:** `src/pages/ProfitAnalysis.tsx`

**Structure:**
```tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useProfitAnalysisData } from '@/components/profit-analysis/hooks/useProfitAnalysisData';
import { ProfitSummaryCards } from '@/components/profit-analysis/ProfitSummaryCards';
import { BillingProgressTable } from '@/components/profit-analysis/BillingProgressTable';
import { MarginAnalysisTable } from '@/components/profit-analysis/MarginAnalysisTable';
import { CostAnalysisTable } from '@/components/profit-analysis/CostAnalysisTable';
import { ProjectCostBreakdown } from '@/components/profit-analysis/ProjectCostBreakdown';

export default function ProfitAnalysis() {
  const [statusFilter, setStatusFilter] = useState<string[]>(['approved', 'in_progress', 'complete']);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('billing');

  const { data, isLoading, error } = useProfitAnalysisData(statusFilter);

  const selectedProject = data?.find(p => p.id === selectedProjectId) || null;

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profit Analysis</h1>
          <p className="text-muted-foreground">
            Financial performance across {data?.length || 0} projects
          </p>
        </div>
        
        {/* Status Filter */}
        <Select 
          value={statusFilter.join(',')} 
          onValueChange={(val) => setStatusFilter(val.split(','))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approved,in_progress,complete">All Active</SelectItem>
            <SelectItem value="in_progress">In Progress Only</SelectItem>
            <SelectItem value="complete">Completed Only</SelectItem>
            <SelectItem value="approved">Approved Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Summary Cards */}
      <ProfitSummaryCards data={data} isLoading={isLoading} />
      
      {/* Tabbed Tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="billing">Billing Progress</TabsTrigger>
          <TabsTrigger value="margins">Margin Analysis</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="billing" className="mt-4">
          <BillingProgressTable 
            data={data} 
            isLoading={isLoading}
            onSelectProject={setSelectedProjectId} 
          />
        </TabsContent>
        
        <TabsContent value="margins" className="mt-4">
          <MarginAnalysisTable 
            data={data} 
            isLoading={isLoading}
            onSelectProject={setSelectedProjectId} 
          />
        </TabsContent>
        
        <TabsContent value="costs" className="mt-4">
          <CostAnalysisTable 
            data={data} 
            isLoading={isLoading}
            onSelectProject={setSelectedProjectId} 
          />
        </TabsContent>
      </Tabs>
      
      {/* Project Detail Sheet */}
      <ProjectCostBreakdown 
        project={selectedProject}
        open={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)} 
      />
    </div>
  );
}
```

**Route:** Add to router at `/profit-analysis`

---

### 2. useProfitAnalysisData.ts (Data Hook)

**Location:** `src/components/profit-analysis/hooks/useProfitAnalysisData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProfitAnalysisProject, ProfitSummaryTotals } from '@/types/profitAnalysis';

export function useProfitAnalysisData(
  statusFilter: string[] = ['approved', 'in_progress', 'complete']
) {
  return useQuery({
    queryKey: ['profit-analysis', statusFilter],
    queryFn: async () => {
      // Use RPC function to get data from reporting.project_financials view
      const { data, error } = await supabase.rpc('get_profit_analysis_data', {
        status_filter: statusFilter
      });

      if (error) throw error;
      
      return data as ProfitAnalysisProject[];
    }
  });
}

/**
 * Calculate summary totals from project data
 * Note: Only aggregates database-provided values, no new calculations
 */
export function calculateSummaryTotals(projects: ProfitAnalysisProject[]): ProfitSummaryTotals {
  const totals = projects.reduce((acc, project) => ({
    totalContractValue: acc.totalContractValue + project.contracted_amount,
    totalInvoiced: acc.totalInvoiced + project.total_invoiced,
    totalProjectedMargin: acc.totalProjectedMargin + project.projected_margin,
    totalCurrentMargin: acc.totalCurrentMargin + project.current_margin,
    totalOriginalEstCosts: acc.totalOriginalEstCosts + project.original_est_costs,
    totalAdjustedEstCosts: acc.totalAdjustedEstCosts + project.adjusted_est_costs,
    totalActualExpenses: acc.totalActualExpenses + project.total_expenses,
  }), {
    totalContractValue: 0,
    totalInvoiced: 0,
    totalProjectedMargin: 0,
    totalCurrentMargin: 0,
    totalOriginalEstCosts: 0,
    totalAdjustedEstCosts: 0,
    totalActualExpenses: 0,
  });

  return {
    ...totals,
    // Simple subtraction - not a new calculation
    totalRemainingToBill: totals.totalContractValue - totals.totalInvoiced,
    // Weighted average from database values
    aggregateMarginPercent: totals.totalContractValue > 0 
      ? (totals.totalProjectedMargin / totals.totalContractValue) * 100 
      : 0,
    projectCount: projects.length,
  };
}
```

---

### 3. ProfitSummaryCards.tsx

**Location:** `src/components/profit-analysis/ProfitSummaryCards.tsx`

**Display 6 cards in responsive grid:**

| Card | Value Source | Subtext |
|------|--------------|---------|
| Total Contract Value | Sum of `contracted_amount` | `{projectCount} projects` |
| Total Invoiced | Sum of `total_invoiced` | `{percent}% billed` |
| Remaining to Bill | `totalContractValue - totalInvoiced` | `across all projects` |
| Projected Margin | Sum of `projected_margin` | `{aggregateMarginPercent}%` |
| Current Margin | Sum of `current_margin` | `realized to date` |
| Total Expenses | Sum of `total_expenses` | `{budget_utilization}% of budget` |

**Use existing patterns from `src/pages/Dashboard.tsx` for card layout.**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { calculateSummaryTotals } from './hooks/useProfitAnalysisData';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  data: ProfitAnalysisProject[] | undefined;
  isLoading: boolean;
}

export function ProfitSummaryCards({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totals = calculateSummaryTotals(data || []);
  
  const billingPercent = totals.totalContractValue > 0 
    ? ((totals.totalInvoiced / totals.totalContractValue) * 100).toFixed(1)
    : '0';
    
  const budgetUtilization = totals.totalAdjustedEstCosts > 0
    ? ((totals.totalActualExpenses / totals.totalAdjustedEstCosts) * 100).toFixed(1)
    : '0';

  const cards = [
    { 
      title: 'Total Contract Value', 
      value: formatCurrency(totals.totalContractValue),
      subtext: `${totals.projectCount} projects`
    },
    { 
      title: 'Total Invoiced', 
      value: formatCurrency(totals.totalInvoiced),
      subtext: `${billingPercent}% billed`
    },
    { 
      title: 'Remaining to Bill', 
      value: formatCurrency(totals.totalRemainingToBill),
      subtext: 'across all projects'
    },
    { 
      title: 'Projected Margin', 
      value: formatCurrency(totals.totalProjectedMargin),
      subtext: `${totals.aggregateMarginPercent.toFixed(1)}%`
    },
    { 
      title: 'Current Margin', 
      value: formatCurrency(totals.totalCurrentMargin),
      subtext: 'realized to date'
    },
    { 
      title: 'Total Expenses', 
      value: formatCurrency(totals.totalActualExpenses),
      subtext: `${budgetUtilization}% of budget`
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### 4. BillingProgressTable.tsx

**Location:** `src/components/profit-analysis/BillingProgressTable.tsx`

**Columns (all from database):**

| Column | Database Field | Format |
|--------|----------------|--------|
| Project | `project_number`, `project_name` | Link |
| Client | `client_name` | Text |
| Status | `status` | Badge |
| Contract | `contracted_amount` | Currency |
| Invoiced | `total_invoiced` | Currency |
| Remaining | `contracted_amount - total_invoiced` | Currency |
| Billed % | `(total_invoiced / contracted_amount) * 100` | Percentage |
| Invoices | `invoice_count` | Number |

**Use existing Table component patterns from `src/components/reports/SimpleReportBuilder.tsx`.**

**Features:**
- Sortable columns (default: Contract descending)
- Click row to select project
- Totals row at bottom

---

### 5. MarginAnalysisTable.tsx

**Location:** `src/components/profit-analysis/MarginAnalysisTable.tsx`

**Columns (all from database):**

| Column | Database Field | Format |
|--------|----------------|--------|
| Project | `project_number`, `project_name` | Link |
| Contract | `contracted_amount` | Currency |
| Original Margin | `original_margin` | Currency |
| Projected Margin | `projected_margin` | Currency |
| Current Margin | `current_margin` | Currency |
| Margin % | `margin_percentage` | Percentage |
| Margin Change | `current_margin - original_margin` | Currency (+/-) |

**Color coding for Margin Change:**
- Positive (green): `text-green-600`
- Negative (red): `text-red-600`

---

### 6. CostAnalysisTable.tsx

**Location:** `src/components/profit-analysis/CostAnalysisTable.tsx`

**Columns (all from database):**

| Column | Database Field | Format |
|--------|----------------|--------|
| Project | `project_number`, `project_name` | Link |
| Original Est. | `original_est_costs` | Currency |
| Adjusted Est. | `adjusted_est_costs` | Currency |
| Actual Expenses | `total_expenses` | Currency |
| Variance | `cost_variance` | Currency (+/-) |
| Variance % | `cost_variance_percent` | Percentage |
| Budget Used | `budget_utilization_percent` | Percentage |

**Color coding for Variance:**
- Over budget (red): positive variance = `text-red-600`
- Under budget (green): negative variance = `text-green-600`

---

### 7. ProjectCostBreakdown.tsx

**Location:** `src/components/profit-analysis/ProjectCostBreakdown.tsx`

**Use Sheet component (slides from right) - see existing patterns in `src/components/payees/PayeeSheet.tsx`**

**Sections to display:**

```
REVENUE SUMMARY
───────────────────────────────────────────
Contract Amount (base):     {contracted_amount - change_order_revenue}
Change Order Revenue:       {change_order_revenue}
Total Contract:             {contracted_amount}

Total Invoiced:             {total_invoiced}
Remaining to Bill:          {contracted_amount - total_invoiced}
Billing Progress:           {(total_invoiced / contracted_amount) * 100}%

───────────────────────────────────────────

MARGIN SUMMARY
───────────────────────────────────────────
Original Estimate Margin:   {original_margin}
Projected Margin:           {projected_margin}
Current Margin:             {current_margin}
Margin %:                   {margin_percentage}%
Margin Change:              {current_margin - original_margin}

───────────────────────────────────────────

COST SUMMARY
───────────────────────────────────────────
Original Est. Costs:        {original_est_costs}
Adjusted Est. Costs:        {adjusted_est_costs}
Actual Expenses:            {total_expenses}
Remaining Budget:           {adjusted_est_costs - total_expenses}
Budget Used:                {budget_utilization_percent}%
Cost Variance:              {cost_variance}

───────────────────────────────────────────

EXPENSES BY CATEGORY
───────────────────────────────────────────
{Parse expenses_by_category JSONB and display as table}

Category          Amount        % of Total
─────────────────────────────────────────
Materials         $XX,XXX       XX%
Labor             $XX,XXX       XX%
Subcontractors    $XX,XXX       XX%
Equipment         $XX,XXX       XX%
─────────────────────────────────────────
TOTAL             $XX,XXX       100%

───────────────────────────────────────────

CHANGE ORDERS
───────────────────────────────────────────
Count:                      {change_order_count}
Revenue Added:              {change_order_revenue}
Cost Added:                 {change_order_cost}
Net Margin Impact:          {change_order_revenue - change_order_cost}

───────────────────────────────────────────

CONTINGENCY
───────────────────────────────────────────
Total Contingency:          {contingency_amount}
Used:                       {contingency_used}
Remaining:                  {contingency_remaining}
```

---

## Routing

Add to `src/App.tsx` or router configuration:

```tsx
import ProfitAnalysis from '@/pages/ProfitAnalysis';

// Add route
<Route path="/profit-analysis" element={<ProfitAnalysis />} />
```

Add navigation link to sidebar/menu.

---

## Implementation Checklist

### Phase 1: Database & Types
- [ ] Create `get_profit_analysis_data` RPC function in Supabase
- [ ] Create `src/types/profitAnalysis.ts` with interfaces
- [ ] Test RPC function returns correct data

### Phase 2: Data Hook
- [ ] Create `useProfitAnalysisData.ts` hook
- [ ] Create `calculateSummaryTotals` helper function
- [ ] Test data fetching works

### Phase 3: Main Page & Summary
- [ ] Create `ProfitAnalysis.tsx` page
- [ ] Create `ProfitSummaryCards.tsx` component
- [ ] Add route to router
- [ ] Test page loads with summary cards

### Phase 4: Tables
- [ ] Create `BillingProgressTable.tsx`
- [ ] Create `MarginAnalysisTable.tsx`
- [ ] Create `CostAnalysisTable.tsx`
- [ ] Add sorting functionality
- [ ] Add totals row

### Phase 5: Project Detail Sheet (see detailed spec below)
- [ ] Update existing `ProjectCostBreakdown.tsx` with full implementation
- [ ] Create `CostFlowVisualization.tsx` (Recharts-based)
- [ ] Create `MarginComparisonBars.tsx`
- [ ] Create `CategoryBreakdownTable.tsx` (expandable to line items)
- [ ] Create `useProjectFinancialDetail.ts` hook
- [ ] Row click already wired up - just needs content
- [ ] Add projected final calculation for in-progress projects

### Phase 6: Polish
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test responsive design
- [ ] Add to navigation menu

---

## Phase 5: Project Detail Sheet - Detailed Specification

### The Financial Story

The sidebar tells the complete story of a project's financial lifecycle:

| Stage | What Happens | Data Source |
|-------|--------------|-------------|
| **1. Estimate** | Initial bid based on best guess | `estimate_line_items.total_cost` |
| **2. Quotes** | Subs/vendors return real numbers | `quote_line_items` linked to `estimate_line_items` |
| **3. Change Orders** | Scope changes mid-project | `change_orders`, `change_order_line_items` |
| **4. Actuals** | Real expenses come in | `expenses`, `expense_line_item_correlations` |
| **5. Final** | Project closes out | All aggregated in `reporting.project_financials` |

### Data Hook: useProjectFinancialDetail.ts

**Location:** `src/components/profit-analysis/hooks/useProjectFinancialDetail.ts`

This hook fetches detailed line-item level data for the selected project.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LineItemDetail {
  id: string;
  category: string;
  description: string;
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  hasAcceptedQuote: boolean;
  quotePayee: string | null;
}

interface CategorySummary {
  category: string;
  categoryLabel: string;
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  lineItems: LineItemDetail[];
  isExpanded: boolean;
}

interface ProjectFinancialDetail {
  // From reporting.project_financials (already have this)
  project: ProfitAnalysisProject;
  
  // Line item level detail
  categories: CategorySummary[];
  
  // Computed stage transitions
  estimateToQuoteChange: number;
  estimateToQuotePercent: number;
  quoteToActualChange: number;
  quoteToActualPercent: number;
  
  // For in-progress: projected final
  projectedFinalCost: number | null;
  projectedFinalMargin: number | null;
  burnRate: number | null; // % of budget used vs % of project complete
}

export function useProjectFinancialDetail(projectId: string | null) {
  return useQuery({
    queryKey: ['project-financial-detail', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      // Fetch estimate line items with linked quotes
      const { data: estimateData, error: estError } = await supabase
        .from('estimates')
        .select(`
          id,
          total_cost,
          contingency_amount,
          estimate_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            total_cost
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .eq('is_current_version', true)
        .single();
      
      if (estError && estError.code !== 'PGRST116') throw estError;
      
      // Fetch accepted quotes with line items
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          total_amount,
          payees (payee_name),
          quote_line_items (
            id,
            estimate_line_item_id,
            category,
            description,
            quantity,
            rate,
            total_cost
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'accepted');
      
      if (quotesError) throw quotesError;
      
      // Fetch expenses with correlations
      // Reference: src/hooks/useLineItemControl.ts for correlation logic
      const { data: expenseData, error: expError } = await supabase
        .from('expense_line_item_correlations')
        .select(`
          id,
          expense_id,
          expense_split_id,
          estimate_line_item_id,
          quote_id,
          expenses (
            id,
            amount,
            category,
            description,
            expense_date,
            payees (payee_name)
          ),
          expense_splits (
            id,
            split_amount,
            projects (project_name)
          )
        `)
        .eq('project_id', projectId);
      
      if (expError) throw expError;
      
      // Process and group by category
      // Reference: src/components/ProjectLineItemAnalysis.tsx for grouping pattern
      // ... processing logic
      
      return processedData;
    },
    enabled: !!projectId
  });
}
```

### Component: ProjectCostBreakdown.tsx (UPDATE EXISTING FILE)

**Location:** `src/components/profit-analysis/ProjectCostBreakdown.tsx`

**Current state:** Shell exists with placeholder content. Update to full implementation.

**Use Sheet component pattern from:** `src/components/ui/sheet.tsx`

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { CostFlowVisualization } from './CostFlowVisualization';
import { MarginComparisonBars } from './MarginComparisonBars';
import { CategoryBreakdownTable } from './CategoryBreakdownTable';
import { useProjectFinancialDetail } from './hooks/useProjectFinancialDetail';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  project: ProfitAnalysisProject | null;
  open: boolean;
  onClose: () => void;
}

export function ProjectCostBreakdown({ project, open, onClose }: Props) {
  const { data: detail, isLoading } = useProjectFinancialDetail(project?.id || null);
  
  if (!project) return null;
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {project.project_number}
            <Badge variant="outline">{project.status}</Badge>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{project.project_name}</p>
          {project.client_name && (
            <p className="text-sm text-muted-foreground">Client: {project.client_name}</p>
          )}
        </SheetHeader>
        
        <div className="mt-6 space-y-8">
          {/* Section 1: What We Sold It For */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              What We Sold It For
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Original Contract</span>
                <span className="font-medium">
                  {formatCurrency(project.contracted_amount - project.change_order_revenue)}
                </span>
              </div>
              {project.change_order_revenue > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>+ Change Orders ({project.change_order_count})</span>
                  <span>{formatCurrency(project.change_order_revenue)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Contract</span>
                <span>{formatCurrency(project.contracted_amount)}</span>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Invoiced</span>
                  <span>{formatCurrency(project.total_invoiced)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining to Bill</span>
                  <span>{formatCurrency(project.contracted_amount - project.total_invoiced)}</span>
                </div>
                <Progress 
                  value={project.contracted_amount > 0 ? (project.total_invoiced / project.contracted_amount) * 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {project.contracted_amount > 0 ? ((project.total_invoiced / project.contracted_amount) * 100).toFixed(1) : 0}% billed
                </p>
              </div>
            </div>
          </section>
          
          <Separator />
          
          {/* Section 2: Cost Flow Visualization */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              What We Thought It Would Cost
            </h3>
            <CostFlowVisualization
              estimatedCost={project.original_est_costs}
              quotedCost={project.adjusted_est_costs}
              actualCost={project.total_expenses}
              budgetUtilization={project.budget_utilization_percent}
            />
          </section>
          
          <Separator />
          
          {/* Section 3: Margin Comparison */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              What We Made
            </h3>
            <MarginComparisonBars
              originalMargin={project.original_margin}
              projectedMargin={project.projected_margin}
              currentMargin={project.current_margin}
              contractedAmount={project.contracted_amount}
            />
          </section>
          
          <Separator />
          
          {/* Section 4: Category Breakdown (Expandable) */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Cost Breakdown by Category
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <CategoryBreakdownTable 
                categories={detail?.categories || []}
                expensesByCategory={project.expenses_by_category}
              />
            )}
          </section>
          
          <Separator />
          
          {/* Section 5: Change Orders */}
          {project.change_order_count > 0 && (
            <>
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Change Orders
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Count</span>
                    <span>{project.change_order_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue Added</span>
                    <span className="text-green-600">+{formatCurrency(project.change_order_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost Added</span>
                    <span className="text-red-600">+{formatCurrency(project.change_order_cost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Net Margin Impact</span>
                    <span className={project.change_order_revenue - project.change_order_cost >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(project.change_order_revenue - project.change_order_cost)}
                    </span>
                  </div>
                </div>
              </section>
              <Separator />
            </>
          )}
          
          {/* Section 6: Contingency */}
          {project.contingency_amount > 0 && (
            <>
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Contingency
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Allocated</span>
                    <span>{formatCurrency(project.contingency_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used</span>
                    <span>{formatCurrency(project.contingency_used)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining</span>
                    <span>{formatCurrency(project.contingency_remaining)}</span>
                  </div>
                  <Progress 
                    value={project.contingency_amount > 0 ? (project.contingency_used / project.contingency_amount) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </section>
              <Separator />
            </>
          )}
          
          {/* Section 7: Projected Final (for in-progress only) */}
          {project.status === 'in_progress' && detail?.projectedFinalCost && (
            <section className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Projected Final (Based on Current Burn Rate)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Projected Final Cost</span>
                  <span>{formatCurrency(detail.projectedFinalCost)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Projected Final Margin</span>
                  <span className={detail.projectedFinalMargin && detail.projectedFinalMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(detail.projectedFinalMargin || 0)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Component: CostFlowVisualization.tsx

**Use Recharts** - Reference: `src/components/ProfitChart.tsx`

This is the key visual that shows ESTIMATE → QUOTES → ACTUALS with arrows and variance callouts.

```typescript
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Cell,
  ReferenceLine,
  LabelList
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface Props {
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  budgetUtilization: number;
}

export function CostFlowVisualization({ 
  estimatedCost, 
  quotedCost, 
  actualCost,
  budgetUtilization 
}: Props) {
  const estimateToQuoteChange = quotedCost - estimatedCost;
  const estimateToQuotePercent = estimatedCost > 0 
    ? ((estimateToQuoteChange / estimatedCost) * 100) 
    : 0;
  
  const quoteToActualChange = actualCost - quotedCost;
  const quoteToActualPercent = quotedCost > 0 
    ? ((quoteToActualChange / quotedCost) * 100) 
    : 0;

  const data = [
    { name: 'Estimate', value: estimatedCost, fill: '#94a3b8' },  // slate-400
    { name: 'Quotes', value: quotedCost, fill: '#f97316' },       // orange-500
    { name: 'Actual', value: actualCost, fill: '#22c55e' },       // green-500
  ];

  return (
    <div className="space-y-4">
      {/* Flow Arrow Display */}
      <div className="flex items-center justify-between text-center">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase">Estimate</p>
          <p className="text-lg font-bold">{formatCurrency(estimatedCost)}</p>
        </div>
        
        <div className="px-2">
          <div className={`text-xs font-medium ${estimateToQuoteChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {estimateToQuoteChange >= 0 ? '+' : ''}{estimateToQuotePercent.toFixed(0)}%
          </div>
          <div className="text-muted-foreground">→</div>
        </div>
        
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase">Quotes</p>
          <p className="text-lg font-bold">{formatCurrency(quotedCost)}</p>
        </div>
        
        <div className="px-2">
          <div className={`text-xs font-medium ${quoteToActualChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {quoteToActualChange >= 0 ? '+' : ''}{quoteToActualPercent.toFixed(0)}%
          </div>
          <div className="text-muted-foreground">→</div>
        </div>
        
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase">Actual</p>
          <p className="text-lg font-bold">{formatCurrency(actualCost)}</p>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="vertical">
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={60}
              tick={{ fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList 
                dataKey="value" 
                position="right" 
                formatter={(value: number) => formatCurrency(value, { showCents: false })}
                style={{ fontSize: 11 }}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Budget Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Budget Used</span>
          <span>{budgetUtilization.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(budgetUtilization, 100)} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {formatCurrency(actualCost)} of {formatCurrency(quotedCost)} budget
        </p>
      </div>
    </div>
  );
}
```

### Component: MarginComparisonBars.tsx

Horizontal bars showing margin comparison across stages.

```typescript
import { formatCurrency } from '@/lib/utils';

interface Props {
  originalMargin: number;
  projectedMargin: number;
  currentMargin: number;
  contractedAmount: number;
}

export function MarginComparisonBars({ 
  originalMargin, 
  projectedMargin, 
  currentMargin,
  contractedAmount 
}: Props) {
  const maxMargin = Math.max(originalMargin, projectedMargin, currentMargin, 1);
  
  const originalPercent = contractedAmount > 0 ? (originalMargin / contractedAmount) * 100 : 0;
  const projectedPercent = contractedAmount > 0 ? (projectedMargin / contractedAmount) * 100 : 0;
  const currentPercent = contractedAmount > 0 ? (currentMargin / contractedAmount) * 100 : 0;
  
  const marginChange = currentMargin - originalMargin;
  
  const bars = [
    { 
      label: 'Estimated', 
      value: originalMargin, 
      percent: originalPercent,
      width: (originalMargin / maxMargin) * 100,
      color: 'bg-slate-400'
    },
    { 
      label: 'Projected', 
      value: projectedMargin, 
      percent: projectedPercent,
      width: (projectedMargin / maxMargin) * 100,
      color: 'bg-orange-500'
    },
    { 
      label: 'Actual', 
      value: currentMargin, 
      percent: currentPercent,
      width: (currentMargin / maxMargin) * 100,
      color: 'bg-green-500'
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{bar.label}</span>
              <span className="font-medium">
                {formatCurrency(bar.value)} ({bar.percent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${bar.color} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(bar.width, 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-2 border-t">
        <div className="flex justify-between text-sm">
          <span>Margin Change from Estimate</span>
          <span className={`font-semibold ${marginChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {marginChange >= 0 ? '+' : ''}{formatCurrency(marginChange)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

### Component: CategoryBreakdownTable.tsx

Expandable table showing category-level and line-item-level detail.

**Reference pattern:** `src/components/ProjectLineItemAnalysis.tsx`

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';

interface LineItemDetail {
  id: string;
  description: string;
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
}

interface CategorySummary {
  category: string;
  categoryLabel: string;
  estimatedCost: number;
  quotedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  lineItems: LineItemDetail[];
}

interface Props {
  categories: CategorySummary[];
  expensesByCategory: Record<string, number>;
}

export function CategoryBreakdownTable({ categories, expensesByCategory }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  // If no detailed categories, fall back to expenses_by_category JSONB
  if (categories.length === 0 && expensesByCategory) {
    const categoryEntries = Object.entries(expensesByCategory);
    const total = categoryEntries.reduce((sum, [_, amount]) => sum + (amount as number), 0);
    
    return (
      <div className="space-y-2">
        {categoryEntries.map(([category, amount]) => (
          <div key={category} className="flex justify-between text-sm py-2 border-b last:border-0">
            <span>{CATEGORY_DISPLAY_MAP[category] || category}</span>
            <div className="text-right">
              <span className="font-medium">{formatCurrency(amount as number)}</span>
              <span className="text-muted-foreground ml-2">
                ({((amount as number) / total * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
        <div className="flex justify-between text-sm font-semibold pt-2 border-t">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-2 py-1">
        <div className="col-span-1">Category</div>
        <div className="text-right">Est.</div>
        <div className="text-right">Quoted</div>
        <div className="text-right">Actual</div>
        <div className="text-right">Var.</div>
      </div>
      
      {categories.map((cat) => {
        const isExpanded = expandedCategories.has(cat.category);
        
        return (
          <div key={cat.category}>
            {/* Category Row */}
            <div 
              className="grid grid-cols-5 gap-2 text-sm py-2 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(cat.category)}
            >
              <div className="col-span-1 flex items-center gap-1 font-medium">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {cat.categoryLabel}
              </div>
              <div className="text-right">{formatCurrency(cat.estimatedCost, { showCents: false })}</div>
              <div className="text-right">{formatCurrency(cat.quotedCost, { showCents: false })}</div>
              <div className="text-right">{formatCurrency(cat.actualCost, { showCents: false })}</div>
              <div className={cn(
                "text-right font-medium",
                cat.variance > 0 ? "text-red-600" : cat.variance < 0 ? "text-green-600" : ""
              )}>
                {cat.variance > 0 ? '+' : ''}{formatCurrency(cat.variance, { showCents: false })}
              </div>
            </div>
            
            {/* Expanded Line Items */}
            {isExpanded && cat.lineItems.length > 0 && (
              <div className="ml-6 border-l-2 border-muted pl-2 space-y-1">
                {cat.lineItems.map((item) => (
                  <div 
                    key={item.id}
                    className="grid grid-cols-5 gap-2 text-xs py-1.5 px-2 text-muted-foreground"
                  >
                    <div className="col-span-1 truncate" title={item.description}>
                      {item.description}
                    </div>
                    <div className="text-right">{formatCurrency(item.estimatedCost, { showCents: false })}</div>
                    <div className="text-right">{formatCurrency(item.quotedCost, { showCents: false })}</div>
                    <div className="text-right">{formatCurrency(item.actualCost, { showCents: false })}</div>
                    <div className={cn(
                      "text-right",
                      item.variance > 0 ? "text-red-500" : item.variance < 0 ? "text-green-500" : ""
                    )}>
                      {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance, { showCents: false })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Totals Row */}
      <div className="grid grid-cols-5 gap-2 text-sm font-semibold py-2 px-2 border-t mt-2">
        <div className="col-span-1">Total</div>
        <div className="text-right">
          {formatCurrency(categories.reduce((s, c) => s + c.estimatedCost, 0), { showCents: false })}
        </div>
        <div className="text-right">
          {formatCurrency(categories.reduce((s, c) => s + c.quotedCost, 0), { showCents: false })}
        </div>
        <div className="text-right">
          {formatCurrency(categories.reduce((s, c) => s + c.actualCost, 0), { showCents: false })}
        </div>
        <div className={cn(
          "text-right",
          categories.reduce((s, c) => s + c.variance, 0) > 0 ? "text-red-600" : "text-green-600"
        )}>
          {formatCurrency(categories.reduce((s, c) => s + c.variance, 0), { showCents: false })}
        </div>
      </div>
    </div>
  );
}
```

---

## Important Notes

1. **NO frontend calculations** - All financial metrics come from database fields
2. **Reference KPIGuide.tsx** - For field definitions and formulas
3. **Use formatCurrency from lib/utils** - For consistent currency formatting
4. **Follow existing patterns** - Look at Dashboard.tsx, SimpleReportBuilder.tsx for UI patterns
5. **Mobile-first** - Use responsive grid classes (grid-cols-2 md:grid-cols-3 lg:grid-cols-6)

## Existing Code References

| What | Where | Use For |
|------|-------|---------|
| Line item correlation logic | `src/hooks/useLineItemControl.ts` | Fetching quote/expense mappings |
| Category analysis pattern | `src/components/ProjectLineItemAnalysis.tsx` | Grouping by category, expand/collapse |
| Variance calculations | `src/components/VarianceAnalysis.tsx` | Variance display patterns |
| Quote-to-estimate mapping | `src/utils/quoteFinancials.ts` | `compareQuoteToEstimate()` |
| Sheet component | `src/components/ui/sheet.tsx` | Sidebar slide-in pattern |
| Recharts usage | `src/components/ProfitChart.tsx` | Chart configuration |
| Currency formatting | `src/lib/utils.ts` | `formatCurrency()` |
| Category display labels | `src/types/estimate.ts` | `CATEGORY_DISPLAY_MAP` |

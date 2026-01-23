# Phase 5.1: Line Item Allocation Tracking

## Overview

Add expense allocation tracking to the Project Cost Breakdown sheet, showing how many external line items have expenses allocated vs. pending. Include an action button to view a detailed line item allocation sheet.

---

## The Business Question

**"Of all the line items we need to pay vendors for, how many have we received invoices/expenses for?"**

This answers:
- Which line items are "closed out" (expense received and allocated)
- Which are still open (waiting on vendor invoice)
- Overall project cost tracking completion

---

## Key Concepts

### Internal vs External Line Items

**Internal categories** (from `src/hooks/useLineItemControl.ts`):
- `labor_internal` - Internal labor (time entries, not vendor expenses)
- `management` - Management overhead

**External categories** (need vendor expenses):
- `subcontractors` - External labor
- `materials` - Materials
- `equipment` - Equipment rental/purchase
- `permits` - Permits & fees
- `other` - Other external costs

Only **external** line items need expense allocation tracking.

---

## Data Sources

### Line Items
- `estimate_line_items` - from approved estimate
- `change_order_line_items` - from approved change orders

### Expense Correlations
- `expense_line_item_correlations` table links expenses to line items
- Reference: `src/hooks/useLineItemControl.ts` for correlation logic

### Quote Mappings
- `quote_line_items.estimate_line_item_id` - links quotes to estimate line items
- `quote_line_items.change_order_line_item_id` - links quotes to CO line items

---

## File Changes

### 1. UPDATE: ProjectCostBreakdown.tsx

Add allocation summary section and action button.

**Location:** `src/components/profit-analysis/ProjectCostBreakdown.tsx`

**Add after the "What We Made" section:**

```typescript
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { LineItemAllocationSheet } from './LineItemAllocationSheet';

// Inside the component, add state:
const [showLineItemSheet, setShowLineItemSheet] = useState(false);

// Add this section after Margin Comparison, before Category Breakdown:

<Separator />

{/* Section: Line Item Allocation Status */}
<section>
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
      Expense Allocation Status
    </h3>
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => setShowLineItemSheet(true)}
    >
      <FileText className="h-4 w-4 mr-2" />
      View Line Items
    </Button>
  </div>
  
  {isLoading ? (
    <Skeleton className="h-20 w-full" />
  ) : detail?.allocationSummary ? (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-2xl font-bold">{detail.allocationSummary.totalExternalLineItems}</p>
          <p className="text-xs text-muted-foreground">External Line Items</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{detail.allocationSummary.allocatedCount}</p>
          <p className="text-xs text-muted-foreground">With Expenses</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">{detail.allocationSummary.pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Allocation Progress</span>
          <span>{detail.allocationSummary.allocationPercent.toFixed(0)}%</span>
        </div>
        <Progress 
          value={detail.allocationSummary.allocationPercent} 
          className="h-2"
        />
      </div>
      
      {/* Status message */}
      {detail.allocationSummary.pendingCount === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>All external line items have expenses allocated</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          <span>{detail.allocationSummary.pendingCount} line items awaiting vendor invoices</span>
        </div>
      )}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">No external line items found</p>
  )}
</section>

{/* Line Item Allocation Sheet */}
<LineItemAllocationSheet
  projectId={project.id}
  projectNumber={project.project_number}
  open={showLineItemSheet}
  onClose={() => setShowLineItemSheet(false)}
/>
```

---

### 2. UPDATE: useProjectFinancialDetail.ts

Add allocation summary to the hook.

**Location:** `src/components/profit-analysis/hooks/useProjectFinancialDetail.ts`

**Add to the interface:**

```typescript
interface AllocationSummary {
  totalExternalLineItems: number;
  allocatedCount: number;
  pendingCount: number;
  allocationPercent: number;
  lineItems: LineItemAllocationDetail[];
}

interface LineItemAllocationDetail {
  id: string;
  source: 'estimate' | 'change_order';
  changeOrderNumber?: string;
  category: string;
  categoryLabel: string;
  description: string;
  estimatedCost: number;
  quotedCost: number;
  quotedBy: string | null;
  allocatedAmount: number;
  hasAllocation: boolean;
  allocationStatus: 'full' | 'partial' | 'none';
  expenses: AllocatedExpense[];
}

interface AllocatedExpense {
  id: string;
  date: string;
  payee: string;
  description: string;
  amount: number;
  isSplit: boolean;
}

interface ProjectFinancialDetail {
  // ... existing fields ...
  allocationSummary: AllocationSummary | null;
}
```

**Add to the query function:**

```typescript
// Internal categories that don't need expense allocation
const INTERNAL_CATEGORIES = ['labor_internal', 'management'];

// Inside the queryFn, after fetching estimate/quote/expense data:

// Build line item allocation details
const lineItemDetails: LineItemAllocationDetail[] = [];

// Process estimate line items (external only)
for (const item of estimateData?.estimate_line_items || []) {
  if (INTERNAL_CATEGORIES.includes(item.category)) continue;
  
  // Find accepted quote for this line item
  const linkedQuote = quotesData?.find(q => 
    q.quote_line_items?.some(qli => qli.estimate_line_item_id === item.id)
  );
  const quoteLineItem = linkedQuote?.quote_line_items?.find(
    qli => qli.estimate_line_item_id === item.id
  );
  
  // Find correlated expenses
  const correlatedExpenses = expenseData?.filter(
    corr => corr.estimate_line_item_id === item.id
  ) || [];
  
  const allocatedAmount = correlatedExpenses.reduce((sum, corr) => {
    if (corr.expense_split_id && corr.expense_splits) {
      return sum + (corr.expense_splits.split_amount || 0);
    }
    return sum + (corr.expenses?.amount || 0);
  }, 0);
  
  const quotedCost = quoteLineItem?.total_cost || 0;
  const baseline = quotedCost > 0 ? quotedCost : item.total_cost;
  
  lineItemDetails.push({
    id: item.id,
    source: 'estimate',
    category: item.category,
    categoryLabel: CATEGORY_DISPLAY_MAP[item.category] || item.category,
    description: item.description,
    estimatedCost: item.total_cost,
    quotedCost,
    quotedBy: linkedQuote?.payees?.payee_name || null,
    allocatedAmount,
    hasAllocation: correlatedExpenses.length > 0,
    allocationStatus: allocatedAmount >= baseline ? 'full' : allocatedAmount > 0 ? 'partial' : 'none',
    expenses: correlatedExpenses.map(corr => ({
      id: corr.expense_id || corr.expense_split_id,
      date: corr.expenses?.expense_date || '',
      payee: corr.expenses?.payees?.payee_name || 'Unknown',
      description: corr.expenses?.description || '',
      amount: corr.expense_split_id ? corr.expense_splits?.split_amount : corr.expenses?.amount,
      isSplit: !!corr.expense_split_id,
    })),
  });
}

// Process change order line items (external only)
// Similar logic for change_order_line_items...

// Calculate summary
const totalExternal = lineItemDetails.length;
const allocatedCount = lineItemDetails.filter(li => li.hasAllocation).length;
const pendingCount = totalExternal - allocatedCount;

const allocationSummary: AllocationSummary = {
  totalExternalLineItems: totalExternal,
  allocatedCount,
  pendingCount,
  allocationPercent: totalExternal > 0 ? (allocatedCount / totalExternal) * 100 : 100,
  lineItems: lineItemDetails,
};
```

---

### 3. CREATE: LineItemAllocationSheet.tsx

New sheet showing all line items with their allocation status.

**Location:** `src/components/profit-analysis/LineItemAllocationSheet.tsx`

```typescript
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText 
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useProjectFinancialDetail } from './hooks/useProjectFinancialDetail';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { format } from 'date-fns';

interface Props {
  projectId: string;
  projectNumber: string;
  open: boolean;
  onClose: () => void;
}

export function LineItemAllocationSheet({ projectId, projectNumber, open, onClose }: Props) {
  const { data: detail, isLoading } = useProjectFinancialDetail(projectId);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'allocated' | 'pending'>('all');
  
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const lineItems = detail?.allocationSummary?.lineItems || [];
  
  const filteredItems = lineItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'allocated') return item.hasAllocation;
    if (filter === 'pending') return !item.hasAllocation;
    return true;
  });
  
  // Group by category
  const groupedByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = {
        category: item.category,
        categoryLabel: item.categoryLabel,
        items: [],
        totalEstimated: 0,
        totalQuoted: 0,
        totalAllocated: 0,
      };
    }
    acc[item.category].items.push(item);
    acc[item.category].totalEstimated += item.estimatedCost;
    acc[item.category].totalQuoted += item.quotedCost || item.estimatedCost;
    acc[item.category].totalAllocated += item.allocatedAmount;
    return acc;
  }, {} as Record<string, any>);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'full':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Allocated</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'none':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Line Item Allocations
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{projectNumber}</p>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Summary */}
          {detail?.allocationSummary && (
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="p-2 bg-muted/50 rounded">
                <p className="font-bold">{detail.allocationSummary.totalExternalLineItems}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <p className="font-bold text-green-600">{detail.allocationSummary.allocatedCount}</p>
                <p className="text-xs text-muted-foreground">Allocated</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded">
                <p className="font-bold text-yellow-600">{detail.allocationSummary.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          )}
          
          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({lineItems.length})</TabsTrigger>
              <TabsTrigger value="allocated">
                Allocated ({lineItems.filter(i => i.hasAllocation).length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({lineItems.filter(i => !i.hasAllocation).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Line Items by Category */}
          <div className="space-y-4">
            {Object.values(groupedByCategory).map((group: any) => (
              <div key={group.category} className="border rounded-lg">
                {/* Category Header */}
                <div className="flex items-center justify-between p-3 bg-muted/30">
                  <div>
                    <p className="font-medium">{group.categoryLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length} line items
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{formatCurrency(group.totalAllocated)}</p>
                    <p className="text-xs text-muted-foreground">
                      of {formatCurrency(group.totalQuoted)} quoted
                    </p>
                  </div>
                </div>
                
                {/* Line Items */}
                <div className="divide-y">
                  {group.items.map((item: any) => {
                    const isExpanded = expandedItems.has(item.id);
                    
                    return (
                      <div key={item.id}>
                        {/* Line Item Row */}
                        <div 
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20"
                          onClick={() => toggleExpand(item.id)}
                        >
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.source === 'change_order' && (
                                <Badge variant="outline" className="text-[10px]">
                                  CO: {item.changeOrderNumber}
                                </Badge>
                              )}
                              {item.quotedBy && (
                                <span>Quoted by: {item.quotedBy}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm">
                            <p className="font-medium">
                              {formatCurrency(item.allocatedAmount)} / {formatCurrency(item.quotedCost || item.estimatedCost)}
                            </p>
                            {getStatusBadge(item.allocationStatus)}
                          </div>
                        </div>
                        
                        {/* Expanded: Show Expenses */}
                        {isExpanded && (
                          <div className="px-10 pb-3 space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-b pb-1">
                              <div>Estimated: {formatCurrency(item.estimatedCost)}</div>
                              <div>Quoted: {formatCurrency(item.quotedCost)}</div>
                              <div>Allocated: {formatCurrency(item.allocatedAmount)}</div>
                            </div>
                            
                            {item.expenses.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-xs font-medium">Allocated Expenses:</p>
                                {item.expenses.map((exp: any) => (
                                  <div 
                                    key={exp.id}
                                    className="flex justify-between items-center text-xs p-2 bg-muted/30 rounded"
                                  >
                                    <div>
                                      <p className="font-medium">{exp.payee}</p>
                                      <p className="text-muted-foreground">
                                        {exp.date ? format(new Date(exp.date), 'MMM d, yyyy') : 'No date'}
                                        {exp.isSplit && ' (Split)'}
                                      </p>
                                    </div>
                                    <p className="font-medium">{formatCurrency(exp.amount)}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic p-2 bg-yellow-50 rounded">
                                No expenses allocated yet. Go to Expense Matching to allocate.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No line items match the current filter</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

### 4. UPDATE: index.ts (barrel export)

**Location:** `src/components/profit-analysis/index.ts`

Add the new export:

```typescript
export { LineItemAllocationSheet } from './LineItemAllocationSheet';
```

---

## Implementation Checklist

### Phase 5.1: Line Item Allocation Tracking
- [ ] Update `useProjectFinancialDetail.ts` to include `allocationSummary`
- [ ] Update `ProjectCostBreakdown.tsx` to show allocation status section
- [ ] Create `LineItemAllocationSheet.tsx` for detailed view
- [ ] Add action button to open line item sheet
- [ ] Update barrel export in `index.ts`
- [ ] Test with projects that have/don't have allocations

---

## Cursor Prompt

```
Implement Phase 5.1: Line Item Allocation Tracking following docs/line-items/PHASE_5_1_LINE_ITEM_ALLOCATION.md

1. Update src/components/profit-analysis/hooks/useProjectFinancialDetail.ts:
   - Add AllocationSummary and LineItemAllocationDetail interfaces
   - Query expense_line_item_correlations to find allocated expenses
   - Filter to external categories only (exclude labor_internal, management)
   - Calculate allocation counts and percentages

2. Update src/components/profit-analysis/ProjectCostBreakdown.tsx:
   - Add "Expense Allocation Status" section with summary stats
   - Add "View Line Items" button that opens LineItemAllocationSheet
   - Show allocation progress bar and status message

3. Create src/components/profit-analysis/LineItemAllocationSheet.tsx:
   - Sheet with line items grouped by category
   - Filter tabs: All / Allocated / Pending
   - Expandable rows showing allocated expenses
   - Status badges: Allocated (green), Partial (yellow), Pending (red)

Reference existing patterns:
- src/hooks/useLineItemControl.ts for correlation query logic
- src/components/LineItemControlDashboard.tsx for UI patterns
- src/types/estimate.ts for CATEGORY_DISPLAY_MAP and internal category check

Internal categories to exclude: ['labor_internal', 'management']
```

---

## Data Flow

```
estimate_line_items / change_order_line_items
        │
        ▼
quote_line_items (estimate_line_item_id / change_order_line_item_id)
        │
        ▼
expense_line_item_correlations (estimate_line_item_id / quote_id)
        │
        ▼
expenses / expense_splits
```

---

## Notes

1. **Internal vs External:** Only track allocation for external categories. Internal labor comes from time entries, not vendor expenses.

2. **Quote-based allocation:** Some expenses are allocated to quotes rather than directly to estimate line items. The hook needs to follow the `quote_id` → `quote_line_items.estimate_line_item_id` chain.

3. **Split expenses:** Handle both direct expenses and split expenses via `expense_splits`.

4. **Change orders:** Include line items from approved change orders, not just the original estimate.

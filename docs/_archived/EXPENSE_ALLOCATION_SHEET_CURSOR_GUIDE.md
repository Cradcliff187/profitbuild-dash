# Expense Allocation Sheet - Cursor AI Implementation Guide

**Project:** ProfitBuild - Replace full-page expense matching with inline sheet component  
**Branch:** feature/expense-allocation-sheet (already created)  
**Estimated Time:** 3-4 days  
**Risk Level:** Low (phased approach with fallback)

---

## 📋 Pre-Implementation Setup

### Verify Branch
```bash
git status
# Should show: On branch feature/expense-allocation-sheet

git pull origin feature/expense-allocation-sheet
```

### Backup Critical Files
```bash
# Create backup directory
mkdir -p .backups/$(date +%Y%m%d)

# Backup files we'll modify
cp src/components/GlobalExpenseMatching.tsx .backups/$(date +%Y%m%d)/
cp src/components/ExpensesList.tsx .backups/$(date +%Y%m%d)/
cp src/pages/ExpenseMatching.tsx .backups/$(date +%Y%m%d)/
```

---

## 🏗️ PHASE 1: Extract Reusable Logic

### PROMPT 1.1: Create Utility File

**File to create:** `src/utils/expenseAllocation.ts`

**Cursor Prompt:**
```
Create a new utility file at src/utils/expenseAllocation.ts that extracts the core allocation logic from GlobalExpenseMatching.tsx.

Extract these functions (copy them exactly, don't modify logic):
1. suggestLineItemAllocation() - lines ~540-620
2. calculateMatchConfidence() - lines ~625-695
3. The category mapping object that maps ExpenseCategory to LineItemCategory[]

Also create these TypeScript interfaces at the top of the file:
- LineItemForMatching (copy from GlobalExpenseMatching.tsx)
- EnhancedExpense (copy from GlobalExpenseMatching.tsx)

Export all functions and interfaces.

Add these imports at the top:
- ExpenseCategory from '@/types/expense'
- LineItemCategory from '@/types/estimate'
- fuzzyMatchPayee, PartialPayee from '@/utils/fuzzyPayeeMatcher'

DO NOT modify the logic inside these functions - just copy them exactly as they are.
```

**Expected Result:**
- New file created at `src/utils/expenseAllocation.ts`
- Contains exported functions and interfaces
- File compiles without errors

**Test:**
```bash
npm run build
# Should complete without errors
```

---

### PROMPT 1.2: Update GlobalExpenseMatching to Use Utils

**File to modify:** `src/components/GlobalExpenseMatching.tsx`

**Cursor Prompt:**
```
Refactor src/components/GlobalExpenseMatching.tsx to import and use the functions we extracted to src/utils/expenseAllocation.ts.

Changes needed:
1. Add import at top: import { suggestLineItemAllocation, calculateMatchConfidence, LineItemForMatching, EnhancedExpense } from '@/utils/expenseAllocation';

2. REMOVE the local definitions of:
   - suggestLineItemAllocation function
   - calculateMatchConfidence function
   - The categoryMap object (it's now in the utility functions)
   - LineItemForMatching interface (keep EnhancedExpenseSplit since it's different)

3. Keep all other logic exactly the same - we're just using imported functions instead of local ones.

The component should work EXACTLY the same way, just using shared utilities.
```

**Expected Result:**
- GlobalExpenseMatching.tsx imports from utils
- Duplicate functions removed
- Component still compiles and functions

**Test:**
```bash
npm run dev
# Navigate to http://localhost:5173/expenses/matching
# Try allocating an expense
# Verify fuzzy matching still shows suggestions
# Verify allocation still works
```

**Commit Point:**
```bash
git add src/utils/expenseAllocation.ts src/components/GlobalExpenseMatching.tsx
git commit -m "refactor: extract expense allocation logic to shared utilities"
```

---

## 🎨 PHASE 2: Create Basic Sheet Component

### PROMPT 2.1: Create ExpenseAllocationSheet Component

**File to create:** `src/components/ExpenseAllocationSheet.tsx`

**Cursor Prompt:**
```
Create a new component at src/components/ExpenseAllocationSheet.tsx for allocating a SINGLE expense to line items.

Component structure:

```typescript
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building, Search, CheckCircle, DollarSign, Zap } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { 
  suggestLineItemAllocation, 
  calculateMatchConfidence,
  LineItemForMatching 
} from '@/utils/expenseAllocation';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { format } from 'date-fns';

interface ExpenseAllocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string | null;
  onSuccess: () => void;
}

export const ExpenseAllocationSheet: React.FC<ExpenseAllocationSheetProps> = ({
  open,
  onOpenChange,
  expenseId,
  onSuccess
}) => {
  // TODO: Implement state management
  // TODO: Implement data loading
  // TODO: Implement allocation logic
  // TODO: Implement UI rendering
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[900px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Match Expense to Line Items</SheetTitle>
          <SheetDescription>
            Select a line item to allocate this expense
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Content will go here */}
        </div>

        <div className="px-6 py-4 border-t flex space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

This is just the skeleton - we'll fill it in next steps.
```

**Expected Result:**
- New file created
- Component compiles
- Basic skeleton structure in place

**Test:**
```bash
npm run build
# Should complete without errors
```

---

### PROMPT 2.2: Implement State Management and Data Loading

**File to modify:** `src/components/ExpenseAllocationSheet.tsx`

**Cursor Prompt:**
```
Update src/components/ExpenseAllocationSheet.tsx to add state management and data loading.

Add this state at the top of the component (after the props destructuring):

```typescript
const { toast } = useToast();
const [isLoading, setIsLoading] = useState(false);
const [expense, setExpense] = useState<any>(null);
const [lineItems, setLineItems] = useState<LineItemForMatching[]>([]);
const [suggestedLineItemId, setSuggestedLineItemId] = useState<string | undefined>();
const [confidenceScore, setConfidenceScore] = useState<number>(0);
const [searchTerm, setSearchTerm] = useState('');
const [activeTab, setActiveTab] = useState<'estimates' | 'quotes' | 'change_orders'>('estimates');
```

Add this data loading function:

```typescript
const loadExpenseData = async () => {
  if (!expenseId) return;
  
  setIsLoading(true);
  try {
    // 1. Load the expense
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        payees(payee_name),
        projects(project_name, project_number)
      `)
      .eq('id', expenseId)
      .single();
    
    if (expenseError) throw expenseError;
    
    const enhancedExpense = {
      ...expenseData,
      payee_name: expenseData.payees?.payee_name,
      project_name: expenseData.projects?.project_name,
      project_number: expenseData.projects?.project_number
    };
    
    setExpense(enhancedExpense);
    
    // 2. Load line items for this project only
    const projectId = expenseData.project_id;
    
    // Load estimate line items
    const { data: estimates, error: estimatesError } = await supabase
      .from('estimates')
      .select(`
        id,
        estimate_number,
        project_id,
        projects(project_name),
        estimate_line_items(*)
      `)
      .eq('project_id', projectId);
    
    if (estimatesError) throw estimatesError;
    
    // Load quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        project_id,
        projects(project_name),
        payees(payee_name),
        total_cost
      `)
      .eq('project_id', projectId);
    
    if (quotesError) throw quotesError;
    
    // Load change orders
    const { data: changeOrders, error: coError } = await supabase
      .from('change_orders')
      .select(`
        id,
        change_order_number,
        project_id,
        status,
        projects(project_name),
        change_order_line_items(*)
      `)
      .eq('project_id', projectId);
    
    if (coError) throw coError;
    
    // Load existing correlations to calculate allocated amounts
    const { data: correlations } = await supabase
      .from('expense_line_item_correlations')
      .select('*');
    
    // Transform to LineItemForMatching format
    const estimateLineItems: LineItemForMatching[] = [];
    estimates?.forEach(est => {
      est.estimate_line_items?.forEach((item: any) => {
        estimateLineItems.push({
          id: item.id,
          type: 'estimate',
          source_id: est.id,
          project_id: est.project_id,
          project_name: est.projects?.project_name || '',
          category: item.category,
          description: item.description,
          total: item.total_cost || 0,
          allocated_amount: 0, // Will calculate below
        });
      });
    });
    
    const quoteLineItems: LineItemForMatching[] = quotes?.map(q => ({
      id: q.id,
      type: 'quote',
      source_id: q.id,
      project_id: q.project_id,
      project_name: q.projects?.project_name || '',
      category: 'SUBCONTRACTOR' as LineItemCategory,
      description: `Quote #${q.quote_number}`,
      total: q.total_cost || 0,
      allocated_amount: 0,
      payee_name: q.payees?.payee_name
    })) || [];
    
    const changeOrderLineItems: LineItemForMatching[] = [];
    changeOrders?.forEach(co => {
      co.change_order_line_items?.forEach((item: any) => {
        changeOrderLineItems.push({
          id: item.id,
          type: 'change_order',
          source_id: co.id,
          project_id: co.project_id,
          project_name: co.projects?.project_name || '',
          category: item.category,
          description: item.description,
          total: item.total_cost || 0,
          allocated_amount: 0,
          change_order_number: co.change_order_number,
          change_order_status: co.status
        });
      });
    });
    
    const allLineItems = [...estimateLineItems, ...quoteLineItems, ...changeOrderLineItems];
    
    // Calculate allocated amounts
    correlations?.forEach(corr => {
      // Get the expense or split amount
      let allocatedAmount = 0;
      if (corr.expense_id) {
        const exp = await supabase.from('expenses').select('amount').eq('id', corr.expense_id).single();
        allocatedAmount = exp.data?.amount || 0;
      } else if (corr.expense_split_id) {
        const split = await supabase.from('expense_splits').select('split_amount').eq('id', corr.expense_split_id).single();
        allocatedAmount = split.data?.split_amount || 0;
      }
      
      const lineItem = allLineItems.find(li => 
        li.id === corr.estimate_line_item_id ||
        (corr.quote_id && li.source_id === corr.quote_id) ||
        li.id === corr.change_order_line_item_id
      );
      
      if (lineItem) {
        lineItem.allocated_amount += allocatedAmount;
      }
    });
    
    setLineItems(allLineItems);
    
    // 3. Calculate suggestions
    const suggested = suggestLineItemAllocation(enhancedExpense, allLineItems);
    const confidence = calculateMatchConfidence(enhancedExpense, allLineItems);
    
    setSuggestedLineItemId(suggested);
    setConfidenceScore(confidence);
    
    // Auto-select the tab with suggestions
    if (suggested) {
      const suggestedItem = allLineItems.find(li => li.id === suggested);
      if (suggestedItem) {
        setActiveTab(suggestedItem.type === 'estimate' ? 'estimates' : 
                     suggestedItem.type === 'quote' ? 'quotes' : 'change_orders');
      }
    }
    
  } catch (error) {
    console.error('Error loading expense data:', error);
    toast({
      title: "Error",
      description: "Failed to load expense data.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};
```

Add useEffect to trigger loading:

```typescript
useEffect(() => {
  if (open && expenseId) {
    loadExpenseData();
  }
}, [open, expenseId]);
```

DO NOT modify the UI yet - we'll do that next.
```

**Expected Result:**
- State variables added
- Data loading function implemented
- useEffect triggers data load

**Test:**
```bash
npm run build
# Should complete without errors
```

---

### PROMPT 2.3: Implement Allocation Function

**File to modify:** `src/components/ExpenseAllocationSheet.tsx`

**Cursor Prompt:**
```
Add the allocation handler function to src/components/ExpenseAllocationSheet.tsx.

Add this function after the loadExpenseData function:

```typescript
const handleAllocate = async (lineItem: LineItemForMatching) => {
  if (!expense) return;
  
  setIsLoading(true);
  try {
    // Create correlation
    const correlation = {
      expense_id: expense.id,
      expense_split_id: null,
      estimate_line_item_id: lineItem.type === 'estimate' ? lineItem.id : null,
      quote_id: lineItem.type === 'quote' ? lineItem.source_id : null,
      change_order_line_item_id: lineItem.type === 'change_order' ? lineItem.id : null,
      correlation_type: lineItem.type === 'estimate' ? 'estimated' : 
                       lineItem.type === 'quote' ? 'quoted' : 'change_order',
      auto_correlated: false,
      notes: 'Manually assigned via inline allocation sheet'
    };
    
    const { error: correlationError } = await supabase
      .from('expense_line_item_correlations')
      .insert([correlation]);
    
    if (correlationError) throw correlationError;
    
    // Update expense to mark as planned
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ is_planned: true })
      .eq('id', expense.id);
    
    if (updateError) throw updateError;
    
    toast({
      title: "Allocation Complete",
      description: `Allocated ${formatCurrency(expense.amount)} to ${lineItem.type} line item.`
    });
    
    onSuccess();
    onOpenChange(false);
    
  } catch (error) {
    console.error('Error allocating expense:', error);
    toast({
      title: "Error",
      description: "Failed to allocate expense.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};
```
```

**Expected Result:**
- Allocation function added
- Handles database operations
- Shows toast notifications

**Test:**
```bash
npm run build
```

---

### PROMPT 2.4: Implement UI Rendering

**File to modify:** `src/components/ExpenseAllocationSheet.tsx`

**Cursor Prompt:**
```
Update the UI rendering in src/components/ExpenseAllocationSheet.tsx to show expense details and line items.

Replace the content inside the ScrollArea div (the "flex-1 overflow-y-auto" div) with:

```typescript
{isLoading ? (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
) : expense ? (
  <div className="space-y-4">
    {/* Expense Details */}
    <div className="p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">
            {formatCurrency(expense.amount)} • {expense.payee_name || 'No Payee'}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-1">
              <Building className="h-3 w-3" />
              {expense.project_number} • {expense.project_name}
            </div>
            <div>{EXPENSE_CATEGORY_DISPLAY[expense.category]} • {format(new Date(expense.expense_date), 'MMM d, yyyy')}</div>
            {expense.description && <div className="italic">{expense.description}</div>}
          </div>
        </div>
        
        {confidenceScore > 0 && (
          <Badge variant="outline" className="ml-2">
            <Zap className="h-3 w-3 mr-1" />
            {confidenceScore}% Match
          </Badge>
        )}
      </div>
    </div>

    {/* Suggested Matches */}
    {suggestedLineItemId && (
      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 mb-2">
          <Zap className="h-4 w-4" />
          Suggested Match ({confidenceScore}% confidence)
        </div>
        {(() => {
          const suggested = lineItems.find(li => li.id === suggestedLineItemId);
          if (!suggested) return null;
          
          return (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{suggested.description}</div>
                <div className="text-xs text-muted-foreground">
                  {CATEGORY_DISPLAY_MAP[suggested.category]} • {formatCurrency(suggested.total)}
                  {suggested.allocated_amount > 0 && ` • ${formatCurrency(suggested.allocated_amount)} allocated`}
                </div>
              </div>
              <Button size="sm" onClick={() => handleAllocate(suggested)}>
                Allocate Here
              </Button>
            </div>
          );
        })()}
      </div>
    )}

    {/* Search */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search line items..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9"
      />
    </div>

    {/* Tabs for Line Item Types */}
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="estimates">
          Estimates ({lineItems.filter(li => li.type === 'estimate').length})
        </TabsTrigger>
        <TabsTrigger value="quotes">
          Quotes ({lineItems.filter(li => li.type === 'quote').length})
        </TabsTrigger>
        <TabsTrigger value="change_orders">
          Change Orders ({lineItems.filter(li => li.type === 'change_order').length})
        </TabsTrigger>
      </TabsList>

      {/* Filter line items based on search */}
      {(() => {
        const filtered = lineItems.filter(li => {
          if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return li.description.toLowerCase().includes(search) ||
                   li.category.toLowerCase().includes(search);
          }
          return true;
        });

        return (
          <>
            <TabsContent value="estimates" className="space-y-2 mt-4">
              {filtered.filter(li => li.type === 'estimate').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No estimate line items found
                </div>
              ) : (
                filtered.filter(li => li.type === 'estimate').map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 border rounded-lg transition-all hover:border-primary hover:shadow-sm",
                      item.id === suggestedLineItemId && "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {CATEGORY_DISPLAY_MAP[item.category]}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-sm font-medium">{formatCurrency(item.total)}</div>
                        {item.allocated_amount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.allocated_amount)} allocated
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAllocate(item)}
                      disabled={isLoading}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Allocate to This Item
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="quotes" className="space-y-2 mt-4">
              {filtered.filter(li => li.type === 'quote').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No quote line items found
                </div>
              ) : (
                filtered.filter(li => li.type === 'quote').map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 border rounded-lg transition-all hover:border-primary hover:shadow-sm",
                      item.id === suggestedLineItemId && "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.payee_name && `${item.payee_name} • `}
                          {CATEGORY_DISPLAY_MAP[item.category]}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-sm font-medium">{formatCurrency(item.total)}</div>
                        {item.allocated_amount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.allocated_amount)} allocated
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAllocate(item)}
                      disabled={isLoading}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Allocate to This Item
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="change_orders" className="space-y-2 mt-4">
              {filtered.filter(li => li.type === 'change_order').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No change order line items found
                </div>
              ) : (
                filtered.filter(li => li.type === 'change_order').map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 border rounded-lg transition-all hover:border-primary hover:shadow-sm",
                      item.id === suggestedLineItemId && "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          CO #{item.change_order_number} • {CATEGORY_DISPLAY_MAP[item.category]}
                          {item.change_order_status && ` • ${item.change_order_status}`}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-sm font-medium">{formatCurrency(item.total)}</div>
                        {item.allocated_amount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.allocated_amount)} allocated
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAllocate(item)}
                      disabled={isLoading}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Allocate to This Item
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
          </>
        );
      })()}
    </Tabs>
  </div>
) : (
  <div className="text-center py-12 text-muted-foreground">
    Select an expense to allocate
  </div>
)}
```

Also add the ScrollArea import at the top if not already there:
import { ScrollArea } from '@/components/ui/scroll-area';
```

**Expected Result:**
- Full UI rendered
- Shows expense details
- Shows line items in tabs
- Search works
- Suggestion highlighting works

**Test:**
```bash
npm run build
```

**Commit Point:**
```bash
git add src/components/ExpenseAllocationSheet.tsx
git commit -m "feat: create ExpenseAllocationSheet component with basic allocation"
```

---

## 🔌 PHASE 3: Integrate with ExpensesList

### PROMPT 3.1: Add Sheet State to ExpensesList

**File to modify:** `src/components/ExpensesList.tsx`

**Cursor Prompt:**
```
Update src/components/ExpensesList.tsx to add state for the allocation sheet.

1. Add import at top:
import { ExpenseAllocationSheet } from './ExpenseAllocationSheet';

2. Add these state variables after the existing useState declarations (around line 100):
const [allocationSheetOpen, setAllocationSheetOpen] = useState(false);
const [expenseToAllocate, setExpenseToAllocate] = useState<string | null>(null);

3. Add this handler function after the existing handler functions (around line 200):
const handleAllocationSuccess = () => {
  // Refresh the expenses list
  onRefresh();
  setAllocationSheetOpen(false);
  setExpenseToAllocate(null);
};

DO NOT modify the UI yet - just add these state variables and handler.
```

**Expected Result:**
- Import added
- State variables added
- Handler function added
- File compiles

**Test:**
```bash
npm run build
```

---

### PROMPT 3.2: Update Actions Menu to Use Sheet

**File to modify:** `src/components/ExpensesList.tsx`

**Cursor Prompt:**
```
Update the "Match to Line Items" menu item in src/components/ExpensesList.tsx to open the sheet instead of navigating.

Find the DropdownMenuItem that has "Match to Line Items" text (search for the text "Match to Line Items").

Change it from:
```typescript
{!isAllocated && (
  <DropdownMenuItem onClick={() => navigate(`/expenses/matching?highlight=${row.id}`)}>
    <Target className="h-3 w-3 mr-2" />
    Match to Line Items
  </DropdownMenuItem>
)}
```

To:
```typescript
{!isAllocated && (
  <DropdownMenuItem onClick={() => {
    setExpenseToAllocate(row.id);
    setAllocationSheetOpen(true);
  }}>
    <Target className="h-3 w-3 mr-2" />
    Match to Line Items
  </DropdownMenuItem>
)}
```

DO NOT remove the navigate import yet - we'll keep the old page as fallback for now.
```

**Expected Result:**
- Menu item now opens sheet
- Navigation removed
- File compiles

**Test:**
```bash
npm run build
```

---

### PROMPT 3.3: Add Sheet Component to Render

**File to modify:** `src/components/ExpensesList.tsx`

**Cursor Prompt:**
```
Add the ExpenseAllocationSheet component to the render output in src/components/ExpensesList.tsx.

Find the end of the return statement. Look for the closing tags of EntityTableTemplate and the existing dialog components (ReassignExpenseProjectDialog and ExpenseSplitDialog).

Add the ExpenseAllocationSheet component AFTER those dialogs but before the closing fragment tag:

```typescript
{/* Expense Allocation Sheet */}
<ExpenseAllocationSheet
  open={allocationSheetOpen}
  onOpenChange={setAllocationSheetOpen}
  expenseId={expenseToAllocate}
  onSuccess={handleAllocationSuccess}
/>
```

The structure should look like:
```typescript
return (
  <>
    {/* existing content */}
    <EntityTableTemplate ... />
    
    {/* Other existing dialogs */}
    <ReassignExpenseProjectDialog ... />
    <ExpenseSplitDialog ... />
    
    {/* NEW - Expense Allocation Sheet */}
    <ExpenseAllocationSheet
      open={allocationSheetOpen}
      onOpenChange={setAllocationSheetOpen}
      expenseId={expenseToAllocate}
      onSuccess={handleAllocationSuccess}
    />
  </>
);
```
```

**Expected Result:**
- Sheet component added to render
- File compiles
- Ready for testing

**Test:**
```bash
npm run build
```

**Commit Point:**
```bash
git add src/components/ExpensesList.tsx
git commit -m "feat: integrate ExpenseAllocationSheet with ExpensesList"
```

---

## ✅ PHASE 4: Testing & Validation

### Manual Testing Checklist

Run dev server:
```bash
npm run dev
```

Navigate to: `http://localhost:5173/expenses`

**Test 1: Basic Allocation**
- [ ] Click on an expense Actions menu (three dots)
- [ ] Click "Match to Line Items"
- [ ] Sheet should slide in from right
- [ ] Verify expense details display correctly
- [ ] Verify line items show for the project
- [ ] Click "Allocate to This Item" on an estimate
- [ ] Verify success toast appears
- [ ] Verify sheet closes
- [ ] Verify expense now shows "→ Estimate" badge
- [ ] Check database: Verify correlation created in `expense_line_item_correlations`

**Test 2: Fuzzy Matching Suggestions**
- [ ] Create a test expense with payee "ABC Company"
- [ ] Create a quote with same payee "ABC Company"
- [ ] Open allocation sheet for that expense
- [ ] Verify green "Suggested Match" box appears
- [ ] Verify confidence score displays
- [ ] Click "Allocate Here" in suggestion box
- [ ] Verify allocation succeeds

**Test 3: Search & Filtering**
- [ ] Open sheet for project with many line items
- [ ] Type in search box (e.g., "framing")
- [ ] Verify line items filter
- [ ] Clear search
- [ ] Switch to "Quotes" tab
- [ ] Verify quote line items display
- [ ] Switch to "Change Orders" tab
- [ ] Verify change order line items display

**Test 4: Edge Cases**
- [ ] Try allocating expense from project with no line items
- [ ] Verify empty state message displays
- [ ] Try opening allocation for already-allocated expense
- [ ] Verify menu item is hidden (not clickable)
- [ ] Try with operational project (000-UNASSIGNED)
- [ ] Verify "Match to Line Items" option doesn't appear
- [ ] Click Cancel button - verify sheet closes
- [ ] Click X button - verify sheet closes
- [ ] Press ESC key - verify sheet closes

**Test 5: Data Accuracy**
- [ ] Verify allocated amounts display correctly
- [ ] Allocate $500 to a line item
- [ ] Open another expense for same project
- [ ] Verify that line item now shows "$500 allocated"
- [ ] Verify total on line item is correct

---

### Database Validation

Open Supabase SQL Editor and run:

```sql
-- Verify correlations are being created correctly
SELECT 
  e.description as expense_desc,
  e.amount,
  c.correlation_type,
  c.notes,
  CASE 
    WHEN c.estimate_line_item_id IS NOT NULL THEN 'Estimate'
    WHEN c.quote_id IS NOT NULL THEN 'Quote'
    WHEN c.change_order_line_item_id IS NOT NULL THEN 'Change Order'
  END as line_item_type,
  c.created_at
FROM expense_line_item_correlations c
JOIN expenses e ON e.id = c.expense_id
WHERE c.created_at > NOW() - INTERVAL '1 hour'
ORDER BY c.created_at DESC;

-- Verify is_planned flag is being set
SELECT 
  id, 
  description, 
  amount, 
  is_planned,
  updated_at
FROM expenses
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

**Expected Results:**
- Correlations show correct type (Estimate/Quote/Change Order)
- Notes say "Manually assigned via inline allocation sheet"
- is_planned is TRUE for allocated expenses

---

### Regression Testing

**Verify Old Functionality Still Works:**

1. Navigate to `/expenses/matching`
2. Old page should still load and function
3. Try allocating an expense from old page
4. Verify it still works

**If old page has issues, STOP and debug before proceeding.**

---

## 🎨 PHASE 5: Polish & Enhancements (Optional)

### PROMPT 5.1: Add Better Loading States

**File to modify:** `src/components/ExpenseAllocationSheet.tsx`

**Cursor Prompt:**
```
Enhance loading states in src/components/ExpenseAllocationSheet.tsx.

Update the allocation button to show loading spinner when clicked:

Find all three "Allocate to This Item" buttons (in estimates, quotes, and change_orders tabs).

Replace the button content with:

```typescript
<Button
  size="sm"
  className="w-full"
  onClick={() => handleAllocate(item)}
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
      Allocating...
    </>
  ) : (
    <>
      <CheckCircle className="h-3 w-3 mr-1" />
      Allocate to This Item
    </>
  )}
</Button>
```

Apply this change to all three tab sections (estimates, quotes, change_orders).
```

**Test:**
```bash
npm run dev
# Click allocate button
# Should see spinner briefly before success
```

---

### PROMPT 5.2: Add Keyboard Shortcuts

**File to modify:** `src/components/ExpenseAllocationSheet.tsx`

**Cursor Prompt:**
```
Add keyboard shortcuts to src/components/ExpenseAllocationSheet.tsx.

Add this useEffect after the existing useEffect for data loading:

```typescript
// Keyboard shortcuts
useEffect(() => {
  if (!open) return;
  
  const handleKeyPress = (e: KeyboardEvent) => {
    // ESC to close
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
    
    // Enter on suggested match to allocate
    if (e.key === 'Enter' && suggestedLineItemId && !isLoading) {
      const suggested = lineItems.find(li => li.id === suggestedLineItemId);
      if (suggested) {
        handleAllocate(suggested);
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [open, suggestedLineItemId, lineItems, isLoading]);
```

Also add a hint in the suggested match section. Find the "Suggested Match" div and add this text at the bottom:

```typescript
<div className="text-xs text-muted-foreground mt-1">
  Press Enter to quickly allocate to suggested match
</div>
```
```

**Test:**
```bash
npm run dev
# Open sheet
# Press ESC - should close
# Open sheet with suggestion
# Press Enter - should allocate
```

---

### PROMPT 5.3: Improve Empty States

**File to modify:** `src/components/ExpenseAllocationSheet.tsx`

**Cursor Prompt:**
```
Improve empty states in src/components/ExpenseAllocationSheet.tsx.

Replace the empty state messages in all three tabs with more helpful versions.

For estimates tab, change from:
```typescript
<div className="text-center py-8 text-muted-foreground text-sm">
  No estimate line items found
</div>
```

To:
```typescript
<div className="text-center py-12">
  <div className="text-muted-foreground text-sm mb-3">
    No estimate line items found for this project
  </div>
  <div className="text-xs text-muted-foreground mb-4">
    Create an estimate first to allocate expenses to specific line items
  </div>
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => {
      window.location.href = `/projects/${expense.project_id}`;
    }}
  >
    View Project
  </Button>
</div>
```

Apply similar improvements to the quotes and change_orders empty states:
- Quotes: "Create a quote first..."
- Change Orders: "Create a change order first..."
```

**Test:**
```bash
npm run dev
# Open sheet for project with no estimates
# Should see helpful message with View Project button
```

---

## 📊 PHASE 6: Final Testing & Commit

### Comprehensive Test Pass

Run through ALL test scenarios one more time:

**Scenarios to Test:**
1. [ ] Basic allocation (estimate, quote, change order)
2. [ ] Fuzzy matching suggestions
3. [ ] Search functionality
4. [ ] Tab switching
5. [ ] Empty states
6. [ ] Loading states
7. [ ] Keyboard shortcuts (ESC, Enter)
8. [ ] Error handling (disconnect network and try)
9. [ ] Multiple line items from same project
10. [ ] Already-allocated expenses
11. [ ] Operational project expenses
12. [ ] Mobile/responsive view (resize browser)

**Performance Check:**
- [ ] Sheet opens in < 2 seconds
- [ ] No lag when typing in search
- [ ] Smooth animations
- [ ] No console errors

---

### Final Commit

```bash
# Check status
git status

# Add all changes
git add -A

# Commit with descriptive message
git commit -m "feat: complete inline expense allocation sheet

- Created ExpenseAllocationSheet component
- Integrated with ExpensesList
- Added fuzzy matching suggestions
- Implemented search and filtering
- Added keyboard shortcuts (ESC, Enter)
- Improved loading and empty states
- Maintained backward compatibility with old page

Resolves UX issue where users lost context when navigating to 
full-page allocation interface. New inline sheet reduces allocation 
time from 20-30 seconds to under 10 seconds per expense."

# Push to remote
git push origin feature/expense-allocation-sheet
```

---

## 🚀 PHASE 7: Create Pull Request

### PR Checklist

**Before creating PR:**
- [ ] All tests passing
- [ ] No console errors
- [ ] Database queries verified
- [ ] Mobile responsive tested
- [ ] Old page still works
- [ ] Code committed and pushed

### PR Description Template

```markdown
## Description
Replaces full-page expense allocation interface with inline Sheet component to reduce context switching and improve workflow efficiency.

## Changes
- ✅ Created `ExpenseAllocationSheet.tsx` component
- ✅ Extracted allocation logic to `src/utils/expenseAllocation.ts`
- ✅ Updated `ExpensesList.tsx` to open sheet instead of navigating
- ✅ Added fuzzy matching suggestions
- ✅ Implemented search and tab filtering
- ✅ Added keyboard shortcuts (ESC to close, Enter to allocate)
- ✅ Maintained backward compatibility with `/expenses/matching` page

## Testing
- [x] Manual testing complete
- [x] Database queries verified
- [x] Edge cases tested
- [x] Mobile responsive verified
- [x] Regression testing passed

## Screenshots
[Add screenshots of the new sheet interface]

## Performance
- Sheet opens in < 2 seconds
- Reduces allocation time from 20-30s to < 10s per expense
- No performance degradation observed

## Breaking Changes
None - old page remains functional as fallback

## Rollback Plan
Set `USE_INLINE_ALLOCATION = false` in feature flags (to be implemented)
```

---

## 📈 Success Metrics

Track these after deployment:

| Metric | Baseline | Target | How to Measure |
|--------|----------|--------|----------------|
| Allocation time per expense | 20-30 sec | < 10 sec | Time user studies |
| Context switches | 4 clicks | 2 clicks | Analytics events |
| User adoption | N/A | > 80% | Compare old vs new usage |
| Error rate | Unknown | < 5% | Monitor failed allocations |
| Mobile usage | Unknown | Increase | Device type analytics |

---

## 🆘 Troubleshooting

### Issue: Sheet won't open
**Check:**
- Console for errors
- Verify `expenseId` is not null
- Check if expense is already allocated

**Debug:**
```typescript
// Add to handleAllocationSuccess
console.log('Opening sheet for expense:', expenseToAllocate);
```

### Issue: Line items not loading
**Check:**
- Network tab for failed API calls
- Supabase RLS policies
- Project ID is valid

**Debug:**
```typescript
// Add to loadExpenseData
console.log('Loading for project:', projectId);
console.log('Found line items:', allLineItems.length);
```

### Issue: Allocation fails
**Check:**
- Database constraints
- Correlation table structure
- Error message in toast

**Debug:**
```sql
-- Check correlation table
SELECT * FROM expense_line_item_correlations 
ORDER BY created_at DESC LIMIT 10;
```

### Issue: Old page broken
**Rollback:**
```bash
git checkout src/components/GlobalExpenseMatching.tsx
git checkout src/utils/expenseAllocation.ts
npm run build
```

---

## 📝 Notes for Cursor

**When using Cursor:**
1. Copy entire prompt including code blocks
2. Let Cursor analyze before making changes
3. Review diff before accepting
4. Test after each major change
5. Commit frequently

**Cursor Tips:**
- Use Cmd+K (Mac) or Ctrl+K (Windows) for inline edits
- Use Cmd+L for chat-based instructions
- Accept changes with Cmd+Enter
- Reject with Escape

---

## ✅ Final Checklist

**Phase 1: Extract Logic**
- [ ] Created `src/utils/expenseAllocation.ts`
- [ ] Updated `GlobalExpenseMatching.tsx` to use utils
- [ ] Tested old page still works
- [ ] Committed changes

**Phase 2: Create Sheet**
- [ ] Created `ExpenseAllocationSheet.tsx`
- [ ] Implemented state management
- [ ] Implemented data loading
- [ ] Implemented allocation function
- [ ] Implemented UI rendering
- [ ] Committed changes

**Phase 3: Integration**
- [ ] Added state to `ExpensesList.tsx`
- [ ] Updated actions menu
- [ ] Added sheet to render
- [ ] Tested integration
- [ ] Committed changes

**Phase 4: Testing**
- [ ] Manual testing complete
- [ ] Database validation passed
- [ ] Regression testing passed

**Phase 5: Polish**
- [ ] Added loading states
- [ ] Added keyboard shortcuts
- [ ] Improved empty states

**Phase 6: Final Testing**
- [ ] All scenarios tested
- [ ] Performance verified
- [ ] Final commit made

**Phase 7: PR**
- [ ] Pull request created
- [ ] Screenshots added
- [ ] Review requested

---

## 📞 Support

If you encounter issues:

1. **Check git status:** `git status`
2. **Check current branch:** `git branch`
3. **View recent commits:** `git log --oneline -5`
4. **Rollback if needed:** `git reset --hard HEAD~1`

**Emergency Rollback:**
```bash
# Completely reset to main
git checkout main
git branch -D feature/expense-allocation-sheet
git checkout -b feature/expense-allocation-sheet
# Start over from Phase 1
```

---

**END OF GUIDE**

**Estimated Total Time:** 3-4 days  
**Complexity:** Medium-High  
**Risk:** Low (with phased approach)  
**Impact:** High (significant UX improvement)

Good luck! 🚀

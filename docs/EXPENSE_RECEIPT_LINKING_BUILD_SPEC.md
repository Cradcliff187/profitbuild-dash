# Expense-Receipt Linking Feature Build Specification

**Feature:** Link Receipt Images to Expenses from All Expenses Table  
**Priority:** High  
**Estimated Phases:** 4  
**Complexity:** Medium  

---

## Executive Summary

This specification enables users to link existing receipt images (from the `receipts` table) to expenses displayed in the All Expenses table. The database infrastructure already exists (`expenses.receipt_id` FK to `receipts.id`), so this is purely a frontend implementation.

### Key Requirements
- Receipts should NOT be filtered by project (many are submitted unassigned)
- Suggestions based on amount/date/payee are acceptable but not forceful
- One receipt CAN be linked to multiple expenses (many-to-one relationship)
- Receipts remain documentation only - NO financial calculations

---

## Phase 1: TypeScript Types & Utilities

### Step 1.1: Update Expense Type (if needed)

**File:** `src/types/expense.ts`

Verify the `Expense` interface includes `receipt_id`. If not, add:

```typescript
export interface Expense {
  // ... existing fields ...
  receipt_id?: string | null;
  // For display - populated from joins
  receipt_image_url?: string;
}
```

### Step 1.2: Create Receipt Linking Utilities

**File:** `src/utils/receiptLinking.ts` (NEW FILE)

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface ReceiptForLinking {
  id: string;
  image_url: string;
  amount: number;
  captured_at: string;
  description: string | null;
  payee_id: string | null;
  payee_name: string | null;
  project_id: string | null;
  project_number: string | null;
  project_name: string | null;
  approval_status: string | null;
  // Computed fields
  match_score?: number;
  match_reasons?: string[];
}

export interface LinkReceiptParams {
  expenseId: string;
  receiptId: string;
}

export interface UnlinkReceiptParams {
  expenseId: string;
}

/**
 * Fetch all receipts available for linking
 * Does NOT filter by project since receipts are often submitted unassigned
 */
export async function fetchReceiptsForLinking(): Promise<ReceiptForLinking[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      id,
      image_url,
      amount,
      captured_at,
      description,
      payee_id,
      project_id,
      approval_status,
      payees (
        payee_name
      ),
      projects (
        project_number,
        project_name
      )
    `)
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('Error fetching receipts for linking:', error);
    throw error;
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    image_url: r.image_url,
    amount: r.amount,
    captured_at: r.captured_at,
    description: r.description,
    payee_id: r.payee_id,
    payee_name: r.payees?.payee_name || null,
    project_id: r.project_id,
    project_number: r.projects?.project_number || null,
    project_name: r.projects?.project_name || null,
    approval_status: r.approval_status,
  }));
}

/**
 * Calculate a soft match score for receipt suggestions
 * Returns 0-100 score and reasons for the match
 * This is SUGGESTIVE ONLY - user makes final decision
 */
export function calculateMatchScore(
  receipt: ReceiptForLinking,
  expense: {
    amount: number;
    expense_date: string;
    payee_id?: string | null;
    project_id?: string | null;
  }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Amount match (within 5% or $5, whichever is greater)
  const amountTolerance = Math.max(expense.amount * 0.05, 5);
  const amountDiff = Math.abs(receipt.amount - expense.amount);
  if (amountDiff === 0) {
    score += 40;
    reasons.push('Exact amount match');
  } else if (amountDiff <= amountTolerance) {
    score += 25;
    reasons.push('Similar amount');
  }

  // Date match (within 7 days)
  const receiptDate = new Date(receipt.captured_at);
  const expenseDate = new Date(expense.expense_date);
  const daysDiff = Math.abs((receiptDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 1) {
    score += 30;
    reasons.push('Same day');
  } else if (daysDiff <= 3) {
    score += 20;
    reasons.push('Within 3 days');
  } else if (daysDiff <= 7) {
    score += 10;
    reasons.push('Within a week');
  }

  // Payee match
  if (expense.payee_id && receipt.payee_id === expense.payee_id) {
    score += 20;
    reasons.push('Same payee');
  }

  // Project match (bonus, not required)
  if (expense.project_id && receipt.project_id === expense.project_id) {
    score += 10;
    reasons.push('Same project');
  }

  return { score, reasons };
}

/**
 * Link a receipt to an expense
 */
export async function linkReceiptToExpense({ expenseId, receiptId }: LinkReceiptParams): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ receipt_id: receiptId })
    .eq('id', expenseId);

  if (error) {
    console.error('Error linking receipt to expense:', error);
    throw error;
  }
}

/**
 * Unlink a receipt from an expense
 */
export async function unlinkReceiptFromExpense({ expenseId }: UnlinkReceiptParams): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ receipt_id: null })
    .eq('id', expenseId);

  if (error) {
    console.error('Error unlinking receipt from expense:', error);
    throw error;
  }
}

/**
 * Fetch the linked receipt for an expense
 */
export async function fetchLinkedReceipt(receiptId: string): Promise<ReceiptForLinking | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      id,
      image_url,
      amount,
      captured_at,
      description,
      payee_id,
      project_id,
      approval_status,
      payees (
        payee_name
      ),
      projects (
        project_number,
        project_name
      )
    `)
    .eq('id', receiptId)
    .single();

  if (error) {
    console.error('Error fetching linked receipt:', error);
    return null;
  }

  return {
    id: data.id,
    image_url: data.image_url,
    amount: data.amount,
    captured_at: data.captured_at,
    description: data.description,
    payee_id: data.payee_id,
    payee_name: (data.payees as any)?.payee_name || null,
    project_id: data.project_id,
    project_number: (data.projects as any)?.project_number || null,
    project_name: (data.projects as any)?.project_name || null,
    approval_status: data.approval_status,
  };
}
```

---

## Phase 2: Receipt Link Modal Component

### Step 2.1: Create ReceiptLinkModal

**File:** `src/components/expenses/ReceiptLinkModal.tsx` (NEW FILE)

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Search,
  Receipt,
  Calendar,
  DollarSign,
  Building2,
  User,
  CheckCircle2,
  Sparkles,
  X,
  ImageIcon,
  Link2,
} from 'lucide-react';
import {
  ReceiptForLinking,
  fetchReceiptsForLinking,
  calculateMatchScore,
  linkReceiptToExpense,
} from '@/utils/receiptLinking';
import { Expense } from '@/types/expense';

interface ReceiptLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSuccess: () => void;
}

export const ReceiptLinkModal: React.FC<ReceiptLinkModalProps> = ({
  open,
  onOpenChange,
  expense,
  onSuccess,
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [receipts, setReceipts] = useState<ReceiptForLinking[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch receipts when modal opens
  useEffect(() => {
    if (open && expense) {
      loadReceipts();
    }
  }, [open, expense]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedReceiptId(null);
      setPreviewUrl(null);
    }
  }, [open]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const data = await fetchReceiptsForLinking();
      setReceipts(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load receipts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate match scores and sort by relevance
  const scoredReceipts = useMemo(() => {
    if (!expense) return [];

    return receipts
      .map((receipt) => {
        const { score, reasons } = calculateMatchScore(receipt, {
          amount: expense.amount,
          expense_date: expense.expense_date,
          payee_id: expense.payee_id,
          project_id: expense.project_id,
        });
        return {
          ...receipt,
          match_score: score,
          match_reasons: reasons,
        };
      })
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [receipts, expense]);

  // Filter by search query
  const filteredReceipts = useMemo(() => {
    if (!searchQuery.trim()) return scoredReceipts;

    const query = searchQuery.toLowerCase();
    return scoredReceipts.filter(
      (r) =>
        r.payee_name?.toLowerCase().includes(query) ||
        r.project_number?.toLowerCase().includes(query) ||
        r.project_name?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.amount.toString().includes(query)
    );
  }, [scoredReceipts, searchQuery]);

  // Separate suggested and other receipts
  const suggestedReceipts = filteredReceipts.filter((r) => (r.match_score || 0) >= 40);
  const otherReceipts = filteredReceipts.filter((r) => (r.match_score || 0) < 40);

  const handleLink = async () => {
    if (!expense || !selectedReceiptId) return;

    setLinking(true);
    try {
      await linkReceiptToExpense({
        expenseId: expense.id,
        receiptId: selectedReceiptId,
      });
      toast({
        title: 'Receipt Linked',
        description: 'The receipt has been linked to this expense.',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to link receipt',
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  const ReceiptCard = ({ receipt }: { receipt: ReceiptForLinking }) => {
    const isSelected = selectedReceiptId === receipt.id;
    const hasHighScore = (receipt.match_score || 0) >= 40;

    return (
      <div
        className={cn(
          'relative p-3 border rounded-lg cursor-pointer transition-all',
          'hover:border-primary/50 hover:bg-accent/50',
          isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
          hasHighScore && !isSelected && 'border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/20'
        )}
        onClick={() => setSelectedReceiptId(receipt.id)}
      >
        {/* Match badge */}
        {hasHighScore && (
          <Badge
            variant="outline"
            className="absolute -top-2 -right-2 bg-amber-100 text-amber-800 border-amber-300 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {receipt.match_score}% match
          </Badge>
        )}

        <div className="flex gap-3">
          {/* Thumbnail */}
          <div
            className="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewUrl(receipt.image_url);
            }}
          >
            {receipt.image_url ? (
              <img
                src={receipt.image_url}
                alt="Receipt"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-base">
                {formatCurrency(receipt.amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(receipt.captured_at), 'MMM d, yyyy')}
              </span>
            </div>

            {receipt.payee_name && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{receipt.payee_name}</span>
              </div>
            )}

            {receipt.project_number && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {receipt.project_number}
                  {receipt.project_name && ` - ${receipt.project_name}`}
                </span>
              </div>
            )}

            {/* Match reasons */}
            {receipt.match_reasons && receipt.match_reasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {receipt.match_reasons.map((reason, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs py-0">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Expense context */}
      {expense && (
        <div className="p-3 bg-muted/50 rounded-lg mb-4 space-y-1">
          <p className="text-sm font-medium">Linking receipt to expense:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {formatCurrency(expense.amount)}
            </span>
            <span>{format(new Date(expense.expense_date), 'MMM d, yyyy')}</span>
            {expense.payee_name && <span>{expense.payee_name}</span>}
            {expense.project_number && <span>{expense.project_number}</span>}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search receipts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Receipt list */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No receipts found</p>
            {searchQuery && (
              <p className="text-sm">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Suggested section */}
            {suggestedReceipts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Suggested Matches
                </h4>
                <div className="space-y-2">
                  {suggestedReceipts.map((receipt) => (
                    <ReceiptCard key={receipt.id} receipt={receipt} />
                  ))}
                </div>
              </div>
            )}

            {/* Other receipts */}
            {otherReceipts.length > 0 && (
              <div>
                {suggestedReceipts.length > 0 && (
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    All Receipts
                  </h4>
                )}
                <div className="space-y-2">
                  {otherReceipts.map((receipt) => (
                    <ReceiptCard key={receipt.id} receipt={receipt} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!selectedReceiptId || linking}
          onClick={handleLink}
        >
          {linking ? (
            'Linking...'
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Link Receipt
            </>
          )}
        </Button>
      </div>

      {/* Image preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Link Receipt</SheetTitle>
            <SheetDescription>
              Select a receipt to link to this expense
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Receipt</DialogTitle>
          <DialogDescription>
            Select a receipt to link to this expense
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">{content}</div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptLinkModal;
```

---

## Phase 3: Update ExpensesList Component

### Step 3.1: Add Receipt Column and Actions

**File:** `src/components/ExpensesList.tsx`

**Changes Required:**

1. **Add imports at top of file:**

```typescript
import { ReceiptLinkModal } from './expenses/ReceiptLinkModal';
import { ReceiptPreviewModal } from './ReceiptPreviewModal';
import { unlinkReceiptFromExpense, fetchLinkedReceipt } from '@/utils/receiptLinking';
import { Receipt, Link2, Unlink, Eye } from 'lucide-react';
```

2. **Add new column definition** (add to `columnDefinitions` array or equivalent):

```typescript
{
  key: 'receipt',
  label: 'Receipt',
  defaultVisible: true,
  width: '80px',
  align: 'center',
  sortable: false,
}
```

3. **Add state variables** (inside component function):

```typescript
// Receipt linking state
const [receiptLinkModalOpen, setReceiptLinkModalOpen] = useState(false);
const [expenseToLink, setExpenseToLink] = useState<Expense | null>(null);
const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
const [previewReceiptDetails, setPreviewReceiptDetails] = useState<any>(null);
```

4. **Add handler functions:**

```typescript
// Handle opening receipt link modal
const handleLinkReceipt = (expense: Expense) => {
  setExpenseToLink(expense);
  setReceiptLinkModalOpen(true);
};

// Handle viewing linked receipt
const handleViewReceipt = async (expense: Expense) => {
  if (!expense.receipt_id) return;
  
  try {
    const receipt = await fetchLinkedReceipt(expense.receipt_id);
    if (receipt) {
      setPreviewReceiptUrl(receipt.image_url);
      setPreviewReceiptDetails({
        project: expense.project_number || 'Unassigned',
        date: expense.expense_date,
        payee: expense.payee_name,
        amount: formatCurrency(expense.amount),
      });
      setReceiptPreviewOpen(true);
    }
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to load receipt',
      variant: 'destructive',
    });
  }
};

// Handle unlinking receipt
const handleUnlinkReceipt = async (expense: Expense) => {
  if (!expense.receipt_id) return;
  
  try {
    await unlinkReceiptFromExpense({ expenseId: expense.id });
    toast({
      title: 'Receipt Unlinked',
      description: 'The receipt has been unlinked from this expense.',
    });
    onRefresh?.();
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to unlink receipt',
      variant: 'destructive',
    });
  }
};

// Handle successful receipt link
const handleReceiptLinkSuccess = () => {
  setReceiptLinkModalOpen(false);
  setExpenseToLink(null);
  onRefresh?.();
};
```

5. **Add receipt cell rendering** (in table body, add case for 'receipt' column):

```typescript
{column.key === 'receipt' && (
  <div className="flex justify-center">
    {expense.receipt_id ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={() => handleViewReceipt(expense)}
        title="View linked receipt"
      >
        <Receipt className="h-4 w-4" />
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
        onClick={() => handleLinkReceipt(expense)}
        title="Link a receipt"
      >
        <Link2 className="h-4 w-4" />
      </Button>
    )}
  </div>
)}
```

6. **Add dropdown menu items** (in the row actions dropdown menu):

```typescript
{/* Receipt actions - add before or after existing menu items */}
<DropdownMenuSeparator />
{expense.receipt_id ? (
  <>
    <DropdownMenuItem onClick={() => handleViewReceipt(expense)}>
      <Eye className="mr-2 h-4 w-4" />
      View Receipt
    </DropdownMenuItem>
    <DropdownMenuItem 
      onClick={() => handleUnlinkReceipt(expense)}
      className="text-destructive"
    >
      <Unlink className="mr-2 h-4 w-4" />
      Unlink Receipt
    </DropdownMenuItem>
  </>
) : (
  <DropdownMenuItem onClick={() => handleLinkReceipt(expense)}>
    <Link2 className="mr-2 h-4 w-4" />
    Link Receipt
  </DropdownMenuItem>
)}
```

7. **Add modals at end of component** (before closing tag):

```typescript
{/* Receipt Link Modal */}
<ReceiptLinkModal
  open={receiptLinkModalOpen}
  onOpenChange={setReceiptLinkModalOpen}
  expense={expenseToLink}
  onSuccess={handleReceiptLinkSuccess}
/>

{/* Receipt Preview Modal */}
<ReceiptPreviewModal
  open={receiptPreviewOpen}
  onOpenChange={setReceiptPreviewOpen}
  receiptUrl={previewReceiptUrl}
  timeEntryDetails={previewReceiptDetails}
/>
```

---

## Phase 4: Update Expense Data Fetching

### Step 4.1: Include receipt_id in Expense Queries

**File:** `src/pages/Expenses.tsx` (or wherever expenses are fetched)

Update the expense fetch query to include `receipt_id`:

```typescript
const { data, error } = await supabase
  .from('expenses')
  .select(`
    *,
    payees (
      payee_name,
      payee_type
    ),
    projects (
      project_number,
      project_name,
      category
    )
  `)
  .order('expense_date', { ascending: false });
```

**Note:** The `receipt_id` field should already be included when selecting `*`. Verify this works correctly.

### Step 4.2: Update useExpenses Hook (if exists)

If there's a `useExpenses` hook or similar, ensure `receipt_id` is included in the return type and query.

---

## Validation Checklist

After implementation, verify:

### Functional Tests
- [ ] Can open Link Receipt modal from expense row action menu
- [ ] Can open Link Receipt modal from receipt column icon
- [ ] Modal shows all receipts (not filtered by project)
- [ ] Suggested matches appear at top with match score badges
- [ ] Can search/filter receipts by payee, project, amount
- [ ] Can click receipt thumbnail to preview full image
- [ ] Can select a receipt and click "Link Receipt"
- [ ] After linking, receipt column shows green receipt icon
- [ ] Can click green icon to view linked receipt
- [ ] Can unlink receipt from dropdown menu
- [ ] One receipt can be linked to multiple expenses
- [ ] Toast notifications appear for success/error states

### UI/UX Tests
- [ ] Modal is responsive (Sheet on mobile, Dialog on desktop)
- [ ] Loading states display correctly
- [ ] Empty states display correctly
- [ ] Match score badges are subtle, not overwhelming
- [ ] Touch targets are 48px minimum on mobile

### Data Integrity Tests
- [ ] Linking updates `expenses.receipt_id` in database
- [ ] Unlinking sets `expenses.receipt_id` to null
- [ ] No impact on financial calculations (receipts remain documentation only)

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/types/expense.ts` | Verify | Ensure `receipt_id` field exists |
| `src/utils/receiptLinking.ts` | Create | Receipt linking utilities |
| `src/components/expenses/ReceiptLinkModal.tsx` | Create | Modal for selecting receipts |
| `src/components/ExpensesList.tsx` | Update | Add column, actions, modals |
| `src/pages/Expenses.tsx` | Verify | Ensure receipt_id in queries |

---

## Notes for Cursor Agent

1. **Follow existing patterns** - Look at how other modals (like `ExpenseAllocationSheet`) are implemented
2. **Use existing components** - The `ReceiptPreviewModal` already exists and should be reused
3. **Mobile-first** - Use Sheet component on mobile, Dialog on desktop (pattern exists in codebase)
4. **Toast notifications** - Use existing `useToast` hook pattern
5. **Error handling** - Wrap async operations in try/catch with appropriate error toasts
6. **Type safety** - Ensure all TypeScript types are properly defined and used

---

## Optional Enhancements (Future)

These are NOT part of the initial implementation but could be added later:

1. **Bulk linking** - Select multiple expenses and link same receipt to all
2. **Receipt upload from expense** - Upload new receipt directly while linking
3. **Auto-suggest on expense creation** - Show matching receipts when creating expense
4. **Receipt usage indicator** - Show which receipts are already linked to expenses
5. **Filter by unlinked only** - Toggle to show only receipts not yet linked

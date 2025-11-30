# Feature Spec: Invoice/Revenue Reconciliation

## Summary

Add invoice/revenue reconciliation to CSV upload, mirroring the existing expense reconciliation. When users upload QuickBooks CSV files, show them how much invoice revenue already exists in the database versus what's in the uploaded file.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/enhancedTransactionImporter.ts` | Add calculation function, update interface, update return |
| `src/components/ExpenseImportModal.tsx` | Add state types, add UI components |

---

## Implementation Details

### Part 1: enhancedTransactionImporter.ts

#### 1A. Update TransactionImportResult Interface

Find the `TransactionImportResult` interface and add this property:

```typescript
revenueReconciliation?: {
  totalExistingRevenues: number;
  totalDuplicateAmount: number;
  difference: number;
  isAligned: boolean;
  threshold: number;
};
```

#### 1B. Add calculateRevenueReconciliation Function

Add this function after the existing `calculateReconciliation` function:

```typescript
/**
 * Calculates reconciliation between matching revenues in database and duplicate invoice totals
 */
const calculateRevenueReconciliation = async (
  startDate: string,
  endDate: string,
  allRevenueDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingRevenueId?: string;
    matchKey?: string;
    reason?: string;
  }>
): Promise<{
  totalExistingRevenues: number;
  totalDuplicateAmount: number;
  difference: number;
  isAligned: boolean;
  threshold: number;
}> => {
  const revenueIds = allRevenueDuplicates
    .filter(dup => dup.existingRevenueId)
    .map(dup => dup.existingRevenueId!)
    .filter((id, index, self) => self.indexOf(id) === index);

  let totalExistingRevenues = 0;
  
  if (revenueIds.length > 0) {
    const { data: revenuesData, error } = await supabase
      .from('project_revenues')
      .select('id, amount')
      .in('id', revenueIds);

    if (!error && revenuesData) {
      totalExistingRevenues = revenuesData.reduce((sum, rev) => sum + Math.abs(rev.amount || 0), 0);
    }
  }

  let totalDuplicateAmount = 0;
  for (const dup of allRevenueDuplicates) {
    const amount = parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0');
    totalDuplicateAmount += Math.abs(amount);
  }

  const difference = Math.abs(totalExistingRevenues - totalDuplicateAmount);
  const threshold = 0.01;
  const isAligned = difference <= threshold;

  return {
    totalExistingRevenues,
    totalDuplicateAmount,
    difference,
    isAligned,
    threshold
  };
};
```

#### 1C. Call the Function in processTransactionImport

Find where expense reconciliation is calculated (search for `calculateReconciliation` call). After that block, add:

```typescript
// === Calculate REVENUE reconciliation ===
let revenueReconciliation;
if (dates.length > 0 && (revenueDatabaseDuplicates.length > 0 || revenueInFileDuplicates.length > 0)) {
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  minDate.setDate(minDate.getDate() - 1);
  maxDate.setDate(maxDate.getDate() + 1);
  
  const allRevenueDuplicates = [
    ...revenueInFileDuplicates.map(d => ({ transaction: d.transaction, reason: d.reason })),
    ...revenueDatabaseDuplicates.map(d => ({ 
      transaction: d.transaction, 
      existingRevenueId: d.existingRevenueId, 
      matchKey: d.matchKey 
    }))
  ];
  
  revenueReconciliation = await calculateRevenueReconciliation(
    minDate.toISOString().split('T')[0],
    maxDate.toISOString().split('T')[0],
    allRevenueDuplicates
  );
}
```

#### 1D. Update Return Statement

Add `revenueReconciliation` to the return object at the end of `processTransactionImport`.

---

### Part 2: ExpenseImportModal.tsx

#### 2A. Update validationResults State Type

Add these properties to the validationResults useState type:

```typescript
revenueReconciliation?: {
  totalExistingRevenues: number;
  totalDuplicateAmount: number;
  difference: number;
  isAligned: boolean;
  threshold: number;
};
revenueDatabaseDuplicatesSkipped?: number;
revenueDatabaseDuplicates?: Array<{
  transaction: TransactionCSVRow;
  existingRevenueId: string;
  matchKey: string;
}>;
revenueInFileDuplicatesSkipped?: number;
revenueInFileDuplicates?: Array<{
  transaction: TransactionCSVRow;
  reason: string;
}>;
```

#### 2B. Update importResults State Type

Add to importResults useState type:

```typescript
revenueReconciliation?: {
  totalExistingRevenues: number;
  totalDuplicateAmount: number;
  difference: number;
  isAligned: boolean;
  threshold: number;
};
```

#### 2C. Add Revenue Duplicate Warning Card

Find the expense database duplicates warning (search for `databaseDuplicatesSkipped`). After that card, add:

```tsx
{/* Revenue Database Duplicates Warning */}
{validationResults.revenueDatabaseDuplicatesSkipped && validationResults.revenueDatabaseDuplicatesSkipped > 0 && (
  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
    <div className="flex items-start gap-2">
      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium text-amber-800 text-sm">
          {validationResults.revenueDatabaseDuplicatesSkipped} invoice(s) already exist in the system
        </h4>
        <p className="text-sm text-amber-700 mt-1">
          These invoices will be skipped during import.
        </p>
        <p className="text-xs text-amber-600 mt-1 italic">
          These were likely imported in a previous upload.
        </p>
      </div>
    </div>
    
    {validationResults.revenueDatabaseDuplicates && validationResults.revenueDatabaseDuplicates.length > 0 && (
      <details className="mt-2">
        <summary className="text-xs cursor-pointer text-amber-700 hover:underline">
          View duplicate invoices
        </summary>
        <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-white rounded border border-amber-200 p-2">
          {validationResults.revenueDatabaseDuplicates.slice(0, 10).map((dup, idx) => (
            <div key={idx} className="py-1 border-b border-amber-100 last:border-0">
              {dup.transaction['Date']} - {dup.transaction['Name']} - {formatCurrency(parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0'))}
            </div>
          ))}
          {validationResults.revenueDatabaseDuplicates.length > 10 && (
            <div className="pt-1 text-amber-600">
              ...and {validationResults.revenueDatabaseDuplicates.length - 10} more
            </div>
          )}
        </div>
      </details>
    )}
  </div>
)}
```

#### 2D. Add Revenue Reconciliation Card

Find the expense reconciliation card (search for `Reconciliation Aligned`). After that card, add:

```tsx
{/* Revenue/Invoice Reconciliation Display */}
{validationResults.revenueReconciliation && (validationResults.revenueReconciliation.totalDuplicateAmount > 0 || validationResults.revenueReconciliation.totalExistingRevenues > 0) && (
  <div className={cn(
    "p-4 rounded-lg border",
    validationResults.revenueReconciliation.isAligned
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200"
  )}>
    <div className="flex items-start gap-2 mb-2">
      {validationResults.revenueReconciliation.isAligned ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <h4 className="font-medium text-sm">
          {validationResults.revenueReconciliation.isAligned ? 'Invoice Reconciliation Aligned' : 'Invoice Reconciliation Failed'}
        </h4>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Matching Invoices in System:</span>
            <span className="font-medium">{formatCurrency(validationResults.revenueReconciliation.totalExistingRevenues)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Duplicate Invoice Amount:</span>
            <span className="font-medium">{formatCurrency(validationResults.revenueReconciliation.totalDuplicateAmount)}</span>
          </div>
          <div className="flex justify-between border-t pt-1">
            <span className={cn(
              "font-medium",
              validationResults.revenueReconciliation.isAligned ? "text-green-700" : "text-red-700"
            )}>
              Difference:
            </span>
            <span className={cn(
              "font-bold",
              validationResults.revenueReconciliation.isAligned ? "text-green-700" : "text-red-700"
            )}>
              {formatCurrency(validationResults.revenueReconciliation.difference)}
            </span>
          </div>
        </div>
        {!validationResults.revenueReconciliation.isAligned && (
          <p className="text-xs text-red-600 mt-2 italic">
            Invoice reconciliation failed: Totals do not match. Please review duplicate invoices before importing.
          </p>
        )}
      </div>
    </div>
  </div>
)}
```

---

## Key Differences from Expense Reconciliation

| Aspect | Expenses | Invoices |
|--------|----------|----------|
| Table | `expenses` | `project_revenues` |
| Category filter | Excludes LABOR | None needed |
| ID field | `existingExpenseId` | `existingRevenueId` |
| Total label | "Matching Expenses in System" | "Matching Invoices in System" |

---

## Verification

After implementation:
- [ ] No TypeScript errors
- [ ] Upload CSV with invoices - no reconciliation shows if no duplicates
- [ ] Re-upload same CSV - reconciliation card appears with aligned totals
- [ ] Both expense and invoice reconciliation cards can appear simultaneously

# CSV Import Modal - Add Financial Before/After Snapshot

## Addition to YTD Workflow Redesign

Add a clean financial summary showing totals before and after import.

---

## File to Modify

`src/components/ExpenseImportModal.tsx`

---

## Step 1: Add Financial Snapshot Calculation

Add this useMemo after the `newRecordIssues` calculation:

```typescript
// Calculate financial before/after snapshot
const financialSnapshot = useMemo(() => {
  if (!validationResults || !categorizeTransactions.newRecords.length) {
    return null;
  }

  // Current system totals (from reconciliation data)
  const currentExpenseTotal = validationResults.reconciliation?.totalExistingNonLaborExpenses || 0;
  const currentRevenueTotal = validationResults.revenueReconciliation?.totalExistingRevenues || 0;

  // New amounts being added
  const newExpenseAmount = categorizeTransactions.newExpenses.reduce((sum, row) => {
    const amount = parseFloat(String(row.Amount).replace(/[,$()]/g, '')) || 0;
    return sum + Math.abs(amount);
  }, 0);

  const newRevenueAmount = categorizeTransactions.newRevenues.reduce((sum, row) => {
    const amount = parseFloat(String(row.Amount).replace(/[,$()]/g, '')) || 0;
    return sum + Math.abs(amount);
  }, 0);

  return {
    expenses: {
      before: currentExpenseTotal,
      adding: newExpenseAmount,
      after: currentExpenseTotal + newExpenseAmount,
    },
    revenues: {
      before: currentRevenueTotal,
      adding: newRevenueAmount,
      after: currentRevenueTotal + newRevenueAmount,
    },
  };
}, [validationResults, categorizeTransactions]);
```

---

## Step 2: Add Financial Snapshot Component

Add this component before the main export (or inline within the preview step):

```typescript
const FinancialSnapshot: React.FC<{
  expenses: { before: number; adding: number; after: number };
  revenues: { before: number; adding: number; after: number };
}> = ({ expenses, revenues }) => (
  <div className="grid grid-cols-2 gap-4">
    {/* Expenses Card */}
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <h4 className="font-medium text-gray-700">Expenses</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Current in system:</span>
          <span className="font-mono">{formatCurrency(expenses.before)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Adding:</span>
          <span className="font-mono">+{formatCurrency(expenses.adding)}</span>
        </div>
        <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
          <span>After import:</span>
          <span className="font-mono">{formatCurrency(expenses.after)}</span>
        </div>
      </div>
    </div>

    {/* Revenues Card */}
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        <h4 className="font-medium text-gray-700">Revenues</h4>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Current in system:</span>
          <span className="font-mono">{formatCurrency(revenues.before)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Adding:</span>
          <span className="font-mono">+{formatCurrency(revenues.adding)}</span>
        </div>
        <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
          <span>After import:</span>
          <span className="font-mono">{formatCurrency(revenues.after)}</span>
        </div>
      </div>
    </div>
  </div>
);
```

---

## Step 3: Add to Preview Step UI

Insert the Financial Snapshot after the "New Records Status" section and before the Tabs:

```typescript
{/* New Records Status section ... */}

{/* Financial Before/After Snapshot */}
{categorizeTransactions.newRecords.length > 0 && financialSnapshot && (
  <div className="space-y-2">
    <h4 className="text-sm font-medium text-gray-600">Financial Impact</h4>
    <FinancialSnapshot 
      expenses={financialSnapshot.expenses} 
      revenues={financialSnapshot.revenues} 
    />
  </div>
)}

{/* Tabs section ... */}
```

---

## Alternative: Compact Inline Version

If you prefer a more compact single-row version:

```typescript
{/* Compact Financial Impact */}
{categorizeTransactions.newRecords.length > 0 && financialSnapshot && (
  <div className="bg-gray-50 border rounded-lg p-4">
    <h4 className="text-sm font-medium text-gray-600 mb-3">Financial Impact</h4>
    <div className="grid grid-cols-2 gap-6 text-sm">
      {/* Expenses */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-gray-600">Expenses:</span>
        </div>
        <div className="text-right">
          <span className="text-gray-400 font-mono">{formatCurrency(financialSnapshot.expenses.before)}</span>
          <span className="mx-2 text-gray-400">→</span>
          <span className="font-medium font-mono">{formatCurrency(financialSnapshot.expenses.after)}</span>
          <span className="text-green-600 text-xs ml-2">(+{formatCurrency(financialSnapshot.expenses.adding)})</span>
        </div>
      </div>
      
      {/* Revenues */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-gray-600">Revenues:</span>
        </div>
        <div className="text-right">
          <span className="text-gray-400 font-mono">{formatCurrency(financialSnapshot.revenues.before)}</span>
          <span className="mx-2 text-gray-400">→</span>
          <span className="font-medium font-mono">{formatCurrency(financialSnapshot.revenues.after)}</span>
          <span className="text-green-600 text-xs ml-2">(+{formatCurrency(financialSnapshot.revenues.adding)})</span>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Visual Reference

**Two-Card Layout:**
```
┌─────────────────────────┐  ┌─────────────────────────┐
│ ● Expenses              │  │ ● Revenues              │
│                         │  │                         │
│ Current:    $69,588.71  │  │ Current:   $123,096.00  │
│ Adding:       +$450.00  │  │ Adding:      +$800.00   │
│ ─────────────────────── │  │ ─────────────────────── │
│ After:      $70,038.71  │  │ After:     $123,896.00  │
└─────────────────────────┘  └─────────────────────────┘
```

**Compact Single-Row:**
```
┌─────────────────────────────────────────────────────────────┐
│ Financial Impact                                            │
│                                                             │
│ ● Expenses:  $69,588.71 → $70,038.71  (+$450.00)           │
│ ● Revenues:  $123,096.00 → $123,896.00  (+$800.00)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification

- [ ] Shows current expense total from system
- [ ] Shows current revenue total from system  
- [ ] Calculates new amounts from NEW records only (not duplicates)
- [ ] Displays after-import totals correctly
- [ ] Only appears when there are new records to import
- [ ] Handles $0 amounts gracefully

---

## Build and Test

```bash
npm run build
npm run dev
```

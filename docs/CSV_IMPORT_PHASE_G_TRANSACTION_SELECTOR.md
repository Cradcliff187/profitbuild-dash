# CSV Import Phase G: Transaction-Level Selection in Review Step

## Add After: Phases A–F from `CSV_IMPORT_MEDIUM_MINOR_FIXES.md`

---

## Problem

Users cannot selectively import transactions from a CSV upload. Every non-duplicate row is imported automatically. This causes friction when:

- A QB export covers a full month but only some transactions are needed
- A transaction was previously imported, corrected in the system, and needs re-importing
- Certain transactions should be skipped temporarily (pending vendor clarification, etc.)
- A duplicate exists but the user intentionally wants to bring it in again after fixing data

Currently:
- New transactions → always imported (no opt-out)
- Duplicates → always skipped (no opt-in)
- No per-row control at all

---

## Solution

### G1: Selectable Transaction Table in Review Step

Replace the current summary-only Review step with an interactive table where every parsed transaction has a checkbox.

**Default states:**
- 🟢 New transactions → **checked** (selected for import)
- 🟡 Duplicates → **unchecked** (skipped by default, user can override)
- 🔴 Errors (unparseable date, missing amount) → **disabled** (cannot be selected)

**Bulk controls:**
- "Select All" / "Deselect All"
- "Select All New" / "Select All Duplicates"
- Selection count: "27 of 40 selected for import"

**Table columns:**

| ☑ | Date | Name/Payee | Amount | Category | Project | Status | Match Info |
|---|------|------------|--------|----------|---------|--------|------------|
| ☑ | 02/01/26 | Home Depot | $342.50 | Materials | 24-001 | 🟢 New | Payee: 92% match |
| ☑ | 02/03/26 | Lowe's | $187.20 | Materials | 24-001 | 🟢 New | Payee: 88% match |
| ☐ | 02/03/26 | Shell Gas | $65.00 | Gas | 001-GAS | 🟢 New | — |
| ☐ | 02/05/26 | Home Depot | $342.50 | Materials | 24-001 | 🟡 Duplicate | Matches expense #abc |
| ☐ | 02/10/26 | HD Supply | $1,200.00 | Materials | — | 🟠 Unassigned | No project match |

**Mobile layout (48px touch targets):**
On mobile, render as stacked cards instead of a table:

```
┌─────────────────────────────────────┐
│ ☑  Home Depot              $342.50 │
│    02/01/26 · Materials · 24-001   │
│    🟢 New · Payee: 92% match       │
├─────────────────────────────────────┤
│ ☐  Home Depot              $342.50 │
│    02/05/26 · Materials · 24-001   │
│    🟡 Duplicate · Matches #abc     │
└─────────────────────────────────────┘
```

**Filtering/sorting within the table:**
- Filter by status: New / Duplicate / Unassigned / All
- Sort by: Date, Amount, Name, Status
- Search within uploaded transactions

### G2: Selection State Management

Track selection state in the ExpenseImportModal component:

```typescript
// Selection state — keyed by row index in parsed data
const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

// Initialize after parsing: select all new, deselect all duplicates
useEffect(() => {
  if (categorizedTransactions) {
    const initialSelection = new Set<number>();
    categorizedTransactions.forEach((tx, index) => {
      if (tx.status === 'new') {
        initialSelection.add(index);
      }
      // duplicates and errors are NOT added → unchecked by default
    });
    setSelectedRows(initialSelection);
  }
}, [categorizedTransactions]);
```

**Bulk actions:**
```typescript
const selectAllNew = () => {
  const newSelection = new Set(selectedRows);
  categorizedTransactions.forEach((tx, i) => {
    if (tx.status === 'new') newSelection.add(i);
  });
  setSelectedRows(newSelection);
};

const selectAllDuplicates = () => {
  const newSelection = new Set(selectedRows);
  categorizedTransactions.forEach((tx, i) => {
    if (tx.status === 'duplicate') newSelection.add(i);
  });
  setSelectedRows(newSelection);
};

const deselectAll = () => setSelectedRows(new Set());

const selectAll = () => {
  const all = new Set<number>();
  categorizedTransactions.forEach((tx, i) => {
    if (tx.status !== 'error') all.add(i);
  });
  setSelectedRows(all);
};
```

### G3: Filter Rows Before Import

When the user clicks "Import Selected", only pass the checked rows to `processTransactionImport()`:

```typescript
// Current: passes ALL parsed data
const result = await processTransactionImport(parsedData, userId);

// New: filter to selected rows only
const selectedData = parsedData.filter((_, index) => selectedRows.has(index));
const result = await processTransactionImport(selectedData, userId);
```

This requires no changes to `processTransactionImport()` itself — it already processes whatever array it receives. The filtering happens upstream in the modal.

### G4: Duplicate Override Handling

When a user selects a duplicate for import, it should be imported as a **new record** (not update the existing one). Add a flag for audit:

```typescript
// In TransactionImportResult, add:
reimportedDuplicates: Array<{
  transaction: TransactionCSVRow;
  existingExpenseId: string;    // The record this duplicates
  newExpenseId: string;         // The newly created record
  matchKey: string;
}>;
```

When processing, if a row was flagged as duplicate but the user selected it anyway:

```typescript
// In processTransactionImport — modify dedup logic:
// Instead of hard-skipping duplicates, return them in results with status
// Let the caller (ExpenseImportModal) decide which to include

// Option A (simpler): Don't change processTransactionImport at all.
// Just remove duplicate rows from the input BEFORE calling it,
// only for rows the user did NOT select.
// Selected duplicates pass through as if they're new.
```

**Recommended approach — Option A** is simplest:
1. Modal categorizes all rows (new vs duplicate) during preview
2. User selects/deselects rows
3. Before calling `processTransactionImport()`, filter to selected rows only
4. Selected duplicates are NOT in the dedup set, so they import as new records
5. The import result notes them in `reimportedDuplicates` for the completion summary

**Important:** The dedup check inside `processTransactionImport()` queries the database for existing expenses. If the user selects a duplicate, it will still be caught by the DB dedup check. To handle this, pass an `overrideKeys` set:

```typescript
// Updated function signature
export async function processTransactionImport(
  data: TransactionCSVRow[],
  userId: string,
  options?: {
    overrideDedup?: Set<string>;  // Composite keys to skip dedup for
  }
): Promise<TransactionImportResult>
```

Inside the function, when checking for database duplicates:
```typescript
const primaryKey = createExpenseKey(date, amount, name, accountFullName);
if (options?.overrideDedup?.has(primaryKey)) {
  // User explicitly selected this duplicate — skip dedup check, import it
} else if (existingExpenses.has(primaryKey)) {
  // Normal dedup — skip
  databaseDuplicates.push({ ... });
  continue;
}
```

The modal builds the `overrideDedup` set from selected duplicate rows:
```typescript
const overrideKeys = new Set<string>();
categorizedTransactions.forEach((tx, index) => {
  if (tx.status === 'duplicate' && selectedRows.has(index)) {
    overrideKeys.add(tx.matchKey);  // Key calculated during preview categorization
  }
});

const result = await processTransactionImport(selectedData, userId, {
  overrideDedup: overrideKeys
});
```

### G5: Updated Import Button & Summary

The import button reflects the selection:

```
[Import 27 Transactions]     ← dynamic count
```

Disabled if 0 selected. Shows breakdown on hover or below:
```
27 selected: 25 new + 2 re-imports
```

Completion step shows:
```
✅ Import Complete

  25 new transactions imported
   2 duplicate transactions re-imported (overrides)
  13 transactions skipped (not selected)
   0 errors
```

### G6: "Remember Selection" for Repeat Imports (Optional Enhancement)

If the same file (by name + row count) is uploaded again, restore the previous selection state. Store in localStorage:

```typescript
const selectionCacheKey = `import-selection-${fileName}-${rowCount}`;
```

This is optional and low priority — only useful for iterative import workflows.

---

## Files to Change

| File | Changes |
|------|---------|
| `src/components/ExpenseImportModal.tsx` | Major — add selectable transaction table, selection state, bulk controls, filter-before-import, override dedup set |
| `src/utils/enhancedTransactionImporter.ts` | Minor — add `overrideDedup` option to `processTransactionImport()`, add `reimportedDuplicates` to result |
| `src/utils/importCore.ts` | None (uses existing `createExpenseKey()`) |

**No database migrations required.** This is purely a UI + import logic change.

---

## UI Components Needed

### New: `TransactionSelectionTable.tsx`

Reusable component for the selectable transaction list:

```typescript
interface TransactionSelectionTableProps {
  transactions: CategorizedTransaction[];
  selectedRows: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  // Optional filters
  statusFilter?: 'all' | 'new' | 'duplicate' | 'unassigned';
  searchQuery?: string;
}
```

Renders as:
- Desktop: `<Table>` with checkboxes in first column
- Mobile: Stacked `<Card>` list with checkbox + swipe actions

Uses existing shadcn-ui components: `<Table>`, `<Checkbox>`, `<Badge>`, `<Button>`, `<Input>` (for search).

### New: `TransactionSelectionControls.tsx`

Bulk action bar above the table:

```typescript
interface TransactionSelectionControlsProps {
  totalNew: number;
  totalDuplicates: number;
  totalErrors: number;
  selectedCount: number;
  onSelectAllNew: () => void;
  onSelectAllDuplicates: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
}
```

---

## Integration with Other Phases

- **Phases B/D** (project matching, unmapped accounts): The Review step already has warning cards for unmatched projects and unmapped accounts. The transaction selector table lives BELOW these resolution sections. Flow is:
  1. Resolve unmatched payees (Phase 4 from Critical Fixes)
  2. Resolve unmatched projects (Phase B)
  3. Resolve unmapped accounts (Phase D)
  4. **Select transactions to import (Phase G)**
  5. Click "Import Selected"

- **Phase E** (import history): Re-imported duplicates get the same `import_batch_id` as the rest of the batch. The batch detail view shows them flagged as re-imports.

- **Phase F** (match logging): Selected duplicates log as `decision: 'user_override'` in the match log.

---

## Testing Checklist

- [ ] New transactions default to checked
- [ ] Duplicates default to unchecked
- [ ] Error rows are disabled (greyed out, not checkable)
- [ ] "Select All" checks all non-error rows
- [ ] "Deselect All" unchecks everything
- [ ] "Select All New" only checks new transactions
- [ ] "Select All Duplicates" checks duplicate rows
- [ ] Import button shows dynamic count: "Import 27 Transactions"
- [ ] Import button disabled when 0 selected
- [ ] Only selected rows are actually imported
- [ ] Selected duplicate successfully imports as new record
- [ ] Selected duplicate does NOT modify the existing record
- [ ] Completion summary shows correct counts (new, re-imports, skipped)
- [ ] Mobile layout uses card view with 48px touch targets
- [ ] Checkbox tap area is at least 48x48px on mobile
- [ ] Table is scrollable on mobile without horizontal overflow
- [ ] Search within transactions filters the visible list
- [ ] Status filter (New/Duplicate/All) works correctly
- [ ] Large imports (500+ rows) render performantly (consider virtualization)

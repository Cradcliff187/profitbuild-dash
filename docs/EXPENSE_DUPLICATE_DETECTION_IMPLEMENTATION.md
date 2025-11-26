# Expense Import Duplicate Detection - Implementation Guide

## Overview

**Feature:** Add database-level duplicate detection to QuickBooks CSV expense imports  
**Problem:** Users download YTD exports from QuickBooks and upload them periodically. Currently, re-uploading creates duplicate expense records because the system only checks for duplicates within the uploaded file, not against existing database records.  
**Solution:** Query existing expenses before import and skip transactions that already exist in the database.

---

## Current State Analysis

### What Exists Today

**File:** `src/utils/csvParser.ts`

1. **In-File Duplicate Detection** - The `detectDuplicates()` function filters duplicates within a single CSV upload using a Map with key: `"date-amount-name"` (lowercase)

2. **No Database Check** - The `mapQuickBooksToExpenses()` function processes transactions and inserts them directly without querying existing records

3. **Available Fields for Matching:**
   - `expense_date` - Transaction date
   - `amount` - Transaction amount
   - `payee_id` - Matched payee UUID
   - `quickbooks_transaction_id` - Exists in schema but NOT populated during import
   - `description` - Transaction description
   - `invoice_number` - Invoice/check number if present

### Import Flow (Current)

```
CSV File → parseQuickBooksCSV() → detectDuplicates() → mapQuickBooksToExpenses() → INSERT to DB
                                       ↑
                                 Only checks within
                                 the uploaded file
```

### Import Flow (Target)

```
CSV File → parseQuickBooksCSV() → detectDuplicates() → checkDatabaseDuplicates() → mapQuickBooksToExpenses() → INSERT to DB
                                       ↑                        ↑
                                 Checks within           Checks against
                                 uploaded file           existing DB records
```

---

## Implementation Requirements

### Duplicate Detection Strategy

Use a composite key for matching: `expense_date + amount + payee_id`

**Why this combination:**
- `expense_date` - Narrows scope significantly
- `amount` - High discriminator for transactions
- `payee_id` - Distinguishes between vendors on same day

**Edge Cases to Handle:**
1. Same payee, same amount, same day (legitimate duplicates) - Flag for user review
2. Payee not matched yet (payee_id is null) - Use description fallback
3. Different payees, same amount, same day - Allow both (not duplicates)

### Matching Tolerance

- **Date:** Exact match (no tolerance)
- **Amount:** Exact match to 2 decimal places
- **Payee:** Match by payee_id OR by normalized payee name if payee_id is null

---

## Implementation Steps

### Step 1: Add Database Query Function

**File:** `src/utils/csvParser.ts`

Add a new function to query existing expenses within a date range:

```typescript
/**
 * Fetches existing expenses from database for duplicate detection
 * @param startDate - Earliest date in the import batch
 * @param endDate - Latest date in the import batch
 * @returns Map of composite keys to existing expense IDs
 */
const fetchExistingExpenses = async (
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> => {
  const { data: existingExpenses, error } = await supabase
    .from('expenses')
    .select('id, expense_date, amount, payee_id, description')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .eq('is_split', false); // Only check non-split parent expenses

  if (error) {
    console.error('Error fetching existing expenses for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();
  
  for (const expense of existingExpenses || []) {
    // Primary key: date-amount-payeeId
    const primaryKey = createExpenseKey(
      expense.expense_date,
      expense.amount,
      expense.payee_id
    );
    existingMap.set(primaryKey, { 
      id: expense.id, 
      description: expense.description || '' 
    });
    
    // Secondary key for null payee: date-amount-description (normalized)
    if (!expense.payee_id && expense.description) {
      const secondaryKey = createExpenseKeyWithDescription(
        expense.expense_date,
        expense.amount,
        expense.description
      );
      existingMap.set(secondaryKey, { 
        id: expense.id, 
        description: expense.description 
      });
    }
  }

  return existingMap;
};

/**
 * Creates a composite key for expense matching
 */
const createExpenseKey = (
  date: string | Date,
  amount: number,
  payeeId: string | null
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(amount * 100) / 100; // Ensure 2 decimal precision
  return `${dateStr}|${normalizedAmount}|${payeeId || 'null'}`.toLowerCase();
};

/**
 * Creates a composite key using description (fallback when no payee)
 */
const createExpenseKeyWithDescription = (
  date: string | Date,
  amount: number,
  description: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(amount * 100) / 100;
  const normalizedDesc = description.toLowerCase().trim().substring(0, 50);
  return `desc|${dateStr}|${normalizedAmount}|${normalizedDesc}`;
};
```

### Step 2: Update QBImportResult Interface

**File:** `src/utils/csvParser.ts`

Add new fields to track database duplicates separately from in-file duplicates:

```typescript
export interface QBImportResult {
  total: number;
  successful: number;
  failed: number;
  expenses: Expense[];
  unmatchedProjects: string[];
  unmatchedPayees: string[];
  fuzzyMatches: PayeeMatchInfo[];
  lowConfidenceMatches: Array<{
    qbName: string;
    suggestions: Array<{
      payee: PartialPayee;
      confidence: number;
    }>;
  }>;
  duplicates: Array<{
    transaction: QBTransaction;
    reason: string;
  }>;
  duplicatesDetected: number;          // In-file duplicates (existing)
  
  // NEW FIELDS
  databaseDuplicates: Array<{
    transaction: QBTransaction;
    existingExpenseId: string;
    matchKey: string;
  }>;
  databaseDuplicatesSkipped: number;   // Count of DB duplicates skipped
  
  mappingStats: {
    databaseMapped: number;
    staticMapped: number;
    descriptionMapped: number;
    unmapped: number;
  };
  unmappedAccounts: string[];
  autoCreatedPayees: Array<{
    qbName: string;
    payeeId: string;
    payeeType: PayeeType;
  }>;
  autoCreatedCount: number;
  errors: string[];
}
```

### Step 3: Modify mapQuickBooksToExpenses Function

**File:** `src/utils/csvParser.ts`

Update the main import function to check database duplicates:

```typescript
export const mapQuickBooksToExpenses = async (
  transactions: QBTransaction[],
  fileName: string
): Promise<QBImportResult> => {
  // Detect and filter in-file duplicates (existing logic)
  const uniqueTransactions = detectDuplicates(transactions);
  const inFileDuplicateCount = transactions.length - uniqueTransactions.length;
  
  // Initialize result with new fields
  const result: QBImportResult = {
    total: transactions.length,
    successful: 0,
    failed: 0,
    expenses: [],
    unmatchedProjects: [],
    unmatchedPayees: [],
    fuzzyMatches: [],
    lowConfidenceMatches: [],
    duplicates: [],
    duplicatesDetected: inFileDuplicateCount,
    databaseDuplicates: [],           // NEW
    databaseDuplicatesSkipped: 0,     // NEW
    mappingStats: {
      databaseMapped: 0,
      staticMapped: 0,
      descriptionMapped: 0,
      unmapped: 0
    },
    unmappedAccounts: [],
    autoCreatedPayees: [],
    autoCreatedCount: 0,
    errors: []
  };

  try {
    // === NEW: Calculate date range and fetch existing expenses ===
    const dates = uniqueTransactions
      .map(t => t.date)
      .filter(d => d && d.trim() !== '')
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()));
    
    let existingExpenses = new Map<string, { id: string; description: string }>();
    
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Add buffer days to catch edge cases
      minDate.setDate(minDate.getDate() - 1);
      maxDate.setDate(maxDate.getDate() + 1);
      
      existingExpenses = await fetchExistingExpenses(
        minDate.toISOString().split('T')[0],
        maxDate.toISOString().split('T')[0]
      );
    }
    // === END NEW ===

    // Load projects, payees, and account mappings (existing logic)
    const [projectsResponse, payeesResponse, mappingsResponse] = await Promise.all([
      supabase.from('projects').select('id, project_number, project_name'),
      supabase.from('payees').select('id, payee_name, full_name'),
      supabase.from('quickbooks_account_mappings').select('*').eq('is_active', true)
    ]);

    const projects = projectsResponse.data || [];
    const payees = payeesResponse.data || [];
    const dbMappings = mappingsResponse.data || [];

    // ... existing project matching logic ...

    // Process each unique transaction
    for (const transaction of uniqueTransactions) {
      try {
        const amount = parseQuickBooksAmount(transaction.amount);
        const expense_date = transaction.date ? new Date(transaction.date) : new Date();
        const dateStr = expense_date.toISOString().split('T')[0];
        
        // ... existing payee matching logic to get payeeId ...
        // (This section stays the same - we need payeeId for duplicate check)
        
        // === NEW: Check for database duplicate ===
        const primaryKey = createExpenseKey(dateStr, amount, payeeId);
        const descriptionKey = createExpenseKeyWithDescription(
          dateStr, 
          amount, 
          transaction.name || ''
        );
        
        const existingByPrimaryKey = existingExpenses.get(primaryKey);
        const existingByDescription = !payeeId ? existingExpenses.get(descriptionKey) : null;
        const existingExpense = existingByPrimaryKey || existingByDescription;
        
        if (existingExpense) {
          result.databaseDuplicates.push({
            transaction,
            existingExpenseId: existingExpense.id,
            matchKey: existingByPrimaryKey ? primaryKey : descriptionKey
          });
          result.databaseDuplicatesSkipped++;
          continue; // Skip this transaction - already exists in database
        }
        // === END NEW ===

        // ... rest of existing transaction processing logic ...
        // (categorization, expense creation, etc.)

      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to process transaction: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`Database error: ${error}`);
  }

  return result;
};
```

### Step 4: Update Import Modal UI

**File:** `src/components/ExpenseImportModal.tsx` (or `TransactionImportModal.tsx`)

Add display of database duplicate statistics:

```typescript
// In the validation results section, add:

{/* Database Duplicates Warning */}
{validationResults.databaseDuplicatesSkipped > 0 && (
  <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
    <div className="flex items-start gap-2 mb-2">
      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium text-sm">Existing Transactions Found</h4>
        <p className="text-sm mt-1">
          <span className="font-medium text-amber-700">
            {validationResults.databaseDuplicatesSkipped} transaction(s)
          </span>
          {' '}already exist in the database and will be skipped.
        </p>
        <p className="text-xs text-amber-600 mt-1 italic">
          These were likely imported in a previous upload.
        </p>
      </div>
    </div>
    
    {/* Optional: Expandable list of duplicates */}
    {validationResults.databaseDuplicates.length > 0 && (
      <details className="mt-2">
        <summary className="text-xs cursor-pointer text-amber-700 hover:underline">
          View duplicate transactions
        </summary>
        <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-white rounded border border-amber-200 p-2">
          {validationResults.databaseDuplicates.slice(0, 10).map((dup, idx) => (
            <div key={idx} className="py-1 border-b border-amber-100 last:border-0">
              {dup.transaction.date} - {dup.transaction.name} - ${dup.transaction.amount}
            </div>
          ))}
          {validationResults.databaseDuplicates.length > 10 && (
            <div className="pt-1 text-amber-600">
              ...and {validationResults.databaseDuplicates.length - 10} more
            </div>
          )}
        </div>
      </details>
    )}
  </div>
)}
```

### Step 5: Update Import Summary

After successful import, update the summary toast/message to include duplicate stats:

```typescript
toast({
  title: "Import Complete",
  description: `Imported ${result.successful} expense(s). ` +
    `${result.databaseDuplicatesSkipped > 0 
      ? `Skipped ${result.databaseDuplicatesSkipped} duplicate(s). ` 
      : ''}` +
    `${result.failed > 0 ? `${result.failed} failed.` : ''}`,
  variant: result.failed > 0 ? "destructive" : "default"
});
```

---

## Testing Requirements

### Unit Tests

Create test file: `src/utils/__tests__/csvParser.duplicateDetection.test.ts`

```typescript
describe('Expense Duplicate Detection', () => {
  describe('createExpenseKey', () => {
    it('creates consistent keys for same inputs', () => {
      const key1 = createExpenseKey('2024-01-15', 100.50, 'payee-123');
      const key2 = createExpenseKey('2024-01-15', 100.50, 'payee-123');
      expect(key1).toBe(key2);
    });

    it('handles null payee_id', () => {
      const key = createExpenseKey('2024-01-15', 100.50, null);
      expect(key).toContain('null');
    });

    it('normalizes amount to 2 decimal places', () => {
      const key1 = createExpenseKey('2024-01-15', 100.504, 'payee-123');
      const key2 = createExpenseKey('2024-01-15', 100.50, 'payee-123');
      expect(key1).toBe(key2);
    });
  });

  describe('fetchExistingExpenses', () => {
    it('returns empty map on database error', async () => {
      // Mock supabase error
      const result = await fetchExistingExpenses('2024-01-01', '2024-01-31');
      expect(result).toBeInstanceOf(Map);
    });
  });

  describe('mapQuickBooksToExpenses - duplicate handling', () => {
    it('skips transactions that exist in database', async () => {
      // Setup: Create expense in DB first
      // Import: Try to import same transaction
      // Assert: Transaction is in databaseDuplicates, not expenses
    });

    it('allows transactions with same amount but different payee', async () => {
      // Two transactions, same date/amount, different payees
      // Both should be imported
    });

    it('uses description fallback when payee is null', async () => {
      // Transaction with null payee, matching description
      // Should be detected as duplicate
    });
  });
});
```

### Manual Testing Checklist

1. **Fresh Import Test**
   - [ ] Upload a CSV with 10 transactions
   - [ ] Verify all 10 are imported
   - [ ] Check `databaseDuplicatesSkipped` is 0

2. **Re-Upload Same File Test**
   - [ ] Upload the same CSV again
   - [ ] Verify 0 new expenses imported
   - [ ] Verify `databaseDuplicatesSkipped` equals original count
   - [ ] Check UI shows duplicate warning

3. **Partial Overlap Test**
   - [ ] Upload CSV with 10 transactions
   - [ ] Create new CSV with 5 old + 5 new transactions
   - [ ] Upload second CSV
   - [ ] Verify only 5 new expenses imported
   - [ ] Verify `databaseDuplicatesSkipped` is 5

4. **Edge Cases**
   - [ ] Same payee, same amount, same day (should skip as duplicate)
   - [ ] Different payee, same amount, same day (should allow both)
   - [ ] No payee match, same description (should detect via description key)
   - [ ] Amount with floating point precision issues (100.004 vs 100.00)

5. **Performance Test**
   - [ ] Upload YTD file with 1000+ transactions
   - [ ] Verify import completes in reasonable time (<30 seconds)
   - [ ] Check memory usage doesn't spike excessively

---

## Rollback Plan

If issues arise after deployment:

### Quick Disable (No Code Change)

Add environment variable check to bypass duplicate detection:

```typescript
const SKIP_DB_DUPLICATE_CHECK = import.meta.env.VITE_SKIP_DB_DUPLICATE_CHECK === 'true';

// In mapQuickBooksToExpenses:
if (!SKIP_DB_DUPLICATE_CHECK) {
  existingExpenses = await fetchExistingExpenses(minDate, maxDate);
}
```

### Full Rollback

1. Revert changes to `src/utils/csvParser.ts`
2. Revert changes to `src/components/ExpenseImportModal.tsx`
3. No database migration required (feature is read-only)

---

## Documentation Updates

After implementation, update these files:

1. **`src/docs/CSV_PARSER.md`** - Add section on database duplicate detection
2. **`CHANGELOG.md`** - Document the new feature
3. **`README.md`** - Note the duplicate handling behavior if relevant

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/utils/csvParser.ts` | Add `fetchExistingExpenses()`, `createExpenseKey()`, `createExpenseKeyWithDescription()`, update `QBImportResult` interface, modify `mapQuickBooksToExpenses()` |
| `src/components/ExpenseImportModal.tsx` | Add duplicate warning UI, update summary display |
| `src/utils/__tests__/csvParser.duplicateDetection.test.ts` | New test file |
| `src/docs/CSV_PARSER.md` | Documentation update |

---

## Success Criteria

- [ ] Re-uploading the same CSV file imports 0 new records
- [ ] Database duplicates are tracked separately from in-file duplicates
- [ ] User sees clear feedback about skipped duplicates
- [ ] Performance is acceptable for large (1000+) transaction imports
- [ ] No regression in existing import functionality
- [ ] Edge cases handled (null payees, floating point amounts)

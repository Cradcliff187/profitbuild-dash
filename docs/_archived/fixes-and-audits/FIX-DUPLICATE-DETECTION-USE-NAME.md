# Fix Duplicate Detection - Use Name Instead of Payee ID

## The Problem

Current duplicate detection uses `payee_id` in the composite key:
```
date | amount | payee_id
```

**Why this fails:**
- `payee_id` is derived from the QuickBooks `Name` field through fuzzy matching
- Different imports may match the same `Name` to different payees (or null)
- Auto-created payees get new IDs each time
- Result: Same transaction appears as "new" because the key doesn't match

**Example of failure:**
| Import | QuickBooks Name | Matched Payee ID | Key | Duplicate? |
|--------|-----------------|------------------|-----|------------|
| First | "Home Depot" | `abc-123` | `2025-01-15\|100\|abc-123` | No (new) |
| Second | "Home Depot" | `xyz-789` | `2025-01-15\|100\|xyz-789` | No (new!) ❌ |

## The Solution

Use the stable QuickBooks `Name` field directly:
```
date | amount | normalized_name
```

**This ensures consistency:**
| Import | QuickBooks Name | Key | Duplicate? |
|--------|-----------------|-----|------------|
| First | "Home Depot" | `2025-01-15\|100\|home depot` | No (new) |
| Second | "Home Depot" | `2025-01-15\|100\|home depot` | Yes ✅ |

---

## Files to Modify

1. `src/utils/enhancedTransactionImporter.ts` (primary)
2. `src/utils/csvParser.ts` (if still used)
3. `src/components/ExpenseImportModal.tsx` (validation)

---

## Step 1: Fix enhancedTransactionImporter.ts - Key Functions

### 1A. Update createExpenseKey Function

Find and replace the `createExpenseKey` function:

```typescript
/**
 * Creates a composite key for expense matching
 * Uses normalized name (from QuickBooks) instead of payee_id for consistency
 * 
 * @param date - Transaction date
 * @param amount - Transaction amount
 * @param name - QuickBooks Name field (stable across imports)
 */
const createExpenseKey = (
  date: string | Date,
  amount: number,
  name: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100; // Ensure positive, 2 decimal precision
  const normalizedName = (name || '').toLowerCase().trim();
  return `${dateStr}|${normalizedAmount}|${normalizedName}`;
};
```

### 1B. Update createExpenseKeyWithDescription Function (Keep as Fallback)

```typescript
/**
 * Creates a composite key using description (fallback when name is empty)
 */
const createExpenseKeyWithDescription = (
  date: string | Date,
  amount: number,
  description: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
  const normalizedDesc = (description || '').toLowerCase().trim().substring(0, 50);
  return `desc|${dateStr}|${normalizedAmount}|${normalizedDesc}`;
};
```

---

## Step 2: Fix fetchExistingExpenses Function

The database query needs to fetch the data we need for name-based matching.

**Problem:** The database stores `payee_id`, not the original QuickBooks name.

**Solution:** Join with payees table to get the name, OR store the original name in description.

### Option A: Join with Payees (Recommended)

```typescript
/**
 * Fetches existing expenses from database for duplicate detection
 * Joins with payees to get the name for matching
 */
const fetchExistingExpenses = async (
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> => {
  const { data: existingExpenses, error } = await supabase
    .from('expenses')
    .select(`
      id, 
      expense_date, 
      amount, 
      payee_id, 
      description,
      payees!expenses_payee_id_fkey (
        payee_name
      )
    `)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .eq('is_split', false);

  if (error) {
    console.error('Error fetching existing expenses for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();
  
  for (const expense of existingExpenses || []) {
    // Get payee name from joined data
    const payeeName = (expense.payees as any)?.payee_name || '';
    
    // Primary key: date|amount|payee_name
    const primaryKey = createExpenseKey(
      expense.expense_date,
      expense.amount,
      payeeName
    );
    existingMap.set(primaryKey, { 
      id: expense.id, 
      description: expense.description || '' 
    });
    
    // Secondary key: Also try matching by description (for expenses without payee)
    if (expense.description) {
      // Extract name from description pattern "transaction_type - Name (Unassigned)"
      const descMatch = expense.description.match(/^(?:bill|check|expense)\s*-\s*(.+?)(?:\s*\(|$)/i);
      const extractedName = descMatch ? descMatch[1].trim() : '';
      
      if (extractedName) {
        const descKey = createExpenseKey(
          expense.expense_date,
          expense.amount,
          extractedName
        );
        // Only add if different from primary key
        if (descKey !== primaryKey) {
          existingMap.set(descKey, { 
            id: expense.id, 
            description: expense.description 
          });
        }
      }
      
      // Also add description-based key as tertiary fallback
      const descriptionKey = createExpenseKeyWithDescription(
        expense.expense_date,
        expense.amount,
        expense.description
      );
      existingMap.set(descriptionKey, { 
        id: expense.id, 
        description: expense.description 
      });
    }
  }

  return existingMap;
};
```

### Option B: If Join Doesn't Work (Simpler but Less Accurate)

If the Supabase join is problematic, use description parsing:

```typescript
const fetchExistingExpenses = async (
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> => {
  const { data: existingExpenses, error } = await supabase
    .from('expenses')
    .select('id, expense_date, amount, payee_id, description')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .eq('is_split', false);

  if (error) {
    console.error('Error fetching existing expenses for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();
  
  for (const expense of existingExpenses || []) {
    // Extract name from description pattern: "bill - Home Depot" or "expense - Home Depot (Unassigned)"
    const description = expense.description || '';
    const nameMatch = description.match(/^(?:bill|check|expense)\s*-\s*(.+?)(?:\s*\(|$)/i);
    const extractedName = nameMatch ? nameMatch[1].trim() : '';
    
    if (extractedName) {
      // Primary key using extracted name
      const primaryKey = createExpenseKey(
        expense.expense_date,
        expense.amount,
        extractedName
      );
      existingMap.set(primaryKey, { 
        id: expense.id, 
        description 
      });
    }
    
    // Secondary key using full description (fallback)
    const descKey = createExpenseKeyWithDescription(
      expense.expense_date,
      expense.amount,
      description
    );
    existingMap.set(descKey, { 
      id: expense.id, 
      description 
    });
  }

  return existingMap;
};
```

---

## Step 3: Fix the Expense Processing Loop

Find the loop that processes expense transactions (search for `for (const row of uniqueExpenseTransactions)`):

```typescript
// Process unique expense transactions
for (const row of uniqueExpenseTransactions) {
  try {
    const transactionType = row['Transaction type']?.toLowerCase();
    
    // Skip invoices (handled separately)
    if (transactionType === 'invoice') continue;
    
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const date = formatDateForDB(row['Date']);
    const name = row['Name']?.trim() || '';  // QuickBooks name - use this for key!
    const projectWO = row['Project/WO #']?.trim() || '';
    const accountFullName = row['Account full name']?.trim() || '';
    const accountName = row['Account name']?.trim() || '';
    const txType = mapTransactionType(transactionType);

    // === DATABASE DUPLICATE CHECK - USE NAME, NOT PAYEE_ID ===
    const primaryKey = createExpenseKey(date, amount, name);
    const descriptionKey = createExpenseKeyWithDescription(date, amount, name);
    
    const existingByPrimaryKey = existingExpenses.get(primaryKey);
    const existingByDescription = existingExpenses.get(descriptionKey);
    const existingExpense = existingByPrimaryKey || existingByDescription;
    
    if (existingExpense) {
      databaseDuplicates.push({
        transaction: row,
        existingExpenseId: existingExpense.id,
        matchKey: existingByPrimaryKey ? primaryKey : descriptionKey
      });
      continue; // Skip - already exists
    }
    // === END DUPLICATE CHECK ===

    // ... rest of processing (payee matching, project matching, etc.) ...
```

---

## Step 4: Fix detectInFileDuplicates Function

The in-file duplicate detection should also use the same key strategy:

```typescript
/**
 * Detects expense duplicates within the CSV file itself
 */
const detectInFileDuplicates = (
  data: TransactionCSVRow[]
): { unique: TransactionCSVRow[]; duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> } => {
  const seen = new Map<string, TransactionCSVRow>();
  const duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  const unique: TransactionCSVRow[] = [];

  for (const row of data) {
    // Only check expenses for duplicates (not invoices/revenues)
    if (row['Transaction type']?.toLowerCase() === 'invoice') {
      unique.push(row);
      continue;
    }

    const date = formatDateForDB(row['Date']);
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const name = row['Name']?.trim() || '';

    // Use the same key function for consistency
    const key = createExpenseKey(date, amount, name);

    if (seen.has(key)) {
      const firstOccurrence = seen.get(key)!;
      duplicates.push({
        transaction: row,
        reason: `Duplicate of: ${firstOccurrence['Name']} on ${firstOccurrence['Date']} for ${firstOccurrence['Amount']}`
      });
    } else {
      seen.set(key, row);
      unique.push(row);
    }
  }

  return { unique, duplicates };
};
```

---

## Step 5: Fix Revenue Duplicate Detection (Same Pattern)

### 5A. Update createRevenueKey

```typescript
/**
 * Creates a composite key for revenue matching
 * Uses: amount, date, invoice number, and client name
 */
const createRevenueKey = (
  amount: number,
  date: string | Date,
  invoiceNumber: string,
  name: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedInvoice = (invoiceNumber || '').toLowerCase().trim();
  return `rev|${normalizedAmount}|${dateStr}|${normalizedInvoice}|${normalizedName}`;
};
```

### 5B. Update fetchExistingRevenues

```typescript
const fetchExistingRevenues = async (
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> => {
  const { data: existingRevenues, error } = await supabase
    .from('project_revenues')
    .select(`
      id, 
      invoice_date, 
      amount, 
      invoice_number, 
      description,
      clients!project_revenues_client_id_fkey (
        client_name
      )
    `)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate);

  if (error) {
    console.error('Error fetching existing revenues for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();
  
  for (const revenue of existingRevenues || []) {
    const clientName = (revenue.clients as any)?.client_name || '';
    
    // Extract name from description as fallback
    const descMatch = revenue.description?.match(/^Invoice from\s+(.+?)(?:\s*\(|$)/i);
    const extractedName = descMatch ? descMatch[1].trim() : clientName;
    
    const key = createRevenueKey(
      revenue.amount,
      revenue.invoice_date,
      revenue.invoice_number || '',
      extractedName
    );
    
    existingMap.set(key, { 
      id: revenue.id, 
      description: revenue.description || '' 
    });
  }

  return existingMap;
};
```

### 5C. Update detectRevenueInFileDuplicates

```typescript
const detectRevenueInFileDuplicates = (
  data: TransactionCSVRow[]
): { unique: TransactionCSVRow[]; duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> } => {
  const seen = new Map<string, TransactionCSVRow>();
  const duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  const unique: TransactionCSVRow[] = [];

  for (const row of data) {
    // Only check invoices/revenues for duplicates
    if (row['Transaction type']?.toLowerCase() !== 'invoice') {
      unique.push(row);
      continue;
    }

    const date = formatDateForDB(row['Date']);
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const name = row['Name']?.trim() || '';
    const invoiceNumber = row['Invoice #']?.trim() || '';

    const key = createRevenueKey(amount, date, invoiceNumber, name);

    if (seen.has(key)) {
      const firstOccurrence = seen.get(key)!;
      duplicates.push({
        transaction: row,
        reason: `Duplicate invoice: ${firstOccurrence['Name']} on ${firstOccurrence['Date']}`
      });
    } else {
      seen.set(key, row);
      unique.push(row);
    }
  }

  return { unique, duplicates };
};
```

---

## Step 6: Fix ExpenseImportModal.tsx - validateMatches Function

Find the `validateMatches` function and update the duplicate checking:

```typescript
const validateMatches = async (data: TransactionCSVRow[]) => {
  // ... existing setup code ...

  // === Check for in-file duplicates (EXPENSES) ===
  const seenExpenses = new Map<string, TransactionCSVRow>();
  const inFileDuplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  
  // === Check for in-file duplicates (REVENUES) ===
  const seenRevenues = new Map<string, TransactionCSVRow>();
  const revenueInFileDuplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  
  data.forEach(row => {
    const date = row['Date'] ? new Date(row['Date']).toISOString().split('T')[0] : '';
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
    const name = row['Name']?.trim().toLowerCase() || '';
    const invoiceNumber = row['Invoice #']?.trim().toLowerCase() || '';
    const isInvoice = row['Transaction type']?.toLowerCase() === 'invoice';
    
    if (isInvoice) {
      // Revenue duplicate key: amount|date|invoice#|name
      const key = `rev|${normalizedAmount}|${date}|${invoiceNumber}|${name}`;
      
      if (seenRevenues.has(key)) {
        const first = seenRevenues.get(key)!;
        revenueInFileDuplicates.push({
          transaction: row,
          reason: `Duplicate invoice: ${first['Name']} on ${first['Date']}`
        });
      } else {
        seenRevenues.set(key, row);
      }
    } else {
      // Expense duplicate key: date|amount|name (NOT payee_id!)
      const key = `${date}|${normalizedAmount}|${name}`;
      
      if (seenExpenses.has(key)) {
        const first = seenExpenses.get(key)!;
        inFileDuplicates.push({
          transaction: row,
          reason: `Duplicate of: ${first['Name']} on ${first['Date']}`
        });
      } else {
        seenExpenses.set(key, row);
      }
    }
  });

  // === Check for DATABASE duplicates ===
  // ... fetch existing expenses and revenues ...
  
  const databaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingExpenseId: string;
    matchKey: string;
  }> = [];
  
  const revenueDatabaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingRevenueId: string;
    matchKey: string;
  }> = [];

  // Check each non-duplicate row against database
  data.forEach(row => {
    const isInvoice = row['Transaction type']?.toLowerCase() === 'invoice';
    const date = row['Date'] ? new Date(row['Date']).toISOString().split('T')[0] : '';
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
    const name = row['Name']?.trim().toLowerCase() || '';
    
    if (isInvoice) {
      const invoiceNumber = row['Invoice #']?.trim().toLowerCase() || '';
      const key = `rev|${normalizedAmount}|${date}|${invoiceNumber}|${name}`;
      
      const existing = existingRevenues.get(key);
      if (existing) {
        revenueDatabaseDuplicates.push({
          transaction: row,
          existingRevenueId: existing.id,
          matchKey: key
        });
      }
    } else {
      // Expense: Use name-based key
      const key = `${date}|${normalizedAmount}|${name}`;
      
      const existing = existingExpenses.get(key);
      if (existing) {
        databaseDuplicates.push({
          transaction: row,
          existingExpenseId: existing.id,
          matchKey: key
        });
      }
    }
  });

  // ... rest of validation ...
};
```

---

## Step 7: Fix csvParser.ts (If Still Used)

Apply the same changes to `src/utils/csvParser.ts`:

1. Update `createExpenseKey` to use `name` instead of `payeeId`
2. Update `fetchExistingExpenses` to join with payees or extract from description
3. Update `detectDuplicates` function
4. Update the main processing loop

---

## Summary of Key Changes

| Location | Old Key | New Key |
|----------|---------|---------|
| Expense duplicate | `date\|amount\|payee_id` | `date\|amount\|name` |
| Revenue duplicate | `amount\|date\|invoice#\|description` | `rev\|amount\|date\|invoice#\|name` |
| In-file expense | `date\|amount\|name` | `date\|amount\|name` (unchanged) |
| DB fetch | Query payee_id | Join payees OR extract from description |

---

## Verification Checklist

After implementing:

- [ ] Upload a YTD CSV file
- [ ] Note how many are marked as "already imported"
- [ ] Re-upload the SAME file immediately
- [ ] Verify ALL records are now "already imported" (0 new)
- [ ] Check that expenses with different payees but same name are correctly detected
- [ ] Check that revenues with same amount/date/name are correctly detected
- [ ] Verify no regression - new transactions still import correctly

---

## Build and Test

```bash
npm run build
npm run dev
```

Test with a real YTD file from QuickBooks.

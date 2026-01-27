# CSV Import Expense Date Handling - Implementation Guide

**Version:** 1.0  
**Date:** January 27, 2026  
**Author:** Claude AI Review  
**Priority:** MEDIUM - Affects data accuracy on import

---

## Executive Summary

This document identifies date handling inconsistencies in the CSV expense import pipeline. The issues stem from multiple `formatDateForDB` implementations with different behaviors and inconsistent use of the `parseDateOnly()` utility.

### Impact Areas
- ⚠️ **Imported expense dates** may shift by one day due to timezone issues
- ⚠️ **Duplicate detection** may fail when dates normalize differently
- ⚠️ **Standard CSV import** uses full ISO timestamps instead of DATE format
- ⚠️ **QuickBooks import** has separate date handling from standard import

---

## Part 1: Issues Found

### Issue 1: Multiple `formatDateForDB` Implementations ⚠️ HIGH

There are **3 different implementations** of `formatDateForDB` across the codebase:

| File | Implementation | Problem |
|------|----------------|---------|
| `src/utils/expenseCsvParser.ts` | Returns full ISO string with time | Database `expense_date` column is DATE type, not TIMESTAMPTZ |
| `src/utils/enhancedTransactionImporter.ts` | Returns date-only string (correct) | Inconsistent with other file |
| `supabase/functions/_shared/transactionProcessor.ts` | Returns date-only string (correct) | Duplicates logic |

**expenseCsvParser.ts (INCORRECT):**
```typescript
const formatDateForDB = (dateString: string): string => {
  if (!dateString) return new Date().toISOString();  // Returns full timestamp!
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString();  // Returns full timestamp!
  }
  
  return date.toISOString();  // Returns full timestamp!
};
```

**enhancedTransactionImporter.ts (CORRECT):**
```typescript
const formatDateForDB = (dateString: string): string => {
  if (!dateString) return new Date().toISOString().split('T')[0];  // Date only
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];  // Date only
  }
  
  return date.toISOString().split('T')[0];  // Date only
};
```

---

### Issue 2: Timezone Shift on Date Parsing ⚠️ MEDIUM

When parsing dates like "1/15/2026" from QuickBooks CSV:

```typescript
const date = new Date("1/15/2026");  // Interpreted as local midnight
date.toISOString().split('T')[0];     // May shift to previous day!
```

**Example:**
- CSV value: `"1/15/2026"` (January 15, 2026)
- `new Date("1/15/2026")` in EST → `2026-01-15T00:00:00-05:00` (local midnight)
- `.toISOString()` → `2026-01-15T05:00:00.000Z` (converted to UTC)
- `.split('T')[0]` → `"2026-01-15"` (correct in this case)

BUT if the system clock is near midnight:
- The conversion could theoretically cause issues with DST transitions

---

### Issue 3: Duplicate Detection Uses Different Date Normalization ⚠️ MEDIUM

**In `enhancedTransactionImporter.ts`:**
```typescript
// When creating keys from CSV data:
const date = formatDateForDB(row['Date']);  // Uses toISOString().split('T')[0]

// When creating keys from database data:
const normalizedDate = expense.expense_date 
  ? new Date(expense.expense_date).toISOString().split('T')[0] 
  : expense.expense_date;
```

This works **most of the time**, but:
1. Database stores `expense_date` as DATE type (e.g., `"2026-01-15"`)
2. `new Date("2026-01-15")` interprets as midnight UTC
3. `toISOString()` returns `"2026-01-15T00:00:00.000Z"`
4. Split returns `"2026-01-15"` ✓

However, the code doesn't use the safer `parseDateOnly()` utility.

---

### Issue 4: Standard CSV Parser Returns Full Timestamp ⚠️ HIGH

**File:** `src/utils/expenseCsvParser.ts`

The `formatDateForDB` function returns a full ISO timestamp, but the database `expense_date` column is type DATE:

```typescript
// Current implementation returns:
"2026-01-15T05:00:00.000Z"

// Database expects:
"2026-01-15"
```

While Supabase/PostgreSQL will truncate the time portion, this is:
1. Inconsistent with other importers
2. Potentially problematic for queries
3. Harder to debug

---

### Issue 5: No Validation of Imported Date Format ⚠️ LOW

The CSV import doesn't validate that dates are in expected formats before parsing:

```typescript
// Current: Just tries to parse, defaults to today if failed
const date = new Date(dateString);
if (isNaN(date.getTime())) {
  return new Date().toISOString().split('T')[0];  // Silent failure!
}
```

**Problems:**
1. Invalid dates silently become "today" - user may not notice
2. No feedback about which rows had date parsing issues
3. QuickBooks uses "M/D/YYYY" but other CSVs may use "YYYY-MM-DD" or "DD/MM/YYYY"

---

### Issue 6: Inconsistent Fallback Date Handling ⚠️ LOW

When date parsing fails:

| File | Fallback Behavior |
|------|-------------------|
| `expenseCsvParser.ts` | Uses `new Date().toISOString()` (full timestamp) |
| `enhancedTransactionImporter.ts` | Uses `new Date().toISOString().split('T')[0]` (date only) |
| `csvParser.ts` | Uses `new Date()` object directly |

---

## Part 2: Implementation Fixes

### Fix 1: Create Centralized Date Parsing Utility

**File:** `src/utils/dateUtils.ts`

**Action:** Add a robust date parsing function for CSV imports

Add this function after the existing `parseDateOnly` function:

```typescript
/**
 * Parse a date string from CSV import and return a database-ready date string.
 * Handles multiple date formats commonly seen in QuickBooks and other CSV exports.
 * 
 * @param dateString - Date string from CSV (e.g., "1/15/2026", "2026-01-15", "01-15-2026")
 * @param fallbackToToday - If true, returns today's date on parse failure; if false, returns null
 * @returns Date string in YYYY-MM-DD format, or null if parsing failed and fallbackToToday is false
 */
export const parseCsvDateForDB = (
  dateString: string | null | undefined,
  fallbackToToday: boolean = true
): string | null => {
  if (!dateString || typeof dateString !== 'string' || !dateString.trim()) {
    return fallbackToToday ? formatDateForDB(new Date()) : null;
  }

  const trimmed = dateString.trim();
  
  // Try parsing common formats
  let parsed: Date | null = null;
  
  // Format: M/D/YYYY or MM/DD/YYYY (QuickBooks standard)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    // Create date at noon to avoid timezone issues
    parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
  }
  
  // Format: YYYY-MM-DD (ISO date)
  if (!parsed) {
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
  }
  
  // Format: MM-DD-YYYY
  if (!parsed) {
    const dashMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dashMatch) {
      const [, month, day, year] = dashMatch;
      parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
  }
  
  // Fallback: try native Date parsing (less reliable)
  if (!parsed) {
    const nativeParsed = new Date(trimmed);
    if (!isNaN(nativeParsed.getTime())) {
      // If native parsing worked, extract date components to avoid timezone issues
      parsed = new Date(
        nativeParsed.getFullYear(),
        nativeParsed.getMonth(),
        nativeParsed.getDate(),
        12, 0, 0
      );
    }
  }
  
  // Final validation
  if (parsed && !isNaN(parsed.getTime())) {
    return formatDateForDB(parsed);
  }
  
  return fallbackToToday ? formatDateForDB(new Date()) : null;
};

/**
 * Format a Date object to YYYY-MM-DD string for database storage.
 * 
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Validate if a string appears to be a valid date format.
 * Returns the detected format or null if unrecognized.
 * 
 * @param dateString - String to validate
 * @returns Format string ('M/D/YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY') or null
 */
export const detectDateFormat = (dateString: string): string | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const trimmed = dateString.trim();
  
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return 'M/D/YYYY';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'YYYY-MM-DD';
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return 'MM-DD-YYYY';
  
  return null;
};
```

---

### Fix 2: Update expenseCsvParser.ts to Use Centralized Utility

**File:** `src/utils/expenseCsvParser.ts`

**Action:** Replace the local `formatDateForDB` function and import the centralized utility

Add import at top:
```typescript
import { parseCsvDateForDB } from '@/utils/dateUtils';
```

Remove the local `formatDateForDB` function (lines ~85-95).

Update the `mapCSVToExpenses` function:
```typescript
export const mapCSVToExpenses = (
  data: ExpenseCSVRow[], 
  mapping: ExpenseColumnMapping,
  fallbackProjectId: string,
  payeeMap: Map<string, string> = new Map(),
  projectMap: Map<string, string> = new Map()
): ExpenseImportData[] => {
  const normalizeKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

  return data
    .filter(row => {
      // Basic validation - must have required fields
      return mapping.expense_date && row[mapping.expense_date]?.trim() &&
             mapping.description && row[mapping.description]?.trim() &&
             mapping.amount && row[mapping.amount]?.trim();
    })
    .map(row => {
      // ... project_id logic unchanged ...

      const expense: ExpenseImportData = {
        project_id,
        description: row[mapping.description!]?.trim() || '',
        category: 'other' as ExpenseCategory,
        transaction_type: 'expense' as TransactionType,
        amount: parseFloat(row[mapping.amount!]?.replace(/[,$]/g, '') || '0'),
        // USE CENTRALIZED UTILITY:
        expense_date: parseCsvDateForDB(row[mapping.expense_date!]?.trim()) || formatDateForDB(new Date()),
        is_planned: false
      };

      // ... rest unchanged ...
    });
};
```

---

### Fix 3: Update enhancedTransactionImporter.ts to Use Centralized Utility

**File:** `src/utils/enhancedTransactionImporter.ts`

**Action:** Replace the local `formatDateForDB` function

Add import at top:
```typescript
import { parseCsvDateForDB, formatDateForDB } from '@/utils/dateUtils';
```

Remove the local `formatDateForDB` function (around line 180).

Update all usages:
```typescript
// Change from:
const date = formatDateForDB(row['Date']);

// To:
const date = parseCsvDateForDB(row['Date']) || formatDateForDB(new Date());
```

Also update the duplicate detection key creation to use consistent date handling:
```typescript
// When normalizing database dates for comparison:
const normalizedDate = expense.expense_date 
  ? formatDateForDB(parseDateOnly(expense.expense_date))  // Use parseDateOnly first!
  : formatDateForDB(new Date());
```

---

### Fix 4: Update csvParser.ts to Use Centralized Utility

**File:** `src/utils/csvParser.ts`

**Action:** Replace the inline date parsing

Add import at top:
```typescript
import { parseCsvDateForDB, formatDateForDB, parseDateOnly } from '@/utils/dateUtils';
```

Update the `mapQuickBooksToExpenses` function:
```typescript
// Change from:
let expense_date = new Date();
if (transaction.date) {
  const parsedDate = new Date(transaction.date);
  if (!isNaN(parsedDate.getTime())) {
    expense_date = parsedDate;
  }
}

// To:
const expense_date_str = parseCsvDateForDB(transaction.date) || formatDateForDB(new Date());
```

And when creating the expense object:
```typescript
const expense: Expense = {
  // ...
  expense_date: expense_date_str,  // Now a string, not Date
  // ...
};
```

**Note:** This may require updating the `Expense` type to expect `string` for `expense_date` in the import context, or convert when inserting to database.

---

### Fix 5: Update enhancedCsvParser.ts to Use Centralized Utility

**File:** `src/utils/enhancedCsvParser.ts`

**Action:** Replace date handling

Add import at top:
```typescript
import { parseCsvDateForDB, formatDateForDB, parseDateOnly } from '@/utils/dateUtils';
```

Update expense processing:
```typescript
// Change from:
const expenseDate = new Date(transaction.date);
const expenseForDB = {
  ...expense,
  expense_date: expenseDate.toISOString().split('T')[0]
};

// To:
const expenseDateStr = parseCsvDateForDB(transaction.date) || formatDateForDB(new Date());
const expenseForDB = {
  ...expense,
  expense_date: expenseDateStr
};
```

---

### Fix 6: Add Date Parsing Validation Feedback

**File:** `src/utils/expenseCsvParser.ts`

**Action:** Add validation that reports date parsing issues

Update `validateExpenseCSVData`:
```typescript
export const validateExpenseCSVData = (
  data: ExpenseCSVRow[], 
  mapping: ExpenseColumnMapping, 
  selectedProjectId?: string
): string[] => {
  const errors: string[] = [];
  
  // ... existing validation ...
  
  // ADD: Validate date formats
  if (mapping.expense_date) {
    const dateParseIssues: number[] = [];
    data.forEach((row, index) => {
      const dateValue = row[mapping.expense_date!]?.trim();
      if (dateValue) {
        const format = detectDateFormat(dateValue);
        if (!format) {
          // Try parsing anyway
          const parsed = parseCsvDateForDB(dateValue, false);
          if (!parsed) {
            dateParseIssues.push(index + 1);  // 1-indexed for user display
          }
        }
      }
    });
    
    if (dateParseIssues.length > 0) {
      if (dateParseIssues.length <= 5) {
        errors.push(`Rows with unrecognized date format: ${dateParseIssues.join(', ')}. Expected formats: M/D/YYYY, YYYY-MM-DD, or MM-DD-YYYY`);
      } else {
        errors.push(`${dateParseIssues.length} rows have unrecognized date formats. Expected: M/D/YYYY, YYYY-MM-DD, or MM-DD-YYYY`);
      }
    }
  }
  
  return errors;
};
```

---

### Fix 7: Update Edge Function Date Handling

**File:** `supabase/functions/_shared/transactionProcessor.ts`

**Action:** Ensure consistent date handling with frontend

Replace the local `formatDateForDB`:
```typescript
// Change from:
function formatDateForDB(dateString: string): string {
  if (!dateString) return new Date().toISOString().split('T')[0];
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

// To:
function parseCsvDateForDB(dateString: string | null | undefined): string {
  if (!dateString || typeof dateString !== 'string' || !dateString.trim()) {
    return formatDateOnly(new Date());
  }

  const trimmed = dateString.trim();
  let parsed: Date | null = null;
  
  // Format: M/D/YYYY or MM/DD/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
  }
  
  // Format: YYYY-MM-DD
  if (!parsed) {
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
  }
  
  // Fallback
  if (!parsed) {
    const nativeParsed = new Date(trimmed);
    if (!isNaN(nativeParsed.getTime())) {
      parsed = new Date(
        nativeParsed.getFullYear(),
        nativeParsed.getMonth(),
        nativeParsed.getDate(),
        12, 0, 0
      );
    }
  }
  
  if (parsed && !isNaN(parsed.getTime())) {
    return formatDateOnly(parsed);
  }
  
  return formatDateOnly(new Date());
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

---

## Part 3: Testing Checklist

### Date Parsing Tests
- [ ] QuickBooks date "1/15/2026" parses to "2026-01-15"
- [ ] ISO date "2026-01-15" parses to "2026-01-15"
- [ ] Dash date "01-15-2026" parses to "2026-01-15"
- [ ] Invalid date "not-a-date" returns today's date (with warning)
- [ ] Empty date returns today's date

### Timezone Tests
- [ ] Date "1/1/2026" imported in EST displays as "Jan 1, 2026" (not Dec 31)
- [ ] Date "12/31/2025" imported in PST displays as "Dec 31, 2025" (not Jan 1)
- [ ] Dates near DST transitions parse correctly

### Duplicate Detection Tests
- [ ] CSV with date "1/15/2026" matches DB record with "2026-01-15"
- [ ] Re-importing same QuickBooks CSV shows all records as duplicates
- [ ] Different dates with same amount/payee are NOT duplicates

### CSV Import Tests
- [ ] Standard CSV import creates expenses with correct dates
- [ ] QuickBooks import creates expenses with correct dates
- [ ] Date parsing errors are reported to user
- [ ] Invalid dates fallback to today with warning

---

## Part 4: Files Modified Summary

| File | Changes |
|------|---------|
| `src/utils/dateUtils.ts` | Add `parseCsvDateForDB`, `formatDateForDB`, `detectDateFormat` |
| `src/utils/expenseCsvParser.ts` | Use centralized utility, add date validation |
| `src/utils/enhancedTransactionImporter.ts` | Use centralized utility, fix duplicate detection |
| `src/utils/csvParser.ts` | Use centralized utility for QB import |
| `src/utils/enhancedCsvParser.ts` | Use centralized utility |
| `supabase/functions/_shared/transactionProcessor.ts` | Mirror frontend date parsing logic |

---

## Appendix: Date Format Reference

### QuickBooks CSV Date Formats

QuickBooks typically exports dates in `M/D/YYYY` format:
- `1/5/2026` (January 5, 2026)
- `12/31/2025` (December 31, 2025)

### Database Storage

PostgreSQL `DATE` type stores dates without time:
- Stored as: `2026-01-15`
- No timezone information

### JavaScript Date Pitfalls

```javascript
// DANGEROUS - timezone-dependent!
new Date("2026-01-15").toISOString()
// May return "2026-01-14T..." or "2026-01-15T..." depending on timezone

// SAFE - explicit date components
new Date(2026, 0, 15, 12, 0, 0)  // Month is 0-indexed, noon anchor
```

### Recommended Approach

Always:
1. Parse date strings by extracting numeric components explicitly
2. Create Date objects at noon (12:00) to avoid day-shift on timezone conversion
3. Format for DB by extracting year/month/day components (not using toISOString)

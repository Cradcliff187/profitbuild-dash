# CSV Import Critical Fixes — Implementation Plan

## Executive Summary

The QuickBooks CSV import system has **three critical gaps** that need to be resolved. This document is the comprehensive plan and Cursor docs reference for implementing the fixes.

---

## Current Architecture (What Exists)

### Four Parallel Parser Implementations

| File | Location | Role | Status |
|------|----------|------|--------|
| `enhancedTransactionImporter.ts` | `src/utils/` | **PRIMARY** — used by `ExpenseImportModal.tsx` | Active, main code path |
| `csvParser.ts` | `src/utils/` | Legacy QB parser with `mapQuickBooksToExpenses()` | **DEAD CODE** — not called by UI |
| `enhancedCsvParser.ts` | `src/utils/` | Enhanced dual-stream (revenue + expense) parser | **DEAD CODE** — not called by UI |
| `transactionProcessor.ts` | `supabase/functions/_shared/` | Edge function shared processor | Used by edge functions only |

### Active Import Flow (What Actually Runs)

```
User clicks "Import CSV" on Expenses page
  → ExpenseImportModal.tsx opens
    → parseTransactionCSV(file)           [from enhancedTransactionImporter.ts]
    → processTransactionImport(csvData)   [from enhancedTransactionImporter.ts]
      → detectInFileDuplicates()
      → detectRevenueInFileDuplicates()
      → fuzzyMatchPayee()                 [from fuzzyPayeeMatcher.ts]
      → createPayeeFromTransaction()      ← AUTO-CREATES without review
      → categorizeExpense()
      → resolveQBAccountCategory()        [from quickbooksMapping.ts]
      → supabase.insert() into expenses/project_revenues
```

### Supporting Utilities (Shared/Referenced)

| File | Location | Purpose |
|------|----------|---------|
| `fuzzyPayeeMatcher.ts` | `src/utils/` | Jaro-Winkler + token similarity matching |
| `quickbooksMapping.ts` | `src/utils/` | QB account path → expense category mapping |
| `dateUtils.ts` | `src/utils/` | `parseCsvDateForDB()`, `formatDateForDB()` |

---

## Critical Gap #1: Parallel Parser Consolidation

### Problem

Three frontend parsers (`csvParser.ts`, `enhancedCsvParser.ts`, `enhancedTransactionImporter.ts`) and one edge function parser (`transactionProcessor.ts`) duplicate the same logic with divergent implementations:

**Duplicated functions across files:**

| Function | csvParser.ts | enhancedCsvParser.ts | enhancedTransactionImporter.ts | transactionProcessor.ts |
|----------|:---:|:---:|:---:|:---:|
| `parseQuickBooksAmount()` | ✅ | ✅ | ✅ (via `parseFloat` inline) | ✅ (via `parseFloat` inline) |
| `detectPayeeTypeFromAccount()` | ✅ | ✅ (different impl) | ✅ | ✅ |
| `createPayeeFromTransaction()` | ✅ | ✅ (different impl) | ✅ | ✅ (takes supabase param) |
| `categorizeExpense()` | ✅ | ✅ (different impl) | ✅ | ✅ |
| `mapTransactionType()` | ✅ | ✅ | ✅ | ✅ |
| `createExpenseKey()` | ❌ | ❌ | ✅ | ✅ (different normalization) |
| `createRevenueKey()` | ❌ | ❌ | ✅ | ✅ |
| `ACCOUNT_CATEGORY_MAP` | ❌ | ✅ | ❌ (uses quickbooksMapping.ts) | ✅ (own copy) |

**Key divergences:**
- `categorizeExpense()` in csvParser.ts uses `ExpenseCategory` enum; transactionProcessor.ts uses raw strings
- `createExpenseKey()` normalization differs — enhancedTransactionImporter rounds to 2 decimals and lowercases name; transactionProcessor uses different formatting
- `ACCOUNT_CATEGORY_MAP` in enhancedCsvParser.ts and transactionProcessor.ts are separate copies that can drift
- Amount parsing: csvParser.ts handles currency symbols (€£¥); transactionProcessor.ts only strips `$,`

### Solution

1. **Deprecate** `csvParser.ts` and `enhancedCsvParser.ts` — mark with `@deprecated` JSDoc and add console warnings
2. **Create** `src/utils/importCore.ts` — single source of truth for all shared logic
3. **Refactor** `enhancedTransactionImporter.ts` to import from `importCore.ts`
4. **Update** `transactionProcessor.ts` to use equivalent logic (can't share ES module imports directly with Deno edge functions, but keep logic 1:1 with clear comments referencing `importCore.ts`)

### `importCore.ts` — Functions to Extract

```typescript
// From enhancedTransactionImporter.ts (canonical versions):
export function parseQuickBooksAmount(amount: string | number): number
export function normalizeString(str: string): string
export function createExpenseKey(date: string, amount: number, name: string): string
export function createRevenueKey(amount: number, date: string, invoiceNumber: string, name: string): string
export function detectPayeeTypeFromAccount(accountPath?: string): PayeeType
export function categorizeExpense(name: string, accountFullName: string, dbMappings: QBAccountMapping[]): ExpenseCategory
export function mapTransactionType(transactionType: string): TransactionType
export function mapAccountToCategory(accountPath: string): ExpenseCategory | null

// Re-export from existing files:
export { resolveQBAccountCategory, QB_ACCOUNT_MAPPING } from './quickbooksMapping'
export { fuzzyMatchPayee } from './fuzzyPayeeMatcher'
export { parseCsvDateForDB, formatDateForDB } from './dateUtils'
```

### Edge Function Alignment

The `transactionProcessor.ts` edge function **cannot** import from `src/utils/` (it runs in Deno). The approach:

1. Keep `transactionProcessor.ts` self-contained but add header comment:
   ```typescript
   /**
    * IMPORTANT: Logic in this file must stay aligned with src/utils/importCore.ts
    * When updating matching/mapping/dedup logic, update BOTH files.
    * Last synced: [date]
    */
   ```
2. Ensure the following functions produce **identical output** for identical input:
   - `createExpenseKey()` / `createRevenueKey()` — same normalization
   - `categorizeExpense()` — same mapping table
   - `detectPayeeTypeFromAccount()` — same rules
   - `mapTransactionType()` — same mapping

3. **Pin edge function imports** per `.cursorrules`:
   ```typescript
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
   ```

---

## Critical Gap #2: Payee Review Queue (Stop Auto-Creation)

### Problem

When a CSV transaction's `Name` field doesn't match any existing payee (exact or fuzzy ≥75%), the system **auto-creates a new payee record** without user review:

```typescript
// enhancedTransactionImporter.ts line ~300
} else {
  const createdPayeeId = await createPayeeFromTransaction(name, accountFullName);
  if (createdPayeeId) {
    payee_id = createdPayeeId;
    autoCreatedPayees.push({ qbName: name, payeeId: createdPayeeId, payeeType });
    partialPayees.push({ id: createdPayeeId, payee_name: name, full_name: name });
  }
}
```

This creates duplicate payees like "Home Depot" vs "The Home Depot" vs "HOME DEPOT #1234".

### Solution

Replace auto-creation with a **pending payee queue** that requires user review before import completes.

#### Database Changes

New table: `pending_payee_reviews`

```sql
CREATE TABLE pending_payee_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL,
  qb_name TEXT NOT NULL,                    -- Original name from CSV
  suggested_payee_type TEXT DEFAULT 'other', -- Auto-detected from account path
  account_full_name TEXT,                    -- QB account path for context
  resolution TEXT CHECK (resolution IN ('create_new', 'match_existing', 'skip')),
  matched_payee_id UUID REFERENCES payees(id),  -- If user picks existing
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Workflow Changes

**Before (current):**
1. Parse CSV → fuzzy match payees → auto-create unmatched → import all

**After (new):**
1. Parse CSV → fuzzy match payees → queue unmatched for review
2. Show review step in `ExpenseImportModal` with options per unmatched name:
   - **Create New** — creates payee with auto-detected type (same as current auto-create)
   - **Match Existing** — dropdown to pick existing payee (pre-populated with fuzzy suggestions)
   - **Skip** — import transaction without payee assignment
3. User resolves all pending payees → then import proceeds

#### UI Changes to `ExpenseImportModal.tsx`

Add a new step between "Review" and "Complete":

```
Upload → Review → Resolve Payees → Complete
                   ↑ NEW STEP
```

The "Resolve Payees" step shows a table:

| CSV Name | Suggested Type | Best Match | Action |
|----------|---------------|------------|--------|
| Home Depot #1234 | Material Supplier | Home Depot (87%) | [Create New] [Match: Home Depot ▼] [Skip] |
| Bob's Plumbing | Subcontractor | — | [Create New] [Match: ▼] [Skip] |

If there are no unmatched payees, skip this step entirely.

#### Code Changes

In `enhancedTransactionImporter.ts`, replace the auto-create block:

```typescript
// BEFORE:
const createdPayeeId = await createPayeeFromTransaction(name, accountFullName);

// AFTER:
pendingPayeeReviews.push({
  qbName: name,
  suggestedPayeeType: detectPayeeTypeFromAccount(accountFullName),
  accountFullName,
  suggestions: matchResult.matches
    .filter(m => m.confidence >= 40)
    .slice(0, 5)
    .map(m => ({ payee: m.payee, confidence: m.confidence }))
});
```

Add `pendingPayeeReviews` to the return type of `processTransactionImport()`.

---

## Critical Gap #3: Import Batch Tracking & Stronger Dedup

### Problem

1. **No import batch tracking** — if an import goes wrong, there's no way to identify and roll back the affected records
2. **Fragile composite key** — `date|amount|name` collisions are possible for legitimate different transactions (two $50 purchases at Home Depot on the same day)
3. **No QB Transaction ID** — standard QuickBooks CSV exports don't include a unique transaction ID

### Solution

#### Database Changes

Add `import_batch_id` column to both `expenses` and `project_revenues`:

```sql
-- New table for import batches
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  imported_by UUID REFERENCES auth.users(id),
  imported_at TIMESTAMPTZ DEFAULT now(),
  total_rows INTEGER,
  expenses_imported INTEGER DEFAULT 0,
  revenues_imported INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('processing', 'completed', 'rolled_back')) DEFAULT 'processing'
);

-- Add import_batch_id to expenses
ALTER TABLE expenses ADD COLUMN import_batch_id UUID REFERENCES import_batches(id);

-- Add import_batch_id to project_revenues  
ALTER TABLE project_revenues ADD COLUMN import_batch_id UUID REFERENCES import_batches(id);

-- Add account_full_name to composite key for better dedup
-- (already exists in expenses/revenues as column, just use in key generation)
```

#### Stronger Composite Key

Update `createExpenseKey()` to include `account_full_name` for disambiguation:

```typescript
// BEFORE:
export function createExpenseKey(date: string, amount: number, name: string): string {
  return `${date}|${Math.abs(amount).toFixed(2)}|${name.toLowerCase().trim()}`;
}

// AFTER:
export function createExpenseKey(
  date: string, 
  amount: number, 
  name: string, 
  accountFullName?: string
): string {
  const base = `${date}|${Math.abs(amount).toFixed(2)}|${name.toLowerCase().trim()}`;
  return accountFullName ? `${base}|${accountFullName.toLowerCase().trim()}` : base;
}
```

**IMPORTANT**: This is a breaking change for existing dedup. The migration must be backward-compatible:
- New imports use 4-part key (date|amount|name|account)
- Existing expense lookup still tries 3-part key as fallback
- Both enhancedTransactionImporter.ts AND transactionProcessor.ts must update

#### Import Batch Workflow

```typescript
// 1. Create batch record at import start
const { data: batch } = await supabase
  .from('import_batches')
  .insert({ file_name: fileName, imported_by: userId, total_rows: data.length })
  .select('id')
  .single();

// 2. Tag every imported expense/revenue with batch ID
const expense = {
  ...expenseData,
  import_batch_id: batch.id
};

// 3. Update batch stats on completion
await supabase
  .from('import_batches')
  .update({ 
    expenses_imported: expenseCount,
    revenues_imported: revenueCount,
    duplicates_skipped: dupCount,
    status: 'completed' 
  })
  .eq('id', batch.id);
```

#### Rollback Support

```sql
-- Rollback an import batch
UPDATE import_batches SET status = 'rolled_back' WHERE id = $1;
DELETE FROM expenses WHERE import_batch_id = $1;
DELETE FROM project_revenues WHERE import_batch_id = $1;
```

This can be exposed as a button in the import history UI later.

---

## File Change Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/utils/importCore.ts` | Shared import utilities (single source of truth) |
| `supabase/migrations/YYYYMMDD_import_batch_tracking.sql` | Schema for import_batches table + columns |
| `supabase/migrations/YYYYMMDD_pending_payee_reviews.sql` | Schema for pending_payee_reviews table |

### Files to Modify

| File | Changes |
|------|---------|
| `src/utils/enhancedTransactionImporter.ts` | Import from importCore.ts, add batch tracking, replace auto-create with pending queue, strengthen composite key |
| `src/components/ExpenseImportModal.tsx` | Add "Resolve Payees" step, import batch creation, pass batch ID through import |
| `supabase/functions/_shared/transactionProcessor.ts` | Align logic with importCore.ts, add sync comment header, update composite key |

### Files to Deprecate

| File | Action |
|------|--------|
| `src/utils/csvParser.ts` | Add `@deprecated` JSDoc to all exports, add console.warn on `mapQuickBooksToExpenses()` call |
| `src/utils/enhancedCsvParser.ts` | Add `@deprecated` JSDoc to all exports, add console.warn on `processEnhancedQuickBooksImport()` call |

### Files NOT to Touch

| File | Reason |
|------|--------|
| `src/utils/fuzzyPayeeMatcher.ts` | Working correctly, no changes needed |
| `src/utils/quickbooksMapping.ts` | Working correctly, re-exported via importCore.ts |
| `src/utils/dateUtils.ts` | Working correctly, re-exported via importCore.ts |

---

## Implementation Order (Phases)

### Phase 1: Create importCore.ts + Deprecate Dead Code
1. Create `src/utils/importCore.ts` extracting shared functions
2. Add `@deprecated` to csvParser.ts and enhancedCsvParser.ts exports
3. Refactor enhancedTransactionImporter.ts to import from importCore.ts
4. Verify ExpenseImportModal still works identically (no behavior change)

### Phase 2: Database Migrations
1. Create migration for `import_batches` table
2. Create migration for `pending_payee_reviews` table
3. Add `import_batch_id` column to `expenses` and `project_revenues`
4. Apply via Supabase MCP, create local placeholder files per `.cursorrules`

### Phase 3: Import Batch Tracking
1. Update `processTransactionImport()` to accept and propagate `import_batch_id`
2. Update `ExpenseImportModal.tsx` to create batch record before import, pass ID through
3. Update batch record with final stats on completion

### Phase 4: Payee Review Queue
1. Update `processTransactionImport()` to collect pending payees instead of auto-creating
2. Add `pendingPayeeReviews` to `TransactionImportResult` interface
3. Add "Resolve Payees" step UI to `ExpenseImportModal.tsx`
4. Wire resolution actions (create new / match existing / skip) to payee creation
5. Only proceed to actual import after all payees are resolved

### Phase 5: Strengthen Composite Key
1. Update `createExpenseKey()` and `createRevenueKey()` in importCore.ts to include account_full_name
2. Update existing expense lookup to use new key with 3-part fallback
3. Update transactionProcessor.ts edge function with same key changes
4. Test with re-import of existing CSV to verify backward compat

### Phase 6: Edge Function Sync
1. Update `transactionProcessor.ts` with aligned logic from importCore.ts
2. Add sync header comment with date
3. Ensure pinned imports per `.cursorrules`:
   ```typescript
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
   ```
4. Deploy via normal workflow (push to GitHub → Lovable auto-deploys)
5. Test edge function post-deploy

---

## Testing Checklist

### Per Phase

- [ ] Import a fresh QB CSV export — all transactions import correctly
- [ ] Re-import the same CSV — all transactions detected as duplicates
- [ ] Import CSV with new + existing transactions — only new ones import
- [ ] Verify no auto-created payees (Phase 4+)
- [ ] Verify payee review UI shows for unmatched names (Phase 4+)
- [ ] Verify import_batch_id is set on all imported records (Phase 3+)
- [ ] Verify batch stats are accurate after import
- [ ] Check mobile UI — payee review step responsive at 48px touch targets
- [ ] Verify edge function still works after Phase 6 changes

### Regression

- [ ] Existing expenses are not affected by migrations
- [ ] Revenue import still works
- [ ] Fuzzy matching confidence thresholds unchanged (75% auto, 40% suggestion)
- [ ] Project matching (including Fuel→001-GAS, GA→002-GA hardcodes) unchanged
- [ ] Category mapping priority (DB → static → description → default) unchanged
- [ ] Date parsing (M/D/YYYY, YYYY-MM-DD, MM-DD-YYYY) unchanged

---

## Critical Reminders

1. **Edge function imports MUST be pinned** — `@2.57.4` not `@2` — per `.cursorrules`
2. **Migration workflow**: Apply via MCP → query exact version → create local placeholder file
3. **Do NOT modify** `fuzzyPayeeMatcher.ts`, `quickbooksMapping.ts`, or `dateUtils.ts`
4. **transactionProcessor.ts cannot import from src/utils/** — it runs in Deno, keep self-contained but aligned
5. **Receipts are documentation only** — never feed into financial calculations
6. **Backward-compatible composite key** — new 4-part key with 3-part fallback for existing data

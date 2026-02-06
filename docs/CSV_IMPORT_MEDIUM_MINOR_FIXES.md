# CSV Import Medium & Minor Fixes — Implementation Plan

## Prerequisite

The **Critical Fixes Plan** (`CSV_IMPORT_FIX_PLAN.md`) should be completed first. This plan assumes:
- `importCore.ts` exists as the shared utilities module
- `import_batches` table and `import_batch_id` columns exist
- `pending_payee_reviews` table exists
- `csvParser.ts` and `enhancedCsvParser.ts` are deprecated
- `enhancedTransactionImporter.ts` is the single active frontend import path

---

## Issue #4 (Medium): Project Matching — Exact-Only with Hardcoded Special Cases

### Problem

Project matching in `enhancedTransactionImporter.ts` uses exact `normalizeString()` comparison against a map of `project_number` and `project_name`. Two hardcoded special cases exist:

```typescript
if (normalizedProjectWO.startsWith('fuel')) {
  mappedProjectWO = '001-GAS';
} else if (normalizedProjectWO === 'ga') {
  mappedProjectWO = '002-GA';
}
const foundProjectId = projectMap.get(normalizeString(mappedProjectWO));
```

**Failure modes:**
- Typos: `"24-001"` vs `"24-0O1"` (letter O vs zero) — goes to UNASSIGNED silently
- Partial matches: `"24-001 Kitchen"` in QB memo field — no substring extraction
- New overhead projects added later won't have hardcoded mappings
- No reporting surface for how many transactions landed in UNASSIGNED per import

The deprecated `csvParser.ts` is even worse — pure `project_number.toLowerCase()` exact match, no special cases at all.

### Solution

#### 4A: Database-Driven Project Aliases Table

Replace hardcoded special cases with a configurable aliases table:

```sql
CREATE TABLE project_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,                    -- "fuel", "ga", "Fuel - Mike", etc.
  match_type TEXT CHECK (match_type IN ('exact', 'starts_with', 'contains')) DEFAULT 'exact',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alias, match_type)
);

-- Seed with existing hardcoded mappings
INSERT INTO project_aliases (project_id, alias, match_type) VALUES
  ((SELECT id FROM projects WHERE project_number = '001-GAS'), 'fuel', 'starts_with'),
  ((SELECT id FROM projects WHERE project_number = '002-GA'), 'ga', 'exact');
```

**Matching priority in code:**
1. Exact match on `project_number` (existing behavior)
2. Exact match on `project_name` (existing behavior)
3. DB aliases — exact, then starts_with, then contains
4. Fuzzy match on project_number (new — see 4B)
5. UNASSIGNED (fallback)

#### 4B: Fuzzy Project Number Matching

Add lightweight fuzzy matching for project numbers. Project numbers follow patterns like `24-001`, `WO-24-003`, etc. — mostly alphanumeric with dashes.

```typescript
// In importCore.ts
export function fuzzyMatchProject(
  qbProjectWO: string,
  projects: Array<{ id: string; project_number: string; project_name: string }>,
  aliases: Array<{ project_id: string; alias: string; match_type: string }>
): { project_id: string; confidence: number; matchType: string } | null {

  const normalized = normalizeString(qbProjectWO);

  // Priority 1: Exact project_number
  for (const p of projects) {
    if (normalizeString(p.project_number) === normalized) {
      return { project_id: p.id, confidence: 100, matchType: 'exact_number' };
    }
  }

  // Priority 2: Exact project_name
  for (const p of projects) {
    if (normalizeString(p.project_name) === normalized) {
      return { project_id: p.id, confidence: 100, matchType: 'exact_name' };
    }
  }

  // Priority 3: DB aliases
  for (const alias of aliases.filter(a => a.match_type === 'exact')) {
    if (normalizeString(alias.alias) === normalized) {
      return { project_id: alias.project_id, confidence: 95, matchType: 'alias_exact' };
    }
  }
  for (const alias of aliases.filter(a => a.match_type === 'starts_with')) {
    if (normalized.startsWith(normalizeString(alias.alias))) {
      return { project_id: alias.project_id, confidence: 90, matchType: 'alias_prefix' };
    }
  }
  for (const alias of aliases.filter(a => a.match_type === 'contains')) {
    if (normalized.includes(normalizeString(alias.alias))) {
      return { project_id: alias.project_id, confidence: 80, matchType: 'alias_contains' };
    }
  }

  // Priority 4: Fuzzy match on project_number (Jaro-Winkler for typo tolerance)
  // Only for construction projects — don't fuzzy match overhead/system projects
  let bestMatch: { project_id: string; confidence: number } | null = null;
  for (const p of projects) {
    const similarity = jaroWinkler(normalized, normalizeString(p.project_number)) * 100;
    if (similarity >= 85 && (!bestMatch || similarity > bestMatch.confidence)) {
      bestMatch = { project_id: p.id, confidence: similarity };
    }
  }
  if (bestMatch) {
    return { ...bestMatch, matchType: 'fuzzy_number' };
  }

  // Priority 5: Substring extraction — try to extract project number pattern from QB field
  // Handles cases like "24-001 Kitchen Remodel" or "WO#24-003"
  const projectNumberPattern = /(\d{2,4}-\d{2,4}(?:-WO-\d+)?)/;
  const extracted = qbProjectWO.match(projectNumberPattern);
  if (extracted) {
    const extractedNormalized = normalizeString(extracted[1]);
    for (const p of projects) {
      if (normalizeString(p.project_number) === extractedNormalized) {
        return { project_id: p.id, confidence: 90, matchType: 'extracted_number' };
      }
    }
  }

  return null; // → UNASSIGNED
}
```

**Note:** Import the `jaroWinkler` function from `fuzzyPayeeMatcher.ts` — it's currently not exported. Either export it or extract it to `importCore.ts`.

#### 4C: Unassigned Transaction Reporting in Import Results

Add prominent unassigned transaction reporting to the import UI:

**In `TransactionImportResult` interface — add:**
```typescript
unmatchedProjects: Array<{
  qbProjectWO: string;         // Original value from CSV
  transactionCount: number;    // How many transactions had this value
  totalAmount: number;         // Sum of amounts for these transactions
  suggestions?: Array<{        // Fuzzy match suggestions
    project_number: string;
    project_name: string;
    confidence: number;
  }>;
}>;
```

**In `ExpenseImportModal.tsx` Review step — add a warning card:**
```
⚠ 12 transactions ($4,230.50) assigned to 000-UNASSIGNED

  "24-0O1"  → 8 transactions ($3,100.00)  — Did you mean: 24-001 (94% match)?
  ""        → 3 transactions ($980.50)    — No Project/WO # in CSV
  "Kitchen" → 1 transaction ($150.00)     — No matching project found
```

Users should be able to reassign these before import completes (dropdown per unmatched group), similar to the payee review queue from the Critical Fixes plan.

### Files to Change

| File | Changes |
|------|---------|
| `src/utils/importCore.ts` | Add `fuzzyMatchProject()`, export `jaroWinkler()` |
| `src/utils/enhancedTransactionImporter.ts` | Replace hardcoded project matching with `fuzzyMatchProject()`, load aliases from DB, populate `unmatchedProjects` with details |
| `src/components/ExpenseImportModal.tsx` | Add unassigned project warning card in Review step, optional reassignment UI |
| `supabase/functions/_shared/transactionProcessor.ts` | Align project matching logic, load aliases |
| New migration | Create `project_aliases` table + seed data |

---

## Issue #5 (Medium): Revenue Client Matching — Weaker Than Payee Matching

### Problem

The `enhancedCsvParser.ts` (deprecated, but its client matching concept needs to move forward) uses basic Levenshtein distance for client matching:

```typescript
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const distance = levenshteinDistance(longer, shorter);
  return ((longer.length - distance) / longer.length) * 100;
};
```

Meanwhile, payee matching in `fuzzyPayeeMatcher.ts` uses the full treatment:
- Jaro-Winkler similarity
- Token-based similarity (handles word reordering)
- Business name normalization (strips Inc, LLC, Corp, etc.)
- Combined weighted score

This means "Smith & Associates LLC" vs "Smith and Associates" would score poorly with Levenshtein but well with Jaro-Winkler + token matching.

**Additional issue:** The active import path (`enhancedTransactionImporter.ts`) does client matching for revenues using only exact `clientMap` lookup with `normalizeString()`:
```typescript
clientMap.set(normalizeString(client.client_name), client.id);
```
No fuzzy matching at all for revenue client matching in the live code path.

### Solution

#### 5A: Create `fuzzyMatchClient()` in `importCore.ts`

Mirror the `fuzzyMatchPayee()` approach but adapted for client entities:

```typescript
// In importCore.ts
export interface PartialClient {
  id: string;
  client_name: string;
  company_name?: string | null;
}

export function fuzzyMatchClient(
  qbName: string,
  clients: PartialClient[]
): FuzzyMatchResult<PartialClient> {
  // Same algorithm as fuzzyMatchPayee but matches against:
  // - client_name
  // - company_name
  // Uses jaroWinkler + tokenSimilarity + business name normalization
  // Same thresholds: 75% auto-match, 40% suggestion
}
```

The implementation should:
1. Reuse `jaroWinkler()` and `tokenSimilarity()` from `fuzzyPayeeMatcher.ts` (extract to importCore.ts)
2. Normalize business names (strip LLC, Inc, Corp, & → and, etc.)
3. Match against both `client_name` and `company_name` fields
4. Return same structure as `fuzzyMatchPayee()` for UI consistency

#### 5B: Wire Client Fuzzy Matching into Revenue Import

In `enhancedTransactionImporter.ts`, the revenue processing section currently does:
```typescript
const client_id = clientMap.get(normalizeString(name)) || UNASSIGNED_CLIENT_ID;
```

Replace with:
```typescript
let client_id: string | undefined;
if (name) {
  const clientMatch = fuzzyMatchClient(name, partialClients);
  if (clientMatch.bestMatch && clientMatch.bestMatch.confidence >= 75) {
    client_id = clientMatch.bestMatch.client.id;
    // Track match for reporting
  } else if (clientMatch.matches.length > 0) {
    // Add to pending client review (same pattern as pending payee review)
  }
}
```

#### 5C: Client Review Queue (Optional — Depends on Critical Fix Phase 4)

If the payee review queue from Critical Fixes is implemented, extend the same pattern:
- Add `pendingClientReviews` to `TransactionImportResult`
- Show client resolution in the same "Resolve Entities" step as payees
- Options: Match Existing / Create New Client / Skip

### Files to Change

| File | Changes |
|------|---------|
| `src/utils/importCore.ts` | Add `fuzzyMatchClient()`, extract `jaroWinkler()` and `tokenSimilarity()` from fuzzyPayeeMatcher.ts |
| `src/utils/fuzzyPayeeMatcher.ts` | Export `jaroWinkler()` and `tokenSimilarity()` (or move to importCore.ts) |
| `src/utils/enhancedTransactionImporter.ts` | Replace exact client lookup with `fuzzyMatchClient()`, add client match reporting |
| `src/components/ExpenseImportModal.tsx` | Add client resolution UI if client review queue is implemented |

---

## Issue #6 (Medium): Category Mapping Gaps — Unmapped Accounts Not Surfaced

### Problem

The static `ACCOUNT_CATEGORY_MAP` in `quickbooksMapping.ts` covers ~20-25 QuickBooks account paths. Anything not in the dictionary and not matching description keywords falls to `OTHER`. The `unmappedAccounts` array IS tracked in the import result, but it's displayed as a tiny afterthought in the completion step:

```tsx
{importResults.unmappedAccounts && importResults.unmappedAccounts.length > 0 && (
  <div className="mt-4 pt-4 border-t border-green-200">
    <h5 className="font-medium text-sm mb-2">Unmapped Accounts</h5>
    <div className="text-xs text-amber-700">
      {importResults.unmappedAccounts.slice(0, 5).join(', ')}
      {importResults.unmappedAccounts.length > 5 && ` +${importResults.unmappedAccounts.length - 5} more`}
    </div>
  </div>
)}
```

This means unmapped accounts are only visible AFTER import, truncated to 5, with no actionable path to fix them.

### Solution

#### 6A: Surface Unmapped Accounts in the Review Step (Pre-Import)

Move unmapped account reporting from the completion step to the **Review step**, before the user clicks "Import". Show each unmapped account with:
- The QB account full path
- How many transactions use this account
- A dropdown to assign a category (writes to `quickbooks_account_mappings` table)

```
⚙ 3 Unmapped QuickBooks Accounts

  "Cost of Goods Sold:Dumpster Rental"  → 7 transactions  [Select Category ▼]
  "Expenses:Tool Sharpening"            → 2 transactions  [Select Category ▼]  
  "Job Expenses:Safety Equipment"       → 1 transaction   [Select Category ▼]
  
  [Save Mappings & Continue]  [Skip — Import as "Other"]
```

When the user saves a mapping, it writes to `quickbooks_account_mappings` table with `is_active: true`, so the next import automatically picks it up.

#### 6B: Enrich `processTransactionImport()` Return Data

Add per-account transaction counts to the unmapped accounts data:

```typescript
// In TransactionImportResult interface — change unmappedAccounts from string[] to:
unmappedAccounts: Array<{
  accountFullName: string;
  transactionCount: number;
  totalAmount: number;
  suggestedCategory?: ExpenseCategory;  // AI/heuristic suggestion based on account name keywords
}>;
```

**Suggestion heuristic** — before falling through to OTHER, do a keyword scan on the account name itself (not just the description):
```typescript
function suggestCategoryFromAccountName(accountFullName: string): ExpenseCategory | null {
  const lower = accountFullName.toLowerCase();
  if (lower.includes('dumpster') || lower.includes('disposal')) return ExpenseCategory.MATERIALS;
  if (lower.includes('tool') || lower.includes('safety')) return ExpenseCategory.EQUIPMENT;
  if (lower.includes('insurance') || lower.includes('bond')) return ExpenseCategory.MANAGEMENT;
  // etc.
  return null;
}
```

This pre-fills the dropdown with a reasonable suggestion the user can accept or override.

#### 6C: "Manage Mappings" Link from Import Modal

Add a small link/button in the import modal's Review step that opens the existing `AccountMappingsManager` component (already exists at `src/components/AccountMappingsManager.tsx`) either inline or as a sheet/dialog, so users can manage all their mappings without leaving the import flow.

### Files to Change

| File | Changes |
|------|---------|
| `src/utils/importCore.ts` | Add `suggestCategoryFromAccountName()` |
| `src/utils/enhancedTransactionImporter.ts` | Enrich `unmappedAccounts` return data with counts and suggestions |
| `src/components/ExpenseImportModal.tsx` | Move unmapped accounts to Review step, add inline category assignment, link to AccountMappingsManager |

---

## Issue #7 (Medium): Composite Key Normalization Inconsistency

### Problem

In `enhancedTransactionImporter.ts`:
```typescript
const primaryKey = createExpenseKey(date, amount, name);
// createExpenseKey uses: `${date}|${Math.abs(amount).toFixed(2)}|${name.toLowerCase().trim()}`
```

In `ExpenseImportModal.tsx` preview dedup logic:
```typescript
const amount = Math.round(Math.abs(parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0')) * 100) / 100;
```

`Math.abs(1234.5).toFixed(2)` → `"1234.50"` (string)
`Math.round(Math.abs(1234.5) * 100) / 100` → `1234.5` (number)

When used as Map keys, the string `"1234.50"` and number `1234.5` are different keys. In practice this likely doesn't cause real bugs because the preview dedup and the actual import dedup use separate Maps, but it's a ticking time bomb.

### Solution

This is straightforward — already partially addressed by the Critical Fixes `importCore.ts` extraction.

#### 7A: Single `normalizeAmount()` Function in `importCore.ts`

```typescript
export function normalizeAmount(amount: number): string {
  return Math.abs(amount).toFixed(2);
}
```

Use this everywhere — in `createExpenseKey()`, `createRevenueKey()`, and in `ExpenseImportModal.tsx` preview logic.

#### 7B: Update ExpenseImportModal Preview Dedup

In `ExpenseImportModal.tsx`, the `categorizeTransactions` logic that separates new vs duplicate records in the preview should import and use `createExpenseKey()` from `importCore.ts` instead of rolling its own amount normalization:

```typescript
import { createExpenseKey, createRevenueKey } from '@/utils/importCore';

// In preview categorization:
const key = createExpenseKey(date, parsedAmount, name, accountFullName);
```

### Files to Change

| File | Changes |
|------|---------|
| `src/utils/importCore.ts` | Add `normalizeAmount()`, use in `createExpenseKey()` and `createRevenueKey()` |
| `src/components/ExpenseImportModal.tsx` | Import and use `createExpenseKey()` from importCore for preview dedup |

---

## Issue #8 (Minor): Import History / Audit Trail UI

### Problem

The `import_batches` table is being created as part of the Critical Fixes plan, but there's no UI to view import history, and no way to identify which transactions came from which import or roll back a bad import.

### Solution

#### 8A: Import History Tab on Expenses Page

The Expenses page (`src/pages/Expenses.tsx`) already has multiple tabs. Add an "Import History" tab:

```tsx
<TabsTrigger value="imports">
  <History className="h-4 w-4 mr-1" />
  Import History
</TabsTrigger>
```

Content: a table showing:
| Date | File Name | Expenses | Revenues | Duplicates | Errors | Status | Actions |
|------|-----------|----------|----------|------------|--------|--------|---------|
| 2/6/26 | YTD_2026.csv | 45 | 12 | 23 | 0 | Completed | [View Details] |

#### 8B: Import Batch Detail View

Clicking "View Details" shows:
- All expenses/revenues with `import_batch_id` = this batch
- Rollback button (deletes all records with this batch ID, updates status to `rolled_back`)
- Re-import suggestion if rolled back

#### 8C: Visual Indicator on Expense Records

In the expenses list, add a subtle badge or icon for imported records:
```tsx
{expense.import_batch_id && (
  <Badge variant="outline" className="text-xs">CSV Import</Badge>
)}
```

### Files to Change

| File | Changes |
|------|---------|
| `src/pages/Expenses.tsx` | Add "Import History" tab |
| New: `src/components/ImportHistory.tsx` | Import history list component |
| New: `src/components/ImportBatchDetail.tsx` | Batch detail view with rollback |
| `src/components/ExpensesList.tsx` | Add import badge indicator |

---

## Issue #9 (Minor): Match Threshold Validation / Logging

### Problem

The 75% auto-match threshold was raised from 60% but there's no data to validate whether this is optimal. False positives (wrong payee matched) and false negatives (good match rejected) both have costs.

### Solution

#### 9A: Log Match Decisions to `import_batches` Metadata

Add a `match_log` JSONB column to `import_batches`:

```sql
ALTER TABLE import_batches ADD COLUMN match_log JSONB DEFAULT '[]';
```

During import, log every match decision:
```typescript
matchLog.push({
  qbName: name,
  matchedPayee: bestMatch?.payee.payee_name,
  confidence: bestMatch?.confidence,
  decision: bestMatch?.confidence >= 75 ? 'auto_matched' : 
            bestMatch?.confidence >= 40 ? 'suggested' : 'unmatched',
  algorithm: 'jaro_winkler_token'
});
```

#### 9B: Match Quality Report (Future)

This is a future enhancement, not for this phase. But the logged data enables:
- Histogram of match confidence scores
- Identifying which payees are frequently low-confidence
- A/B testing different thresholds

### Files to Change

| File | Changes |
|------|---------|
| Migration | Add `match_log JSONB` to `import_batches` |
| `src/utils/enhancedTransactionImporter.ts` | Populate match_log during import |
| `src/components/ImportBatchDetail.tsx` | Display match log in batch detail view |

---

## Issue #10 (Minor): Split Expense Dedup Awareness

### Problem

Split expenses (`is_split = true`) are excluded from duplicate detection:
```typescript
.eq('is_split', false)
```

This is correct — a split expense has a different amount per project allocation, so the composite key wouldn't match. But if someone imports a transaction that was previously manually entered and then split, it won't be caught.

### Solution

#### 10A: Check Parent Amount for Split Expenses

When building the existing expenses map for dedup, include split expenses but use the **parent amount** (original pre-split amount):

```typescript
// Current: excludes splits
const { data: existingExpenses } = await supabase
  .from('expenses')
  .select('id, amount, expense_date, description, payees(payee_name)')
  .eq('is_split', false);

// New: include splits, use parent amount for key
const { data: allExpenses } = await supabase
  .from('expenses')
  .select('id, amount, expense_date, description, is_split, payees(payee_name)');

// For split expenses, look up parent amount from expense_splits table
// or just use the amount field (which should be the full amount on the parent record)
```

**Important nuance:** When `is_split = true`, the `amount` field on the expense record is the **full original amount**, not the split allocation. The split allocations are in the `expense_splits` table. So the parent expense record's amount IS the right value for the composite key.

The fix is simply removing `.eq('is_split', false)` from the existing expenses query. The composite key will match because the parent expense has the full original amount.

#### 10B: Add Logging When Split Dedup Fires

When a duplicate is detected against a split expense, add a note in the match:

```typescript
if (existingExpense && existingExpense.is_split) {
  databaseDuplicates.push({
    transaction: row,
    existingExpenseId: existingExpense.id,
    matchKey: primaryKey,
    note: 'Matched against a split expense — review allocations if re-importing'
  });
}
```

### Files to Change

| File | Changes |
|------|---------|
| `src/utils/enhancedTransactionImporter.ts` | Remove `is_split = false` filter, add split-aware dedup logging |

---

## Implementation Order

### Phase A: Quick Wins (Issues #7, #10)
1. Add `normalizeAmount()` to `importCore.ts`, update all key generation
2. Update ExpenseImportModal preview to use importCore key functions
3. Remove `is_split = false` filter from dedup query, add split-aware logging
4. **No migrations, no UI changes — purely code alignment**

### Phase B: Project Matching Overhaul (Issue #4)
1. Create `project_aliases` migration + seed data
2. Add `fuzzyMatchProject()` to `importCore.ts`
3. Extract and export `jaroWinkler()` for reuse
4. Replace hardcoded project matching in `enhancedTransactionImporter.ts`
5. Add unmatched project reporting with suggestions to import results
6. Update ExpenseImportModal Review step with project warning card
7. Align `transactionProcessor.ts` edge function

### Phase C: Client Matching Upgrade (Issue #5)
1. Add `fuzzyMatchClient()` to `importCore.ts`
2. Wire into revenue processing in `enhancedTransactionImporter.ts`
3. Add client match reporting to import results
4. Optionally add client review queue if payee queue exists

### Phase D: Category Mapping UX (Issue #6)
1. Enrich `unmappedAccounts` return data with counts and suggestions
2. Add `suggestCategoryFromAccountName()` to `importCore.ts`
3. Move unmapped accounts display from completion to Review step
4. Add inline category assignment with save to `quickbooks_account_mappings`
5. Add link to `AccountMappingsManager` from import modal

### Phase E: Import History UI (Issue #8)
1. Create `ImportHistory.tsx` component
2. Create `ImportBatchDetail.tsx` with rollback functionality
3. Add "Import History" tab to Expenses page
4. Add import badge to expense list items

### Phase F: Match Logging (Issue #9)
1. Add `match_log JSONB` to `import_batches` table
2. Populate during import
3. Display in batch detail view

---

## Database Migration Summary

| Migration | Tables/Columns |
|-----------|----------------|
| `project_aliases` | New table: `project_aliases` (id, project_id, alias, match_type, is_active) + seed data |
| `import_batch_match_log` | Add `match_log JSONB DEFAULT '[]'` to `import_batches` |

**Note:** `import_batches` and `pending_payee_reviews` tables are created in the Critical Fixes plan. This plan only adds the `match_log` column extension.

---

## Edge Function Impact

`supabase/functions/_shared/transactionProcessor.ts` needs updates for:
- Issue #4: Load `project_aliases`, use `fuzzyMatchProject()` logic (keep self-contained but aligned)
- Issue #7: Use same `normalizeAmount()` approach in composite key generation

**Remember:** Pin all imports per `.cursorrules`:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
```

---

## Testing Checklist

### Issue #4 — Project Matching
- [ ] "Fuel - Mike" correctly maps to 001-GAS via alias
- [ ] "ga" correctly maps to 002-GA via alias
- [ ] Typo "24-0O1" gets fuzzy suggestion for "24-001"
- [ ] "24-001 Kitchen" extracts project number correctly
- [ ] Unmatched projects show in Review step with counts and amounts
- [ ] New alias added via DB is picked up on next import

### Issue #5 — Client Matching
- [ ] "Smith & Associates LLC" matches "Smith and Associates" at ≥75%
- [ ] Revenue transactions use fuzzy client matching, not just exact
- [ ] Low-confidence client matches appear as suggestions

### Issue #6 — Category Mapping
- [ ] Unmapped accounts appear in Review step (not just completion)
- [ ] Inline category assignment saves to `quickbooks_account_mappings`
- [ ] Next import auto-maps previously unmapped accounts
- [ ] Suggested categories pre-fill from account name keywords

### Issue #7 — Key Normalization
- [ ] Preview dedup and actual dedup use identical key generation
- [ ] No type mismatches (string vs number) in map keys

### Issue #8 — Import History
- [ ] Import history tab shows all past batches
- [ ] Batch detail shows individual records
- [ ] Rollback deletes batch records and updates status

### Issue #9 — Match Logging
- [ ] Match decisions logged to `import_batches.match_log`
- [ ] Log viewable in batch detail

### Issue #10 — Split Dedup
- [ ] Previously-split expense detected as duplicate on re-import
- [ ] Split-aware note appears in duplicate reporting

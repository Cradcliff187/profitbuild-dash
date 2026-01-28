
# Fix: Align Quotes Page Contract Display with Project Documents

## Problem Summary

Two misalignments exist between the Quotes page and Project Documents:

1. **Display Mismatch**: The Quotes page shows `contract_number` (user-entered like "4545") while Project Documents shows the `internal_reference` (auto-generated like "Q-ABF-225001-03")

2. **Data Orphans**: When contracts are deleted from the `contracts` table, the corresponding entries in `project_documents` remain (orphaned records)

---

## Root Cause Analysis

**Contract Generation Flow:**
```
User clicks "Generate Contract"
       ↓
Edge Function executes
       ↓
┌─────────────────────────────────────┐
│  1. Creates row in `contracts`      │
│     - contract_number: user input   │
│     - internal_reference: auto      │
│                                     │
│  2. Creates row in `project_documents`
│     - file_name: uses internal_ref  │
│     - related_quote_id: links quote │
└─────────────────────────────────────┘
```

**Current Display Logic:**

| Location | Code | Shows |
|----------|------|-------|
| QuoteForm.tsx line 1162 | `{c.contract_number}` | "4545" |
| QuoteViewRoute.tsx line 132 | `internal_reference \|\| contract_number` | Correct! |
| ContractsListView.tsx line 84 | `internal_reference \|\| contract_number` | Correct! |

The QuoteForm is the only component still showing `contract_number` instead of `internal_reference`.

---

## Solution

### Change 1: Fix QuoteForm.tsx Display

**File:** `src/components/QuoteForm.tsx`

Update line 1162 to prefer `internal_reference`:

```typescript
// Before:
<p className="font-medium truncate">{c.contract_number}</p>

// After:
<p className="font-medium truncate">{c.internal_reference || c.contract_number}</p>
```

This matches the pattern already used in `QuoteViewRoute.tsx` and `ContractsListView.tsx`.

---

### Change 2: Cascade Delete from project_documents

When a contract is deleted, the related document should also be deleted. Options:

**Option A: Database Trigger (Recommended)**

Create a trigger on `contracts` table that deletes related `project_documents` entries:

```sql
CREATE OR REPLACE FUNCTION delete_related_project_documents()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM project_documents 
  WHERE related_quote_id = OLD.quote_id 
    AND document_type = 'contract';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_delete_cascade
BEFORE DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION delete_related_project_documents();
```

**Option B: Manual Cleanup Query**

For existing orphaned documents, run:

```sql
DELETE FROM project_documents 
WHERE document_type = 'contract' 
  AND related_quote_id NOT IN (SELECT quote_id FROM contracts WHERE quote_id IS NOT NULL);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/QuoteForm.tsx` | Line 1162: Use `internal_reference \|\| contract_number` |

## Database Changes

| Change | Type |
|--------|------|
| Create cascade delete trigger | SQL migration |
| Clean up orphaned documents | One-time SQL query |

---

## Summary

This is primarily a **1-line code fix** in QuoteForm.tsx to align the display, plus optional database trigger to prevent future orphaned documents.

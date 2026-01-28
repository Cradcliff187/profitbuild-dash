
# Cleanup Plan: Remove All Test Contract Data

## Current State
| Table | Count |
|-------|-------|
| `project_documents` (contract type) | 28 records |
| `contracts` | 3 records |

**Note:** The 3 existing contracts link to quote `87deacb6-7f9d-4219-b8cf-6761d3daba4f`, and all 28 document entries reference the same quote. Since you confirmed these are all test data, we'll clean them all.

---

## Cleanup Steps

### Step 1: Delete all contract documents from `project_documents`
```sql
DELETE FROM project_documents 
WHERE document_type = 'contract';
```

### Step 2: Delete all contracts from `contracts` table
```sql
DELETE FROM contracts;
```

---

## After Cleanup
- Both tables will be empty of contract data
- The cascade delete trigger we just created will prevent future orphans
- New contracts you generate will use the aligned display (`internal_reference`)

---

## What This Cleans Up
- All 28 document timeline entries
- All 3 contract records
- Clears the slate for fresh, properly-synced data

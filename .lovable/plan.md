

# Add Notes Section to Payees

## Summary
This is a simple, low-risk change that requires adding a `notes` column to the database and updating 3 files in the UI.

## Complexity: Low
- One database migration
- Three TypeScript files to update
- No breaking changes

---

## Database Change

**Add `notes` column to `payees` table:**

```sql
ALTER TABLE payees ADD COLUMN notes text;
```

This is a nullable text column (no constraints), so it won't affect existing records.

---

## Frontend Changes

### 1. Update TypeScript Types
**File:** `src/types/payee.ts`

Add `notes?: string;` to both interfaces:
- `Payee` interface
- `CreatePayeeData` interface

### 2. Update Payee Form (Editor)
**File:** `src/components/PayeeForm.tsx`

- Add `notes: z.string().optional()` to the Zod schema
- Add `notes: payee?.notes || ""` to default values
- Add a Textarea field for notes in the "Additional Information" section
- Include `notes` in the submit handler for both create and update operations

### 3. Update Payee Details Modal (Viewer)
**File:** `src/components/PayeeDetailsModal.tsx`

- Add a new "Notes" section at the bottom (before System Information)
- Display notes in a full-width field since notes can be longer text

---

## Result
After implementation:
- Users can add notes when creating or editing payees
- Notes will display in the payee details view
- Existing payees will show empty notes (no impact on current data)
- Useful for tracking special instructions, payment preferences, contact notes, etc.


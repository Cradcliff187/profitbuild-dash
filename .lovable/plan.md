
# Update Contract Numbering System + Fix Test Data and Address

## Summary

Adding a new internal reference field with format `Q-{PayeeInitials}-{ProjectNumber}-{Version}`, making subcontract number user-entered, clearing test data, and fixing address formatting.

---

## Changes Overview

### 1. New Internal Reference Format

**Format:** `Q-{PayeeInitials}-{ProjectNumber}-{Version}`

**Examples:**
- `Q-AB-225001-01` for A&B Flooring on project 225-001, version 1
- `Q-UC-225005-02` for UC Health on project 225-005, version 2

**Logic for payee initials:**
- Take first letter of each word in payee name
- Limit to 2-3 characters
- Fallback to "XX" if name is empty

```typescript
function getPayeeInitials(payeeName: string): string {
  if (!payeeName) return 'XX';
  const words = payeeName.split(/\s+/).filter(w => w.length > 0);
  const initials = words.map(w => w[0].toUpperCase()).join('');
  return initials.slice(0, 3) || 'XX';
}
```

### 2. Database Migration

Add new column and update existing records:

```sql
-- Add internal_reference column
ALTER TABLE contracts ADD COLUMN internal_reference TEXT;

-- Make contract_number nullable (user enters subcontract number manually)
ALTER TABLE contracts ALTER COLUMN contract_number DROP NOT NULL;

-- Generate references for any existing contracts
-- (Will be done via edge function logic for new contracts)
```

### 3. Update Edge Function

**File:** `supabase/functions/generate-contract/index.ts`

Changes:
- Add `getPayeeInitials()` helper function
- Generate `internal_reference` using new format: `Q-{initials}-{projectNumber}-{version}`
- Use `internal_reference` for file naming
- Allow `contract_number` to be empty or user-provided
- Fix address parser to strip leading commas

```typescript
// Generate payee initials
function getPayeeInitials(payeeName: string): string {
  if (!payeeName) return 'XX';
  const words = payeeName.split(/\s+/).filter(w => w.length > 0);
  const initials = words.map(w => w[0].toUpperCase()).join('');
  return initials.slice(0, 3) || 'XX';
}

// Generate internal reference
const payeeInitials = getPayeeInitials(payeeName);
const projectNum = projectNumber.replace(/-/g, '');
const internalReference = `Q-${payeeInitials}-${projectNum}-${String(version).padStart(2, '0')}`;

// Use for file naming
const baseFilename = `${internalReference}_SubcontractorProjectAgreement_${timestamp}`;

// Fix address parser - strip leading commas
const city = beforeStateZip.substring(endOfStreet).replace(/^[,\s]+/, '').trim();
```

### 4. Update Frontend Hook

**File:** `src/hooks/useContractData.ts`

Changes:
- Set `subcontractNumber` to empty string (user enters manually)
- Remove `generateContractNumber()` call

```typescript
// Before
subcontractNumber: generateContractNumber(project?.project_number ?? 'NEW', clientName, existingNumbers),

// After  
subcontractNumber: '', // User enters the subcontractor's reference number
```

### 5. Update Contract Modal

**File:** `src/components/contracts/ContractGenerationModal.tsx`

- Update label to "Subcontract Number (optional)"
- Add placeholder text: "Enter subcontractor's reference number"
- Field is optional - user can leave blank or fill in later

### 6. Update UI Display

**Files:** `ContractsListView.tsx`, `QuoteViewRoute.tsx`

- Show `internal_reference` as primary identifier in contract lists
- Display format: `Q-AB-225001-01`
- Show `contract_number` (subcontract number) as secondary when available

### 7. Update Types

**File:** `src/types/contract.ts`

```typescript
export interface Contract {
  id: string;
  internal_reference: string;      // NEW: auto-generated (Q-AB-225001-01)
  contract_number: string | null;  // CHANGED: nullable, user-entered subcontract number
  // ... rest unchanged
}
```

### 8. Clear Test Data (Database)

```sql
UPDATE payees 
SET 
  contact_name = NULL,
  contact_title = NULL,
  phone_numbers = NULL
WHERE payee_name = 'A&B Flooring';
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `internal_reference` column, make `contract_number` nullable |
| `supabase/functions/generate-contract/index.ts` | Generate Q-XX-XXXXX-XX reference, fix address parser |
| `src/hooks/useContractData.ts` | Set subcontractNumber to empty |
| `src/types/contract.ts` | Add internal_reference, make contract_number nullable |
| `src/components/contracts/ContractGenerationModal.tsx` | Update labels, make subcontract number optional |
| `src/components/contracts/ContractsListView.tsx` | Show internal_reference as primary identifier |
| `src/components/project-routes/QuoteViewRoute.tsx` | Show internal_reference as primary identifier |

---

## Example Result

For a contract with:
- Payee: "A&B Flooring"
- Project: 225-001
- Version: 1

**Internal Reference (auto):** `Q-AB-225001-01`
**Subcontract Number (user):** _(blank until user enters)_
**Filename:** `Q-AB-225001-01_SubcontractorProjectAgreement_20260128.docx`

---

## Summary

After these changes:
- Internal reference uses informative format: `Q-{Initials}-{Project}-{Version}`
- Subcontract Number is user-entered (from subcontractor)
- File names use stable, descriptive internal reference
- A&B Flooring test data cleared
- RCG address displays correctly without extra comma

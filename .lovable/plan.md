

# Add Missing Fields to Payee Editor

## Problem
The Payee view modal shows fields that cannot be edited in the PayeeForm:
- **Full Name** - completely missing from form
- **Account Number** - completely missing from form
- **Is Active** (status toggle) - no way to deactivate a payee
- **Conditional fields** (hourly_rate, license_number, insurance_expires, permit_issuer) are hidden based on payee type but should always be editable

## Solution
Update `PayeeForm.tsx` to include all editable fields and remove unnecessary conditional hiding.

---

## Changes to `src/components/PayeeForm.tsx`

### 1. Update Zod Schema (lines 21-37)
Add missing fields to the validation schema:
- `full_name: z.string().optional()`
- `account_number: z.string().optional()`
- `is_active: z.boolean().optional()`

### 2. Update Default Values (lines 64-80)
Add defaults for new fields:
- `full_name: payee?.full_name || ""`
- `account_number: payee?.account_number || ""`
- `is_active: payee?.is_active ?? true` (default to active for new payees)

### 3. Add Full Name Field
Add after Payee Name field:
- Text input for full name (e.g., legal name vs business name)

### 4. Add Account Number Field
Add to Business Details section:
- Text input for vendor/payee account number

### 5. Add Is Active Toggle
Add to form:
- Checkbox or switch to mark payee as active/inactive
- Only show when editing existing payee (not when creating new)

### 6. Always Show Hourly Rate Field
Remove the conditional that hides hourly_rate for non-Internal Labor types:
- All payee types can have hourly rates (subcontractors, etc.)

### 7. Always Show License/Insurance Fields
Make license_number and insurance_expires visible for all payee types (not just subcontractors):
- Any vendor might have licenses or insurance

### 8. Update Submit Handler (lines 92-169)
Include new fields in both create and update operations:
- Add `full_name`, `account_number`, `is_active` to payeeData object

---

## Technical Notes

- The `is_active` field exists in the database and Payee type already
- `full_name` and `account_number` are already defined in the Payee type
- No database schema changes required
- Non-breaking change - existing payees will continue to work

## Result
After this change:
- All fields visible in the view modal will be editable in the form
- Users can set full names, account numbers, and deactivate payees
- Hourly rates can be set for any payee type (not just internal labor)


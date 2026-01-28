
# Fix Validation Error Messages - Show Field Name

## Problem

When clicking "Continue to Preview", if a required field is missing, the toast shows:
- **Title**: "Validation Error"
- **Description**: "This field is required"

This doesn't tell you **which field** is missing. Very frustrating!

## Root Cause

In `ContractGenerationModal.tsx` (lines 251-257), the validation error display only shows the error message, not the field name:

```typescript
const firstError = Object.values(validation.errors)[0];  // Only gets "This field is required"
toast({
  title: 'Validation Error',
  description: firstError,  // Generic message, no field info
});
```

## Solution

Update the error display to include the field name in a human-readable format.

---

## Technical Changes

### File: `src/components/contracts/ContractGenerationModal.tsx`

**1. Add a helper function to convert field paths to readable labels:**

```typescript
function fieldPathToLabel(path: string): string {
  const labels: Record<string, string> = {
    'subcontractor.company': 'Company Name',
    'subcontractor.contactName': 'Contact Name',
    'subcontractor.address': 'Address',
    'subcontractor.legalForm': 'Legal Form',
    'subcontractor.stateOfFormation': 'State of Formation',
    'project.projectNameNumber': 'Project Name/Number',
    'project.location': 'Project Location',
    'project.propertyOwner': 'Property Owner',
    'project.startDate': 'Start Date',
    'project.endDate': 'End Date',
    'contract.subcontractNumber': 'Subcontract Number',
    'contract.subcontractPrice': 'Subcontract Price',
    'contract.agreementDate': 'Agreement Date',
  };
  return labels[path] || path.split('.').pop() || path;
}
```

**2. Update error display to show field name (lines 251-258):**

```typescript
if (!validation.isValid) {
  const [firstField, firstMessage] = Object.entries(validation.errors)[0];
  const fieldLabel = fieldPathToLabel(firstField);
  toast({
    title: 'Missing Required Field',
    description: `${fieldLabel}: ${firstMessage}`,
    variant: 'destructive',
  });
  return;
}
```

---

## Result

| Before | After |
|--------|-------|
| "This field is required" | "State of Formation: This field is required" |
| No idea which field | Clear indication of missing field |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/contracts/ContractGenerationModal.tsx` | Add field label helper, update toast to show field name |

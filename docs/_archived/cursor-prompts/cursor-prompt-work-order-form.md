# Cursor AI Prompt: Work Order Form Enhancement

## Instructions for Cursor

Read the specification at `/docs/work-order-form-enhancement-spec.md` and implement the changes in two phases.

---

## Phase 1: Database Migration (Do This First)

Create a new Supabase migration file to add the `do_not_exceed` column to the projects table:

```sql
-- Add do_not_exceed column for work orders (T&M cap)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS do_not_exceed NUMERIC(12,2) NULL;

COMMENT ON COLUMN public.projects.do_not_exceed IS 'Not-to-exceed amount for T&M work orders';
```

After I run this migration and regenerate types, proceed to Phase 2.

---

## Phase 2: Update QuickWorkOrderForm.tsx

Refactor `src/components/QuickWorkOrderForm.tsx` with these specific changes:

### 1. Add Imports
```tsx
import { ClientSelector } from "@/components/ClientSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPES } from "@/types/project";
```

### 2. Update State
Replace the `formData` useState to include:
- `clientId` (string) - for client FK
- `clientName` (string) - denormalized
- `address` (string)
- `customerPoNumber` (string)
- `jobType` (string)
- `estimatedCost` (renamed from `estimatedAmount`)
- `doNotExceed` (string)

### 3. Add Client Handler
```tsx
const handleClientChange = (clientId: string, clientName?: string) => {
  setFormData(prev => ({ ...prev, clientId, clientName: clientName || '' }));
};
```

### 4. Replace Client Text Input
Replace the current `clientName` text Input with:
```tsx
<ClientSelector
  value={formData.clientId}
  onValueChange={handleClientChange}
  placeholder="Select a client"
  required={true}
  showLabel={false}
/>
```

### 5. Add New Form Fields
Add these fields in order after client:
- **Address** (Textarea, optional)
- **Customer PO Number** (Input, optional)
- **Job Type** (Select using JOB_TYPES constant)
- **Estimated Cost** (Input type="number", with helper text)
- **Do Not Exceed** (Input type="number", with helper text about T&M cap)

### 6. Update Validation
Change validation to require `clientId` instead of `clientName`:
```tsx
if (!formData.clientId || !formData.projectName.trim()) {
```

### 7. Update Database Insert
Add these fields to the insert:
- `client_id: formData.clientId || null`
- `address: formData.address || null`
- `customer_po_number: formData.customerPoNumber || null`
- `job_type: formData.jobType || null`
- `category: 'construction'`
- `original_est_costs: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null`
- `do_not_exceed: formData.doNotExceed ? parseFloat(formData.doNotExceed) : null`

---

## Reference Files

Look at these files for patterns:
- `src/components/ProjectFormSimple.tsx` - Client selector usage pattern
- `src/components/ClientSelector.tsx` - Component interface
- `src/types/project.ts` - JOB_TYPES constant location

---

## Constraints

1. Keep the simple `useState` approach - don't convert to react-hook-form
2. Maintain existing styling patterns (space-y-2, Label/Input structure)
3. Keep existing date picker and submit button logic
4. Ensure TypeScript has no errors after changes
5. Do NOT modify the `generateProjectNumber` function or its usage

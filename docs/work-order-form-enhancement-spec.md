# Work Order Form Enhancement Specification

## Overview
Enhance `QuickWorkOrderForm.tsx` to match the professional patterns used in `ProjectFormSimple.tsx`, including proper client selection, additional fields, and a new "Do Not Exceed" (NTE) amount for T&M work orders.

---

## Phase 1: Database Migration

### Create Migration File
**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_do_not_exceed_to_projects.sql`

```sql
-- Add do_not_exceed column for work orders (T&M cap)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS do_not_exceed NUMERIC(12,2) NULL;

COMMENT ON COLUMN public.projects.do_not_exceed IS 'Not-to-exceed amount for T&M work orders';
```

### Regenerate Types
After migration runs in Supabase:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

---

## Phase 2: QuickWorkOrderForm.tsx Changes

### Current File Location
`src/components/QuickWorkOrderForm.tsx`

### Current State (Problems)
| Field | Issue |
|-------|-------|
| `clientName` | Text input - should be `ClientSelector` dropdown |
| `estimatedAmount` | Ambiguous naming - is this cost or revenue? |
| Missing | `address`, `customer_po_number`, `job_type`, `do_not_exceed` |

### Required Imports (Add These)

```tsx
import { ClientSelector } from "@/components/ClientSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPES } from "@/types/project";
```

### Updated State Structure

Replace the current `formData` useState with:

```tsx
const [formData, setFormData] = useState({
  projectNumber: 'Auto-generated on save',
  clientId: '',              // NEW - for database FK
  clientName: '',            // Keep for denormalized storage
  projectName: '',
  address: '',               // NEW
  customerPoNumber: '',      // NEW
  jobType: '',               // NEW
  estimatedCost: '',         // RENAMED from estimatedAmount (clarity)
  doNotExceed: '',           // NEW - requires schema migration
  startDate: new Date(),
});
```

### Client Selection Handler

Add this handler function:

```tsx
const handleClientChange = (clientId: string, clientName?: string) => {
  setFormData(prev => ({ 
    ...prev, 
    clientId, 
    clientName: clientName || '' 
  }));
};
```

### Updated Form Fields

Replace the current `clientName` text input with:

```tsx
{/* Client - Use ClientSelector like ProjectFormSimple */}
<div className="space-y-2">
  <Label>Client *</Label>
  <ClientSelector
    value={formData.clientId}
    onValueChange={handleClientChange}
    placeholder="Select a client"
    required={true}
    showLabel={false}
  />
</div>
```

Add these new fields after the client selector:

```tsx
{/* Address */}
<div className="space-y-2">
  <Label htmlFor="address">Job Site Address</Label>
  <Textarea
    id="address"
    value={formData.address}
    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
    placeholder="Project/job site address"
    className="min-h-[60px] resize-none"
  />
</div>

{/* Customer PO Number */}
<div className="space-y-2">
  <Label htmlFor="customerPoNumber">Customer PO Number</Label>
  <Input
    id="customerPoNumber"
    value={formData.customerPoNumber}
    onChange={(e) => setFormData(prev => ({ ...prev, customerPoNumber: e.target.value }))}
    placeholder="Enter PO number (optional)"
  />
</div>

{/* Job Type */}
<div className="space-y-2">
  <Label htmlFor="jobType">Job Type</Label>
  <Select 
    value={formData.jobType} 
    onValueChange={(value) => setFormData(prev => ({ ...prev, jobType: value }))}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select job type" />
    </SelectTrigger>
    <SelectContent>
      {JOB_TYPES.map((type) => (
        <SelectItem key={type} value={type}>{type}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Update the Estimated Cost field (rename for clarity):

```tsx
{/* Estimated Cost (your costs) */}
<div className="space-y-2">
  <Label htmlFor="estimatedCost">Estimated Cost</Label>
  <Input
    id="estimatedCost"
    type="number"
    step="0.01"
    min="0"
    value={formData.estimatedCost}
    onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
    placeholder="0.00"
  />
  <p className="text-xs text-muted-foreground">Your estimated costs for this work order</p>
</div>
```

Add the Do Not Exceed field:

```tsx
{/* Do Not Exceed (T&M cap) - Requires migration */}
<div className="space-y-2">
  <Label htmlFor="doNotExceed">Do Not Exceed Amount</Label>
  <Input
    id="doNotExceed"
    type="number"
    step="0.01"
    min="0"
    value={formData.doNotExceed}
    onChange={(e) => setFormData(prev => ({ ...prev, doNotExceed: e.target.value }))}
    placeholder="0.00"
  />
  <p className="text-xs text-muted-foreground">Maximum billable amount for T&M work</p>
</div>
```

### Updated Database Insert

Replace the current insert with:

```tsx
const { data: project, error: projectError } = await supabase
  .from('projects')
  .insert({
    project_number: generatedNumber,
    project_name: formData.projectName,
    client_id: formData.clientId || null,           // NEW - FK to clients
    client_name: formData.clientName,               // Keep denormalized
    address: formData.address || null,              // NEW
    customer_po_number: formData.customerPoNumber || null,  // NEW
    job_type: formData.jobType || null,             // NEW
    project_type: 'work_order',
    category: 'construction',                        // IMPORTANT: Set explicitly
    status: 'in_progress',
    start_date: formData.startDate.toISOString().split('T')[0],
    original_est_costs: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
    do_not_exceed: formData.doNotExceed ? parseFloat(formData.doNotExceed) : null,  // NEW - requires migration
  })
  .select()
  .single();
```

### Form Validation Update

Update the validation check:

```tsx
if (!formData.clientId || !formData.projectName.trim()) {
  toast({
    title: "Error",
    description: "Please select a client and enter a project name",
    variant: "destructive",
  });
  return;
}
```

---

## Phase 3: Display Updates (Optional)

### WorkOrderCard.tsx
Consider displaying `do_not_exceed` if set:

```tsx
{project.do_not_exceed && (
  <div className="text-sm text-muted-foreground">
    NTE: {formatCurrency(project.do_not_exceed)}
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/NEW.sql` | Add `do_not_exceed` column |
| `src/integrations/supabase/types.ts` | Regenerate after migration |
| `src/components/QuickWorkOrderForm.tsx` | Major refactor (see above) |
| `src/components/WorkOrderCard.tsx` | Display `do_not_exceed` if set (optional) |

---

## Testing Checklist

- [ ] Migration runs successfully in Supabase
- [ ] Types regenerated and include `do_not_exceed`
- [ ] ClientSelector dropdown shows clients from DB
- [ ] Client selection populates both `clientId` and `clientName`
- [ ] All new fields save to database correctly
- [ ] Work orders appear in Work Orders page (not Projects page)
- [ ] Existing work orders still display correctly
- [ ] Form validation requires client selection
- [ ] "Work Order with Estimate" path still works

---

## Implementation Notes

1. **Category field**: The project category system is already implemented. Setting `category: 'construction'` ensures work orders appear in the correct lists and reports.

2. **Client denormalization**: We store both `client_id` (FK) and `client_name` (denormalized) to support queries that don't need to join the clients table.

3. **Do Not Exceed vs Contracted Amount**: 
   - `do_not_exceed` = Maximum you can bill the client (T&M cap)
   - `contracted_amount` = Calculated from approved estimates + change orders
   - These serve different purposes and both should exist

4. **Job Types**: The `JOB_TYPES` constant is imported from `@/types/project` and includes: Commercial, Emergency Service, Government, Healthcare, Industrial, Maintenance, Renovation, Residential

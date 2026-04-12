# AI Agent Instructions: KPI Validation Fixes

## Objective
Fix field mapping issues between AVAILABLE_FIELDS (SimpleReportBuilder.tsx) and KPI definitions (src/lib/kpi-definitions/) to ensure reporting section works correctly.

## Prerequisites
Before starting, run these SQL queries in Supabase to understand current state:

```sql
-- Check if gross_hours column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'gross_hours';

-- Check weekly_labor_hours view columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weekly_labor_hours'
ORDER BY ordinal_position;
```

---

## Task 1: Add Missing KPIs to expense-kpis.ts

**File:** `src/lib/kpi-definitions/expense-kpis.ts`

**Action:** Add these KPI definitions at the end of the `expenseKPIs` array, BEFORE the closing `];`

```typescript
  // ==========================================================================
  // JOINED/RELATED FIELDS (For Time Entries & Reports)
  // ==========================================================================
  {
    id: 'expense_worker_name',
    name: 'Worker Name',
    source: 'database',
    field: 'payees.payee_name',
    formula: 'Employee name from payees table via JOIN on payee_id',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, labor tracking, internal costs reports',
    notes: 'Accessed via JOIN: expenses.payee_id → payees.id. For internal workers only (is_internal=true). Aliased as worker_name in reports.',
    aliases: ['worker', 'employee', 'employee name', 'worker_name', 'payee_name'],
  },
  {
    id: 'expense_employee_number',
    name: 'Employee Number',
    source: 'database',
    field: 'payees.employee_number',
    formula: 'Employee ID from payees table via JOIN',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, payroll integration, weekly labor reports',
    notes: 'Accessed via JOIN: expenses.payee_id → payees.id.',
    aliases: ['employee #', 'employee number', 'emp number', 'emp #'],
  },
  {
    id: 'expense_hourly_rate',
    name: 'Hourly Rate',
    source: 'database',
    field: 'payees.hourly_rate',
    formula: 'Employee hourly rate from payees table via JOIN',
    dataType: 'currency',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, labor cost calculations, internal costs',
    notes: 'Accessed via JOIN: expenses.payee_id → payees.id. Used to calculate amount = hours × rate.',
    aliases: ['rate', 'hourly rate', 'pay rate', 'wage'],
  },
  {
    id: 'expense_approval_status',
    name: 'Approval Status',
    source: 'database',
    field: 'expenses.approval_status',
    formula: "ENUM: 'pending' | 'approved' | 'rejected'",
    dataType: 'enum',
    domain: 'expense',
    whereUsed: 'TimeEntries table, approval workflows, filtering, reports',
    notes: 'Tracks the approval state of time entries and expenses.',
    aliases: ['status', 'approval status', 'approval', 'approval_status'],
  },
  {
    id: 'expense_description',
    name: 'Description',
    source: 'database',
    field: 'expenses.description',
    formula: 'Free-text description/notes for the expense or time entry',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries detail, expense detail, notes field',
    notes: 'User-entered description or notes. May contain hours for manual entries.',
    aliases: ['description', 'notes', 'details', 'note'],
  },
  {
    id: 'expense_project_number',
    name: 'Project Number',
    source: 'database',
    field: 'projects.project_number',
    formula: 'Project identifier from projects table via JOIN',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, expense reports, internal costs',
    notes: 'Accessed via JOIN: expenses.project_id → projects.id.',
    aliases: ['project #', 'project number', 'proj #'],
  },
  {
    id: 'expense_project_name',
    name: 'Project Name',
    source: 'database',
    field: 'projects.project_name',
    formula: 'Project name from projects table via JOIN',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, expense reports, internal costs',
    notes: 'Accessed via JOIN: expenses.project_id → projects.id.',
    aliases: ['project name', 'project', 'job name'],
  },
  {
    id: 'expense_client_name',
    name: 'Client Name',
    source: 'database',
    field: 'projects.client_name',
    formula: 'Client name from projects table via JOIN',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, expense reports, client filtering',
    notes: 'Accessed via JOIN: expenses.project_id → projects.id.',
    aliases: ['client', 'customer', 'client name'],
  },
```

**Verification:** File should have no TypeScript errors after save.

---

## Task 2: Update gross_hours KPI Source

**File:** `src/lib/kpi-definitions/expense-kpis.ts`

**Action:** Find the existing `expense_gross_hours` KPI and update the `source` and `notes` fields.

**Find this block:**
```typescript
  {
    id: 'expense_gross_hours',
    name: 'Gross Hours',
    source: 'database',
    field: 'expenses.gross_hours',
```

**Replace with:**
```typescript
  {
    id: 'expense_gross_hours',
    name: 'Gross Hours',
    source: 'frontend',
    field: 'CALCULATED: (end_time - start_time) / 3600',
```

**Also update the notes field in the same KPI to:**
```typescript
    notes: 'CALCULATED FIELD - not stored in database. Total shift duration before lunch deduction. Computed from start_time/end_time in frontend (useTimeEntries.ts) and should be calculated in execute_simple_report RPC.',
```

---

## Task 3: Create view-kpis.ts

**File:** `src/lib/kpi-definitions/view-kpis.ts` (NEW FILE)

**Action:** Create this new file with the following content:

```typescript
/**
 * View KPI Definitions
 *
 * KPIs for database views that aggregate or transform data.
 * Views have their own column names that may differ from source tables.
 *
 * @version 1.0.0
 * @lastUpdated 2026-01-29
 */

import { KPIMeasure } from './types';

export const viewKPIs: KPIMeasure[] = [
  // ==========================================================================
  // WEEKLY LABOR HOURS VIEW
  // ==========================================================================
  {
    id: 'weekly_labor_employee_name',
    name: 'Employee Name (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.employee_name',
    formula: 'Derived from payees.payee_name via time entry aggregation',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports',
    notes: 'Employee name aggregated from time entries for the week.',
    aliases: ['employee', 'worker', 'employee_name'],
  },
  {
    id: 'weekly_labor_employee_number',
    name: 'Employee Number (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.employee_number',
    formula: 'Derived from payees.employee_number',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports',
    aliases: ['employee #', 'emp number'],
  },
  {
    id: 'weekly_labor_week_start',
    name: 'Week Start (Sunday)',
    source: 'view',
    field: 'weekly_labor_hours.week_start_sunday',
    formula: 'DATE_TRUNC(week, expense_date) adjusted to Sunday start',
    dataType: 'date',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports, date filtering',
    notes: 'First day of the week (Sunday) for the aggregated data.',
    aliases: ['week start', 'week starting', 'week_start_sunday'],
  },
  {
    id: 'weekly_labor_week_end',
    name: 'Week End (Saturday)',
    source: 'view',
    field: 'weekly_labor_hours.week_end_saturday',
    formula: 'week_start_sunday + 6 days',
    dataType: 'date',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports',
    notes: 'Last day of the week (Saturday).',
    aliases: ['week end', 'week ending', 'week_end_saturday'],
  },
  {
    id: 'weekly_labor_total_hours',
    name: 'Total Hours (Weekly Net)',
    source: 'view',
    field: 'weekly_labor_hours.total_hours',
    formula: 'SUM(expenses.hours) for the week',
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports, payroll',
    notes: 'Total net billable hours for the week (after lunch deductions).',
    aliases: ['total hours', 'weekly hours', 'hours'],
  },
  {
    id: 'weekly_labor_gross_hours',
    name: 'Gross Hours (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.gross_hours',
    formula: 'SUM(calculated gross hours) for the week',
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports, compliance',
    notes: 'Total gross shift hours for the week (before lunch deductions). VERIFY THIS COLUMN EXISTS IN VIEW.',
    aliases: ['gross hours', 'shift hours'],
  },
  {
    id: 'weekly_labor_total_cost',
    name: 'Total Cost (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.total_cost',
    formula: 'SUM(expenses.amount) for the week',
    dataType: 'currency',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports, cost analysis',
    notes: 'Total labor cost for the week.',
    aliases: ['total cost', 'weekly cost', 'labor cost'],
  },
  {
    id: 'weekly_labor_hourly_rate',
    name: 'Hourly Rate (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.hourly_rate',
    formula: 'From payees.hourly_rate or calculated average',
    dataType: 'currency',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports',
    aliases: ['rate', 'hourly rate'],
  },
  {
    id: 'weekly_labor_entry_count',
    name: 'Entry Count (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.entry_count',
    formula: 'COUNT(expenses) for the week',
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports',
    notes: 'Number of time entries in the week.',
    aliases: ['entries', 'entry count'],
  },
  {
    id: 'weekly_labor_approved_entries',
    name: 'Approved Entries (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.approved_entries',
    formula: "COUNT(expenses WHERE approval_status='approved')",
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports, approval tracking',
    aliases: ['approved', 'approved count'],
  },
  {
    id: 'weekly_labor_pending_entries',
    name: 'Pending Entries (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.pending_entries',
    formula: "COUNT(expenses WHERE approval_status='pending')",
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports, approval tracking',
    aliases: ['pending', 'pending count'],
  },
  {
    id: 'weekly_labor_rejected_entries',
    name: 'Rejected Entries (Weekly)',
    source: 'view',
    field: 'weekly_labor_hours.rejected_entries',
    formula: "COUNT(expenses WHERE approval_status='rejected')",
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'Weekly labor reports, approval tracking',
    aliases: ['rejected', 'rejected count'],
  },

  // ==========================================================================
  // TRAINING STATUS VIEW
  // ==========================================================================
  {
    id: 'training_employee_name',
    name: 'Employee Name (Training)',
    source: 'view',
    field: 'reporting.training_status.employee_name',
    formula: 'From payees.payee_name via training assignment',
    dataType: 'text',
    domain: 'training',
    whereUsed: 'Training reports',
    aliases: ['employee', 'trainee'],
  },
  {
    id: 'training_content_title',
    name: 'Content Title',
    source: 'view',
    field: 'reporting.training_status.content_title',
    formula: 'From training_content.title',
    dataType: 'text',
    domain: 'training',
    whereUsed: 'Training reports',
    aliases: ['title', 'training title', 'content'],
  },
  {
    id: 'training_content_type',
    name: 'Content Type',
    source: 'view',
    field: 'reporting.training_status.content_type',
    formula: "ENUM: 'video_link' | 'video_embed' | 'document' | 'presentation' | 'external_link'",
    dataType: 'enum',
    domain: 'training',
    whereUsed: 'Training reports',
    aliases: ['type', 'format'],
  },
  {
    id: 'training_status',
    name: 'Training Status',
    source: 'view',
    field: 'reporting.training_status.status',
    formula: "CALCULATED: 'completed' | 'overdue' | 'assigned' | 'pending'",
    dataType: 'enum',
    domain: 'training',
    whereUsed: 'Training reports, compliance tracking',
    aliases: ['status', 'completion status'],
  },
  {
    id: 'training_is_required',
    name: 'Is Required',
    source: 'view',
    field: 'reporting.training_status.is_required',
    formula: 'Boolean - whether training is mandatory',
    dataType: 'boolean',
    domain: 'training',
    whereUsed: 'Training reports, compliance',
    aliases: ['required', 'mandatory'],
  },
  {
    id: 'training_due_date',
    name: 'Due Date',
    source: 'view',
    field: 'reporting.training_status.due_date',
    formula: 'Date training must be completed by',
    dataType: 'date',
    domain: 'training',
    whereUsed: 'Training reports, deadline tracking',
    aliases: ['due', 'deadline'],
  },
  {
    id: 'training_days_remaining',
    name: 'Days Remaining',
    source: 'view',
    field: 'reporting.training_status.days_remaining',
    formula: 'due_date - CURRENT_DATE',
    dataType: 'number',
    domain: 'training',
    whereUsed: 'Training reports, deadline tracking',
    notes: 'Negative values indicate overdue.',
    aliases: ['remaining', 'days left'],
  },
  {
    id: 'training_assigned_at',
    name: 'Assigned At',
    source: 'view',
    field: 'reporting.training_status.assigned_at',
    formula: 'Timestamp when training was assigned',
    dataType: 'date',
    domain: 'training',
    whereUsed: 'Training reports',
    aliases: ['assigned', 'assignment date'],
  },
  {
    id: 'training_completed_at',
    name: 'Completed At',
    source: 'view',
    field: 'reporting.training_status.completed_at',
    formula: 'Timestamp when training was completed',
    dataType: 'date',
    domain: 'training',
    whereUsed: 'Training reports',
    aliases: ['completed', 'completion date'],
  },
];

export default viewKPIs;
```

---

## Task 4: Update index.ts to Export view-kpis

**File:** `src/lib/kpi-definitions/index.ts`

**Action 1:** Add import near the top with other imports:

```typescript
import { viewKPIs } from './view-kpis';
```

**Action 2:** Add to exports section:

```typescript
export { viewKPIs };
```

**Action 3:** Update `getAllKPIs()` function to include viewKPIs:

**Find:**
```typescript
export function getAllKPIs() {
  return [
    ...projectFinancialKPIs,
    ...estimateKPIs,
    ...expenseKPIs,
    ...quoteKPIs,
    ...revenueKPIs,
    ...changeOrderKPIs,
    ...workOrderKPIs,
    ...deprecatedKPIs,
  ];
}
```

**Replace with:**
```typescript
export function getAllKPIs() {
  return [
    ...projectFinancialKPIs,
    ...estimateKPIs,
    ...expenseKPIs,
    ...quoteKPIs,
    ...revenueKPIs,
    ...changeOrderKPIs,
    ...workOrderKPIs,
    ...viewKPIs,
    ...deprecatedKPIs,
  ];
}
```

**Action 4:** Update `getKPIsByDomain()` function:

**Find the domainMap object and add these entries:**
```typescript
    time_entry: viewKPIs.filter(k => k.domain === 'time_entry'),
    training: viewKPIs.filter(k => k.domain === 'training'),
```

---

## Task 5: Fix Type Mismatches in SimpleReportBuilder.tsx

**File:** `src/components/reports/SimpleReportBuilder.tsx`

**Action:** In the `time_entries` array within AVAILABLE_FIELDS, find and update these entries:

**Find:**
```typescript
    { key: 'start_time', label: 'Start Time', type: 'text', group: 'time', helpText: 'Time entry start time' },
    { key: 'end_time', label: 'End Time', type: 'text', group: 'time', helpText: 'Time entry end time' },
```

**Replace with:**
```typescript
    { key: 'start_time', label: 'Start Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Time entry start timestamp' },
    { key: 'end_time', label: 'End Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Time entry end timestamp' },
```

---

## Task 6: Regenerate AI Context File

**Action:** Run the sync script to update the edge function's KPI context:

```bash
npx tsx scripts/sync-edge-kpi-context.ts
```

If the script doesn't exist or fails, this can be done manually later.

---

## Task 7: Verify Changes

After all changes, run:

```bash
# TypeScript check
npm run typecheck

# Or if using tsc directly
npx tsc --noEmit
```

Ensure no TypeScript errors.

---

## Summary of Changes

| File | Action |
|------|--------|
| `src/lib/kpi-definitions/expense-kpis.ts` | Add 8 new KPIs, update gross_hours source |
| `src/lib/kpi-definitions/view-kpis.ts` | CREATE new file with 21 view KPIs |
| `src/lib/kpi-definitions/index.ts` | Import/export viewKPIs, update getAllKPIs and getKPIsByDomain |
| `src/components/reports/SimpleReportBuilder.tsx` | Fix start_time/end_time type from 'text' to 'date' |

---

## Post-Implementation: Database Verification

After code changes, verify the `weekly_labor_hours` view has the `gross_hours` column. If it doesn't exist:

**Option A:** Remove `gross_hours` from AVAILABLE_FIELDS.weekly_labor_hours

**Option B:** Update the view to include gross_hours calculation:

```sql
-- Only if gross_hours is missing from the view
-- This would need to be a migration file
```

---

## Notes for AI Agent

1. Make changes in the order listed (Tasks 1-6)
2. Do NOT modify any existing KPI definitions except `expense_gross_hours`
3. Preserve all existing code - only ADD new content or REPLACE specific blocks as noted
4. The `KPIMeasure` type is already defined in `types.ts` - do not modify it
5. If any import errors occur, check that `./types` exports `KPIMeasure`
6. Run typecheck after each file modification to catch errors early

# KPI Validation Fixes - Ready to Apply

## Fix 1: Add Missing KPIs to expense-kpis.ts

**File:** `src/lib/kpi-definitions/expense-kpis.ts`

Add these KPI definitions after the existing expense KPIs:

```typescript
  // ==========================================================================
  // JOINED/RELATED FIELDS (For Time Entries)
  // ==========================================================================
  {
    id: 'expense_worker_name',
    name: 'Worker Name',
    source: 'database',
    field: 'payees.payee_name',
    formula: 'Employee name from payees table via JOIN on payee_id',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, labor tracking, internal costs',
    notes: 'Accessed via JOIN: expenses.payee_id → payees.id. For internal workers only (is_internal=true).',
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
    whereUsed: 'TimeEntries reports, payroll integration',
    notes: 'Accessed via JOIN: expenses.payee_id → payees.id.',
    aliases: ['employee #', 'employee number', 'emp number'],
  },
  {
    id: 'expense_hourly_rate',
    name: 'Hourly Rate',
    source: 'database',
    field: 'payees.hourly_rate',
    formula: 'Employee hourly rate from payees table via JOIN',
    dataType: 'currency',
    domain: 'expense',
    whereUsed: 'TimeEntries reports, labor cost calculations',
    notes: 'Accessed via JOIN: expenses.payee_id → payees.id. Used to calculate amount = hours × rate.',
    aliases: ['rate', 'hourly rate', 'pay rate'],
  },
  {
    id: 'expense_approval_status',
    name: 'Approval Status',
    source: 'database',
    field: 'expenses.approval_status',
    formula: "ENUM: 'pending' | 'approved' | 'rejected'",
    dataType: 'enum',
    domain: 'expense',
    whereUsed: 'TimeEntries table, approval workflows, filtering',
    notes: 'Tracks the approval state of time entries and expenses.',
    aliases: ['status', 'approval status', 'approval'],
  },
  {
    id: 'expense_description',
    name: 'Description',
    source: 'database',
    field: 'expenses.description',
    formula: 'Free-text description/notes for the expense',
    dataType: 'text',
    domain: 'expense',
    whereUsed: 'TimeEntries detail, expense detail, notes',
    notes: 'User-entered description or notes for the expense/time entry.',
    aliases: ['description', 'notes', 'details'],
  },
```

---

## Fix 2: Update gross_hours KPI Source

**File:** `src/lib/kpi-definitions/expense-kpis.ts`

Find and update the `expense_gross_hours` definition:

```typescript
  {
    id: 'expense_gross_hours',
    name: 'Gross Hours',
    source: 'frontend',  // CHANGED from 'database' - this is calculated in frontend
    field: 'CALCULATED',  // CHANGED - not a real DB column
    formula: '(end_time - start_time) converted to hours',
    dataType: 'number',
    domain: 'expense',
    whereUsed: 'Time entry calculations, reports, time tracking',
    notes: 'CALCULATED FIELD: Total shift duration before lunch deduction. Computed in frontend from start_time/end_time. NOT a database column.',
    aliases: ['gross hours', 'total hours', 'shift hours', 'raw hours'],
    relatedTo: ['expense_net_hours', 'expense_start_time', 'expense_end_time'],
    preferWhen: 'User asks about total time worked before breaks',
    avoidWhen: 'User asks about billable hours (use net_hours instead)',
  },
```

**ALTERNATIVE:** If you want to add gross_hours as a real DB column:

```sql
-- Migration: add_gross_hours_column.sql

-- Add column
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS gross_hours NUMERIC(10,2);

-- Backfill existing data
UPDATE expenses
SET gross_hours = EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
WHERE start_time IS NOT NULL AND end_time IS NOT NULL;

-- Create trigger for future inserts/updates
CREATE OR REPLACE FUNCTION calculate_expense_gross_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.gross_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expense_gross_hours_trigger ON expenses;
CREATE TRIGGER expense_gross_hours_trigger
  BEFORE INSERT OR UPDATE OF start_time, end_time ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION calculate_expense_gross_hours();
```

---

## Fix 3: Fix Type Mismatches in SimpleReportBuilder.tsx

**File:** `src/components/reports/SimpleReportBuilder.tsx`

Find the `time_entries` array and update these entries:

```typescript
// BEFORE:
{ key: 'start_time', label: 'Start Time', type: 'text', group: 'time', helpText: 'Time entry start time' },
{ key: 'end_time', label: 'End Time', type: 'text', group: 'time', helpText: 'Time entry end time' },

// AFTER:
{ key: 'start_time', label: 'Start Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Time entry start time (timestamp)' },
{ key: 'end_time', label: 'End Time', type: 'date', group: 'time', allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], helpText: 'Time entry end time (timestamp)' },
```

---

## Fix 4: Create View KPIs File

**File:** `src/lib/kpi-definitions/view-kpis.ts` (NEW FILE)

```typescript
/**
 * View KPI Definitions
 *
 * KPIs for database views that aggregate or transform data.
 * These are separate from table-based KPIs because views have
 * their own column names that may differ from source tables.
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
    aliases: ['week start', 'week starting'],
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
    aliases: ['week end', 'week ending'],
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
    aliases: ['total hours', 'weekly hours'],
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
    notes: 'Total gross shift hours for the week (before lunch deductions). MAY NOT EXIST IN VIEW.',
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
  },

  // ==========================================================================
  // PROJECT FINANCIALS VIEW
  // ==========================================================================
  // Note: Many of these already exist in project-kpis.ts with view source
  // This section is for any view-specific columns not in the base tables

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
  },
];

export default viewKPIs;
```

---

## Fix 5: Update index.ts to Include View KPIs

**File:** `src/lib/kpi-definitions/index.ts`

Add import and export:

```typescript
// Add import
import { viewKPIs } from './view-kpis';

// Add to exports
export { viewKPIs };

// Update getAllKPIs function
export function getAllKPIs() {
  return [
    ...projectFinancialKPIs,
    ...estimateKPIs,
    ...expenseKPIs,
    ...quoteKPIs,
    ...revenueKPIs,
    ...changeOrderKPIs,
    ...workOrderKPIs,
    ...viewKPIs,        // ADD THIS
    ...deprecatedKPIs,
  ];
}

// Update getKPIsByDomain function
export function getKPIsByDomain(domain: string) {
  const domainMap: Record<string, any[]> = {
    project: projectFinancialKPIs,
    estimate: estimateKPIs,
    expense: expenseKPIs,
    quote: quoteKPIs,
    revenue: revenueKPIs,
    change_order: changeOrderKPIs,
    work_order: workOrderKPIs,
    time_entry: viewKPIs.filter(k => k.domain === 'time_entry'),  // ADD THIS
    training: viewKPIs.filter(k => k.domain === 'training'),      // ADD THIS
    deprecated: deprecatedKPIs,
  };
  return domainMap[domain] || [];
}
```

---

## Fix 6: Add Project Metadata KPIs

**File:** `src/lib/kpi-definitions/project-kpis.ts`

Add these at the beginning of the array (after PROJECT METADATA comment):

```typescript
  // ==========================================================================
  // PROJECT METADATA
  // ==========================================================================
  {
    id: 'project_number',
    name: 'Project Number',
    source: 'database',
    field: 'projects.project_number',
    formula: 'Unique project identifier (e.g., "2024-001")',
    dataType: 'text',
    domain: 'project',
    whereUsed: 'All project views, filtering, lookups',
    notes: 'Auto-generated sequential number. Format: YYYY-NNN.',
    aliases: ['project #', 'project number', 'project id'],
  },
  {
    id: 'project_name',
    name: 'Project Name',
    source: 'database',
    field: 'projects.project_name',
    formula: 'User-defined project name',
    dataType: 'text',
    domain: 'project',
    whereUsed: 'All project views, search, display',
    aliases: ['project name', 'name', 'title'],
  },
  {
    id: 'project_client_name',
    name: 'Client Name',
    source: 'database',
    field: 'projects.client_name',
    formula: 'Name of the client/customer',
    dataType: 'text',
    domain: 'project',
    whereUsed: 'Project lists, filtering, reports',
    aliases: ['client', 'customer', 'client name'],
  },
```

---

## Verification Queries

After applying fixes, run these to verify:

```sql
-- Check if gross_hours column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'gross_hours';

-- Check weekly_labor_hours view columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weekly_labor_hours';

-- Test time_entries data
SELECT 
  e.id,
  e.expense_date,
  e.hours,
  e.start_time,
  e.end_time,
  p.payee_name as worker_name,
  EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600 as calculated_gross_hours
FROM expenses e
LEFT JOIN payees p ON e.payee_id = p.id
WHERE e.category = 'labor_internal'
LIMIT 5;
```

---

## Summary of Files to Modify

| File | Action |
|------|--------|
| `src/lib/kpi-definitions/expense-kpis.ts` | Add 5 new KPIs for joined fields, update gross_hours |
| `src/lib/kpi-definitions/project-kpis.ts` | Add 3 metadata KPIs |
| `src/lib/kpi-definitions/view-kpis.ts` | CREATE new file with view KPIs |
| `src/lib/kpi-definitions/index.ts` | Import and export viewKPIs |
| `src/components/reports/SimpleReportBuilder.tsx` | Fix start_time/end_time types |
| `supabase/migrations/xxx_add_gross_hours.sql` | Optional: add DB column |

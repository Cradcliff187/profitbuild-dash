# Date Field Consistency Implementation Guide

**Version:** 1.0  
**Date:** January 27, 2026  
**Author:** Claude AI Review  
**Priority:** HIGH - Affects payroll, reporting, and audit accuracy

---

## Executive Summary

This document identifies and provides fixes for date field inconsistencies across the RCG Work application. The core problem is confusion between **6 distinct date/time fields** in the `expenses` table, leading to incorrect labeling in exports, inconsistent filtering in reports, and missing documentation for AI-powered features.

### Impact Areas
- ⚠️ **Payroll exports** showing wrong "Submitted At" dates
- ⚠️ **AI Reports** may filter by wrong date field
- ⚠️ **KPI Guide** missing date field documentation
- ⚠️ **Type definitions** incomplete for date fields

---

## Part 1: Date Field Reference

### The 6 Date Fields in `expenses` Table

| Field | Type | Purpose | When Set | Use For |
|-------|------|---------|----------|---------|
| `expense_date` | DATE | **When work happened** (business date) | User input | Payroll, financial reports, "last week's hours" |
| `created_at` | TIMESTAMPTZ | When record was created in system | Auto on INSERT | Audit trail, "when was this entered" |
| `submitted_for_approval_at` | TIMESTAMPTZ | When submitted for approval | On submit action | Workflow metrics, "pending for X days" |
| `approved_at` | TIMESTAMPTZ | When approved/rejected | On approval action | Approval audit, "approved on date" |
| `start_time` | TIMESTAMPTZ | Actual clock-in time (labor only) | User input | Hours calculation, schedule analysis |
| `end_time` | TIMESTAMPTZ | Actual clock-out time (labor only) | User input | Hours calculation, schedule analysis |

### Decision Tree: Which Date to Use?

```
Question about time entries/expenses?
│
├── "When did the work happen?" → expense_date
├── "When did they clock in/out?" → start_time / end_time
├── "When was this entered?" → created_at
├── "When was this submitted for approval?" → submitted_for_approval_at
├── "When was this approved?" → approved_at
│
├── PAYROLL REPORTS → expense_date (business date)
├── AUDIT TRAILS → created_at, submitted_for_approval_at, approved_at
├── FINANCIAL REPORTS → expense_date
└── APPROVAL METRICS → submitted_for_approval_at, approved_at
```

---

## Part 2: Issues Found

### Issue 1: Time Entry Export Mislabels "Submitted At" ⚠️ HIGH

**File:** `src/utils/timeEntryExport.ts`

**Problem:** Uses `created_at` but labels the column "Submitted At"

```typescript
// CURRENT (INCORRECT)
const submittedAt = format(new Date(entry.created_at), "yyyy-MM-dd HH:mm");
// ...
"Submitted At", // Column header
```

**Impact:** CSV exports for payroll show wrong "Submitted At" dates. `created_at` is when the record was created, NOT when it was submitted for approval.

---

### Issue 2: Missing Date Fields in TimeEntryListItem Interface ⚠️ MEDIUM

**File:** `src/types/timeEntry.ts`

**Problem:** Interface doesn't include `submitted_for_approval_at` or `approved_at`

```typescript
// CURRENT
export interface TimeEntryListItem {
  // ...
  created_at: string;
  // Missing: submitted_for_approval_at
  // Missing: approved_at
}
```

---

### Issue 3: useTimeEntries Hook Doesn't Fetch Approval Dates ⚠️ MEDIUM

**File:** `src/hooks/useTimeEntries.ts`

**Problem:** Query doesn't select `submitted_for_approval_at` or `approved_at`

---

### Issue 4: MobileTimeTracker Double-Filter Logic ⚠️ LOW

**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

**Problem:** Requires BOTH `created_at` AND `expense_date` to match today

```typescript
const filteredData = (data || []).filter((expense: any) => {
  const localCreatedDate = format(new Date(expense.created_at), 'yyyy-MM-dd');
  const matches = localCreatedDate === today && expense.expense_date === today;
  // ...
});
```

**Question for Chris:** Is this intentional? If someone enters yesterday's work today, it won't appear in "Today's Entries."

---

### Issue 5: KPI Definitions Missing Date Fields ⚠️ MEDIUM

**File:** `src/lib/kpi-definitions/expense-kpis.ts`

**Problem:** Missing KPI definitions for key date fields:
- `expense_date` (the business date - most important!)
- `submitted_for_approval_at`
- `approved_at`
- `created_at` (for expenses)

---

### Issue 6: AI Report Assistant Missing Date Field Documentation ⚠️ HIGH

**File:** `supabase/functions/ai-report-assistant/index.ts`

**Problem:** System prompt doesn't explain the difference between date fields. AI may use wrong date for queries like:
- "Show me last week's time entries" (should use `expense_date`)
- "Show entries submitted yesterday" (should use `submitted_for_approval_at`)
- "Show entries approved today" (should use `approved_at`)

---

### Issue 7: Few-Shot Examples Incomplete Date Guidance ⚠️ MEDIUM

**File:** `src/lib/kpi-definitions/few-shot-examples.ts`

**Problem:** Examples correctly use `expense_date` for time-based queries but don't include examples for:
- Approval workflow queries
- Submission date queries
- Audit trail queries

---

### Issue 8: Inconsistent Export Field Usage ⚠️ MEDIUM

| Export File | "Date" Column Uses | "Submitted At" Uses |
|-------------|-------------------|---------------------|
| `timeEntryExport.ts` | `expense_date` ✓ | `created_at` ✗ (wrong!) |
| `receiptExport.ts` | `date` field | `submitted_for_approval_at` ✓ |
| `BulkActionsBar.tsx` | `expense_date` ✓ | N/A |

---

## Part 3: Implementation Fixes

### Fix 1: Update TimeEntryListItem Interface

**File:** `src/types/timeEntry.ts`

**Action:** Add missing date fields to the interface

```typescript
export interface TimeEntryListItem {
  id: string;
  expense_date: string;
  start_time: string | null;
  end_time: string | null;
  amount: number;
  description: string;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  rejection_reason?: string;
  created_at: string;
  // ADD THESE FIELDS:
  submitted_for_approval_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  // ... rest of interface unchanged
}
```

---

### Fix 2: Update useTimeEntries Hook to Fetch Approval Dates

**File:** `src/hooks/useTimeEntries.ts`

**Action:** Update the select query to include approval date fields

Find the query that starts with:
```typescript
let query = supabase
  .from('expenses')
  .select(`
```

Add to the select:
```typescript
.select(`
  *,
  submitted_for_approval_at,
  approved_at,
  approved_by,
  payees!expenses_payee_id_fkey(payee_name, hourly_rate, employee_number),
  projects!expenses_project_id_fkey(project_number, project_name, client_name, address)
`)
```

Also update the mapping in the `fetchEntries` function to include:
```typescript
return {
  // ... existing fields
  submitted_for_approval_at: entry.submitted_for_approval_at,
  approved_at: entry.approved_at,
  approved_by: entry.approved_by,
};
```

---

### Fix 3: Fix Time Entry Export Headers and Data

**File:** `src/utils/timeEntryExport.ts`

**Action:** Update headers and add correct date fields

Replace the existing export function with:

```typescript
import { format } from "date-fns";
import { TimeEntryListItem } from "@/types/timeEntry";
import { parseDateOnly } from "@/utils/dateUtils";

export const exportTimeEntriesToCSV = (entries: TimeEntryListItem[]) => {
  const headers = [
    "Work Date",           // expense_date - when work happened
    "Worker",
    "Employee #",
    "Project Number",
    "Project Name",
    "Client",
    "Project Address",
    "Start Time",
    "End Time",
    "Gross Hours",
    "Lunch Taken",
    "Lunch Duration (min)",
    "Net Hours",
    "Rate",
    "Amount",
    "Status",
    "Notes",
    "Created At",          // When record was created
    "Submitted At",        // When submitted for approval
    "Approved At",         // When approved
  ];

  const rows = entries.map((entry) => {
    const workDate = parseDateOnly(entry.expense_date);
    const startTime = entry.start_time ? format(new Date(entry.start_time), "HH:mm") : "";
    const endTime = entry.end_time ? format(new Date(entry.end_time), "HH:mm") : "";
    
    // Format timestamps correctly
    const createdAt = entry.created_at 
      ? format(new Date(entry.created_at), "yyyy-MM-dd HH:mm")
      : "";
    const submittedAt = entry.submitted_for_approval_at 
      ? format(new Date(entry.submitted_for_approval_at), "yyyy-MM-dd HH:mm")
      : "";
    const approvedAt = entry.approved_at 
      ? format(new Date(entry.approved_at), "yyyy-MM-dd HH:mm")
      : "";

    return [
      format(workDate, "yyyy-MM-dd"),      // Work Date
      entry.worker_name,
      entry.payee?.employee_number || "",
      entry.project_number,
      entry.project_name,
      entry.client_name,
      entry.project_address || "",
      startTime,
      endTime,
      entry.gross_hours?.toFixed(2) || entry.hours.toFixed(2),
      entry.lunch_taken ? "Yes" : "No",
      entry.lunch_taken ? (entry.lunch_duration_minutes?.toString() || "") : "",
      entry.hours.toFixed(2),
      entry.hourly_rate.toFixed(2),
      entry.amount.toFixed(2),
      entry.approval_status || "pending",
      entry.note || "",
      createdAt,
      submittedAt,
      approvedAt,
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `time-entries-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
```

---

### Fix 4: Add Date Field KPIs to expense-kpis.ts

**File:** `src/lib/kpi-definitions/expense-kpis.ts`

**Action:** Add missing date field KPI definitions after the existing time tracking fields section

Add these KPI definitions:

```typescript
  // ==========================================================================
  // DATE/TIMESTAMP FIELDS
  // ==========================================================================
  {
    id: 'expense_date',
    name: 'Work Date / Expense Date',
    source: 'database',
    field: 'expenses.expense_date',
    formula: 'Date when the work was performed or expense incurred',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Payroll reports, financial reports, time-based filtering',
    notes: 'PRIMARY DATE FOR BUSINESS QUERIES. Use this for "last week\'s hours", payroll, financial reporting. This is the business date, not when the entry was created.',
    aliases: ['work date', 'date', 'expense date', 'business date'],
  },
  {
    id: 'expense_created_at',
    name: 'Created At',
    source: 'database',
    field: 'expenses.created_at',
    formula: 'Timestamp when the expense record was created in the system',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Audit trails, entry tracking, "when was this entered"',
    notes: 'When the record was created in the database. NOT the same as when work was done (use expense_date for that) or when it was submitted for approval.',
    aliases: ['created', 'entry date', 'record created'],
  },
  {
    id: 'expense_submitted_for_approval_at',
    name: 'Submitted For Approval At',
    source: 'database',
    field: 'expenses.submitted_for_approval_at',
    formula: 'Timestamp when the expense was submitted for approval',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Approval workflow, pending duration calculations, audit trails',
    notes: 'When the user clicked "Submit for Approval". Use for workflow metrics like "how long has this been pending".',
    aliases: ['submitted', 'submission date', 'submitted at'],
  },
  {
    id: 'expense_approved_at',
    name: 'Approved At',
    source: 'database',
    field: 'expenses.approved_at',
    formula: 'Timestamp when the expense was approved or rejected',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Approval audit trail, approval metrics, compliance reporting',
    notes: 'When the approval decision was made. May be null if status is still pending.',
    aliases: ['approved', 'approval date', 'decision date'],
  },
```

---

### Fix 5: Add Date Field Documentation to AI Report Assistant

**File:** `supabase/functions/ai-report-assistant/index.ts`

**Action:** Add date field guidance to the `criticalRules` array in `KPI_CONTEXT`

Find the `criticalRules` array and add these rules:

```typescript
criticalRules: [
  // ... existing rules ...
  
  // ADD THESE DATE RULES:
  "DATE FIELD GUIDE: Use expense_date for 'when work happened' queries (last week's hours, monthly expenses, payroll)",
  "DATE FIELD GUIDE: Use created_at for 'when was this entered' queries (audit trails, record creation)",
  "DATE FIELD GUIDE: Use submitted_for_approval_at for 'when was this submitted' queries (pending duration, workflow)",
  "DATE FIELD GUIDE: Use approved_at for 'when was this approved' queries (approval audit, compliance)",
  "DATE FIELD GUIDE: For time entries, start_time/end_time are the actual clock times; expense_date is the business date",
  "TIME ENTRY QUERIES: Always use expense_date for date filtering (e.g., 'last week', 'this month', 'yesterday')",
],
```

---

### Fix 6: Add Date-Specific Few-Shot Examples

**File:** `src/lib/kpi-definitions/few-shot-examples.ts`

**Action:** Add examples that demonstrate proper date field usage

Add these examples to the `fewShotExamples` array:

```typescript
  // ==========================================================================
  // DATE FIELD USAGE EXAMPLES
  // ==========================================================================
  {
    question: "Show me time entries submitted for approval yesterday",
    reasoning: "User wants entries by SUBMISSION date, not work date. Use submitted_for_approval_at field.",
    sql: `SELECT
  p.payee_name,
  e.expense_date as work_date,
  e.submitted_for_approval_at,
  e.approval_status,
  CASE
    WHEN e.lunch_taken = true THEN
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
    ELSE
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
  END as hours
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE e.category = 'labor_internal'
  AND e.submitted_for_approval_at >= CURRENT_DATE - INTERVAL '1 day'
  AND e.submitted_for_approval_at < CURRENT_DATE
ORDER BY e.submitted_for_approval_at DESC`,
    kpisUsed: [],
    category: 'time_based',
    responseMode: 'simple'
  },
  {
    question: "What time entries were approved today?",
    reasoning: "User wants entries by APPROVAL date. Use approved_at field.",
    sql: `SELECT
  p.payee_name,
  e.expense_date as work_date,
  e.approved_at,
  CASE
    WHEN e.lunch_taken = true THEN
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
    ELSE
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
  END as hours,
  e.amount
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE e.category = 'labor_internal'
  AND e.approval_status = 'approved'
  AND e.approved_at >= CURRENT_DATE
ORDER BY e.approved_at DESC`,
    kpisUsed: [],
    category: 'time_based',
    responseMode: 'simple'
  },
  {
    question: "How long have pending time entries been waiting for approval?",
    reasoning: "Calculate days since submission. Use submitted_for_approval_at to calculate pending duration.",
    sql: `SELECT
  p.payee_name,
  e.expense_date as work_date,
  e.submitted_for_approval_at,
  EXTRACT(DAY FROM (NOW() - e.submitted_for_approval_at)) as days_pending,
  CASE
    WHEN e.lunch_taken = true THEN
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
    ELSE
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
  END as hours,
  e.amount
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE e.category = 'labor_internal'
  AND e.approval_status = 'pending'
  AND e.submitted_for_approval_at IS NOT NULL
ORDER BY e.submitted_for_approval_at ASC`,
    kpisUsed: [],
    category: 'time_based',
    responseMode: 'analytical'
  },
```

---

### Fix 7: Update TimeEntryExportModal to Reflect New Columns

**File:** `src/components/TimeEntryExportModal.tsx`

**Action:** Update the export options to include new date columns

Find the section that builds headers based on options and update to include:

```typescript
// In the headers building section, add:
headers.push("Created At", "Submitted At", "Approved At");
```

And in the row building section:
```typescript
// Add corresponding row values
row.push(
  createdAt,  // format(new Date(entry.created_at), "yyyy-MM-dd HH:mm")
  entry.submitted_for_approval_at 
    ? format(new Date(entry.submitted_for_approval_at), "yyyy-MM-dd HH:mm") 
    : "",
  entry.approved_at 
    ? format(new Date(entry.approved_at), "yyyy-MM-dd HH:mm") 
    : ""
);
```

---

### Fix 8: Add Date Field Section to KPI Guide

**File:** `src/pages/KPIGuide.tsx`

**Action:** Add a new "Date Fields" tab or section explaining proper date usage

Add a new tab option:
```typescript
{ value: 'dates', label: 'Date Fields', icon: Calendar },
```

And a corresponding section that displays the date field reference table from Part 1 of this document.

---

### Fix 9: Update SimpleReportBuilder Field Definitions

**File:** `src/components/reports/SimpleReportBuilder.tsx`

**Action:** Update the time_entries field definitions to include all date fields with proper help text

Find the `time_entries` array in `FIELD_DEFINITIONS` and update:

```typescript
time_entries: [
  { 
    key: 'expense_date', 
    label: 'Work Date', 
    type: 'date', 
    group: 'dates', 
    allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], 
    helpText: 'Date when work was performed (business date for payroll)' 
  },
  { 
    key: 'created_at', 
    label: 'Created At', 
    type: 'date', 
    group: 'dates', 
    allowedOperators: ['equals', 'greater_than', 'less_than', 'between'], 
    helpText: 'When the time entry record was created in the system' 
  },
  { 
    key: 'submitted_for_approval_at', 
    label: 'Submitted At', 
    type: 'date', 
    group: 'dates', 
    allowedOperators: ['equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null'], 
    helpText: 'When the entry was submitted for approval' 
  },
  { 
    key: 'approved_at', 
    label: 'Approved At', 
    type: 'date', 
    group: 'dates', 
    allowedOperators: ['equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null'], 
    helpText: 'When the entry was approved or rejected' 
  },
  // ... rest of existing fields
],
```

---

## Part 4: Testing Checklist

After implementing fixes, verify:

### Time Entry Export Tests
- [ ] Export CSV has "Work Date", "Created At", "Submitted At", "Approved At" columns
- [ ] "Work Date" shows `expense_date` value
- [ ] "Created At" shows `created_at` value
- [ ] "Submitted At" shows `submitted_for_approval_at` value (or empty if null)
- [ ] "Approved At" shows `approved_at` value (or empty if null)

### AI Report Tests
- [ ] Query "Show me last week's hours" uses `expense_date` filter
- [ ] Query "Show entries submitted yesterday" uses `submitted_for_approval_at`
- [ ] Query "Show approvals from today" uses `approved_at`
- [ ] Query "How long have entries been pending" calculates from `submitted_for_approval_at`

### Report Builder Tests
- [ ] "Work Date" field available for filtering
- [ ] "Submitted At" field available for filtering
- [ ] "Approved At" field available for filtering
- [ ] Help text displays correctly for each date field

### KPI Guide Tests
- [ ] Date fields section/tab displays
- [ ] All 6 date fields documented with proper usage guidance

---

## Part 5: Files Modified Summary

| File | Changes |
|------|---------|
| `src/types/timeEntry.ts` | Add `submitted_for_approval_at`, `approved_at`, `approved_by` fields |
| `src/hooks/useTimeEntries.ts` | Update query to select approval date fields, update mapping |
| `src/utils/timeEntryExport.ts` | Fix column headers, add new date columns |
| `src/lib/kpi-definitions/expense-kpis.ts` | Add 4 new date field KPIs |
| `supabase/functions/ai-report-assistant/index.ts` | Add date field rules to criticalRules |
| `src/lib/kpi-definitions/few-shot-examples.ts` | Add 3 date-specific examples |
| `src/components/TimeEntryExportModal.tsx` | Update to include new date columns |
| `src/pages/KPIGuide.tsx` | Add Date Fields section/tab |
| `src/components/reports/SimpleReportBuilder.tsx` | Update time_entries field definitions |

---

## Part 6: Optional - Review MobileTimeTracker Filter Logic

**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

**Question for Chris:** The current logic filters entries where BOTH `created_at` AND `expense_date` match today. This means:
- If worker enters yesterday's work today → Entry won't show in "Today's Entries"
- Debug logging suggests this was intentional

**Options:**
1. **Keep current behavior** - "Today's Entries" means entries created today for today's work
2. **Change to expense_date only** - "Today's Entries" means all work done today regardless of when entered
3. **Add toggle** - Let users choose their view preference

No code change provided for this - needs clarification on intended behavior.

---

## Appendix: Database Schema Reference

```sql
-- Relevant columns from expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  expense_date DATE DEFAULT CURRENT_DATE,           -- Business date (when work happened)
  created_at TIMESTAMPTZ DEFAULT NOW(),             -- Record creation
  submitted_for_approval_at TIMESTAMPTZ,            -- When submitted for approval
  approved_at TIMESTAMPTZ,                          -- When approved/rejected
  approved_by UUID,                                 -- Who approved
  start_time TIMESTAMPTZ,                           -- Clock-in (labor only)
  end_time TIMESTAMPTZ,                             -- Clock-out (labor only)
  -- ... other columns
);

-- Indexes for date queries
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_submitted_for_approval_at ON expenses(submitted_for_approval_at);
CREATE INDEX idx_expenses_approved_at ON expenses(approved_at);
CREATE INDEX idx_expenses_approval_status ON expenses(approval_status);
```

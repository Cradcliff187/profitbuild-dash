# KPI VALIDATION RESULTS

**Generated:** 2026-01-29  
**Status:** ISSUES FOUND - Requires Fixes

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 3 | Must fix - will cause failures |
| 🟡 WARNING | 7 | Should fix - inconsistent behavior |
| 🟢 LOW | 5 | Nice to fix - documentation gaps |

---

## 🔴 CRITICAL ISSUES

### Issue #1: `worker_name` Has No KPI Definition

**Location:** 
- `AVAILABLE_FIELDS.time_entries`
- `AVAILABLE_FIELDS.internal_costs`

**Evidence:**
```typescript
// In SimpleReportBuilder.tsx - time_entries
{ key: 'worker_name', label: 'Employee', type: 'text', group: 'employee', dataSource: 'workers' }

// In SimpleReportBuilder.tsx - internal_costs  
{ key: 'worker_name', label: 'Employee/Worker', type: 'text', group: 'employee', dataSource: 'workers' }
```

**KPI Search Results:** NO KPI found with id containing "worker_name"

**Actual Source:** `payees.payee_name` via JOIN on `expenses.payee_id`

**Impact:** 
- Reports may fail if RPC doesn't alias this correctly
- Filter dropdown loads `payee_name` values but filter passes `worker_name` field

**Fix Required:**
1. Add KPI definition with `worker_name` as alias
2. OR rename to `payee_name` everywhere

---

### Issue #2: `gross_hours` Source Mismatch

**KPI Definition Says:**
```typescript
{
  id: 'expense_gross_hours',
  source: 'database',           // <-- Claims DB column
  field: 'expenses.gross_hours', // <-- Claims this column exists
  formula: '(end_time - start_time) / 3600',
}
```

**Frontend Actually Does:**
```typescript
// In useTimeEntries.ts
const grossHours = entry.start_time && entry.end_time
  ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60)
  : hours;

// In TimeEntryExportModal.tsx  
const grossHours = entry.start_time && entry.end_time
  ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60)
  : hours;
```

**Impact:**
- KPI says it's a DB column, but frontend calculates it
- Reports using `gross_hours` may get wrong/null values if RPC doesn't calculate it
- Inconsistent behavior between pages and reports

**Fix Required:**
1. Either add `gross_hours` column to `expenses` table via trigger
2. OR update KPI to `source: 'frontend'` and ensure RPC calculates it

---

### Issue #3: `weekly_labor_hours.gross_hours` May Not Exist

**AVAILABLE_FIELDS Definition:**
```typescript
// In SimpleReportBuilder.tsx - weekly_labor_hours
{ key: 'gross_hours', label: 'Gross Hours', type: 'number', group: 'time', 
  helpText: 'Total shift duration before lunch deduction.' }
```

**KPI Definition:** NONE - no KPI for weekly view columns

**Evidence from AI context:**
```typescript
// ai-context-generator.ts shows gross_hours calculation
`expenses.gross_hours` = total shift duration (use for compliance, shift tracking)
```

**Impact:**
- If `weekly_labor_hours` view doesn't have `gross_hours` column, reports will fail
- No validation that view schema matches AVAILABLE_FIELDS

**Fix Required:**
1. Verify view has this column: `SELECT * FROM weekly_labor_hours LIMIT 1;`
2. If missing, add to view or remove from AVAILABLE_FIELDS

---

## 🟡 WARNING ISSUES

### Issue #4: Type Mismatch - `start_time` / `end_time`

**AVAILABLE_FIELDS:**
```typescript
{ key: 'start_time', label: 'Start Time', type: 'text', group: 'time' }
{ key: 'end_time', label: 'End Time', type: 'text', group: 'time' }
```

**KPI Definition:**
```typescript
{
  id: 'expense_start_time',
  dataType: 'date',  // <-- KPI says date
  field: 'expenses.start_time',
}
```

**Impact:** Type filtering and formatting may be incorrect

**Fix:** Change AVAILABLE_FIELDS type from `'text'` to `'date'`

---

### Issue #5: Missing KPIs for Joined Fields

These AVAILABLE_FIELDS reference columns from joined tables but have NO KPI definitions:

| Field Key | Source Table | Used In |
|-----------|--------------|---------|
| `hourly_rate` | `payees.hourly_rate` | time_entries, internal_costs |
| `employee_number` | `payees.employee_number` | time_entries, weekly_labor_hours |
| `project_number` | `projects.project_number` | time_entries, internal_costs, quotes |
| `project_name` | `projects.project_name` | time_entries, internal_costs, quotes |
| `client_name` | `projects.client_name` | time_entries, internal_costs |

**Impact:** No validation, no documentation, no semantic mapping

**Fix:** Add KPI definitions for commonly-used joined fields

---

### Issue #6: Missing KPI for `approval_status`

**AVAILABLE_FIELDS:**
```typescript
{ key: 'approval_status', label: 'Approval Status', type: 'text', 
  enumValues: ['pending', 'approved', 'rejected'] }
```

**KPI Search:** No KPI with id `expense_approval_status` or `approval_status`

**Impact:** No semantic mapping, no documentation

**Fix:** Add KPI definition for `expenses.approval_status`

---

### Issue #7: Missing KPI for `description`

**AVAILABLE_FIELDS:**
```typescript
{ key: 'description', label: 'Description', type: 'text', group: 'project_info' }
```

**KPI Search:** No KPI found

**Fix:** Add KPI definition for `expenses.description`

---

### Issue #8: All `weekly_labor_hours` Fields Missing KPIs

Every field in `weekly_labor_hours` has NO corresponding KPI:

| Field | Status |
|-------|--------|
| `employee_number` | ⚠️ No KPI |
| `employee_name` | ⚠️ No KPI |
| `week_start_sunday` | ⚠️ No KPI |
| `week_end_saturday` | ⚠️ No KPI |
| `total_hours` | ⚠️ No KPI |
| `gross_hours` | ⚠️ No KPI |
| `total_cost` | ⚠️ No KPI |
| `hourly_rate` | ⚠️ No KPI |
| `entry_count` | ⚠️ No KPI |
| `approved_entries` | ⚠️ No KPI |
| `pending_entries` | ⚠️ No KPI |
| `rejected_entries` | ⚠️ No KPI |

**Impact:** No validation for view schema, no documentation, no semantic mappings

**Fix:** Create `view-kpis.ts` with definitions for all view columns

---

### Issue #9: `internal_labor_hours` Data Source Not in AVAILABLE_FIELDS

**ReportConfig interface lists:**
```typescript
data_source: 'projects' | 'expenses' | 'quotes' | 'time_entries' | 
             'estimate_line_items' | 'internal_costs' | 
             'internal_labor_hours' |  // <-- This one
             'weekly_labor_hours';
```

**AVAILABLE_FIELDS keys:**
- `projects` ✅
- `expenses` ✅
- `quotes` ✅
- `time_entries` ✅
- `estimate_line_items` ✅
- `internal_costs` ✅
- `weekly_labor_hours` ✅
- `internal_labor_hours` ❌ MISSING

**Impact:** Data source exists in type but no fields defined

**Fix:** Either add AVAILABLE_FIELDS for `internal_labor_hours` or remove from type

---

### Issue #10: Enum Fields Typed as `text`

These fields have `enumValues` but type is `'text'` not `'enum'`:

| Field | enumValues | Type |
|-------|------------|------|
| `status` (projects) | `project_status` enum | `text` |
| `status` (quotes) | `quote_status` enum | `text` |
| `approval_status` | `['pending', 'approved', 'rejected']` | `text` |
| `category` (expenses) | expense categories | `text` |

**Impact:** Minor - formatting may not apply enum-specific styling

**Fix:** Either add `'enum'` type support or document that `text` + `enumValues` = enum

---

## 🟢 LOW PRIORITY ISSUES

### Issue #11: `internal_costs` Duplicate of `time_entries`?

Both data sources have nearly identical fields. Unclear why both exist.

**Recommendation:** Document the difference or consolidate

---

### Issue #12: Quote Field Name Mismatch

**AVAILABLE_FIELDS:**
```typescript
{ key: 'total_amount', label: 'Total Amount', type: 'currency' }  // quotes
{ key: 'payee_name', label: 'Vendor', type: 'text' }  // quotes
```

**KPI Definitions:**
```typescript
{ id: 'quote_quote_amount', field: 'quotes.quote_amount' }  // Different key
{ id: 'quote_vendor_name', field: 'quotes.vendor_name' }  // Different key
```

**Impact:** Semantic mapping may not work correctly

---

### Issue #13: `training_status` Fields Need KPIs

All fields in `reporting.training_status` lack KPI definitions.

---

### Issue #14: No Validation Script Exists

The codebase has `validation.ts` for KPI internal consistency but does NOT validate AVAILABLE_FIELDS against KPIs.

---

### Issue #15: Templates May Reference Old Field Names

`saved_reports` table may contain templates using field names that have changed.

---

## Verified Working ✅

These fields have matching KPIs and correct types:

### time_entries
| Field | KPI | Type Match |
|-------|-----|------------|
| `expense_date` | `expense_date` | ✅ date=date |
| `created_at` | `expense_created_at` | ✅ date=date |
| `submitted_for_approval_at` | `expense_submitted_for_approval_at` | ✅ date=date |
| `approved_at` | `expense_approved_at` | ✅ date=date |
| `hours` | `expense_net_hours` | ✅ number=number |
| `amount` | `expense_amount` | ✅ currency=currency |
| `lunch_taken` | `expense_lunch_taken` | ✅ boolean=boolean |
| `lunch_duration_minutes` | `expense_lunch_duration_minutes` | ✅ number=number |

### projects
| Field | KPI | Type Match |
|-------|-----|------------|
| `contracted_amount` | `contracted_amount` | ✅ currency=currency |
| `current_margin` | `current_margin` | ✅ currency=currency |
| `margin_percentage` | `margin_percentage` | ✅ percent=percent |
| `total_expenses` | `total_expenses` | ✅ currency=currency |
| `target_margin` | `target_margin` | ✅ currency=currency |
| `projected_margin` | `projected_margin` | ✅ currency=currency |
| `original_margin` | `original_margin` | ✅ currency=currency |

---

## Action Items

### Immediate (Before Next Deploy)

1. **Verify `gross_hours` in database:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'expenses' AND column_name = 'gross_hours';
   ```

2. **Verify `weekly_labor_hours` view columns:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'weekly_labor_hours';
   ```

3. **Test `worker_name` filter in reports** - does it actually filter correctly?

### Short Term (This Sprint)

4. Add KPI definition for `worker_name` (or rename to `payee_name`)
5. Fix `start_time`/`end_time` type from `text` to `date`
6. Add `approval_status` KPI definition
7. Clarify `gross_hours` source (DB column vs calculated)

### Medium Term (Next Sprint)

8. Create `view-kpis.ts` for all view columns
9. Add KPIs for commonly-used joined fields
10. Add AVAILABLE_FIELDS validation to CI/CD
11. Audit `saved_reports` templates for stale field names

---

## SQL Verification Queries

Run these to confirm actual database state:

```sql
-- 1. Check if gross_hours column exists in expenses
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'gross_hours';

-- 2. Get all columns from weekly_labor_hours view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weekly_labor_hours'
ORDER BY ordinal_position;

-- 3. Test worker_name in time entries query
SELECT 
  e.id,
  p.payee_name as worker_name,
  e.hours,
  e.expense_date
FROM expenses e
LEFT JOIN payees p ON e.payee_id = p.id
WHERE e.category = 'labor_internal'
LIMIT 5;

-- 4. Check what execute_simple_report actually returns
SELECT jsonb_object_keys(
  (SELECT (data->0) FROM execute_simple_report('time_entries', '{}'::jsonb, 'expense_date', 'DESC', 1))
) as returned_columns;
```

---

## Files That Need Updates

| File | Changes Needed | Priority |
|------|----------------|----------|
| `src/lib/kpi-definitions/expense-kpis.ts` | Add `worker_name`, `approval_status`, `description` KPIs | 🔴 High |
| `src/lib/kpi-definitions/view-kpis.ts` | CREATE - add all view column KPIs | 🟡 Medium |
| `src/lib/kpi-definitions/index.ts` | Import/export view-kpis | 🟡 Medium |
| `src/components/reports/SimpleReportBuilder.tsx` | Fix `start_time`/`end_time` types | 🟡 Medium |
| `supabase/migrations/xxx.sql` | Add `gross_hours` column OR update view | 🔴 High |

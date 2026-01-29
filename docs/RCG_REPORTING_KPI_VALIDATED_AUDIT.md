# RCG Work Reporting Section - Complete KPI-Validated Audit

## Executive Summary

The previous audit missed a critical resource: **the KPI definitions system** (`src/lib/kpi-definitions/`). This is the **single source of truth** for all field names, formulas, data types, and aliases. The reporting section must be validated against these definitions.

---

## KPI Definitions System Overview

The codebase has a comprehensive KPI system:

```
src/lib/kpi-definitions/
├── types.ts                 # KPIMeasure interface
├── index.ts                 # Exports all KPIs and utilities
├── project-kpis.ts          # 25+ project financial metrics
├── estimate-kpis.ts         # Estimate metrics
├── expense-kpis.ts          # Expense & time tracking metrics
├── quote-kpis.ts            # Quote metrics
├── revenue-kpis.ts          # Revenue/invoicing metrics
├── change-order-kpis.ts     # Change order metrics
├── work-order-kpis.ts       # Work order metrics
├── deprecated-kpis.ts       # Legacy fields (DO NOT USE)
├── semantic-mappings.ts     # Concept → KPI mappings for AI
├── business-rules.ts        # Business logic rules
├── business-benchmarks.ts   # Healthy/warning thresholds
├── few-shot-examples.ts     # SQL examples for AI
├── ai-context-generator.ts  # Generates AI prompts
└── validation.ts            # KPI validation utilities
```

**Key files to reference:**
- `validation.ts` - Already has validation logic we can extend
- `types.ts` - Defines the `KPIMeasure` interface

---

## Required Validation Tasks

### Task 1: Validate AVAILABLE_FIELDS Against KPI Definitions

**Goal:** Every field in `SimpleReportBuilder.tsx` AVAILABLE_FIELDS must match a KPI definition.

**For each data source, verify:**

| Check | Description |
|-------|-------------|
| Field Key Match | `AVAILABLE_FIELDS.key` must match `KPIMeasure.field` (column name portion) |
| Data Type Match | `AVAILABLE_FIELDS.type` must match `KPIMeasure.dataType` |
| Label Accuracy | `AVAILABLE_FIELDS.label` should match or be an alias of `KPIMeasure.name` |
| Not Deprecated | Field should not be in `deprecated-kpis.ts` |
| Source Valid | For views, verify the view actually has this column |

**Example KPI Definition:**
```typescript
{
  id: 'expense_gross_hours',
  name: 'Gross Hours',
  source: 'database',
  field: 'expenses.gross_hours',  // <-- This defines the column name
  formula: '(end_time - start_time) / 3600',
  dataType: 'number',
  domain: 'expense',
  aliases: ['shift hours', 'total hours', 'raw hours'],
}
```

**Corresponding AVAILABLE_FIELDS entry should be:**
```typescript
{
  key: 'gross_hours',       // Must match column name from KPI field
  label: 'Gross Hours',     // Should match KPI name or alias
  type: 'number',           // Must match KPI dataType
  group: 'time',
}
```

---

### Task 2: Cross-Reference Table - Time Entries

**Data Source:** `time_entries` (actually `expenses WHERE category='labor_internal'`)

| KPI Definition | KPI Field | Expected Key | AVAILABLE_FIELDS Key | Status |
|----------------|-----------|--------------|---------------------|--------|
| expense_date | `expenses.expense_date` | `expense_date` | `expense_date` | ✅ |
| expense_created_at | `expenses.created_at` | `created_at` | `created_at` | ✅ |
| expense_submitted_for_approval_at | `expenses.submitted_for_approval_at` | `submitted_for_approval_at` | `submitted_for_approval_at` | ✅ |
| expense_approved_at | `expenses.approved_at` | `approved_at` | `approved_at` | ✅ |
| expense_gross_hours | `expenses.gross_hours` | `gross_hours` | `gross_hours` | ⚠️ KPI says DB field exists |
| expense_net_hours | `expenses.hours` | `hours` | `hours` | ✅ |
| expense_lunch_taken | `expenses.lunch_taken` | `lunch_taken` | `lunch_taken` | ✅ |
| expense_lunch_duration_minutes | `expenses.lunch_duration_minutes` | `lunch_duration_minutes` | `lunch_duration_minutes` | ✅ |
| expense_amount | `expenses.amount` | `amount` | `amount` | ✅ |
| expense_start_time | `expenses.start_time` | `start_time` | ❌ MISSING | 🔴 |
| expense_end_time | `expenses.end_time` | `end_time` | ❌ MISSING | 🔴 |
| N/A | `payees.payee_name` | `payee_name` | `worker_name` | 🔴 MISMATCH |
| N/A | `payees.hourly_rate` | `hourly_rate` | `hourly_rate` | ✅ |
| N/A | `payees.employee_number` | `employee_number` | `employee_number` | ✅ |

**Issues Found:**
1. `worker_name` vs `payee_name` - No KPI defines `worker_name`, it should be `payee_name` or aliased
2. `start_time` and `end_time` not in AVAILABLE_FIELDS but are KPI-defined
3. `gross_hours` - KPI says it's a DB field (`expenses.gross_hours`), need to verify RPC returns it

---

### Task 3: Cross-Reference Table - Projects

**Data Source:** `projects` (via `reporting.project_financials` view)

| KPI Definition | KPI Field | Expected Key | AVAILABLE_FIELDS Key | Status |
|----------------|-----------|--------------|---------------------|--------|
| contracted_amount | `projects.contracted_amount` | `contracted_amount` | `contracted_amount` | ✅ |
| current_margin | `projects.current_margin` | `current_margin` | `current_margin` | ✅ |
| margin_percentage | `projects.margin_percentage` | `margin_percentage` | `margin_percentage` | ✅ |
| total_expenses | `reporting.project_financials.total_expenses` | `total_expenses` | `total_expenses` | ✅ |
| total_invoiced | `reporting.project_financials.total_invoiced` | `total_invoiced` | `total_invoiced` | ✅ |
| cost_variance | `reporting.project_financials.cost_variance` | `cost_variance` | `cost_variance` | ✅ |
| project_status | `projects.status` | `status` | `status` | ✅ |
| project_category | `projects.category` | `category` | `category` | ✅ |

*(Continue for all project fields...)*

---

### Task 4: Cross-Reference Table - Weekly Labor Hours

**Data Source:** `weekly_labor_hours` (view)

| KPI Definition | Expected Key | AVAILABLE_FIELDS Key | Status |
|----------------|--------------|---------------------|--------|
| N/A (view column) | `employee_name` | `employee_name` | ⚠️ Verify view has this |
| N/A (view column) | `employee_number` | `employee_number` | ⚠️ Verify view has this |
| N/A (view column) | `week_start_sunday` | `week_start_sunday` | ⚠️ Verify view has this |
| N/A (view column) | `total_hours` | `total_hours` | ⚠️ Verify view has this |
| N/A (view column) | `gross_hours` | `gross_hours` | 🔴 Likely MISSING from view |

**Issues Found:**
1. This view may not have all expected columns
2. `gross_hours` probably needs to be added to the view
3. No corresponding KPI definitions for view-specific columns

---

### Task 5: Validate Data Types

**Compare `AVAILABLE_FIELDS.type` with `KPIMeasure.dataType`:**

| AVAILABLE_FIELDS type | KPIMeasure dataType | Match? |
|-----------------------|---------------------|--------|
| `'text'` | `'text'` | ✅ |
| `'number'` | `'number'` | ✅ |
| `'currency'` | `'currency'` | ✅ |
| `'date'` | `'date'` | ✅ |
| `'boolean'` | `'boolean'` | ✅ |
| `'percent'` | `'percent'` | ✅ |

**Check each field's type matches the KPI definition.**

---

### Task 6: Check for Deprecated Fields

**From `deprecated-kpis.ts`:**
- `projects.budget` → Use `contracted_amount`
- `estimate_line_items.rate` → Use `price_per_unit`
- Various legacy revenue/expense fields

**Verify:** AVAILABLE_FIELDS does NOT include any deprecated field names.

---

### Task 7: Validate Semantic Mappings

**From `semantic-mappings.ts`:**
```typescript
{
  concept: 'hours',
  aliases: ['time', 'worked', 'labor hours', 'shift'],
  kpiIds: ['expense_net_hours', 'expense_gross_hours'],
  defaultKpiId: 'expense_net_hours',
  disambiguation: {
    expense_net_hours: 'Billable hours after lunch deduction (default for payroll/billing)',
    expense_gross_hours: 'Total shift duration before lunch deduction (for compliance/overtime)'
  }
}
```

**Verify:** When user filters by "hours", the correct field (`hours` for net) is used.

---

### Task 8: Validate Business Benchmarks

**From `business-benchmarks.ts`:**
```typescript
{
  project_margin: { healthy: '15-30%', warning: '>10%', critical: '>5%' },
  cost_variance: { healthy: '-5-5%', warning: '>10%', critical: '>20%' },
  weekly_hours: { healthy: '35-45', warning: '>50' },
}
```

**Consideration:** Reports should potentially use these benchmarks for conditional formatting.

---

## Specific Issues Found

### Issue #1: `worker_name` Has No KPI Definition

**Evidence:**
- AVAILABLE_FIELDS uses `worker_name`
- No KPI defines `worker_name`
- KPIs define `payees.payee_name` 

**Fix:** Either:
- Add KPI definition for `worker_name` with alias to `payee_name`
- OR change AVAILABLE_FIELDS to use `payee_name` and update RPC to return `payee_name`

---

### Issue #2: `gross_hours` - KPI vs Reality Mismatch

**KPI Definition says:**
```typescript
{
  id: 'expense_gross_hours',
  source: 'database',
  field: 'expenses.gross_hours',  // Claims it's a DB column
}
```

**Reality:** 
- The `expenses` table may not have a `gross_hours` column
- It's calculated: `(end_time - start_time) / 3600`
- RPC may not return it

**Fix:** Either:
- Add `gross_hours` column to expenses table via trigger
- OR update KPI to `source: 'frontend'` with formula
- AND ensure RPC calculates and returns it

---

### Issue #3: View Columns Not Defined in KPIs

**Problem:** Views like `weekly_labor_hours` have columns not defined anywhere:
- `employee_name`
- `week_start_sunday`
- `total_hours`
- `entry_count`

**Fix:** Add KPI definitions for view-specific columns, or create a separate "view fields" documentation.

---

### Issue #4: Missing Time Fields in AVAILABLE_FIELDS

**KPIs Define:**
- `expense_start_time` → `expenses.start_time`
- `expense_end_time` → `expenses.end_time`

**AVAILABLE_FIELDS.time_entries:** Does NOT include `start_time` or `end_time`

**Impact:** Users can't include actual clock-in/clock-out times in reports.

**Fix:** Add `start_time` and `end_time` to AVAILABLE_FIELDS.time_entries.

---

### Issue #5: Inconsistent Naming Between Components

**Problem:**
- KPIs use: `expense_date`, `payee_name`, `approval_status`
- useTimeEntries uses: `expense_date`, `worker_name`, `approval_status`
- useReportFilterOptions uses: `payee_name` for value
- AVAILABLE_FIELDS uses: `expense_date`, `worker_name`, `approval_status`

**Fix:** Standardize on KPI-defined names throughout.

---

## Validation Script Enhancement

**Extend `src/lib/kpi-definitions/validation.ts` to validate AVAILABLE_FIELDS:**

```typescript
// Add to validation.ts

import { AVAILABLE_FIELDS } from '@/components/reports/SimpleReportBuilder';
import { getAllKPIs } from './index';

export function validateAvailableFieldsAgainstKPIs(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allKPIs = getAllKPIs();
  
  // Build lookup: column name → KPI
  const kpiByColumn: Map<string, KPIMeasure> = new Map();
  for (const kpi of allKPIs) {
    const columnName = kpi.field.split('.').pop(); // Get column name from table.column
    if (columnName) {
      kpiByColumn.set(columnName, kpi);
    }
  }
  
  // Validate each data source's fields
  for (const [dataSource, fields] of Object.entries(AVAILABLE_FIELDS)) {
    for (const field of fields) {
      const kpi = kpiByColumn.get(field.key);
      
      if (!kpi) {
        // No matching KPI - might be OK for view columns
        issues.push({
          type: 'missing',
          severity: 'warning',
          message: `${dataSource}.${field.key}: No KPI definition found`,
          suggestion: 'Add KPI definition or verify this is a view-specific column'
        });
        continue;
      }
      
      // Check data type match
      if (kpi.dataType !== field.type) {
        issues.push({
          type: 'mismatch',
          severity: 'error',
          message: `${dataSource}.${field.key}: Type mismatch - KPI says ${kpi.dataType}, AVAILABLE_FIELDS says ${field.type}`,
          suggestion: `Update AVAILABLE_FIELDS type to '${kpi.dataType}'`
        });
      }
      
      // Check if deprecated
      if (kpi.source === 'deprecated') {
        issues.push({
          type: 'deprecated',
          severity: 'error',
          message: `${dataSource}.${field.key}: Uses deprecated KPI`,
          suggestion: `Replace with ${kpi.replacedBy || 'recommended alternative'}`
        });
      }
    }
  }
  
  return issues;
}
```

---

## Complete Validation Checklist

### Phase 1: Document Current State

- [ ] Export all KPI field names from kpi-definitions
- [ ] Export all AVAILABLE_FIELDS keys from SimpleReportBuilder
- [ ] Export all columns returned by execute_simple_report RPC
- [ ] Create master spreadsheet comparing all three

### Phase 2: Fix KPI Definitions

- [ ] Add missing KPI for `worker_name` or document it's an alias
- [ ] Clarify `gross_hours` source (database vs calculated)
- [ ] Add KPI definitions for view-specific columns
- [ ] Ensure no AVAILABLE_FIELDS reference deprecated KPIs

### Phase 3: Fix AVAILABLE_FIELDS

- [ ] Match all field keys to KPI definitions
- [ ] Match all data types to KPI dataTypes
- [ ] Add missing fields (start_time, end_time)
- [ ] Remove or update fields not in KPIs

### Phase 4: Fix execute_simple_report RPC

- [ ] Ensure RPC returns columns matching KPI field names
- [ ] Add column aliases where needed (payee_name AS worker_name)
- [ ] Add calculated columns (gross_hours)
- [ ] Verify all AVAILABLE_FIELDS keys are returned

### Phase 5: Fix Filters

- [ ] Ensure filter field names match KPI definitions
- [ ] Update universal filter mapping per data source
- [ ] Verify filter values match column data types

### Phase 6: Run Validation

- [ ] Extend validation.ts with AVAILABLE_FIELDS check
- [ ] Run `npx tsx scripts/validate-kpis.ts` (if exists)
- [ ] Fix all errors, review warnings
- [ ] Document any intentional deviations

### Phase 7: Test

- [ ] Test each data source with all fields selected
- [ ] Test each filter type
- [ ] Verify export includes all data
- [ ] Check templates still work

---

## Files to Create/Modify

### New Files

1. **`scripts/validate-report-fields.ts`** - Script to validate AVAILABLE_FIELDS against KPIs
2. **`docs/REPORTING_FIELD_MAPPING.md`** - Document field mappings for future reference

### Modified Files

1. **`src/lib/kpi-definitions/validation.ts`** - Add AVAILABLE_FIELDS validation
2. **`src/lib/kpi-definitions/expense-kpis.ts`** - Clarify gross_hours, add worker_name if needed
3. **`src/components/reports/SimpleReportBuilder.tsx`** - Update AVAILABLE_FIELDS
4. **`src/components/reports/SimpleFilterPanel.tsx`** - Fix universal filters
5. **`supabase/migrations/[timestamp]_fix_execute_simple_report.sql`** - Fix RPC

---

## Key Principles

1. **KPI Definitions are the source of truth** - Always reference them
2. **Field names must match** - `AVAILABLE_FIELDS.key` = column name from `KPIMeasure.field`
3. **Data types must match** - `AVAILABLE_FIELDS.type` = `KPIMeasure.dataType`
4. **No deprecated fields** - Never use fields from `deprecated-kpis.ts`
5. **Document exceptions** - If a field doesn't have a KPI, document why
6. **Validate regularly** - Run validation in CI/CD

---

## Summary of All Issues

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| 1 | `worker_name` has no KPI definition | 🔴 High | KPIs + AVAILABLE_FIELDS |
| 2 | `gross_hours` KPI vs reality mismatch | 🔴 High | KPIs + RPC |
| 3 | View columns not in KPIs | 🟡 Medium | KPIs |
| 4 | Missing `start_time`/`end_time` in AVAILABLE_FIELDS | 🟡 Medium | AVAILABLE_FIELDS |
| 5 | Inconsistent naming across components | 🟡 Medium | Multiple |
| 6 | Universal filter field assumptions | 🟡 Medium | SimpleFilterPanel |
| 7 | Filter value type mismatches | 🟡 Medium | useReportFilterOptions |
| 8 | No automated validation of AVAILABLE_FIELDS | 🟢 Low | validation.ts |
| 9 | Templates may have stale field names | 🟢 Low | saved_reports table |
| 10 | Missing fields show as blank | 🟢 Low | ReportViewer |

---

## Recommended Approach for Claude Code

1. **First:** Run existing KPI validation (`src/lib/kpi-definitions/validation.ts`)
2. **Second:** Create a script to compare AVAILABLE_FIELDS vs KPIs
3. **Third:** Document all mismatches in a table
4. **Fourth:** Fix KPI definitions where they're wrong (e.g., gross_hours source)
5. **Fifth:** Fix AVAILABLE_FIELDS to match KPIs
6. **Sixth:** Fix RPC to return correct column names
7. **Seventh:** Fix filters
8. **Eighth:** Test everything
9. **Ninth:** Add AVAILABLE_FIELDS validation to CI/CD

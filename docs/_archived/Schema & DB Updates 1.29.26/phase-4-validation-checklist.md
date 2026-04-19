# Phase 4: Validation & Testing Checklist

This document provides a comprehensive validation checklist for the RCG Work cleanup.
Execute each section after completing the corresponding phase.

---

## Pre-Implementation Checklist

Before starting, ensure:

- [ ] Database backup created
- [ ] Git branch created for cleanup work
- [ ] Local development environment running
- [ ] Access to Supabase dashboard for database verification
- [ ] Test project with known financial values identified

---

## Phase 1 Validation: Database Migrations

### 1.1 Column Existence Check

Run in Supabase SQL Editor:

```sql
-- Verify new column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name IN ('adjusted_est_margin', 'projected_margin', 'current_margin', 'actual_margin');
```

Expected: All 4 columns should exist

### 1.2 Data Migration Check

```sql
-- Verify data was copied correctly
SELECT 
  project_number,
  projected_margin,
  adjusted_est_margin,
  projected_margin = adjusted_est_margin as data_matches
FROM projects
WHERE contracted_amount > 0
LIMIT 10;
```

Expected: `data_matches` should be TRUE for all rows

### 1.3 Trigger Function Check

```sql
-- Test trigger by updating an estimate
-- First, find a test project
SELECT id, project_number FROM projects WHERE status = 'in_progress' LIMIT 1;

-- Note the ID, then check current values
SELECT 
  project_number,
  adjusted_est_margin,
  projected_margin,
  actual_margin,
  contracted_amount,
  adjusted_est_costs
FROM projects
WHERE id = '[TEST_PROJECT_ID]';

-- Manually trigger recalculation
SELECT calculate_project_margins('[TEST_PROJECT_ID]');

-- Verify both columns updated
SELECT 
  project_number,
  adjusted_est_margin,
  projected_margin,
  adjusted_est_margin = projected_margin as both_updated
FROM projects
WHERE id = '[TEST_PROJECT_ID]';
```

Expected: `both_updated` should be TRUE

### 1.4 View Check

```sql
-- Verify view has new columns
SELECT 
  project_number,
  adjusted_est_margin,
  projected_margin,
  actual_margin,
  budget_utilization_percent,
  adjusted_est_margin_percent
FROM reporting.project_financials
LIMIT 5;
```

Expected: All columns present with reasonable values

### 1.5 RPC Function Check

```sql
-- Verify get_profit_analysis_data returns new columns
SELECT 
  project_number,
  adjusted_est_margin,
  actual_margin
FROM get_profit_analysis_data(ARRAY['in_progress', 'approved'])
LIMIT 5;
```

Expected: Function returns data with new columns

### 1.6 Weekly Labor Hours View Check

```sql
-- Verify gross_hours is calculated
SELECT 
  employee_name,
  week_start_sunday,
  total_hours,
  gross_hours,
  gross_hours >= total_hours as gross_gte_net
FROM weekly_labor_hours
LIMIT 10;
```

Expected: `gross_gte_net` should be TRUE (gross hours >= net hours)

---

## Phase 2 Validation: KPI Definitions

### 2.1 TypeScript Compilation

```bash
# In project root
npm run build

# Should complete without errors
```

### 2.2 KPI Validation Script

```typescript
// Run this in browser console or create a test file
import { runValidation, getKPIStats } from '@/lib/kpi-definitions';

// Run validation
runValidation();

// Check stats
const stats = getKPIStats();
console.log('KPI Stats:', stats);

// Expected:
// - No errors in validation
// - Stats show counts for all domains including time_entry and payee
```

### 2.3 KPI Lookup Tests

```typescript
import { 
  getKPIById, 
  findKPIByAlias, 
  getDefaultKPIForConcept 
} from '@/lib/kpi-definitions';

// Test new KPIs exist
console.assert(getKPIById('adjusted_est_margin') !== undefined, 'adjusted_est_margin should exist');
console.assert(getKPIById('worker_name') !== undefined, 'worker_name should exist');
console.assert(getKPIById('time_entry_gross_hours') !== undefined, 'gross_hours should exist');

// Test deprecated KPIs are marked
const currentMargin = getKPIById('current_margin');
console.assert(currentMargin?.source === 'deprecated', 'current_margin should be deprecated');

// Test semantic mapping
const profitKPI = getDefaultKPIForConcept('profit');
console.assert(profitKPI?.id === 'actual_margin', 'profit should map to actual_margin');

const marginKPI = getDefaultKPIForConcept('margin');
console.assert(marginKPI?.id === 'adjusted_est_margin', 'margin should map to adjusted_est_margin');
```

### 2.4 Edge Function KPI Context

```bash
# Regenerate the KPI context
npm run regenerate-kpi-context

# Or manually run the script
npx tsx scripts/sync-edge-kpi-context.ts

# Verify the generated file
cat supabase/functions/ai-report-assistant/kpi-context.generated.ts | head -50
```

Check that:
- [ ] `adjusted_est_margin` appears in semantic lookup
- [ ] `current_margin` is NOT the default for "margin" concept
- [ ] `worker_name` and other new KPIs are present

---

## Phase 3 Validation: Frontend Updates

### 3.1 Build Check

```bash
npm run build
# Should complete without TypeScript errors
```

### 3.2 Visual Inspection Checklist

#### Projects Page (`/projects`)
- [ ] Page loads without console errors
- [ ] Table displays projects with financial data
- [ ] Column header shows "Adj. Est. Margin ($)" (not "Projected Margin")
- [ ] Margin values match database (compare with Supabase dashboard)
- [ ] Sorting on margin column works
- [ ] Tooltip shows correct breakdown

#### Work Orders Page (`/work-orders`)
- [ ] Page loads without console errors
- [ ] Column headers updated to new terminology
- [ ] "Actual Margin" column shows invoiced - expenses (not contract - expenses)
- [ ] No references to "Current Margin" visible

#### Project Detail Page (`/projects/:id`)
- [ ] Financial metrics card loads
- [ ] For in-progress projects: Shows "Adj. Est. Margin"
- [ ] For completed projects: Shows "Actual Margin"
- [ ] Values match database

#### Profit Analysis Page (`/profit-analysis`)
- [ ] Page loads without errors
- [ ] Margin columns show correct values
- [ ] Summary totals calculate correctly

### 3.3 Console Error Check

Open browser DevTools Console on each page:
- [ ] No errors about undefined `projected_margin`
- [ ] No errors about undefined `current_margin`
- [ ] No deprecation warnings from `projectFinancials.ts` (if kept)

### 3.4 Data Accuracy Spot Check

Pick 3 projects and verify manually:

| Project | DB adjusted_est_margin | UI shows | Match? |
|---------|------------------------|----------|--------|
| [#1]    | $___                   | $___     | [ ]    |
| [#2]    | $___                   | $___     | [ ]    |
| [#3]    | $___                   | $___     | [ ]    |

---

## Phase 4 Validation: Documentation & Types

### 4.1 Documentation Links

Verify these docs are updated:
- [ ] `src/docs/revenue-and-cost-flows.md` - terminology updated
- [ ] `src/docs/financial-calculations.md` - terminology updated
- [ ] `PRODUCT_OVERVIEW.md` - if applicable

### 4.2 Type Mismatches in SimpleReportBuilder

```typescript
// Check AVAILABLE_FIELDS types match KPI definitions
// In SimpleReportBuilder.tsx, verify:

// These should be 'timestamp' not 'text':
{ key: 'start_time', label: 'Start Time', type: 'timestamp', ... }  // ✓
{ key: 'end_time', label: 'End Time', type: 'timestamp', ... }      // ✓

// These should be 'enum' not 'text':
{ key: 'category', label: 'Category', type: 'enum', enumValues: [...], ... }  // ✓
{ key: 'status', label: 'Status', type: 'enum', enumValues: [...], ... }      // ✓
{ key: 'approval_status', label: 'Approval Status', type: 'enum', ... }       // ✓
```

### 4.3 Supabase Types Regeneration

```bash
# Regenerate Supabase types to include new columns
npx supabase gen types typescript --project-id clsjdxwbsjbhjibvlqbz > src/integrations/supabase/types.ts
```

Verify in generated types:
- [ ] `adjusted_est_margin` property exists on projects
- [ ] Comments show deprecation on `current_margin` (if added via SQL COMMENT)

---

## Regression Testing

### Critical User Flows

Test each flow end-to-end:

#### Flow 1: Create Project → Approve Estimate → Check Margins
1. Create new project
2. Create estimate with line items
3. Approve estimate
4. Verify `contracted_amount` populated
5. Verify `adjusted_est_margin` = contracted_amount - adjusted_est_costs
6. Verify `original_margin` = contracted_amount - original_est_costs

Result: [ ] Pass [ ] Fail

#### Flow 2: Add Change Order → Verify Margin Update
1. Find project with approved estimate
2. Note current `adjusted_est_margin`
3. Create change order with client_amount = $1000, cost_impact = $500
4. Approve change order
5. Verify `adjusted_est_margin` increased by $500 (revenue - cost delta)

Result: [ ] Pass [ ] Fail

#### Flow 3: Add Expense → Verify Actual Margin
1. Find project with invoices
2. Note current `actual_margin`
3. Add expense for $500
4. Verify `actual_margin` decreased by $500

Result: [ ] Pass [ ] Fail

#### Flow 4: Weekly Labor Hours Report
1. Go to Reports → Time Entries
2. Select weekly_labor_hours data source
3. Include gross_hours column
4. Run report
5. Verify gross_hours values are >= total_hours

Result: [ ] Pass [ ] Fail

---

## Rollback Plan

If critical issues discovered:

### Database Rollback
```sql
-- If adjusted_est_margin column causes issues, can continue using projected_margin
-- Both columns are maintained by triggers during transition

-- To revert view to use projected_margin:
-- (Keep migration files, just update view if needed)
```

### Frontend Rollback
```bash
# Git revert to pre-cleanup commit
git revert HEAD~N  # where N = number of commits
```

---

## Sign-Off

| Phase | Completed | Verified By | Date |
|-------|-----------|-------------|------|
| Phase 1: Database | [ ] | _________ | ____ |
| Phase 2: KPIs | [ ] | _________ | ____ |
| Phase 3: Frontend | [ ] | _________ | ____ |
| Phase 4: Docs/Types | [ ] | _________ | ____ |
| Regression Tests | [ ] | _________ | ____ |

---

## Post-Implementation Tasks

After all phases complete and verified:

1. [ ] Update memory/documentation with new terminology
2. [ ] Notify team of terminology changes
3. [ ] Schedule removal of deprecated columns (future release)
4. [ ] Archive `projectFinancials.ts` to deprecated folder
5. [ ] Update any external documentation or training materials

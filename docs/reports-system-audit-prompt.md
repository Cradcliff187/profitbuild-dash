# ProfitBuild Reports System Comprehensive Audit

## Agent Instructions

You are conducting a comprehensive audit of the ProfitBuild Reports system. This audit will compare:
1. **Database schema and current state** (via Supabase MCP)
2. **Migration files** (what should be deployed)
3. **Frontend implementation** (React components and hooks)
4. **KPI documentation** (what metrics should exist)
5. **Business logic alignment** (do calculations match requirements)

**Tools Available:**
- Supabase MCP for direct database queries
- File system access to the codebase
- GitHub repository access

**Output Required:**
Create a detailed report with:
- ✅ Items that are correctly implemented
- ⚠️ Items with partial issues or inconsistencies
- ❌ Items that are broken or missing
- 📋 Specific action items with file paths and code changes needed

---

## Phase 1: Database State Verification

### 1.1 Verify Core Tables Exist

Run these queries via Supabase MCP:

```sql
-- Check if reports tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('saved_reports', 'report_execution_log');

-- Check if reporting schema and views exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'reporting';

-- Check for the RPC function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'execute_simple_report';
```

**Document findings:**
- [ ] `saved_reports` table exists? 
- [ ] `report_execution_log` table exists?
- [ ] `reporting.project_financials` view exists?
- [ ] `reporting.estimate_line_items_quote_status` view exists?
- [ ] `reporting.estimate_quote_status_summary` view exists?
- [ ] `execute_simple_report` function exists?

### 1.2 Verify Project Category System

```sql
-- Check if category column exists on projects
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'category';

-- Check category enum type
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_category');

-- Verify category distribution
SELECT category, COUNT(*) as count
FROM projects
GROUP BY category;

-- Check special projects categorization
SELECT project_number, project_name, category
FROM projects
WHERE project_number IN ('SYS-000', '000-UNASSIGNED', '001-GAS', '002-GA')
OR category != 'construction';
```

**Document findings:**
- [ ] Category column exists with proper enum type?
- [ ] SYS-000 and 000-UNASSIGNED are category = 'system'?
- [ ] 001-GAS is category = 'overhead'?
- [ ] All regular projects are category = 'construction'?

### 1.3 Verify Reporting View Definition

```sql
-- Get the actual view definition
SELECT pg_get_viewdef('reporting.project_financials'::regclass, true);
```

**Check the view for:**
- [ ] Uses `WHERE p.category = 'construction'` (NOT the old `project_number NOT IN` filter)?
- [ ] Properly joins to approved current estimate?
- [ ] Handles split expenses correctly via expense_allocations CTE?
- [ ] Includes all required fields from KPI guide?

### 1.4 Verify Financial Calculation Functions

```sql
-- List all functions related to project calculations
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%margin%' 
   OR proname LIKE '%project%calc%'
   OR proname LIKE '%contingency%';

-- Check triggers on projects table
SELECT tgname, tgtype, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'projects'::regclass;

-- Check triggers on expenses table
SELECT tgname, tgtype, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'expenses'::regclass;

-- Check triggers on quotes table
SELECT tgname, tgtype, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'quotes'::regclass;

-- Check triggers on change_orders table
SELECT tgname, tgtype, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'change_orders'::regclass;
```

**Document findings:**
- [ ] `calculate_project_margins` function exists?
- [ ] Triggers fire on expense insert/update/delete?
- [ ] Triggers fire on quote status change?
- [ ] Triggers fire on change order approval?

### 1.5 Test Report Execution Function

```sql
-- Test the RPC function with projects data source
SELECT public.execute_simple_report(
  'projects',
  '{}'::jsonb,
  'created_at',
  'DESC',
  5
);

-- Test with a filter
SELECT public.execute_simple_report(
  'projects',
  '{"filter_0": {"field": "status", "operator": "equals", "value": "in_progress"}}'::jsonb,
  'created_at',
  'DESC',
  5
);

-- Test expenses data source
SELECT public.execute_simple_report(
  'expenses',
  '{}'::jsonb,
  'expense_date',
  'DESC',
  5
);

-- Test quotes data source
SELECT public.execute_simple_report(
  'quotes',
  '{}'::jsonb,
  'created_at',
  'DESC',
  5
);
```

**Document findings:**
- [ ] Function executes without error for each data source?
- [ ] Returns expected JSON structure with data and metadata?
- [ ] Filters work correctly?
- [ ] Row counts are accurate?

### 1.6 Verify Saved Report Templates

```sql
-- Check if templates were seeded
SELECT id, name, category, is_template, created_at
FROM saved_reports
WHERE is_template = true
ORDER BY category, name;

-- Check template configs are valid
SELECT name, config->>'data_source' as data_source, 
       jsonb_array_length(config->'fields') as field_count
FROM saved_reports
WHERE is_template = true;
```

**Document findings:**
- [ ] Templates exist in database?
- [ ] All template categories represented (financial, operational, client, vendor, schedule)?
- [ ] Template configs have valid data_source values?

---

## Phase 2: Frontend Implementation Review

### 2.1 Review Report Execution Hook

**File:** `src/hooks/useReportExecution.ts`

Check for:
- [ ] Actually calls `supabase.rpc('execute_simple_report', ...)` (not TODO placeholder)?
- [ ] Properly formats filters for RPC function?
- [ ] Handles errors correctly?
- [ ] Logs execution to `report_execution_log` table?

**If TODO placeholders exist, document the required fix.**

### 2.2 Review Report Templates Hook

**File:** `src/hooks/useReportTemplates.ts`

Check for:
- [ ] Loads templates from `saved_reports` table where `is_template = true`?
- [ ] Loads user's saved reports where `created_by = user.id`?
- [ ] Save function actually inserts to database?
- [ ] Delete function works?

**If TODO placeholders exist, document the required fix.**

### 2.3 Review SimpleReportBuilder Component

**File:** `src/components/reports/SimpleReportBuilder.tsx`

Check for:
- [ ] `AVAILABLE_FIELDS` constant matches database columns?
- [ ] All field types correctly defined (text, number, currency, date, boolean)?
- [ ] Boolean fields use proper Yes/No/Any UI (not broken enum dropdown)?
- [ ] Category composition fields available for projects?
- [ ] Field groups organized logically?

**Cross-reference with KPI Guide:**
Compare `AVAILABLE_FIELDS` definitions against `src/pages/KPIGuide.tsx` KPI definitions:
- [ ] All KPI metrics have corresponding report fields?
- [ ] Field labels match KPI names?
- [ ] Data types match (currency vs number vs percent)?

### 2.4 Review SimpleFilterPanel Component

**File:** `src/components/reports/SimpleFilterPanel.tsx`

Check for:
- [ ] All filter operators work correctly (equals, in, between, contains, etc.)?
- [ ] Boolean fields render as radio buttons (Yes/No/Any)?
- [ ] Date range picker works?
- [ ] Enum fields show correct options?
- [ ] "Any" selection properly removes filter (doesn't send null)?

### 2.5 Review Report Viewer Component

**File:** `src/components/reports/ReportViewer.tsx`

Check for:
- [ ] Handles all data types correctly (formats currency, dates, percentages)?
- [ ] Pagination works?
- [ ] Column sorting works?
- [ ] Totals row calculates correctly?

### 2.6 Review Export Controls

**Files:** 
- `src/components/reports/ExportControls.tsx`
- `src/utils/reportExporter.ts`

Check for:
- [ ] PDF export generates valid PDF?
- [ ] Excel export generates valid XLSX?
- [ ] CSV export works?
- [ ] Exported data matches displayed data?
- [ ] Currency/date formatting preserved in exports?

### 2.7 Review Template Gallery

**File:** `src/components/reports/NewTemplateGallery.tsx`

Check for:
- [ ] Loads templates from database (not hardcoded)?
- [ ] Displays all template categories?
- [ ] Template selection properly initializes report config?
- [ ] "Custom Report" option works?

---

## Phase 3: Data Flow & Calculation Verification

### 3.1 Expense to Project Margin Flow

Trace how expenses affect project margins:

1. Query a test project with expenses:
```sql
SELECT p.id, p.project_number, p.contracted_amount, p.current_margin, p.margin_percentage
FROM projects p
WHERE p.status = 'in_progress'
AND EXISTS (SELECT 1 FROM expenses e WHERE e.project_id = p.id)
LIMIT 1;
```

2. Get its expenses:
```sql
SELECT e.id, e.amount, e.is_split, e.category
FROM expenses e
WHERE e.project_id = '[PROJECT_ID]';
```

3. Get split allocations if any:
```sql
SELECT es.*, e.amount as parent_amount
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
WHERE es.project_id = '[PROJECT_ID]' OR e.project_id = '[PROJECT_ID]';
```

4. Calculate expected total and compare:
```sql
-- This should match current_margin calculation
SELECT 
  p.contracted_amount,
  COALESCE(SUM(
    CASE 
      WHEN e.is_split THEN es.split_amount 
      ELSE e.amount 
    END
  ), 0) as calculated_expenses,
  p.contracted_amount - COALESCE(SUM(
    CASE 
      WHEN e.is_split THEN es.split_amount 
      ELSE e.amount 
    END
  ), 0) as calculated_margin,
  p.current_margin as stored_margin
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id AND e.is_split = false
LEFT JOIN expense_splits es ON es.project_id = p.id
WHERE p.id = '[PROJECT_ID]'
GROUP BY p.id;
```

**Document findings:**
- [ ] Calculated margin matches stored `current_margin`?
- [ ] Split expenses handled correctly?
- [ ] No double-counting of expenses?

**Note:** Do NOT include `receipts` table in this analysis. Receipts are documentation only - all financial expense data comes from direct input or CSV import into the `expenses` table.

### 3.2 Quote to Projected Costs Flow

```sql
-- Get a project with accepted quotes
SELECT p.id, p.project_number, p.adjusted_est_costs, p.projected_margin
FROM projects p
WHERE EXISTS (SELECT 1 FROM quotes q WHERE q.project_id = p.id AND q.status = 'accepted')
LIMIT 1;

-- Get its estimate costs
SELECT e.total_cost, e.total_amount
FROM estimates e
WHERE e.project_id = '[PROJECT_ID]' AND e.is_current_version = true AND e.status = 'approved';

-- Get accepted quotes
SELECT q.id, q.total_amount, q.status
FROM quotes q
WHERE q.project_id = '[PROJECT_ID]' AND q.status = 'accepted';

-- Verify adjusted_est_costs calculation
-- Should be: original estimate cost + (accepted quote costs replacing estimate line items)
```

**Document findings:**
- [ ] `adjusted_est_costs` reflects accepted quotes?
- [ ] `projected_margin` = `contracted_amount` - `adjusted_est_costs`?

### 3.3 Change Order Impact

```sql
-- Get a project with approved change orders
SELECT p.id, p.project_number, p.contracted_amount, p.original_est_costs, p.adjusted_est_costs
FROM projects p
WHERE EXISTS (SELECT 1 FROM change_orders co WHERE co.project_id = p.id AND co.status = 'approved')
LIMIT 1;

-- Get its change orders
SELECT co.id, co.client_amount, co.cost_impact, co.status
FROM change_orders co
WHERE co.project_id = '[PROJECT_ID]';

-- Verify contracted_amount includes approved CO client_amount
-- Verify adjusted_est_costs includes CO cost_impact
```

**Document findings:**
- [ ] `contracted_amount` includes approved change order revenue?
- [ ] `adjusted_est_costs` includes change order cost impacts?
- [ ] `contingency_used` tracks CO contingency allocations?

### 3.4 Reporting View vs Direct Query Comparison

```sql
-- Compare reporting view output with direct calculation
WITH direct_calc AS (
  SELECT 
    p.id,
    p.contracted_amount,
    COALESCE(SUM(CASE WHEN e.is_split = false THEN e.amount ELSE 0 END), 0) +
    COALESCE(SUM(es.split_amount), 0) as total_expenses
  FROM projects p
  LEFT JOIN expenses e ON e.project_id = p.id
  LEFT JOIN expense_splits es ON es.project_id = p.id
  WHERE p.category = 'construction'
  GROUP BY p.id
)
SELECT 
  rpf.project_number,
  rpf.total_expenses as view_expenses,
  dc.total_expenses as calc_expenses,
  rpf.total_expenses - dc.total_expenses as difference
FROM reporting.project_financials rpf
JOIN direct_calc dc ON dc.id = rpf.id
WHERE rpf.total_expenses != dc.total_expenses;
```

**Document findings:**
- [ ] View expenses match direct calculation?
- [ ] Any discrepancies identified?

---

## Phase 4: KPI Guide Alignment

### 4.1 Cross-Reference All KPIs

**File:** `src/pages/KPIGuide.tsx`

For each KPI category, verify:

#### Project Financial KPIs
| KPI Name | Database Field | In Reporting View? | In Report Builder? |
|----------|---------------|-------------------|-------------------|
| Contracted Amount | projects.contracted_amount | ? | ? |
| Current Margin | projects.current_margin | ? | ? |
| Current Margin % | projects.current_margin_percent | ? | ? |
| Target Margin | projects.target_margin | ? | ? |
| Minimum Margin | projects.minimum_margin | ? | ? |
| Contingency Amount | projects.contingency_amount | ? | ? |
| Contingency Used | projects.contingency_used | ? | ? |
| Projected Margin | projects.projected_margin | ? | ? |
| Original Margin | projects.original_margin | ? | ? |
| Adjusted Est Costs | projects.adjusted_est_costs | ? | ? |
| Original Est Costs | projects.original_est_costs | ? | ? |

#### Estimate KPIs
| KPI Name | Database Field | In Reporting View? | In Report Builder? |
|----------|---------------|-------------------|-------------------|
| Total Amount | estimates.total_amount | ? | ? |
| Total Cost | estimates.total_cost | ? | ? |
| Contingency Amount | estimates.contingency_amount | ? | ? |
| Default Markup % | estimates.default_markup_percent | ? | ? |
| Is Auto Generated | estimates.is_auto_generated | ? | ? |

#### Expense KPIs
| KPI Name | Database Field | In Expense Report? | Calculated Correctly? |
|----------|---------------|-------------------|----------------------|
| Amount | expenses.amount | ? | ? |
| Is Split | expenses.is_split | ? | ? |
| Split Amount | expense_splits.split_amount | ? | ? |
| Total by Project | aggregated | ? | ? |

#### Quote KPIs
| KPI Name | Database Field | In Quote Report? | 
|----------|---------------|-----------------|
| Quote Amount | quotes.quote_amount | ? |
| Client Amount | quotes.client_amount | ? |
| Markup Amount | quotes.markup_amount | ? |
| Status | quotes.status | ? |

#### Change Order KPIs
| KPI Name | Database Field | In Reporting View? |
|----------|---------------|-------------------|
| Client Amount | change_orders.client_amount | ? |
| Cost Impact | change_orders.cost_impact | ? |
| Margin Impact | change_orders.margin_impact | ? |
| Count | aggregated | ? |

#### Revenue KPIs
| KPI Name | Database Field | In Reporting View? |
|----------|---------------|-------------------|
| Invoice Amount | project_revenues.amount | ? |
| Total Invoiced | aggregated | ? |
| Invoice Count | aggregated | ? |

### 4.2 Deprecated Fields Check

Verify these deprecated fields are NOT being used:
- `projects.budget` (use `contracted_amount`)
- `estimate_line_items.rate` (use `price_per_unit`)

```bash
# Search codebase for deprecated field usage
grep -r "\.budget" src/ --include="*.ts" --include="*.tsx"
grep -r "\.rate" src/ --include="*.ts" --include="*.tsx" | grep -v "hourly_rate"
```

---

## Phase 5: Edge Cases & Error Handling

### 5.1 Empty Data Handling

Test report execution with:
```sql
-- Project with no expenses
SELECT public.execute_simple_report(
  'projects',
  '{"filter_0": {"field": "id", "operator": "equals", "value": "[PROJECT_WITH_NO_EXPENSES]"}}'::jsonb,
  'created_at', 'DESC', 10
);
```

- [ ] Returns valid JSON with empty data array?
- [ ] Metadata shows row_count = 0?
- [ ] Frontend handles empty results gracefully?

### 5.2 Invalid Filter Handling

Test with invalid filters:
```sql
-- Invalid field name
SELECT public.execute_simple_report(
  'projects',
  '{"filter_0": {"field": "nonexistent_field", "operator": "equals", "value": "test"}}'::jsonb,
  'created_at', 'DESC', 10
);

-- Invalid operator
SELECT public.execute_simple_report(
  'projects',
  '{"filter_0": {"field": "status", "operator": "invalid_op", "value": "test"}}'::jsonb,
  'created_at', 'DESC', 10
);
```

- [ ] Returns helpful error message?
- [ ] Doesn't expose SQL injection vulnerability?

### 5.3 Large Dataset Performance

```sql
-- Check total row counts
SELECT 'projects' as table_name, COUNT(*) FROM projects
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'quotes', COUNT(*) FROM quotes
UNION ALL
SELECT 'estimate_line_items', COUNT(*) FROM estimate_line_items;

-- Test performance with larger limit
EXPLAIN ANALYZE SELECT public.execute_simple_report(
  'projects',
  '{}'::jsonb,
  'created_at', 'DESC', 1000
);
```

- [ ] Query executes in < 2 seconds?
- [ ] Uses indexes effectively?

### 5.4 Unassigned Project Handling

**Important Business Rule:** SYS-000 / 000-UNASSIGNED should appear as "Unassigned" option in expense/receipt contexts but be excluded from financial reports.

```sql
-- Check unassigned project exists and has correct category
SELECT * FROM projects WHERE project_number IN ('SYS-000', '000-UNASSIGNED');

-- Verify it's excluded from reporting view
SELECT * FROM reporting.project_financials WHERE project_number IN ('SYS-000', '000-UNASSIGNED');
-- Should return 0 rows

-- But check if expenses can be assigned to it
SELECT COUNT(*) FROM expenses WHERE project_id = (
  SELECT id FROM projects WHERE project_number = '000-UNASSIGNED'
);
```

**Check frontend for unassigned handling:**
- [ ] Expense entry shows "Unassigned" option?
- [ ] Receipt upload shows "Unassigned" option?
- [ ] Reports exclude unassigned project from totals?
- [ ] User can filter expenses to see unassigned items?

---

## Phase 6: Security Review

### 6.1 RLS Policies

```sql
-- Check RLS is enabled on reports tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('saved_reports', 'report_execution_log');

-- List RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('saved_reports', 'report_execution_log');
```

- [ ] RLS enabled on `saved_reports`?
- [ ] Users can only read their own reports + templates?
- [ ] Users can only write their own reports?

### 6.2 SQL Injection Prevention

Review `execute_simple_report` function for:
- [ ] Uses `format()` with `%I` for identifiers?
- [ ] Uses `%L` for literals?
- [ ] No string concatenation of user input?

### 6.3 Data Access Control

- [ ] Reports respect underlying table RLS?
- [ ] Reporting views use `security_invoker = on`?

---

## Phase 7: Comprehensive Issue Report

After completing all phases, compile findings into this format:

### Critical Issues (❌ Must Fix)
Issues that prevent reports from working or cause incorrect data.

| # | Issue | Location | Impact | Fix Required |
|---|-------|----------|--------|--------------|
| 1 | | | | |

### Warnings (⚠️ Should Fix)
Issues that may cause confusion or edge case problems.

| # | Issue | Location | Impact | Recommended Fix |
|---|-------|----------|--------|----------------|
| 1 | | | | |

### Verified Working (✅)
Confirm what is working correctly.

| # | Feature | Verification Method |
|---|---------|-------------------|
| 1 | | |

### Action Items Checklist

#### Database Changes Needed
- [ ] Item 1
- [ ] Item 2

#### Migration Files to Create
- [ ] Item 1
- [ ] Item 2

#### Frontend Code Changes
- [ ] File: `path/to/file.tsx` - Change needed
- [ ] File: `path/to/file.ts` - Change needed

#### Documentation Updates
- [ ] Update KPI Guide for...
- [ ] Update README for...

---

## Appendix: Quick Reference Queries

### Get All Project Financial Fields
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;
```

### Get Reporting View Columns
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'reporting' AND table_name = 'project_financials';
```

### Compare Migration Files to Database
```bash
# List all migrations
ls -la supabase/migrations/*.sql

# Check Supabase migration history (if using Supabase CLI)
supabase migration list
```

### Test All Data Sources
```sql
SELECT 'projects' as source, (public.execute_simple_report('projects', '{}', 'created_at', 'DESC', 1))->>'metadata' as meta
UNION ALL
SELECT 'expenses', (public.execute_simple_report('expenses', '{}', 'expense_date', 'DESC', 1))->>'metadata'
UNION ALL
SELECT 'quotes', (public.execute_simple_report('quotes', '{}', 'created_at', 'DESC', 1))->>'metadata'
UNION ALL
SELECT 'time_entries', (public.execute_simple_report('time_entries', '{}', 'expense_date', 'DESC', 1))->>'metadata'
UNION ALL
SELECT 'estimate_line_items', (public.execute_simple_report('estimate_line_items', '{}', 'created_at', 'DESC', 1))->>'metadata';
```

# Database Migrations

## Migration 1: Add Project Category

**File:** `supabase/migrations/[timestamp]_add_project_category.sql`

This migration adds the category system to the projects table.

```sql
-- ============================================================================
-- Migration: Add Project Category System
-- Purpose: Replace hardcoded project_number filtering with category-based filtering
-- ============================================================================

-- Step 1: Create enum type for project categories
-- 'construction' = Real job projects (default)
-- 'system' = Internal system projects (SYS-000, 000-UNASSIGNED) - completely hidden
-- 'overhead' = Overhead cost buckets (001-GAS, 002-GA) - visible in expenses/receipts only
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_category') THEN
    CREATE TYPE project_category AS ENUM ('construction', 'system', 'overhead');
  END IF;
END $$;

-- Step 2: Add category column with safe default
-- All existing projects become 'construction' by default
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS category project_category NOT NULL DEFAULT 'construction';

-- Step 3: Update existing special projects to correct categories
-- System projects - completely hidden from UI
UPDATE projects 
SET category = 'system' 
WHERE project_number IN ('SYS-000', '000-UNASSIGNED')
  AND category != 'system';

-- Overhead projects - visible only in expense/receipt contexts
UPDATE projects 
SET category = 'overhead' 
WHERE project_number = '001-GAS'
  AND category != 'overhead';

-- Step 4: Create index for filtering performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

-- Step 5: Add helpful comment
COMMENT ON COLUMN projects.category IS 
'Project category for filtering: construction (real jobs), system (hidden), overhead (expenses only)';

-- ============================================================================
-- Verification Query - Run after migration to confirm
-- ============================================================================
-- SELECT project_number, project_name, category 
-- FROM projects 
-- WHERE category != 'construction'
-- ORDER BY category, project_number;
```

## Migration 2: Update Reporting Views

**File:** `supabase/migrations/[timestamp]_update_reporting_views_category.sql`

This migration updates the reporting.project_financials view to use category filtering.

```sql
-- ============================================================================
-- Migration: Update Reporting Views for Category Filtering
-- Purpose: Replace project_number exclusions with category-based filtering
-- ============================================================================

-- Drop and recreate the project_financials view
DROP VIEW IF EXISTS reporting.project_financials;

CREATE VIEW reporting.project_financials AS
SELECT 
  p.id,
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  p.project_type,
  p.job_type,
  p.category,  -- Include category in the view for filtering
  p.start_date,
  p.end_date,
  p.created_at,
  p.updated_at,
  
  -- Financial fields (all calculated by database triggers)
  p.contracted_amount,
  p.current_margin,
  p.margin_percentage,
  p.projected_margin,
  p.original_margin,
  p.contingency_remaining,
  p.total_accepted_quotes,
  p.adjusted_est_costs,
  p.original_est_costs,
  
  -- Estimate data
  e.total_amount as estimate_total,
  e.total_cost as estimate_cost,
  e.contingency_amount,
  e.contingency_used,
  e.estimate_number,
  
  -- Expense aggregations (handling split expenses correctly)
  COALESCE(exp_sum.total, 0) as total_expenses,
  COALESCE(exp_sum.count, 0) as expense_count,
  COALESCE(exp_sum.by_category, '{}'::jsonb) as expenses_by_category,
  
  -- Quote aggregations
  COALESCE(quote_sum.total, 0) as accepted_quotes_total,
  COALESCE(quote_sum.count, 0) as accepted_quote_count,
  
  -- Change order aggregations
  COALESCE(co_sum.revenue, 0) as change_order_revenue,
  COALESCE(co_sum.cost, 0) as change_order_cost,
  COALESCE(co_sum.count, 0) as change_order_count,
  
  -- Revenue aggregations
  COALESCE(rev_sum.total, 0) as total_invoiced,
  COALESCE(rev_sum.count, 0) as invoice_count,
  
  -- Line item category composition from current estimate
  COALESCE(eli_sum.has_labor_internal, false) as has_labor_internal,
  COALESCE(eli_sum.has_subcontractors, false) as has_subcontractors,
  COALESCE(eli_sum.has_materials, false) as has_materials,
  COALESCE(eli_sum.has_equipment, false) as has_equipment,
  COALESCE(eli_sum.only_labor_internal, false) as only_labor_internal,
  COALESCE(eli_sum.total_line_items, 0) as total_line_items,
  COALESCE(eli_sum.category_list, ARRAY[]::text[]) as category_list,
  
  -- Calculated fields for reporting
  (p.contracted_amount - COALESCE(exp_sum.total, 0)) as remaining_budget,
  CASE 
    WHEN p.contracted_amount > 0 
    THEN (COALESCE(exp_sum.total, 0) / p.contracted_amount) * 100
    ELSE 0
  END as budget_utilization_percent,
  
  -- Variance calculations
  (COALESCE(exp_sum.total, 0) - COALESCE(e.total_cost, 0)) as cost_variance,
  CASE 
    WHEN COALESCE(e.total_cost, 0) > 0 
    THEN ((COALESCE(exp_sum.total, 0) - COALESCE(e.total_cost, 0)) / COALESCE(e.total_cost, 0)) * 100
    ELSE 0
  END as cost_variance_percent,
  
  -- Contingency calculations
  CASE 
    WHEN COALESCE(e.contingency_amount, 0) > 0 
    THEN (COALESCE(e.contingency_used, 0) / e.contingency_amount) * 100
    ELSE 0
  END as contingency_utilization_percent

FROM projects p

-- Get approved current estimate
LEFT JOIN LATERAL (
  SELECT * FROM estimates e
  WHERE e.project_id = p.id 
    AND e.status = 'approved' 
    AND e.is_current_version = true 
  LIMIT 1
) e ON true

-- Expense summary (handle split expenses correctly)
LEFT JOIN (
  WITH expense_allocations AS (
    SELECT 
      COALESCE(es.project_id, e.project_id) as project_id,
      COALESCE(es.split_amount, e.amount) as amount,
      e.category,
      e.id as expense_id
    FROM expenses e
    LEFT JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.is_split = false OR es.id IS NOT NULL
  )
  SELECT 
    project_id,
    SUM(amount) as total,
    COUNT(DISTINCT expense_id) as count,
    COALESCE(
      (SELECT jsonb_object_agg(category, category_total)
       FROM (
         SELECT category, SUM(amount) as category_total
         FROM expense_allocations ea2
         WHERE ea2.project_id = ea.project_id
         GROUP BY category
       ) cat_totals),
      '{}'::jsonb
    ) as by_category
  FROM expense_allocations ea
  GROUP BY project_id
) exp_sum ON exp_sum.project_id = p.id

-- Accepted quotes summary
LEFT JOIN (
  SELECT 
    project_id,
    SUM(total_amount) as total,
    COUNT(*) as count
  FROM quotes
  WHERE status = 'accepted'
  GROUP BY project_id
) quote_sum ON quote_sum.project_id = p.id

-- Approved change orders summary
LEFT JOIN (
  SELECT 
    project_id,
    SUM(client_amount) as revenue,
    SUM(cost_impact) as cost,
    COUNT(*) as count
  FROM change_orders
  WHERE status = 'approved'
  GROUP BY project_id
) co_sum ON co_sum.project_id = p.id

-- Revenue/invoice summary
LEFT JOIN (
  SELECT 
    project_id,
    SUM(amount) as total,
    COUNT(*) as count
  FROM project_revenues
  GROUP BY project_id
) rev_sum ON rev_sum.project_id = p.id

-- Estimate line items aggregation for category composition
LEFT JOIN (
  SELECT 
    eli.estimate_id,
    COUNT(*) as total_line_items,
    COUNT(*) FILTER (WHERE eli.category = 'labor_internal') > 0 as has_labor_internal,
    COUNT(*) FILTER (WHERE eli.category = 'subcontractors') > 0 as has_subcontractors,
    COUNT(*) FILTER (WHERE eli.category = 'materials') > 0 as has_materials,
    COUNT(*) FILTER (WHERE eli.category = 'equipment') > 0 as has_equipment,
    COUNT(*) = COUNT(*) FILTER (WHERE eli.category = 'labor_internal') as only_labor_internal,
    ARRAY(
      SELECT DISTINCT eli2.category::text
      FROM estimate_line_items eli2
      WHERE eli2.estimate_id = eli.estimate_id
      ORDER BY eli2.category::text
    ) as category_list
  FROM estimate_line_items eli
  GROUP BY eli.estimate_id
) eli_sum ON eli_sum.estimate_id = e.id

-- CHANGED: Use category instead of project_number exclusion
WHERE p.category = 'construction';

-- Grant access to authenticated users
GRANT SELECT ON reporting.project_financials TO authenticated;
```

## Migration 3: Add General & Administrative Project

**File:** `supabase/migrations/[timestamp]_add_general_admin_project.sql`

This migration adds the 002-GA overhead project.

```sql
-- ============================================================================
-- Migration: Add General & Administrative Overhead Project
-- Purpose: Create 002-GA project for general admin expenses
-- ============================================================================

INSERT INTO public.projects (
  id,
  project_number,
  project_name,
  client_name,
  project_type,
  status,
  job_type,
  category,
  address,
  payment_terms,
  minimum_margin_threshold,
  target_margin,
  sequence_number,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000004',  -- Fixed UUID for GA project
  '002-GA',
  'General & Administrative',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',  -- Key: This category controls all filtering behavior
  'Office/Administrative',
  'N/A',
  0.0,
  0.0,
  2,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Also update on project_number conflict (in case UUID is different)
INSERT INTO public.projects (
  project_number,
  project_name,
  client_name,
  project_type,
  status,
  job_type,
  category,
  address,
  payment_terms,
  minimum_margin_threshold,
  target_margin,
  sequence_number,
  created_at,
  updated_at
) VALUES (
  '002-GA',
  'General & Administrative',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',
  'Office/Administrative',
  'N/A',
  0.0,
  0.0,
  2,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE
SET 
  category = 'overhead',
  updated_at = NOW();
```

## Verification Queries

Run these after migrations to verify everything is correct:

```sql
-- Check all project categories
SELECT 
  project_number, 
  project_name, 
  category,
  status
FROM projects 
ORDER BY 
  CASE category 
    WHEN 'system' THEN 1 
    WHEN 'overhead' THEN 2 
    ELSE 3 
  END,
  project_number;

-- Verify construction projects count
SELECT COUNT(*) as construction_count
FROM projects
WHERE category = 'construction';

-- Verify reporting view works
SELECT COUNT(*) as view_count
FROM reporting.project_financials;

-- These counts should match (only construction projects in view)
```

-- Update reporting.project_financials View for Revenue Splits
-- ============================================================================
-- This updates the project_financials view to correctly handle split revenues
-- Pattern mirrors existing expense_splits handling
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing view (if recreating)
-- ============================================================================
-- Note: If you're using CREATE OR REPLACE, you may not need to drop
-- However, if column types change, you'll need to drop first

-- DROP VIEW IF EXISTS reporting.project_financials;

-- ============================================================================
-- STEP 2: Updated project_financials view with revenue splits support
-- ============================================================================

CREATE OR REPLACE VIEW reporting.project_financials AS
WITH 
-- Expense aggregations (existing logic - handles splits)
expense_agg AS (
  SELECT 
    COALESCE(es.project_id, e.project_id) as project_id,
    SUM(COALESCE(es.split_amount, e.amount)) as total_expenses,
    COUNT(DISTINCT e.id) as expense_count,
    jsonb_object_agg(
      COALESCE(e.category::text, 'other'),
      COALESCE(category_totals.amount, 0)
    ) FILTER (WHERE e.category IS NOT NULL) as expenses_by_category
  FROM public.expenses e
  LEFT JOIN public.expense_splits es ON es.expense_id = e.id
  LEFT JOIN LATERAL (
    SELECT 
      e2.category,
      SUM(COALESCE(es2.split_amount, e2.amount)) as amount
    FROM public.expenses e2
    LEFT JOIN public.expense_splits es2 ON es2.expense_id = e2.id
    WHERE COALESCE(es2.project_id, e2.project_id) = COALESCE(es.project_id, e.project_id)
      AND e2.category = e.category
    GROUP BY e2.category
  ) category_totals ON true
  WHERE (e.is_split = false OR e.is_split IS NULL OR es.id IS NOT NULL)
  GROUP BY COALESCE(es.project_id, e.project_id)
),

-- NEW: Revenue aggregations with splits support
revenue_agg AS (
  SELECT 
    COALESCE(rs.project_id, r.project_id) as project_id,
    SUM(COALESCE(rs.split_amount, r.amount)) as total_invoiced,
    COUNT(DISTINCT r.id) as invoice_count
  FROM public.project_revenues r
  LEFT JOIN public.revenue_splits rs ON rs.revenue_id = r.id
  WHERE (r.is_split = false OR r.is_split IS NULL OR rs.id IS NOT NULL)
  GROUP BY COALESCE(rs.project_id, r.project_id)
),

-- Quote aggregations (existing)
quote_agg AS (
  SELECT
    q.project_id,
    SUM(CASE WHEN q.status = 'accepted' THEN q.total_amount ELSE 0 END) as accepted_quotes_total,
    COUNT(CASE WHEN q.status = 'accepted' THEN 1 END) as accepted_quote_count
  FROM public.quotes q
  GROUP BY q.project_id
),

-- Change order aggregations (existing)
change_order_agg AS (
  SELECT
    co.project_id,
    SUM(CASE WHEN co.status = 'approved' THEN co.client_amount ELSE 0 END) as change_order_revenue,
    SUM(CASE WHEN co.status = 'approved' THEN co.cost_impact ELSE 0 END) as change_order_cost,
    COUNT(CASE WHEN co.status = 'approved' THEN 1 END) as change_order_count
  FROM public.change_orders co
  GROUP BY co.project_id
),

-- Estimate data (existing)
estimate_data AS (
  SELECT 
    est.project_id,
    est.estimate_number,
    est.total as estimate_total,
    est.cost as estimate_cost,
    est.contingency_amount,
    est.contingency_used
  FROM public.estimates est
  WHERE est.status = 'approved' 
    AND est.is_current_version = true
)

-- Main query
SELECT 
  p.id,
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  p.project_type,
  p.job_type,
  p.category,
  p.start_date,
  p.end_date,
  p.created_at,
  p.updated_at,
  
  -- Financial fields from projects table (database-calculated)
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
  COALESCE(ed.estimate_total, 0) as estimate_total,
  COALESCE(ed.estimate_cost, 0) as estimate_cost,
  COALESCE(ed.contingency_amount, 0) as contingency_amount,
  COALESCE(ed.contingency_used, 0) as contingency_used,
  ed.estimate_number,
  
  -- Expense aggregations (handles splits)
  COALESCE(ea.total_expenses, 0) as total_expenses,
  COALESCE(ea.expense_count, 0) as expense_count,
  COALESCE(ea.expenses_by_category, '{}'::jsonb) as expenses_by_category,
  
  -- Quote aggregations
  COALESCE(qa.accepted_quotes_total, 0) as accepted_quotes_total,
  COALESCE(qa.accepted_quote_count, 0) as accepted_quote_count,
  
  -- Change order aggregations
  COALESCE(coa.change_order_revenue, 0) as change_order_revenue,
  COALESCE(coa.change_order_cost, 0) as change_order_cost,
  COALESCE(coa.change_order_count, 0) as change_order_count,
  
  -- Revenue aggregations (NOW handles splits)
  COALESCE(ra.total_invoiced, 0) as total_invoiced,
  COALESCE(ra.invoice_count, 0) as invoice_count,
  
  -- Calculated variance fields
  COALESCE(p.contracted_amount, 0) - COALESCE(ea.total_expenses, 0) as remaining_budget,
  CASE 
    WHEN COALESCE(p.contracted_amount, 0) > 0 
    THEN (COALESCE(ea.total_expenses, 0) / p.contracted_amount) * 100
    ELSE 0 
  END as budget_utilization_percent,
  COALESCE(ea.total_expenses, 0) - COALESCE(ed.estimate_cost, 0) as cost_variance,
  COALESCE(p.contracted_amount, 0) - COALESCE(ra.total_invoiced, 0) as revenue_variance

FROM public.projects p
LEFT JOIN estimate_data ed ON ed.project_id = p.id
LEFT JOIN expense_agg ea ON ea.project_id = p.id
LEFT JOIN quote_agg qa ON qa.project_id = p.id
LEFT JOIN change_order_agg coa ON coa.project_id = p.id
LEFT JOIN revenue_agg ra ON ra.project_id = p.id

-- Filter out system projects (use category in future)
WHERE p.project_number NOT IN ('SYS-000', '000-UNASSIGNED')
  -- Future migration: WHERE p.category = 'construction'::project_category
;

-- ============================================================================
-- STEP 3: Grant permissions (if needed)
-- ============================================================================

-- Grant select to authenticated users
GRANT SELECT ON reporting.project_financials TO authenticated;

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================

COMMENT ON VIEW reporting.project_financials IS 
  'Comprehensive project financial view with expense and revenue split support. 
   Used by report builder. Updated to handle revenue_splits table.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test query: Verify split revenues are calculated correctly
/*
SELECT 
  pf.project_number,
  pf.project_name,
  pf.total_invoiced,
  pf.invoice_count,
  pf.revenue_variance
FROM reporting.project_financials pf
WHERE pf.total_invoiced > 0
ORDER BY pf.total_invoiced DESC
LIMIT 10;
*/

-- Test query: Compare direct vs split revenue totals
/*
SELECT 
  'Direct revenues' as type,
  COUNT(*) as count,
  SUM(amount) as total
FROM public.project_revenues
WHERE is_split = false OR is_split IS NULL

UNION ALL

SELECT 
  'Split allocations' as type,
  COUNT(*) as count,
  SUM(split_amount) as total
FROM public.revenue_splits;
*/

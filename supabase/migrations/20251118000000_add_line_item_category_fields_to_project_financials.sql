-- Add line item category composition fields to project_financials view
-- Enables filtering projects by estimate line item categories

-- Drop the view first to allow column reordering
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
    COUNT(*) = COUNT(*) FILTER (WHERE eli.category = 'labor_internal') as only_labor_internal
  FROM estimate_line_items eli
  GROUP BY eli.estimate_id
) eli_sum ON eli_sum.estimate_id = e.id

WHERE p.project_number NOT IN ('SYS-000', '000-UNASSIGNED');

-- Grant access to authenticated users
GRANT SELECT ON reporting.project_financials TO authenticated;


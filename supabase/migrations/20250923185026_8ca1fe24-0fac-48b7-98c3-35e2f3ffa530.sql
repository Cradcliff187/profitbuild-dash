-- Fix security definer view issue by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.project_financial_summary;

CREATE VIEW public.project_financial_summary AS
SELECT 
  p.id as project_id,
  p.project_name,
  p.project_number,
  p.client_name,
  p.status,
  
  -- Estimate totals
  COALESCE(est.total_estimated, 0) as total_estimated,
  COALESCE(est.contingency_amount, 0) as contingency_amount,
  
  -- Revenue totals
  COALESCE(rev.total_invoiced, 0) as total_invoiced,
  COALESCE(rev.invoice_count, 0) as invoice_count,
  
  -- Expense totals
  COALESCE(exp.total_expenses, 0) as total_expenses,
  COALESCE(exp.expense_count, 0) as expense_count,
  
  -- Quote totals (accepted quotes)
  COALESCE(quotes.total_quoted, 0) as total_quoted,
  COALESCE(quotes.quote_count, 0) as accepted_quote_count,
  
  -- Change order impact
  COALESCE(co.client_amount, 0) as change_order_revenue,
  COALESCE(co.cost_impact, 0) as change_order_costs,
  
  -- Calculated margins
  (COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) - 
  (COALESCE(exp.total_expenses, 0) + COALESCE(co.cost_impact, 0)) as actual_profit,
  
  CASE 
    WHEN (COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) > 0 
    THEN ((COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) - 
          (COALESCE(exp.total_expenses, 0) + COALESCE(co.cost_impact, 0))) / 
         (COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) * 100
    ELSE 0 
  END as actual_margin_percentage,
  
  -- Variance calculations
  COALESCE(est.total_estimated, 0) - (COALESCE(exp.total_expenses, 0) + COALESCE(co.cost_impact, 0)) as cost_variance,
  COALESCE(est.total_estimated, 0) - COALESCE(rev.total_invoiced, 0) as revenue_variance

FROM public.projects p

-- Estimate data
LEFT JOIN (
  SELECT 
    e.project_id,
    SUM(e.total_amount) as total_estimated,
    SUM(e.contingency_amount) as contingency_amount
  FROM public.estimates e
  WHERE e.status = 'approved' AND e.is_current_version = true
  GROUP BY e.project_id
) est ON p.id = est.project_id

-- Revenue data
LEFT JOIN (
  SELECT 
    r.project_id,
    SUM(r.amount) as total_invoiced,
    COUNT(*) as invoice_count
  FROM public.project_revenues r
  GROUP BY r.project_id
) rev ON p.id = rev.project_id

-- Expense data
LEFT JOIN (
  SELECT 
    e.project_id,
    SUM(e.amount) as total_expenses,
    COUNT(*) as expense_count
  FROM public.expenses e
  GROUP BY e.project_id
) exp ON p.id = exp.project_id

-- Quote data (accepted quotes)
LEFT JOIN (
  SELECT 
    q.project_id,
    SUM(q.total_amount) as total_quoted,
    COUNT(*) as quote_count
  FROM public.quotes q
  WHERE q.status = 'accepted'
  GROUP BY q.project_id
) quotes ON p.id = quotes.project_id

-- Change order data (approved only)
LEFT JOIN (
  SELECT 
    co.project_id,
    SUM(co.client_amount) as client_amount,
    SUM(co.cost_impact) as cost_impact
  FROM public.change_orders co
  WHERE co.status = 'approved'
  GROUP BY co.project_id
) co ON p.id = co.project_id;
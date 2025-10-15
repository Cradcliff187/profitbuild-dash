-- ============================================================================
-- FIX SECURITY DEFINER VIEW
-- ============================================================================

-- Add RLS to project_financial_summary view
ALTER VIEW public.project_financial_summary SET (security_barrier = true);

-- Enable RLS on the view
-- Note: Views don't support RLS directly in the same way tables do
-- So we need to ensure the underlying tables have proper RLS

-- Alternative: Create a SECURITY INVOKER function instead of relying on the view
CREATE OR REPLACE FUNCTION public.get_project_financial_summary()
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_number text,
  client_name text,
  status project_status,
  total_estimated numeric,
  contingency_amount numeric,
  total_quoted numeric,
  accepted_quote_count bigint,
  total_invoiced numeric,
  invoice_count bigint,
  total_expenses numeric,
  expense_count bigint,
  change_order_revenue numeric,
  change_order_costs numeric,
  actual_profit numeric,
  revenue_variance numeric,
  cost_variance numeric,
  actual_margin_percentage numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id as project_id,
    p.project_name,
    p.project_number,
    p.client_name,
    p.status,
    COALESCE(
      (SELECT e.total_amount 
       FROM estimates e 
       WHERE e.project_id = p.id AND e.status = 'approved' 
       ORDER BY e.updated_at DESC 
       LIMIT 1), 0
    ) as total_estimated,
    COALESCE(
      (SELECT e.contingency_amount 
       FROM estimates e 
       WHERE e.project_id = p.id AND e.status = 'approved' 
       ORDER BY e.updated_at DESC 
       LIMIT 1), 0
    ) as contingency_amount,
    COALESCE(
      (SELECT SUM(q.total_amount) 
       FROM quotes q 
       WHERE q.project_id = p.id), 0
    ) as total_quoted,
    COALESCE(
      (SELECT COUNT(*) 
       FROM quotes q 
       WHERE q.project_id = p.id AND q.status = 'accepted'), 0
    ) as accepted_quote_count,
    COALESCE(
      (SELECT SUM(pr.amount) 
       FROM project_revenues pr 
       WHERE pr.project_id = p.id), 0
    ) as total_invoiced,
    COALESCE(
      (SELECT COUNT(*) 
       FROM project_revenues pr 
       WHERE pr.project_id = p.id), 0
    ) as invoice_count,
    COALESCE(
      (SELECT SUM(ex.amount) 
       FROM expenses ex 
       WHERE ex.project_id = p.id), 0
    ) as total_expenses,
    COALESCE(
      (SELECT COUNT(*) 
       FROM expenses ex 
       WHERE ex.project_id = p.id), 0
    ) as expense_count,
    COALESCE(
      (SELECT SUM(co.client_amount) 
       FROM change_orders co 
       WHERE co.project_id = p.id AND co.status = 'approved'), 0
    ) as change_order_revenue,
    COALESCE(
      (SELECT SUM(co.cost_impact) 
       FROM change_orders co 
       WHERE co.project_id = p.id AND co.status = 'approved'), 0
    ) as change_order_costs,
    p.current_margin as actual_profit,
    0 as revenue_variance,
    0 as cost_variance,
    p.margin_percentage as actual_margin_percentage
  FROM projects p
  WHERE 
    -- Respect RLS: Users can only see projects they have access to
    public.can_access_project(auth.uid(), p.id)
$$;

-- ============================================================================
-- ENSURE ALL EXISTING FUNCTIONS HAVE PROPER search_path
-- ============================================================================

-- Update calculate_project_margins function
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_expenses DECIMAL(15,2) := 0;
  accepted_quotes_total DECIMAL(15,2) := 0;
  approved_estimate_total DECIMAL(15,2) := 0;
  contracted_amt DECIMAL(15,2) := 0;
  calculated_margin DECIMAL(15,2) := 0;
  margin_pct DECIMAL(5,2) := 0;
  contingency_rem DECIMAL(15,2) := 0;
  change_order_client_total DECIMAL(15,2) := 0;
  change_order_cost_total DECIMAL(15,2) := 0;
  change_order_margin_total DECIMAL(15,2) := 0;
  original_cost_total DECIMAL(15,2) := 0;
  adjusted_cost_total DECIMAL(15,2) := 0;
  original_costs_total DECIMAL(15,2) := 0;
  adjusted_costs_total DECIMAL(15,2) := 0;
  actual_allocated_cost_total DECIMAL(15,2) := 0;
  original_margin_calc DECIMAL(15,2) := 0;
  projected_margin_calc DECIMAL(15,2) := 0;
  actual_margin_calc DECIMAL(15,2) := 0;
BEGIN
  SELECT COALESCE(SUM(e.amount), 0)
  INTO total_expenses
  FROM public.expenses e
  WHERE e.project_id = project_id_param;
  
  SELECT COALESCE(SUM(q.total_amount), 0)
  INTO accepted_quotes_total
  FROM public.quotes q
  WHERE q.project_id = project_id_param AND q.status = 'accepted';
  
  SELECT COALESCE(e.total_amount, 0)
  INTO approved_estimate_total
  FROM public.estimates e
  WHERE e.project_id = project_id_param AND e.status = 'approved'
  ORDER BY e.updated_at DESC
  LIMIT 1;
  
  SELECT 
    COALESCE(SUM(co.client_amount), 0),
    COALESCE(SUM(co.cost_impact), 0),
    COALESCE(SUM(co.margin_impact), 0)
  INTO change_order_client_total, change_order_cost_total, change_order_margin_total
  FROM public.change_orders co
  WHERE co.project_id = project_id_param AND co.status = 'approved';
  
  IF approved_estimate_total > 0 THEN
    contracted_amt := approved_estimate_total + change_order_client_total;
  ELSE
    contracted_amt := accepted_quotes_total + change_order_client_total;
  END IF;
  
  total_expenses := total_expenses + change_order_cost_total;
  calculated_margin := COALESCE(contracted_amt, 0) - total_expenses;
  
  IF contracted_amt > 0 THEN
    margin_pct := (calculated_margin / contracted_amt) * 100;
  ELSE
    margin_pct := 0;
  END IF;
  
  SELECT COALESCE(SUM(eli.cost_per_unit * eli.quantity), 0)
  INTO original_costs_total
  FROM public.estimate_line_items eli
  JOIN public.estimates e ON eli.estimate_id = e.id
  WHERE e.project_id = project_id_param AND e.status = 'approved';
  
  WITH line_item_costs AS (
    SELECT 
      eli.category,
      CASE 
        WHEN eli.category IN ('labor_internal', 'management') THEN 
          eli.cost_per_unit * eli.quantity
        ELSE
          COALESCE(
            (SELECT SUM(q.total_amount) 
             FROM public.quotes q 
             WHERE q.estimate_line_item_id = eli.id 
               AND q.status = 'accepted' 
               AND q.project_id = project_id_param),
            eli.cost_per_unit * eli.quantity
          )
      END as item_cost
    FROM public.estimate_line_items eli
    JOIN public.estimates e ON eli.estimate_id = e.id
    WHERE e.project_id = project_id_param AND e.status = 'approved'
  )
  SELECT COALESCE(SUM(item_cost), 0) + change_order_cost_total
  INTO adjusted_costs_total
  FROM line_item_costs;
  
  original_margin_calc := approved_estimate_total - original_costs_total;
  projected_margin_calc := contracted_amt - adjusted_costs_total;
  
  SELECT COALESCE(SUM(exp.amount), 0)
  INTO actual_allocated_cost_total
  FROM public.expenses exp
  JOIN public.expense_line_item_correlations corr ON exp.id = corr.expense_id
  WHERE exp.project_id = project_id_param;
  
  actual_margin_calc := approved_estimate_total - actual_allocated_cost_total;
  contingency_rem := public.calculate_contingency_remaining(project_id_param);
  
  UPDATE public.projects
  SET 
    total_accepted_quotes = accepted_quotes_total,
    contracted_amount = contracted_amt,
    current_margin = calculated_margin,
    margin_percentage = margin_pct,
    contingency_remaining = contingency_rem,
    original_margin = original_margin_calc,
    projected_margin = projected_margin_calc,
    actual_margin = actual_margin_calc,
    original_est_costs = original_costs_total,
    adjusted_est_costs = adjusted_costs_total,
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$$;
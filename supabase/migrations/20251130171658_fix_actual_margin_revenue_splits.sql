-- Fix actual_margin calculation to handle revenue splits
-- The current implementation only queries project_revenues directly,
-- missing split invoices where amounts are in revenue_splits table

CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  project_record RECORD;
  approved_estimate_total DECIMAL(15,2) := 0;
  approved_estimate_cost DECIMAL(15,2) := 0;
  target_margin_pct DECIMAL(5,2) := 0;
  contingency_amt DECIMAL(15,2) := 0;
  accepted_quote_costs DECIMAL(15,2) := 0;
  total_expenses DECIMAL(15,2) := 0;
  total_expense_splits DECIMAL(15,2) := 0;
  approved_co_revenue DECIMAL(15,2) := 0;
  approved_co_costs DECIMAL(15,2) := 0;
  contracted_amt DECIMAL(15,2) := 0;
  projected_costs_calc DECIMAL(15,2) := 0;
  projected_margin_calc DECIMAL(15,2) := 0;
  current_margin_calc DECIMAL(15,2) := 0;
  actual_margin_calc DECIMAL(15,2) := 0;
  original_margin_calc DECIMAL(15,2) := 0;
  total_invoiced DECIMAL(15,2) := 0;
BEGIN
  -- Get project record
  SELECT * INTO project_record FROM projects WHERE id = project_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Skip calculation for system and overhead projects
  IF project_record.category IN ('system', 'overhead') THEN
    RETURN;
  END IF;

  -- Get approved estimate totals
  SELECT 
    COALESCE(e.total_cost, 0),
    COALESCE(e.total_amount, 0),
    COALESCE(e.target_margin_percent, 0),
    COALESCE(e.contingency_amount, 0)
  INTO 
    approved_estimate_cost,
    approved_estimate_total,
    target_margin_pct,
    contingency_amt
  FROM estimates e
  WHERE e.project_id = project_record.id AND e.status = 'approved'
  ORDER BY e.updated_at DESC
  LIMIT 1;

  -- Get accepted quote costs (vendor costs from accepted quote line items)
  SELECT COALESCE(SUM(qli.total_cost), 0) INTO accepted_quote_costs
  FROM quotes q
  INNER JOIN quote_line_items qli ON qli.quote_id = q.id
  WHERE q.project_id = project_record.id
    AND q.status = 'accepted'
    AND qli.estimate_line_item_id IS NOT NULL;

  -- Get total expenses (excluding split parent expenses)
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM expenses
  WHERE project_id = project_record.id
    AND is_split = FALSE;

  -- Get total expense splits for this project
  SELECT COALESCE(SUM(split_amount), 0) INTO total_expense_splits
  FROM expense_splits
  WHERE project_id = project_record.id;

  -- Get approved change order totals
  SELECT 
    COALESCE(SUM(client_amount), 0),
    COALESCE(SUM(cost_impact), 0)
  INTO approved_co_revenue, approved_co_costs
  FROM change_orders
  WHERE project_id = project_record.id AND status = 'approved';

  -- Get total invoiced (handling revenue splits correctly)
  -- This handles both direct revenues and split revenues
  SELECT COALESCE(SUM(COALESCE(rs.split_amount, pr.amount)), 0) INTO total_invoiced
  FROM project_revenues pr
  LEFT JOIN revenue_splits rs ON rs.revenue_id = pr.id AND rs.project_id = project_id_param
  WHERE (pr.is_split = FALSE AND pr.project_id = project_id_param)
     OR (pr.is_split = TRUE AND rs.id IS NOT NULL);

  -- Calculate contracted amount (base estimate + approved CO revenue)
  contracted_amt := approved_estimate_total + approved_co_revenue;

  -- Calculate projected costs
  projected_costs_calc := GREATEST(
    approved_estimate_cost,
    accepted_quote_costs
  ) + approved_co_costs;

  -- Calculate original margin (from approved estimate only)
  original_margin_calc := approved_estimate_total - approved_estimate_cost;

  -- Calculate projected margin (contracted - projected costs)
  projected_margin_calc := contracted_amt - projected_costs_calc;

  -- Calculate current margin (contracted - actual costs)
  current_margin_calc := contracted_amt - (total_expenses + total_expense_splits);

  -- Calculate actual margin (total_invoiced - actual costs)
  -- This is the real profit based on actual invoices and expenses
  actual_margin_calc := total_invoiced - (total_expenses + total_expense_splits);

  -- Update project with calculated values
  UPDATE projects
  SET
    contracted_amount = contracted_amt,
    original_margin = original_margin_calc,
    original_est_costs = approved_estimate_cost,
    adjusted_est_costs = projected_costs_calc,
    projected_margin = projected_margin_calc,
    current_margin = current_margin_calc,
    actual_margin = actual_margin_calc,
    margin_percentage = CASE 
      WHEN contracted_amt > 0 THEN (projected_margin_calc / contracted_amt) * 100
      ELSE 0
    END,
    target_margin = target_margin_pct,
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$function$;

-- Recalculate margins for all projects to populate correct actual_margin values
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN 
    SELECT id FROM projects 
    WHERE category = 'construction'
  LOOP
    PERFORM calculate_project_margins(project_record.id);
  END LOOP;
END $$;


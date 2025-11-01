-- Update calculate_project_margins to restore contingency_remaining calculation
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  approved_estimate_total numeric := 0;
  approved_estimate_cost numeric := 0;
  change_order_client_total numeric := 0;
  change_order_cost_total numeric := 0;
  contingency_billed_total numeric := 0;
  accepted_quotes_total numeric := 0;
  actual_expenses_total numeric := 0;
  contracted_amt numeric := 0;
  original_margin_calc numeric := 0;
  current_margin_calc numeric := 0;
  projected_margin_calc numeric := 0;
  margin_percent numeric := 0;
  original_est_costs_calc numeric := 0;
  adjusted_costs_total numeric := 0;
  contingency_rem numeric := 0;
BEGIN
  -- Get approved estimate totals (revenue and costs)
  SELECT 
    COALESCE(SUM(eli.total), 0), 
    COALESCE(SUM(eli.quantity * eli.cost_per_unit), 0)
  INTO approved_estimate_total, approved_estimate_cost
  FROM estimate_line_items eli
  JOIN estimates e ON eli.estimate_id = e.id
  WHERE e.project_id = project_id_param
    AND e.status = 'approved';

  -- Get change order totals (approved only)
  SELECT 
    COALESCE(SUM(client_amount), 0),
    COALESCE(SUM(cost_impact), 0),
    COALESCE(SUM(contingency_billed_to_client), 0)
  INTO change_order_client_total, change_order_cost_total, contingency_billed_total
  FROM change_orders
  WHERE project_id = project_id_param
    AND status = 'approved';

  -- Get accepted quotes total (for tracking only)
  SELECT COALESCE(SUM(qli.total), 0)
  INTO accepted_quotes_total
  FROM quote_line_items qli
  JOIN quotes q ON qli.quote_id = q.id
  WHERE q.project_id = project_id_param
    AND q.status = 'accepted';

  -- Get actual expenses total
  SELECT COALESCE(SUM(amount), 0)
  INTO actual_expenses_total
  FROM expenses
  WHERE project_id = project_id_param;

  -- Calculate contracted amount (estimate + change orders)
  contracted_amt := approved_estimate_total + change_order_client_total;

  -- Calculate original margin (from approved estimate only)
  original_margin_calc := approved_estimate_total - approved_estimate_cost;

  -- Calculate current margin (contracted - actual expenses)
  current_margin_calc := contracted_amt - actual_expenses_total;

  -- Set original estimated costs
  original_est_costs_calc := approved_estimate_cost;

  -- Calculate adjusted costs (estimate costs + change order cost impacts)
  adjusted_costs_total := approved_estimate_cost + change_order_cost_total;

  -- Calculate projected margin (contracted - adjusted estimated costs)
  projected_margin_calc := contracted_amt - adjusted_costs_total;

  -- Calculate margin percentage based on projected margin
  IF contracted_amt > 0 THEN
    margin_percent := (projected_margin_calc / contracted_amt) * 100;
  ELSE
    margin_percent := 0;
  END IF;

  -- Calculate contingency remaining
  contingency_rem := public.calculate_contingency_remaining(project_id_param);

  -- Update the project with all calculated values
  UPDATE projects
  SET
    contracted_amount = contracted_amt,
    total_accepted_quotes = accepted_quotes_total,
    original_margin = original_margin_calc,
    current_margin = current_margin_calc,
    projected_margin = projected_margin_calc,
    margin_percentage = margin_percent,
    original_est_costs = original_est_costs_calc,
    adjusted_est_costs = adjusted_costs_total,
    contingency_remaining = contingency_rem,
    updated_at = now()
  WHERE id = project_id_param;
END;
$function$;

-- Recalculate margins for all projects to refresh contingency_remaining
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM public.projects LOOP
    PERFORM public.calculate_project_margins(project_record.id);
  END LOOP;
END $$;
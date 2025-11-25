-- Fix calculate_project_margins: Remove invalid actual_margin reference
-- Keep current_margin for live margin tracking only
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- New cost calculation variables
  original_cost_total DECIMAL(15,2) := 0;
  adjusted_cost_total DECIMAL(15,2) := 0;
  original_costs_total DECIMAL(15,2) := 0;
  adjusted_costs_total DECIMAL(15,2) := 0;
  original_margin_calc DECIMAL(15,2) := 0;
  projected_margin_calc DECIMAL(15,2) := 0;
BEGIN
  -- Calculate total expenses for the project
  SELECT COALESCE(SUM(e.amount), 0)
  INTO total_expenses
  FROM public.expenses e
  WHERE e.project_id = project_id_param;
  
  -- Calculate total accepted quotes for the project (keep for backward compatibility)
  SELECT COALESCE(SUM(q.total_amount), 0)
  INTO accepted_quotes_total
  FROM public.quotes q
  WHERE q.project_id = project_id_param AND q.status = 'accepted';
  
  -- Get approved estimate total (this is the revenue for all margin calculations)
  SELECT COALESCE(e.total_amount, 0)
  INTO approved_estimate_total
  FROM public.estimates e
  WHERE e.project_id = project_id_param AND e.status = 'approved'
  ORDER BY e.updated_at DESC
  LIMIT 1;
  
  -- Calculate change order impacts (approved only)
  SELECT 
    COALESCE(SUM(co.client_amount), 0),
    COALESCE(SUM(co.cost_impact), 0),
    COALESCE(SUM(co.margin_impact), 0)
  INTO change_order_client_total, change_order_cost_total, change_order_margin_total
  FROM public.change_orders co
  WHERE co.project_id = project_id_param AND co.status = 'approved';
  
  -- Use approved estimate total plus approved change orders as contracted amount
  IF approved_estimate_total > 0 THEN
    contracted_amt := approved_estimate_total + change_order_client_total;
  ELSE
    contracted_amt := accepted_quotes_total + change_order_client_total;
  END IF;
  
  -- Add change order cost impact to total expenses
  total_expenses := total_expenses + change_order_cost_total;
  
  -- Calculate current margin (contracted amount - actual expenses) - live margin tracking
  calculated_margin := COALESCE(contracted_amt, 0) - total_expenses;
  
  -- Calculate margin percentage
  IF contracted_amt > 0 THEN
    margin_pct := (calculated_margin / contracted_amt) * 100;
  ELSE
    margin_pct := 0;
  END IF;
  
  -- === NEW COST CALCULATIONS ===
  
  -- Calculate Original Est. Costs (sum of all estimate line item costs)
  SELECT COALESCE(SUM(eli.cost_per_unit * eli.quantity), 0)
  INTO original_costs_total
  FROM public.estimate_line_items eli
  JOIN public.estimates e ON eli.estimate_id = e.id
  WHERE e.project_id = project_id_param AND e.status = 'approved';
  
  -- Calculate Adjusted Est. Costs (quotes override estimates + internal + change orders)
  WITH line_item_costs AS (
    SELECT 
      eli.category,
      CASE 
        WHEN eli.category IN ('labor_internal', 'management') THEN 
          eli.cost_per_unit * eli.quantity
        ELSE
          COALESCE(
            (SELECT qli.total_cost 
             FROM public.quote_line_items qli
             JOIN public.quotes q ON qli.quote_id = q.id
             WHERE qli.estimate_line_item_id = qli.id 
               AND q.status = 'accepted'
             ORDER BY q.updated_at DESC
             LIMIT 1),
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
  
  -- === MARGIN CALCULATIONS ===
  
  -- 1. ORIGINAL MARGIN: Revenue - Original estimate costs
  original_margin_calc := approved_estimate_total - original_costs_total;
  
  -- 2. PROJECTED MARGIN: Revenue - Adjusted costs (quotes where available, estimates otherwise)
  projected_margin_calc := contracted_amt - adjusted_costs_total;
  
  -- Calculate contingency remaining (including contingency used by change orders)
  contingency_rem := public.calculate_contingency_remaining(project_id_param);
  
  -- Update the project with all calculated values
  UPDATE public.projects
  SET 
    total_accepted_quotes = accepted_quotes_total,
    contracted_amount = contracted_amt,
    current_margin = calculated_margin,
    margin_percentage = margin_pct,
    contingency_remaining = contingency_rem,
    original_margin = original_margin_calc,
    projected_margin = projected_margin_calc,
    original_est_costs = original_costs_total,
    adjusted_est_costs = adjusted_costs_total,
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$function$;
-- Phase 1 & 2: Fix CO-001 + Add contingency_billed_to_client column + Update functions

-- Add new column for explicit contingency billing tracking
ALTER TABLE public.change_orders
  ADD COLUMN contingency_billed_to_client NUMERIC DEFAULT 0;

-- Comment the column for documentation
COMMENT ON COLUMN public.change_orders.contingency_billed_to_client IS 
  'Explicit amount of contingency billed to client via this change order. Replaces includes_contingency boolean.';

-- Update calculate_contingency_remaining() function with new logic
CREATE OR REPLACE FUNCTION public.calculate_contingency_remaining(project_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_contingency DECIMAL(15,2) := 0;
  used_contingency DECIMAL(15,2) := 0;
  billed_contingency DECIMAL(15,2) := 0;
  remaining_contingency DECIMAL(15,2) := 0;
BEGIN
  -- Get total contingency and amount used for cost overruns from approved estimate
  SELECT COALESCE(e.contingency_amount, 0), COALESCE(e.contingency_used, 0)
  INTO total_contingency, used_contingency
  FROM public.estimates e
  WHERE e.project_id = project_id_param AND e.status = 'approved'
  ORDER BY e.updated_at DESC
  LIMIT 1;
  
  -- Get total contingency billed to client via approved change orders
  SELECT COALESCE(SUM(co.contingency_billed_to_client), 0)
  INTO billed_contingency
  FROM public.change_orders co
  WHERE co.project_id = project_id_param 
    AND co.status = 'approved';
  
  -- Calculate remaining: total - used for costs - billed to client
  remaining_contingency := total_contingency - used_contingency - billed_contingency;
  
  RETURN GREATEST(remaining_contingency, 0);
END;
$function$;

-- Update calculate_project_margins() to include billed contingency in contracted_amount
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
  contingency_billed_total DECIMAL(15,2) := 0;
  original_costs_total DECIMAL(15,2) := 0;
  adjusted_costs_total DECIMAL(15,2) := 0;
  actual_allocated_cost_total DECIMAL(15,2) := 0;
  original_margin_calc DECIMAL(15,2) := 0;
  projected_margin_calc DECIMAL(15,2) := 0;
  actual_margin_calc DECIMAL(15,2) := 0;
BEGIN
  -- Get total expenses (actual costs incurred)
  SELECT COALESCE(SUM(e.amount), 0)
  INTO total_expenses
  FROM public.expenses e
  WHERE e.project_id = project_id_param;
  
  -- Get total accepted quotes
  SELECT COALESCE(SUM(q.total_amount), 0)
  INTO accepted_quotes_total
  FROM public.quotes q
  WHERE q.project_id = project_id_param AND q.status = 'accepted';
  
  -- Get approved estimate total
  SELECT COALESCE(e.total_amount, 0)
  INTO approved_estimate_total
  FROM public.estimates e
  WHERE e.project_id = project_id_param AND e.status = 'approved'
  ORDER BY e.updated_at DESC
  LIMIT 1;
  
  -- Get change order totals AND contingency billed amount (NEW LOGIC)
  SELECT 
    COALESCE(SUM(co.client_amount), 0),
    COALESCE(SUM(co.cost_impact), 0),
    COALESCE(SUM(co.margin_impact), 0),
    COALESCE(SUM(co.contingency_billed_to_client), 0)
  INTO change_order_client_total, change_order_cost_total, 
       change_order_margin_total, contingency_billed_total
  FROM public.change_orders co
  WHERE co.project_id = project_id_param AND co.status = 'approved';
  
  -- Calculate contracted amount: estimate + change orders + billed contingency
  IF approved_estimate_total > 0 THEN
    contracted_amt := approved_estimate_total + change_order_client_total + contingency_billed_total;
  ELSE
    contracted_amt := accepted_quotes_total + change_order_client_total + contingency_billed_total;
  END IF;
  
  -- Calculate current margin (actual expenses vs contract)
  calculated_margin := COALESCE(contracted_amt, 0) - total_expenses;
  
  -- Original costs from approved estimate line items
  SELECT COALESCE(SUM(eli.cost_per_unit * eli.quantity), 0)
  INTO original_costs_total
  FROM public.estimate_line_items eli
  JOIN public.estimates e ON eli.estimate_id = e.id
  WHERE e.project_id = project_id_param AND e.status = 'approved';
  
  -- Adjusted costs: For non-labor/management items, prefer accepted quote line items' costs
  WITH line_item_costs AS (
    SELECT 
      eli.category,
      CASE 
        WHEN eli.category IN ('labor_internal', 'management') THEN 
          eli.cost_per_unit * eli.quantity
        ELSE
          COALESCE(
            (
              SELECT COALESCE(SUM(qli.total_cost), SUM(qli.cost_per_unit * qli.quantity), SUM(qli.total))
              FROM public.quote_line_items qli
              JOIN public.quotes q ON qli.quote_id = q.id
              WHERE q.project_id = project_id_param
                AND q.status = 'accepted'
                AND qli.estimate_line_item_id = eli.id
            ),
            eli.cost_per_unit * eli.quantity
          )
      END as item_cost
    FROM public.estimate_line_items eli
    JOIN public.estimates e ON eli.estimate_id = e.id
    WHERE e.project_id = project_id_param AND e.status = 'approved'
  )
  SELECT COALESCE(SUM(item_cost), 0)
  INTO adjusted_costs_total
  FROM line_item_costs;
  
  -- Add change order costs to adjusted costs
  adjusted_costs_total := adjusted_costs_total + change_order_cost_total;
  
  -- Calculate margins
  original_margin_calc := approved_estimate_total - original_costs_total;
  projected_margin_calc := contracted_amt - adjusted_costs_total;
  
  -- Calculate margin percentage based on projected margin
  IF contracted_amt > 0 THEN
    margin_pct := (projected_margin_calc / contracted_amt) * 100;
  ELSE
    margin_pct := 0;
  END IF;
  
  -- Get actual allocated costs (expenses matched to line items)
  SELECT COALESCE(SUM(exp.amount), 0)
  INTO actual_allocated_cost_total
  FROM public.expenses exp
  JOIN public.expense_line_item_correlations corr ON exp.id = corr.expense_id
  WHERE exp.project_id = project_id_param;
  
  actual_margin_calc := approved_estimate_total - actual_allocated_cost_total;
  
  -- Calculate contingency remaining using updated function
  contingency_rem := public.calculate_contingency_remaining(project_id_param);
  
  -- Update project with all calculated values
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
$function$;

-- Phase 1: Fix CO-001 by setting includes_contingency to FALSE
UPDATE public.change_orders 
SET includes_contingency = FALSE,
    contingency_billed_to_client = 0
WHERE change_order_number = 'CO-001' 
  AND project_id = (SELECT id FROM public.projects WHERE project_number = '225-007');

-- Recalculate margins for project 225-007
DO $$
DECLARE
  project_uuid uuid;
BEGIN
  SELECT id INTO project_uuid FROM public.projects WHERE project_number = '225-007';
  IF project_uuid IS NOT NULL THEN
    PERFORM public.calculate_project_margins(project_uuid);
  END IF;
END $$;
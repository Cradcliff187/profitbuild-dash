-- Add new margin columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS original_margin numeric(15,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS projected_margin numeric(15,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_margin numeric(15,2) DEFAULT NULL;

-- Update calculate_project_margins function to calculate all three margin types
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
  
  -- New margin calculations
  original_cost DECIMAL(15,2) := 0;
  projected_cost DECIMAL(15,2) := 0;
  actual_allocated_cost DECIMAL(15,2) := 0;
  original_margin_calc DECIMAL(15,2) := 0;
  projected_margin_calc DECIMAL(15,2) := 0;
  actual_margin_calc DECIMAL(15,2) := 0;
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
  
  -- Calculate current margin (contracted amount - actual expenses) - keep for backward compatibility
  calculated_margin := COALESCE(contracted_amt, 0) - total_expenses;
  
  -- Calculate margin percentage
  IF contracted_amt > 0 THEN
    margin_pct := (calculated_margin / contracted_amt) * 100;
  ELSE
    margin_pct := 0;
  END IF;
  
  -- === NEW MARGIN CALCULATIONS ===
  
  -- 1. ORIGINAL MARGIN: Revenue - Estimate costs only
  SELECT COALESCE(SUM(eli.cost_per_unit * eli.quantity), 0)
  INTO original_cost
  FROM public.estimate_line_items eli
  JOIN public.estimates e ON eli.estimate_id = e.id
  WHERE e.project_id = project_id_param AND e.status = 'approved';
  
  original_margin_calc := approved_estimate_total - original_cost;
  
  -- 2. PROJECTED MARGIN: Revenue - (Quote costs where available, estimate costs otherwise)
  WITH line_item_costs AS (
    SELECT 
      eli.id,
      eli.cost_per_unit * eli.quantity as estimate_cost,
      COALESCE(
        (SELECT SUM(q.total_amount) 
         FROM public.quotes q 
         WHERE q.estimate_line_item_id = eli.id 
           AND q.status = 'accepted' 
           AND q.project_id = project_id_param),
        eli.cost_per_unit * eli.quantity
      ) as projected_cost
    FROM public.estimate_line_items eli
    JOIN public.estimates e ON eli.estimate_id = e.id
    WHERE e.project_id = project_id_param AND e.status = 'approved'
  )
  SELECT COALESCE(SUM(projected_cost), 0)
  INTO projected_cost
  FROM line_item_costs;
  
  projected_margin_calc := approved_estimate_total - projected_cost;
  
  -- 3. ACTUAL MARGIN: Revenue - Allocated actual expenses only
  SELECT COALESCE(SUM(exp.amount), 0)
  INTO actual_allocated_cost
  FROM public.expenses exp
  JOIN public.expense_line_item_correlations corr ON exp.id = corr.expense_id
  WHERE exp.project_id = project_id_param;
  
  actual_margin_calc := approved_estimate_total - actual_allocated_cost;
  
  -- Calculate contingency remaining (including contingency used by change orders)
  contingency_rem := public.calculate_contingency_remaining(project_id_param);
  
  -- Update the project with all calculated values
  UPDATE public.projects
  SET 
    total_accepted_quotes = accepted_quotes_total,
    contracted_amount = contracted_amt,
    current_margin = calculated_margin, -- Keep existing field for backward compatibility
    margin_percentage = margin_pct,
    contingency_remaining = contingency_rem,
    original_margin = original_margin_calc,
    projected_margin = projected_margin_calc,
    actual_margin = actual_margin_calc,
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$function$;
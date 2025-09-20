-- FIX FINAL SET OF FUNCTIONS
-- Update the remaining functions with proper security settings

CREATE OR REPLACE FUNCTION public.calculate_contingency_remaining(project_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_contingency DECIMAL(15,2) := 0;
  used_contingency DECIMAL(15,2) := 0;
  change_order_contingency_used DECIMAL(15,2) := 0;
  remaining_contingency DECIMAL(15,2) := 0;
BEGIN
  -- Get total contingency and used contingency from current estimate
  SELECT COALESCE(e.contingency_amount, 0), COALESCE(e.contingency_used, 0)
  INTO total_contingency, used_contingency
  FROM public.estimates e
  WHERE e.project_id = project_id_param AND e.is_current_version = true
  LIMIT 1;
  
  -- Calculate contingency used by approved change orders
  SELECT COALESCE(SUM(co.cost_impact), 0)
  INTO change_order_contingency_used
  FROM public.change_orders co
  WHERE co.project_id = project_id_param 
    AND co.status = 'approved' 
    AND co.includes_contingency = true;
  
  -- Calculate remaining contingency
  remaining_contingency := total_contingency - used_contingency - change_order_contingency_used;
  
  RETURN GREATEST(remaining_contingency, 0); -- Never return negative
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_change_order_margin_impact()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate margin impact when both client_amount and cost_impact are provided
  IF NEW.client_amount IS NOT NULL AND NEW.cost_impact IS NOT NULL THEN
    NEW.margin_impact := NEW.client_amount - NEW.cost_impact;
  ELSIF NEW.client_amount IS NOT NULL AND NEW.cost_impact IS NULL THEN
    -- If only client amount is provided, assume it's all margin (no cost impact)
    NEW.margin_impact := NEW.client_amount;
  ELSIF NEW.client_amount IS NULL AND NEW.cost_impact IS NOT NULL THEN
    -- If only cost impact is provided, margin impact is negative
    NEW.margin_impact := -NEW.cost_impact;
  ELSE
    -- If neither is provided, margin impact is null
    NEW.margin_impact := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_expenses DECIMAL(15,2) := 0;
  accepted_quotes_total DECIMAL(15,2) := 0;
  contracted_amt DECIMAL(15,2) := 0;
  calculated_margin DECIMAL(15,2) := 0;
  margin_pct DECIMAL(5,2) := 0;
  contingency_rem DECIMAL(15,2) := 0;
  change_order_client_total DECIMAL(15,2) := 0;
  change_order_cost_total DECIMAL(15,2) := 0;
  change_order_margin_total DECIMAL(15,2) := 0;
BEGIN
  -- Calculate total expenses for the project
  SELECT COALESCE(SUM(e.amount), 0)
  INTO total_expenses
  FROM public.expenses e
  WHERE e.project_id = project_id_param;
  
  -- Calculate total accepted quotes for the project
  SELECT COALESCE(SUM(q.total_amount), 0)
  INTO accepted_quotes_total
  FROM public.quotes q
  WHERE q.project_id = project_id_param AND q.status = 'accepted';
  
  -- Calculate change order impacts (approved only)
  SELECT 
    COALESCE(SUM(co.client_amount), 0),
    COALESCE(SUM(co.cost_impact), 0),
    COALESCE(SUM(co.margin_impact), 0)
  INTO change_order_client_total, change_order_cost_total, change_order_margin_total
  FROM public.change_orders co
  WHERE co.project_id = project_id_param AND co.status = 'approved';
  
  -- Use accepted quotes total plus approved change orders as contracted amount
  contracted_amt := accepted_quotes_total + change_order_client_total;
  
  -- Add change order cost impact to total expenses
  total_expenses := total_expenses + change_order_cost_total;
  
  -- Calculate current margin (contracted amount - actual expenses)
  calculated_margin := COALESCE(contracted_amt, 0) - total_expenses;
  
  -- Calculate margin percentage
  IF contracted_amt > 0 THEN
    margin_pct := (calculated_margin / contracted_amt) * 100;
  ELSE
    margin_pct := 0;
  END IF;
  
  -- Calculate contingency remaining (including contingency used by change orders)
  contingency_rem := public.calculate_contingency_remaining(project_id_param);
  
  -- Update the project with calculated values
  UPDATE public.projects
  SET 
    total_accepted_quotes = accepted_quotes_total,
    contracted_amount = CASE 
      WHEN contracted_amount IS NULL THEN contracted_amt 
      ELSE contracted_amt -- Update with change orders included
    END,
    current_margin = calculated_margin,
    margin_percentage = margin_pct,
    contingency_remaining = contingency_rem,
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$$;
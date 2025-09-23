-- Fix contingency calculation to use approved estimate instead of current version
CREATE OR REPLACE FUNCTION public.calculate_contingency_remaining(project_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_contingency DECIMAL(15,2) := 0;
  used_contingency DECIMAL(15,2) := 0;
  change_order_contingency_used DECIMAL(15,2) := 0;
  remaining_contingency DECIMAL(15,2) := 0;
BEGIN
  -- Get total contingency and used contingency from APPROVED estimate (prioritize approved current, then any approved)
  WITH selected_estimate AS (
    SELECT e.contingency_amount, e.contingency_used
    FROM public.estimates e
    WHERE e.project_id = project_id_param AND e.status = 'approved'
    ORDER BY 
      CASE WHEN e.is_current_version = true THEN 1 ELSE 2 END,
      e.updated_at DESC
    LIMIT 1
  )
  SELECT COALESCE(se.contingency_amount, 0), COALESCE(se.contingency_used, 0)
  INTO total_contingency, used_contingency
  FROM selected_estimate se;
  
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
$function$;
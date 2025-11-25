-- Drop and recreate function to fix margin_percentage calculation
DROP FUNCTION IF EXISTS public.calculate_project_margins(uuid);

CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  project_record RECORD;
  contracted_amt NUMERIC;
  original_contract_amt NUMERIC;
  original_est_cost NUMERIC;
  accepted_quote_costs NUMERIC;
  change_order_revenue NUMERIC;
  change_order_costs NUMERIC;
  adjusted_costs NUMERIC;
  calculated_margin NUMERIC;
  projected_margin_calc NUMERIC;
  margin_pct NUMERIC;
BEGIN
  -- Loop through all projects or just the target project
  FOR project_record IN 
    SELECT id FROM projects 
    WHERE (project_id_param IS NULL OR id = project_id_param)
  LOOP
    -- Get contract amount (current contracted value)
    SELECT COALESCE(contracted_amount, 0) INTO contracted_amt
    FROM projects WHERE id = project_record.id;
    
    -- Get ORIGINAL contract from approved estimate
    SELECT COALESCE(SUM(e.total_amount), 0) INTO original_contract_amt
    FROM estimates e
    WHERE e.project_id = project_record.id
      AND e.status = 'approved'
      AND e.parent_estimate_id IS NULL;
    
    -- Get ORIGINAL estimated costs from approved estimate line items
    SELECT COALESCE(SUM(eli.total_cost), 0) INTO original_est_cost
    FROM estimate_line_items eli
    INNER JOIN estimates e ON e.id = eli.estimate_id
    WHERE e.project_id = project_record.id
      AND e.status = 'approved'
      AND e.parent_estimate_id IS NULL;
    
    -- Get accepted quote costs (vendor costs from accepted quotes)
    SELECT COALESCE(SUM(q.amount), 0) INTO accepted_quote_costs
    FROM quotes q
    LEFT JOIN quote_line_items qli ON qli.quote_id = q.id
    LEFT JOIN estimate_line_items eli ON qli.estimate_line_item_id = eli.id
    WHERE q.project_id = project_record.id
      AND q.status = 'accepted'
      AND eli.id IS NOT NULL;
    
    -- Get change order impacts
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'approved' THEN client_amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN status = 'approved' THEN cost_impact ELSE 0 END), 0)
    INTO change_order_revenue, change_order_costs
    FROM change_orders
    WHERE project_id = project_record.id;
    
    -- Calculate adjusted estimated costs
    -- Start with original estimate costs
    -- Replace with accepted quote costs where quotes exist
    -- Add change order costs
    adjusted_costs := (original_est_cost - accepted_quote_costs) + accepted_quote_costs + change_order_costs;
    
    -- Calculate current margin (Contract - Adjusted Costs)
    calculated_margin := contracted_amt - adjusted_costs;
    
    -- Calculate projected margin (same as current margin in this context)
    projected_margin_calc := calculated_margin;
    
    -- Calculate margin percentage as PROJECTED MARGIN / CONTRACT * 100
    IF contracted_amt > 0 THEN
      margin_pct := (projected_margin_calc / contracted_amt) * 100;
    ELSE
      margin_pct := 0;
    END IF;
    
    -- Update the project with calculated values
    UPDATE projects
    SET 
      adjusted_est_costs = adjusted_costs,
      current_margin = calculated_margin,
      projected_margin = projected_margin_calc,
      margin_percentage = margin_pct,
      original_est_costs = original_est_cost,
      original_margin = original_contract_amt - original_est_cost
    WHERE id = project_record.id;
  END LOOP;
END;
$function$;
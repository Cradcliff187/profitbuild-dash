-- Migration: Update calculate_project_margins to include 'sent' estimates
-- This allows projects in "estimating" status with sent estimates and accepted quotes
-- to have their financial fields populated correctly
--
-- Business Logic: A "sent" estimate represents real numbers that have been shared with
-- the client. When combined with accepted quotes, these should populate project financial
-- fields even before formal estimate approval.

CREATE OR REPLACE FUNCTION public.calculate_project_margins(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_contracted_amount numeric(15,2) := 0;
  v_original_est_costs numeric(15,2) := 0;
  v_adjusted_est_costs numeric(15,2) := 0;
  v_total_expenses numeric(15,2) := 0;
  v_total_invoiced numeric(15,2) := 0;
  v_contingency_amount numeric(15,2) := 0;
  v_contingency_used numeric(15,2) := 0;
  v_contingency_remaining numeric(15,2) := 0;
  v_original_margin numeric(15,2) := 0;
  v_adjusted_est_margin numeric(15,2) := 0;
  v_actual_margin numeric(15,2) := 0;
  v_margin_percentage numeric(5,2) := 0;
  v_estimate_id uuid;
BEGIN
  -- Get the best available estimate (approved preferred, then sent)
  -- Priority: approved with is_current_version, then approved by date, then sent
  SELECT id INTO v_estimate_id
  FROM estimates
  WHERE project_id = p_project_id
    AND status IN ('approved', 'sent')
    AND is_current_version = true
  ORDER BY 
    CASE status 
      WHEN 'approved' THEN 1 
      WHEN 'sent' THEN 2 
      ELSE 3 
    END
  LIMIT 1;
  
  -- If no current version found, get most recent approved or sent estimate
  IF v_estimate_id IS NULL THEN
    SELECT id INTO v_estimate_id
    FROM estimates
    WHERE project_id = p_project_id
      AND status IN ('approved', 'sent')
    ORDER BY 
      CASE status 
        WHEN 'approved' THEN 1 
        WHEN 'sent' THEN 2 
        ELSE 3 
      END,
      date_created DESC
    LIMIT 1;
  END IF;
  
  -- Calculate contracted amount from estimate + approved change orders
  SELECT 
    COALESCE(e.total_amount, 0) + COALESCE(
      (SELECT SUM(client_amount) FROM change_orders 
       WHERE project_id = p_project_id AND status = 'approved'), 0
    )
  INTO v_contracted_amount
  FROM estimates e
  WHERE e.id = v_estimate_id;
  
  -- Fallback to project's contracted_amount if estimate not found
  IF v_contracted_amount IS NULL OR v_contracted_amount = 0 THEN
    SELECT contracted_amount INTO v_contracted_amount
    FROM projects WHERE id = p_project_id;
  END IF;
  
  v_contracted_amount := COALESCE(v_contracted_amount, 0);
  
  -- Calculate original estimated costs from estimate line items
  SELECT COALESCE(SUM(
    COALESCE(eli.total_cost, eli.cost_per_unit * eli.quantity, 0)
  ), 0)
  INTO v_original_est_costs
  FROM estimate_line_items eli
  WHERE eli.estimate_id = v_estimate_id;
  
  -- Calculate adjusted estimated costs (incorporating accepted quote adjustments)
  WITH quote_costs AS (
    SELECT 
      qli.estimate_line_item_id,
      SUM(qli.total_cost) as quoted_cost
    FROM quotes q
    JOIN quote_line_items qli ON qli.quote_id = q.id
    WHERE q.project_id = p_project_id
      AND q.status = 'accepted'
      AND qli.estimate_line_item_id IS NOT NULL
    GROUP BY qli.estimate_line_item_id
  ),
  line_item_costs AS (
    SELECT 
      eli.id,
      CASE 
        WHEN qc.quoted_cost IS NOT NULL THEN qc.quoted_cost
        ELSE COALESCE(eli.total_cost, eli.cost_per_unit * eli.quantity, 0)
      END as final_cost
    FROM estimate_line_items eli
    LEFT JOIN quote_costs qc ON qc.estimate_line_item_id = eli.id
    WHERE eli.estimate_id = v_estimate_id
  )
  SELECT COALESCE(SUM(final_cost), 0)
  INTO v_adjusted_est_costs
  FROM line_item_costs;
  
  -- Add cost impact from approved change orders
  v_adjusted_est_costs := v_adjusted_est_costs + COALESCE(
    (SELECT SUM(cost_impact) FROM change_orders 
     WHERE project_id = p_project_id AND status = 'approved'), 0
  );
  
  -- Calculate total actual expenses (including splits)
  SELECT COALESCE(SUM(
    CASE 
      WHEN e.is_split = false THEN e.amount
      ELSE 0
    END
  ), 0) + COALESCE(
    (SELECT SUM(es.split_amount) 
     FROM expense_splits es 
     WHERE es.project_id = p_project_id), 0
  )
  INTO v_total_expenses
  FROM expenses e
  WHERE e.project_id = p_project_id;
  
  -- Calculate total invoiced/revenue (including splits)
  SELECT COALESCE(SUM(
    CASE 
      WHEN pr.is_split = false THEN pr.amount
      ELSE 0
    END
  ), 0) + COALESCE(
    (SELECT SUM(rs.split_amount) 
     FROM revenue_splits rs 
     WHERE rs.project_id = p_project_id), 0
  )
  INTO v_total_invoiced
  FROM project_revenues pr
  WHERE pr.project_id = p_project_id;
  
  -- Get contingency amount from estimate
  SELECT COALESCE(contingency_amount, 0)
  INTO v_contingency_amount
  FROM estimates
  WHERE id = v_estimate_id;
  
  -- Calculate contingency used from approved change orders
  SELECT COALESCE(SUM(
    CASE WHEN includes_contingency = true THEN cost_impact ELSE 0 END
  ), 0)
  INTO v_contingency_used
  FROM change_orders
  WHERE project_id = p_project_id AND status = 'approved';
  
  v_contingency_remaining := GREATEST(v_contingency_amount - v_contingency_used, 0);
  
  -- Calculate all margin values
  v_original_margin := v_contracted_amount - v_original_est_costs;
  v_adjusted_est_margin := v_contracted_amount - v_adjusted_est_costs;
  v_actual_margin := v_total_invoiced - v_total_expenses;
  
  -- Calculate margin percentage
  IF v_contracted_amount > 0 THEN
    v_margin_percentage := (v_adjusted_est_margin / v_contracted_amount) * 100;
  END IF;
  
  -- Update the project with all calculated values
  UPDATE projects
  SET 
    contracted_amount = v_contracted_amount,
    original_est_costs = v_original_est_costs,
    adjusted_est_costs = v_adjusted_est_costs,
    original_margin = v_original_margin,
    projected_margin = v_adjusted_est_margin,
    adjusted_est_margin = v_adjusted_est_margin,
    actual_margin = v_actual_margin,
    margin_percentage = v_margin_percentage,
    contingency_remaining = v_contingency_remaining,
    current_margin = v_contracted_amount - v_total_expenses,
    updated_at = now()
  WHERE id = p_project_id;
END;
$function$;

COMMENT ON FUNCTION public.calculate_project_margins(uuid) IS 
'Calculates and updates project financial fields including margins, costs, and contingency. 
Now processes estimates with status ''approved'' or ''sent'' to support projects in estimating 
status that have sent estimates with accepted quotes.';

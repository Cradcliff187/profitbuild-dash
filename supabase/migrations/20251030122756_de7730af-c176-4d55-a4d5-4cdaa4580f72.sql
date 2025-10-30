-- Fix calculate_project_margins to remove stale quotes.estimate_line_item_id reference and use quote_line_items instead
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Original costs from approved estimate line items
  SELECT COALESCE(SUM(eli.cost_per_unit * eli.quantity), 0)
  INTO original_costs_total
  FROM public.estimate_line_items eli
  JOIN public.estimates e ON eli.estimate_id = e.id
  WHERE e.project_id = project_id_param AND e.status = 'approved';
  
  -- Adjusted costs: For non-labor/management items, prefer accepted quote line items' total_cost
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

-- Create secure RPC to delete a project and all related records atomically
CREATE OR REPLACE FUNCTION public.delete_project_cascade(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_estimate_ids uuid[];
  v_expense_ids uuid[];
  v_quote_ids uuid[];
BEGIN
  -- Authorization: admins/managers or users with project access
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.can_access_project(auth.uid(), p_project_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not authorized to delete this project';
  END IF;

  -- Collect IDs for dependent records
  SELECT array_agg(id) INTO v_estimate_ids FROM public.estimates WHERE project_id = p_project_id;
  SELECT array_agg(id) INTO v_expense_ids FROM public.expenses WHERE project_id = p_project_id;
  SELECT array_agg(id) INTO v_quote_ids FROM public.quotes WHERE project_id = p_project_id;

  -- 1. Delete expense correlations first
  IF v_expense_ids IS NOT NULL THEN
    DELETE FROM public.expense_line_item_correlations WHERE expense_id = ANY(v_expense_ids);
  END IF;

  -- 2. Delete quote line items (by quote_id and by linked estimate_line_items)
  IF v_quote_ids IS NOT NULL AND array_length(v_quote_ids, 1) > 0 THEN
    DELETE FROM public.quote_line_items WHERE quote_id = ANY(v_quote_ids);
  END IF;

  IF v_estimate_ids IS NOT NULL AND array_length(v_estimate_ids, 1) > 0 THEN
    DELETE FROM public.quote_line_items 
    WHERE estimate_line_item_id IN (
      SELECT id FROM public.estimate_line_items WHERE estimate_id = ANY(v_estimate_ids)
    );
  END IF;

  -- 3. Delete quotes
  DELETE FROM public.quotes WHERE project_id = p_project_id;

  -- 4. Delete estimate line items
  IF v_estimate_ids IS NOT NULL THEN
    DELETE FROM public.estimate_line_items WHERE estimate_id = ANY(v_estimate_ids);
  END IF;

  -- 5. Delete estimates
  DELETE FROM public.estimates WHERE project_id = p_project_id;

  -- 6. Delete expenses
  DELETE FROM public.expenses WHERE project_id = p_project_id;

  -- 7. Delete change orders
  DELETE FROM public.change_orders WHERE project_id = p_project_id;

  -- 8. Delete project revenues
  DELETE FROM public.project_revenues WHERE project_id = p_project_id;

  -- 9. Delete project media
  DELETE FROM public.project_media WHERE project_id = p_project_id;

  -- 10. Delete project assignments
  DELETE FROM public.project_assignments WHERE project_id = p_project_id;

  -- 11. Receipts: remove project reference
  UPDATE public.receipts SET project_id = NULL WHERE project_id = p_project_id;

  -- 12. Finally delete the project
  DELETE FROM public.projects WHERE id = p_project_id;
END;
$$;

-- Allow authenticated users to execute the RPC
GRANT EXECUTE ON FUNCTION public.delete_project_cascade(uuid) TO authenticated;
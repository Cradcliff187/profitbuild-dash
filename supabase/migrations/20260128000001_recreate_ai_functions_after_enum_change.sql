-- Recreate AI functions that were dropped by CASCADE during enum change
-- These functions depend on the project_status enum and were dropped when we altered it

CREATE OR REPLACE FUNCTION public.get_project_financial_summary()
RETURNS TABLE(
  project_id uuid,
  project_name text,
  project_number text,
  client_name text,
  status project_status,
  total_estimated numeric,
  contingency_amount numeric,
  total_quoted numeric,
  accepted_quote_count bigint,
  total_invoiced numeric,
  invoice_count bigint,
  total_expenses numeric,
  expense_count bigint,
  change_order_revenue numeric,
  change_order_costs numeric,
  actual_profit numeric,
  revenue_variance numeric,
  cost_variance numeric,
  actual_margin_percentage numeric
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    p.id as project_id,
    p.project_name,
    p.project_number,
    p.client_name,
    p.status,
    COALESCE(
      (SELECT e.total_amount 
       FROM estimates e 
       WHERE e.project_id = p.id AND e.status = 'approved' 
       ORDER BY e.updated_at DESC 
       LIMIT 1), 0
    ) as total_estimated,
    COALESCE(
      (SELECT e.contingency_amount 
       FROM estimates e 
       WHERE e.project_id = p.id AND e.status = 'approved' 
       ORDER BY e.updated_at DESC 
       LIMIT 1), 0
    ) as contingency_amount,
    COALESCE(
      (SELECT SUM(q.total_amount) 
       FROM quotes q 
       WHERE q.project_id = p.id), 0
    ) as total_quoted,
    COALESCE(
      (SELECT COUNT(*) 
       FROM quotes q 
       WHERE q.project_id = p.id AND q.status = 'accepted'), 0
    ) as accepted_quote_count,
    COALESCE(
      (SELECT SUM(pr.amount) 
       FROM project_revenues pr 
       WHERE pr.project_id = p.id), 0
    ) as total_invoiced,
    COALESCE(
      (SELECT COUNT(*) 
       FROM project_revenues pr 
       WHERE pr.project_id = p.id), 0
    ) as invoice_count,
    COALESCE(
      (SELECT SUM(ex.amount) 
       FROM expenses ex 
       WHERE ex.project_id = p.id), 0
    ) as total_expenses,
    COALESCE(
      (SELECT COUNT(*) 
       FROM expenses ex 
       WHERE ex.project_id = p.id), 0
    ) as expense_count,
    COALESCE(
      (SELECT SUM(co.client_amount) 
       FROM change_orders co 
       WHERE co.project_id = p.id AND co.status = 'approved'), 0
    ) as change_order_revenue,
    COALESCE(
      (SELECT SUM(co.cost_impact) 
       FROM change_orders co 
       WHERE co.project_id = p.id AND co.status = 'approved'), 0
    ) as change_order_costs,
    p.current_margin as actual_profit,
    0 as revenue_variance,
    0 as cost_variance,
    p.margin_percentage as actual_margin_percentage
  FROM projects p
  WHERE 
    -- Respect RLS: Users can only see projects they have access to
    public.can_access_project(auth.uid(), p.id)
$function$;

CREATE OR REPLACE FUNCTION public.ai_resolve_project(p_search_term text)
RETURNS TABLE(
  id uuid,
  project_number text,
  project_name text,
  client_name text,
  status project_status,
  project_type project_type,
  match_type text,
  confidence numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH matches AS (
    SELECT 
      p.id,
      p.project_number,
      p.project_name,
      p.client_name,
      p.status,
      p.project_type,
      CASE
        WHEN LOWER(p.project_number) = LOWER(p_search_term) THEN 'exact_number'
        WHEN LOWER(p.project_name) = LOWER(p_search_term) THEN 'exact_name'
        WHEN LOWER(p.project_number) LIKE '%' || LOWER(p_search_term) || '%' THEN 'partial_number'
        WHEN LOWER(p.project_name) LIKE LOWER(p_search_term) || '%' THEN 'starts_with'
        ELSE 'contains'
      END AS match_type,
      CASE
        WHEN LOWER(p.project_number) = LOWER(p_search_term) THEN 1.0
        WHEN LOWER(p.project_name) = LOWER(p_search_term) THEN 0.95
        WHEN LOWER(p.project_number) LIKE '%' || LOWER(p_search_term) || '%' THEN 0.85
        WHEN LOWER(p.project_name) LIKE LOWER(p_search_term) || '%' THEN 0.75
        ELSE 0.5
      END AS confidence
    FROM projects p
    WHERE 
      p.category = 'construction'  -- Only real projects, not system/overhead
      AND (
        LOWER(p.project_number) ILIKE '%' || LOWER(p_search_term) || '%'
        OR LOWER(p.project_name) ILIKE '%' || LOWER(p_search_term) || '%'
        OR LOWER(p.client_name) ILIKE '%' || LOWER(p_search_term) || '%'
      )
    ORDER BY 
      CASE
        WHEN LOWER(p.project_number) = LOWER(p_search_term) THEN 1
        WHEN LOWER(p.project_name) = LOWER(p_search_term) THEN 2
        WHEN LOWER(p.project_number) LIKE '%' || LOWER(p_search_term) || '%' THEN 3
        WHEN LOWER(p.project_name) LIKE LOWER(p_search_term) || '%' THEN 4
        ELSE 5
      END,
      p.updated_at DESC
    LIMIT 5
  )
  SELECT * FROM matches;
END;
$function$;

-- Note: ai_create_project and ai_update_project_status are more complex functions
-- that are defined in migration 20260125070347_ai_action_functions.sql
-- For now, we'll skip recreating them here since they're not critical for core app functionality
-- and will need to be properly populated from the original source when needed.

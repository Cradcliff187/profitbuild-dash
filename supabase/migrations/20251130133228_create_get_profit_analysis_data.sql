-- Create RPC function for profit analysis data
-- Returns filtered and formatted data from reporting.project_financials view

CREATE OR REPLACE FUNCTION get_profit_analysis_data(
  status_filter text[] DEFAULT ARRAY['approved', 'in_progress', 'complete']
)
RETURNS TABLE (
  id uuid,
  project_number text,
  project_name text,
  client_name text,
  status text,
  job_type text,
  start_date date,
  end_date date,
  contracted_amount numeric,
  total_invoiced numeric,
  invoice_count integer,
  change_order_revenue numeric,
  original_margin numeric,
  projected_margin numeric,
  current_margin numeric,
  margin_percentage numeric,
  original_est_costs numeric,
  adjusted_est_costs numeric,
  total_expenses numeric,
  cost_variance numeric,
  cost_variance_percent numeric,
  budget_utilization_percent numeric,
  total_accepted_quotes numeric,
  accepted_quote_count integer,
  change_order_cost numeric,
  change_order_count integer,
  contingency_amount numeric,
  contingency_used numeric,
  contingency_remaining numeric,
  expenses_by_category jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    id,
    project_number,
    project_name,
    client_name,
    status::text,
    job_type,
    start_date,
    end_date,
    COALESCE(contracted_amount, 0),
    COALESCE(total_invoiced, 0),
    COALESCE(invoice_count::integer, 0),
    COALESCE(change_order_revenue, 0),
    COALESCE(original_margin, 0),
    COALESCE(projected_margin, 0),
    COALESCE(current_margin, 0),
    COALESCE(margin_percentage, 0),
    COALESCE(original_est_costs, 0),
    COALESCE(adjusted_est_costs, 0),
    COALESCE(total_expenses, 0),
    COALESCE(cost_variance, 0),
    CASE 
      WHEN COALESCE(adjusted_est_costs, 0) > 0 
      THEN (COALESCE(cost_variance, 0) / adjusted_est_costs) * 100
      ELSE 0
    END as cost_variance_percent,
    COALESCE(budget_utilization_percent, 0),
    COALESCE(total_accepted_quotes, 0),
    COALESCE(accepted_quote_count::integer, 0),
    COALESCE(change_order_cost, 0),
    COALESCE(change_order_count::integer, 0),
    COALESCE(contingency_amount, 0),
    COALESCE(contingency_used, 0),
    COALESCE(contingency_remaining, 0),
    COALESCE(expenses_by_category, '{}'::jsonb)
  FROM reporting.project_financials
  WHERE status::text = ANY(status_filter)
  ORDER BY contracted_amount DESC;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_profit_analysis_data TO authenticated;


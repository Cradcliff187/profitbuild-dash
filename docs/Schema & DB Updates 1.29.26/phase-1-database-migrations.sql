-- =============================================================================
-- RCG WORK CLEANUP - PHASE 1: DATABASE MIGRATIONS
-- =============================================================================
-- 
-- Run these migrations in order. Each section can be run as a separate migration.
-- Recommended: Create individual migration files in supabase/migrations/
--
-- Migration naming convention:
--   [timestamp]_[description].sql
--   Example: 20260130000001_add_adjusted_est_margin_column.sql
--
-- =============================================================================

-- =============================================================================
-- MIGRATION 1A: Add adjusted_est_margin column
-- File: supabase/migrations/[timestamp]_add_adjusted_est_margin_column.sql
-- =============================================================================

-- Add the new column (keeps projected_margin for backward compatibility)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS adjusted_est_margin numeric(15,2);

-- Copy existing data
UPDATE projects 
SET adjusted_est_margin = projected_margin 
WHERE adjusted_est_margin IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN projects.adjusted_est_margin IS 
  'Expected final margin based on current estimates adjusted for accepted quotes and change orders. Formula: contracted_amount - adjusted_est_costs. Replaces projected_margin.';

-- Mark projected_margin as deprecated (will be removed in future migration)
COMMENT ON COLUMN projects.projected_margin IS 
  'DEPRECATED: Use adjusted_est_margin instead. This column will be removed in a future release.';

-- Mark current_margin as deprecated
COMMENT ON COLUMN projects.current_margin IS 
  'DEPRECATED: Use actual_margin instead. Formula was: contracted_amount - total_expenses. This column will be removed in a future release.';


-- =============================================================================
-- MIGRATION 1B: Update calculate_project_margins function
-- File: supabase/migrations/[timestamp]_update_calculate_project_margins.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_project_margins(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  -- Get the current approved estimate
  SELECT id INTO v_estimate_id
  FROM estimates
  WHERE project_id = p_project_id
    AND status = 'approved'
    AND is_current_version = true
  LIMIT 1;
  
  -- If no current approved, get latest approved
  IF v_estimate_id IS NULL THEN
    SELECT id INTO v_estimate_id
    FROM estimates
    WHERE project_id = p_project_id
      AND status = 'approved'
    ORDER BY date_created DESC
    LIMIT 1;
  END IF;

  -- Calculate contracted_amount (estimate total + approved change orders)
  SELECT 
    COALESCE(e.total_amount, 0) + COALESCE(
      (SELECT SUM(client_amount) FROM change_orders 
       WHERE project_id = p_project_id AND status = 'approved'), 0
    )
  INTO v_contracted_amount
  FROM estimates e
  WHERE e.id = v_estimate_id;
  
  -- If no estimate, check if contracted_amount is set directly
  IF v_contracted_amount IS NULL OR v_contracted_amount = 0 THEN
    SELECT contracted_amount INTO v_contracted_amount
    FROM projects WHERE id = p_project_id;
  END IF;
  
  v_contracted_amount := COALESCE(v_contracted_amount, 0);

  -- Calculate original_est_costs (from estimate line items - COSTS not prices)
  SELECT COALESCE(SUM(
    COALESCE(eli.total_cost, eli.cost_per_unit * eli.quantity, 0)
  ), 0)
  INTO v_original_est_costs
  FROM estimate_line_items eli
  WHERE eli.estimate_id = v_estimate_id;

  -- Calculate adjusted_est_costs (original + accepted quotes variance + change order costs)
  -- Quote costs replace original estimate costs for matched line items
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
  
  -- Add change order cost impacts
  v_adjusted_est_costs := v_adjusted_est_costs + COALESCE(
    (SELECT SUM(cost_impact) FROM change_orders 
     WHERE project_id = p_project_id AND status = 'approved'), 0
  );

  -- Calculate total_expenses (direct + splits)
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

  -- Calculate total_invoiced (direct + splits)
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

  -- Get contingency from estimate
  SELECT COALESCE(contingency_amount, 0)
  INTO v_contingency_amount
  FROM estimates
  WHERE id = v_estimate_id;

  -- Calculate contingency used (from change orders that used contingency)
  SELECT COALESCE(SUM(
    CASE WHEN includes_contingency = true THEN cost_impact ELSE 0 END
  ), 0)
  INTO v_contingency_used
  FROM change_orders
  WHERE project_id = p_project_id AND status = 'approved';

  -- Contingency remaining
  v_contingency_remaining := GREATEST(v_contingency_amount - v_contingency_used, 0);

  -- Calculate margins
  v_original_margin := v_contracted_amount - v_original_est_costs;
  v_adjusted_est_margin := v_contracted_amount - v_adjusted_est_costs;
  v_actual_margin := v_total_invoiced - v_total_expenses;
  
  -- Margin percentage (based on adjusted_est_margin)
  IF v_contracted_amount > 0 THEN
    v_margin_percentage := (v_adjusted_est_margin / v_contracted_amount) * 100;
  END IF;

  -- Update the project record
  UPDATE projects
  SET 
    contracted_amount = v_contracted_amount,
    original_est_costs = v_original_est_costs,
    adjusted_est_costs = v_adjusted_est_costs,
    original_margin = v_original_margin,
    -- Set BOTH columns during transition period
    projected_margin = v_adjusted_est_margin,
    adjusted_est_margin = v_adjusted_est_margin,
    actual_margin = v_actual_margin,
    margin_percentage = v_margin_percentage,
    contingency_remaining = v_contingency_remaining,
    -- Also update current_margin for backward compatibility (DEPRECATED)
    current_margin = v_contracted_amount - v_total_expenses,
    updated_at = now()
  WHERE id = p_project_id;

END;
$$;


-- =============================================================================
-- MIGRATION 1C: Update reporting.project_financials view
-- File: supabase/migrations/[timestamp]_update_project_financials_view.sql
-- =============================================================================

CREATE OR REPLACE VIEW reporting.project_financials AS
SELECT 
  p.id,
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  p.category,
  p.job_type,
  p.start_date,
  p.end_date,
  
  -- Revenue metrics
  p.contracted_amount,
  COALESCE(
    (SELECT SUM(CASE WHEN pr.is_split = false THEN pr.amount ELSE 0 END)
     FROM project_revenues pr WHERE pr.project_id = p.id) +
    (SELECT COALESCE(SUM(rs.split_amount), 0)
     FROM revenue_splits rs WHERE rs.project_id = p.id),
    0
  ) AS total_invoiced,
  
  -- Cost metrics
  p.original_est_costs,
  p.adjusted_est_costs,
  COALESCE(
    (SELECT SUM(CASE WHEN e.is_split = false THEN e.amount ELSE 0 END)
     FROM expenses e WHERE e.project_id = p.id) +
    (SELECT COALESCE(SUM(es.split_amount), 0)
     FROM expense_splits es WHERE es.project_id = p.id),
    0
  ) AS total_expenses,
  
  -- Margin metrics (NEW NAMING)
  p.original_margin,
  p.adjusted_est_margin,  -- NEW: replaces projected_margin
  p.projected_margin,     -- DEPRECATED: kept for backward compatibility
  p.actual_margin,
  p.margin_percentage,
  p.current_margin,       -- DEPRECATED: kept for backward compatibility
  
  -- Contingency
  COALESCE((SELECT contingency_amount FROM estimates 
            WHERE project_id = p.id AND status = 'approved' 
            AND is_current_version = true LIMIT 1), 0) AS contingency_amount,
  COALESCE(p.contingency_remaining, 0) AS contingency_remaining,
  
  -- Variance calculations (NEW)
  COALESCE(
    (SELECT SUM(CASE WHEN e.is_split = false THEN e.amount ELSE 0 END)
     FROM expenses e WHERE e.project_id = p.id) +
    (SELECT COALESCE(SUM(es.split_amount), 0)
     FROM expense_splits es WHERE es.project_id = p.id),
    0
  ) - p.adjusted_est_costs AS cost_variance,
  
  CASE 
    WHEN p.adjusted_est_costs > 0 THEN
      ((COALESCE(
        (SELECT SUM(CASE WHEN e.is_split = false THEN e.amount ELSE 0 END)
         FROM expenses e WHERE e.project_id = p.id) +
        (SELECT COALESCE(SUM(es.split_amount), 0)
         FROM expense_splits es WHERE es.project_id = p.id),
        0
      ) - p.adjusted_est_costs) / p.adjusted_est_costs) * 100
    ELSE 0
  END AS cost_variance_percent,
  
  -- Budget utilization (NEW)
  CASE 
    WHEN p.adjusted_est_costs > 0 THEN
      (COALESCE(
        (SELECT SUM(CASE WHEN e.is_split = false THEN e.amount ELSE 0 END)
         FROM expenses e WHERE e.project_id = p.id) +
        (SELECT COALESCE(SUM(es.split_amount), 0)
         FROM expense_splits es WHERE es.project_id = p.id),
        0
      ) / p.adjusted_est_costs) * 100
    ELSE 0
  END AS budget_utilization_percent,
  
  -- Revenue variance
  p.contracted_amount - COALESCE(
    (SELECT SUM(CASE WHEN pr.is_split = false THEN pr.amount ELSE 0 END)
     FROM project_revenues pr WHERE pr.project_id = p.id) +
    (SELECT COALESCE(SUM(rs.split_amount), 0)
     FROM revenue_splits rs WHERE rs.project_id = p.id),
    0
  ) AS revenue_variance,
  
  -- Margin percentages (NEW)
  CASE 
    WHEN p.contracted_amount > 0 
    THEN (p.adjusted_est_margin / p.contracted_amount) * 100 
    ELSE 0 
  END AS adjusted_est_margin_percent,
  
  CASE 
    WHEN COALESCE(
      (SELECT SUM(CASE WHEN pr.is_split = false THEN pr.amount ELSE 0 END)
       FROM project_revenues pr WHERE pr.project_id = p.id) +
      (SELECT COALESCE(SUM(rs.split_amount), 0)
       FROM revenue_splits rs WHERE rs.project_id = p.id),
      0
    ) > 0 
    THEN (p.actual_margin / COALESCE(
      (SELECT SUM(CASE WHEN pr.is_split = false THEN pr.amount ELSE 0 END)
       FROM project_revenues pr WHERE pr.project_id = p.id) +
      (SELECT COALESCE(SUM(rs.split_amount), 0)
       FROM revenue_splits rs WHERE rs.project_id = p.id),
      0
    )) * 100 
    ELSE 0 
  END AS actual_margin_percent,
  
  -- Counts
  (SELECT COUNT(*) FROM project_revenues pr WHERE pr.project_id = p.id) +
  (SELECT COUNT(*) FROM revenue_splits rs WHERE rs.project_id = p.id) AS invoice_count,
  
  (SELECT COUNT(*) FROM expenses e WHERE e.project_id = p.id) +
  (SELECT COUNT(*) FROM expense_splits es WHERE es.project_id = p.id) AS expense_count,
  
  (SELECT COUNT(*) FROM change_orders co 
   WHERE co.project_id = p.id AND co.status = 'approved') AS change_order_count,
  
  (SELECT COUNT(*) FROM quotes q 
   WHERE q.project_id = p.id AND q.status = 'accepted') AS accepted_quote_count,
  
  -- Change order totals
  COALESCE((SELECT SUM(client_amount) FROM change_orders 
            WHERE project_id = p.id AND status = 'approved'), 0) AS change_order_revenue,
  COALESCE((SELECT SUM(cost_impact) FROM change_orders 
            WHERE project_id = p.id AND status = 'approved'), 0) AS change_order_cost,
  
  -- Timestamps
  p.created_at,
  p.updated_at

FROM projects p
WHERE p.category = 'construction';


-- =============================================================================
-- MIGRATION 1D: Update get_profit_analysis_data function
-- File: supabase/migrations/[timestamp]_update_get_profit_analysis_data.sql
-- =============================================================================

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
  original_est_costs numeric,
  adjusted_est_costs numeric,
  total_expenses numeric,
  original_margin numeric,
  adjusted_est_margin numeric,  -- NEW
  projected_margin numeric,     -- DEPRECATED but kept for compatibility
  actual_margin numeric,
  margin_percentage numeric,
  current_margin numeric,       -- DEPRECATED but kept for compatibility
  contingency_amount numeric,
  contingency_remaining numeric,
  contingency_used numeric,
  cost_variance numeric,
  cost_variance_percent numeric,
  budget_utilization_percent numeric,
  invoice_count bigint,
  change_order_count bigint,
  change_order_revenue numeric,
  change_order_cost numeric,
  accepted_quote_count bigint,
  total_accepted_quotes numeric,
  expenses_by_category jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pf.id,
    pf.project_number,
    pf.project_name,
    pf.client_name,
    pf.status::text,
    pf.job_type,
    pf.start_date,
    pf.end_date,
    pf.contracted_amount,
    pf.total_invoiced,
    pf.original_est_costs,
    pf.adjusted_est_costs,
    pf.total_expenses,
    pf.original_margin,
    pf.adjusted_est_margin,
    pf.projected_margin,
    pf.actual_margin,
    pf.margin_percentage,
    pf.current_margin,
    pf.contingency_amount,
    pf.contingency_remaining,
    pf.contingency_amount - pf.contingency_remaining AS contingency_used,
    pf.cost_variance,
    pf.cost_variance_percent,
    pf.budget_utilization_percent,
    pf.invoice_count,
    pf.change_order_count,
    pf.change_order_revenue,
    pf.change_order_cost,
    pf.accepted_quote_count,
    COALESCE((SELECT SUM(total_amount) FROM quotes q 
              WHERE q.project_id = pf.id AND q.status = 'accepted'), 0) AS total_accepted_quotes,
    (SELECT jsonb_object_agg(category, amount)
     FROM (
       SELECT e.category, SUM(e.amount) as amount
       FROM expenses e
       WHERE e.project_id = pf.id AND e.is_split = false
       GROUP BY e.category
     ) cat_totals
    ) AS expenses_by_category
  FROM reporting.project_financials pf
  WHERE pf.status::text = ANY(status_filter)
    AND pf.category = 'construction'
  ORDER BY pf.project_number;
END;
$$;


-- =============================================================================
-- MIGRATION 1E: Fix weekly_labor_hours view with gross_hours calculation
-- File: supabase/migrations/[timestamp]_fix_weekly_labor_hours_gross_hours.sql
-- =============================================================================

DROP VIEW IF EXISTS weekly_labor_hours;

CREATE OR REPLACE VIEW weekly_labor_hours AS
SELECT 
  e.payee_id,
  p.payee_name AS employee_name,
  p.employee_number,
  p.hourly_rate,
  
  -- Week boundaries (Sunday to Saturday)
  (DATE_TRUNC('week', e.expense_date) - INTERVAL '1 day')::date AS week_start_sunday,
  (DATE_TRUNC('week', e.expense_date) + INTERVAL '5 days')::date AS week_end_saturday,
  
  -- Net hours (billable) - stored in expenses.hours
  SUM(e.hours) AS total_hours,
  
  -- Gross hours - CALCULATED from start_time/end_time
  SUM(
    CASE 
      WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600.0
      ELSE
        -- Fallback: net hours + lunch duration
        e.hours + COALESCE(e.lunch_duration_minutes, 0) / 60.0
    END
  ) AS gross_hours,
  
  -- Total cost
  SUM(e.amount) AS total_cost,
  
  -- Entry counts
  COUNT(*) AS entry_count,
  COUNT(*) FILTER (WHERE e.approval_status = 'approved') AS approved_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'pending') AS pending_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'rejected') AS rejected_entries
  
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE e.category = 'labor_internal'
GROUP BY 
  e.payee_id, 
  p.payee_name, 
  p.employee_number, 
  p.hourly_rate,
  DATE_TRUNC('week', e.expense_date);

COMMENT ON VIEW weekly_labor_hours IS 
  'Aggregates internal labor time entries by employee and week. gross_hours is calculated from start_time/end_time, total_hours is net billable hours from expenses.hours.';


-- =============================================================================
-- MIGRATION 1F: Fix execute_simple_report enum casting
-- File: supabase/migrations/[timestamp]_fix_execute_simple_report_enum_casting.sql
-- =============================================================================

-- This is a partial update - the full function is large
-- Focus on the enum casting fix in the WHERE clause builder

-- Add helper function for safe enum casting
CREATE OR REPLACE FUNCTION safe_cast_to_project_status(val text)
RETURNS project_status
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN val::project_status;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION safe_cast_to_expense_category(val text)
RETURNS expense_category
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN val::expense_category;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION safe_cast_to_quote_status(val text)
RETURNS quote_status
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN val::quote_status;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

-- NOTE: The full execute_simple_report function needs to be updated to use these
-- helper functions when building WHERE clauses for enum columns.
-- The key change is:
--
-- BEFORE:
--   WHERE status = filter_value
--
-- AFTER:
--   WHERE status = safe_cast_to_project_status(filter_value)
--
-- This requires updating the dynamic SQL generation in the function body.


-- =============================================================================
-- MIGRATION 1G: Add gross_hours to execute_simple_report time_entries
-- File: supabase/migrations/[timestamp]_add_gross_hours_to_simple_report.sql
-- =============================================================================

-- This migration updates the execute_simple_report function to include
-- gross_hours as a computed column when data_source = 'time_entries'
--
-- The computed column should be:
--   CASE 
--     WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN
--       ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600, 2)
--     ELSE
--       hours + COALESCE(lunch_duration_minutes, 0) / 60.0
--   END AS gross_hours
--
-- This needs to be added to the SELECT clause builder when
-- 'gross_hours' is in the selected_columns array.

-- For now, add a comment documenting the required change
COMMENT ON FUNCTION execute_simple_report IS 
  'TODO: Add gross_hours computed column for time_entries data source. See migration 1G for formula.';


-- =============================================================================
-- END OF PHASE 1 MIGRATIONS
-- =============================================================================

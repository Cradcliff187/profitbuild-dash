-- Remove 'quoted' from project_status enum by converting existing rows to 'estimating'
-- The 'quoted' status was redundant with 'estimating' and has been removed from the application.

-- Step 1: Update any existing projects that have 'quoted' status to 'estimating'
DO $$
BEGIN
  -- Only run if the status column still uses an enum that includes 'quoted'
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'quoted'
    AND enumtypid = 'project_status'::regtype
  ) THEN
    UPDATE projects
    SET status = 'estimating', updated_at = now()
    WHERE status = 'quoted';
  END IF;
END $$;

-- Step 2: Drop dependent views temporarily (they'll be recreated later by their own migrations)
DROP VIEW IF EXISTS reporting.internal_labor_hours_by_project CASCADE;
DROP VIEW IF EXISTS reporting.project_financials CASCADE;
DROP VIEW IF EXISTS reporting.weekly_labor_hours CASCADE;

-- Step 3: Change the enum if 'quoted' still exists
DO $$
DECLARE
  has_quoted boolean;
BEGIN
  -- Check if 'quoted' exists in the enum
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'quoted'
    AND enumtypid = 'project_status'::regtype
  ) INTO has_quoted;

  IF has_quoted THEN
    -- Drop the default temporarily
    ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;

    -- Rename the old enum
    ALTER TYPE project_status RENAME TO project_status_old;

    -- Create new enum without 'quoted'
    CREATE TYPE project_status AS ENUM (
      'estimating',
      'approved',
      'in_progress',
      'complete',
      'on_hold',
      'cancelled'
    );

    -- Update columns that use the old enum to use the new one
    ALTER TABLE projects
      ALTER COLUMN status TYPE project_status
      USING status::text::project_status;

    -- Restore the default
    ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'estimating'::project_status;

    -- Drop the old enum (CASCADE will drop any dependent functions)
    DROP TYPE project_status_old CASCADE;
  END IF;
END $$;

-- Step 4: Recreate critical reporting views
-- These views were dropped in Step 2 and need to be recreated

CREATE OR REPLACE VIEW reporting.project_financials AS
SELECT p.id, p.project_number, p.project_name, p.client_name, p.status, p.project_type, p.job_type, p.start_date, p.end_date, p.created_at, p.updated_at, p.category, p.contracted_amount, p.current_margin, p.actual_margin, p.margin_percentage, p.projected_margin, p.original_margin, p.contingency_remaining, p.total_accepted_quotes, p.adjusted_est_costs, p.original_est_costs, e.total_amount AS estimate_total, e.total_cost AS estimate_cost, e.contingency_amount, e.contingency_used, e.estimate_number, COALESCE(exp_sum.total, 0::numeric) AS total_expenses, COALESCE(exp_sum.count, 0::bigint) AS expense_count, COALESCE(exp_sum.by_category, '{}'::jsonb) AS expenses_by_category, COALESCE(quote_sum.total, 0::numeric) AS accepted_quotes_total, COALESCE(quote_sum.count, 0::bigint) AS accepted_quote_count, COALESCE(co_sum.revenue, 0::numeric) AS change_order_revenue, COALESCE(co_sum.cost, 0::numeric) AS change_order_cost, COALESCE(co_sum.count, 0::bigint) AS change_order_count, COALESCE(rev_sum.total, 0::numeric) AS total_invoiced, COALESCE(rev_sum.count, 0::bigint) AS invoice_count, p.contracted_amount - COALESCE(exp_sum.total, 0::numeric) AS remaining_budget, CASE WHEN p.contracted_amount > 0::numeric THEN COALESCE(exp_sum.total, 0::numeric) / p.contracted_amount * 100::numeric ELSE 0::numeric END AS budget_utilization_percent, COALESCE(exp_sum.total, 0::numeric) - COALESCE(e.total_cost, 0::numeric) AS cost_variance, CASE WHEN COALESCE(e.total_cost, 0::numeric) > 0::numeric THEN (COALESCE(exp_sum.total, 0::numeric) - COALESCE(e.total_cost, 0::numeric)) / COALESCE(e.total_cost, 0::numeric) * 100::numeric ELSE 0::numeric END AS cost_variance_percent, p.contracted_amount - COALESCE(rev_sum.total, 0::numeric) AS revenue_variance, CASE WHEN p.contracted_amount > 0::numeric THEN (p.contracted_amount - COALESCE(rev_sum.total, 0::numeric)) / p.contracted_amount * 100::numeric ELSE 0::numeric END AS revenue_variance_percent, CASE WHEN COALESCE(e.contingency_amount, 0::numeric) > 0::numeric THEN COALESCE(e.contingency_used, 0::numeric) / e.contingency_amount * 100::numeric ELSE 0::numeric END AS contingency_utilization_percent, COALESCE(labor_sum.estimated_labor_cushion, 0::numeric) AS estimated_labor_cushion, COALESCE(labor_sum.estimated_labor_hours, 0::numeric) AS estimated_labor_hours, COALESCE(e.total_labor_cushion, 0::numeric) AS estimated_max_profit_potential FROM projects p LEFT JOIN LATERAL (SELECT e_1.id, e_1.project_id, e_1.estimate_number, e_1.revision_number, e_1.date_created, e_1.valid_until, e_1.status, e_1.total_amount, e_1.notes, e_1.created_by, e_1.created_at, e_1.updated_at, e_1.contingency_percent, e_1.contingency_amount, e_1.contingency_used, e_1.version_number, e_1.parent_estimate_id, e_1.is_current_version, e_1.valid_for_days, e_1.default_markup_percent, e_1.target_margin_percent, e_1.total_cost, e_1.is_draft, e_1.sequence_number, e_1.is_auto_generated, e_1.total_labor_cushion FROM estimates e_1 WHERE e_1.project_id = p.id AND e_1.status = 'approved'::estimate_status AND e_1.is_current_version = true LIMIT 1) e ON true LEFT JOIN (WITH expense_allocations AS (SELECT COALESCE(es.project_id, e_1.project_id) AS project_id, COALESCE(es.split_amount, e_1.amount) AS amount, e_1.category, e_1.id AS expense_id FROM expenses e_1 LEFT JOIN expense_splits es ON es.expense_id = e_1.id WHERE e_1.is_split = false OR es.id IS NOT NULL) SELECT ea.project_id, sum(ea.amount) AS total, count(DISTINCT ea.expense_id) AS count, COALESCE((SELECT jsonb_object_agg(cat_totals.category, cat_totals.category_total) AS jsonb_object_agg FROM (SELECT ea2.category, sum(ea2.amount) AS category_total FROM expense_allocations ea2 WHERE ea2.project_id = ea.project_id GROUP BY ea2.category) cat_totals), '{}'::jsonb) AS by_category FROM expense_allocations ea GROUP BY ea.project_id) exp_sum ON exp_sum.project_id = p.id LEFT JOIN (SELECT quotes.project_id, sum(quotes.total_amount) AS total, count(*) AS count FROM quotes WHERE quotes.status = 'accepted'::quote_status GROUP BY quotes.project_id) quote_sum ON quote_sum.project_id = p.id LEFT JOIN (SELECT change_orders.project_id, sum(change_orders.client_amount) AS revenue, sum(change_orders.cost_impact) AS cost, count(*) AS count FROM change_orders WHERE change_orders.status = 'approved'::change_order_status GROUP BY change_orders.project_id) co_sum ON co_sum.project_id = p.id LEFT JOIN (SELECT COALESCE(rs.project_id, pr.project_id) AS project_id, sum(COALESCE(rs.split_amount, pr.amount)) AS total, count(DISTINCT pr.id) AS count FROM project_revenues pr LEFT JOIN revenue_splits rs ON rs.revenue_id = pr.id WHERE pr.is_split = false OR pr.is_split IS NULL OR rs.id IS NOT NULL GROUP BY (COALESCE(rs.project_id, pr.project_id))) rev_sum ON rev_sum.project_id = p.id LEFT JOIN (SELECT est.project_id, sum(eli.labor_cushion_amount) AS estimated_labor_cushion, sum(eli.labor_hours) AS estimated_labor_hours FROM estimate_line_items eli JOIN estimates est ON eli.estimate_id = est.id WHERE est.status = 'approved'::estimate_status AND est.is_current_version = true GROUP BY est.project_id) labor_sum ON labor_sum.project_id = p.id WHERE p.category = 'construction'::project_category;

CREATE OR REPLACE VIEW reporting.internal_labor_hours_by_project AS
WITH estimate_totals AS (SELECT p_1.id AS project_id, COALESCE(sum(CASE WHEN eli.category = 'labor_internal'::expense_category AND ((upper(TRIM(BOTH FROM COALESCE(eli.unit, ''::text))) = ANY (ARRAY['HR'::text, 'HRS'::text, 'HOUR'::text, 'HOURS'::text, 'H'::text, ''::text])) OR eli.unit IS NULL) THEN eli.quantity ELSE 0::numeric END), 0::numeric) AS estimated_hours, COALESCE(sum(CASE WHEN eli.category = 'labor_internal'::expense_category THEN eli.total_cost ELSE 0::numeric END), 0::numeric) AS estimated_cost FROM projects p_1 LEFT JOIN estimates est ON est.project_id = p_1.id AND est.status = 'approved'::estimate_status AND est.is_current_version = true LEFT JOIN estimate_line_items eli ON eli.estimate_id = est.id AND eli.category = 'labor_internal'::expense_category WHERE p_1.category = 'construction'::project_category GROUP BY p_1.id), expense_totals AS (SELECT p_1.id AS project_id, COALESCE(sum(CASE WHEN e.category = 'labor_internal'::expense_category AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN EXTRACT(epoch FROM e.end_time::time without time zone - e.start_time::time without time zone) / 3600::numeric WHEN e.category = 'labor_internal'::expense_category AND e.description IS NOT NULL THEN regexp_replace(e.description, '[^0-9.]'::text, ''::text, 'g'::text)::numeric WHEN e.category = 'labor_internal'::expense_category AND e.payee_id IS NOT NULL THEN e.amount / NULLIF((SELECT payees.hourly_rate FROM payees WHERE payees.id = e.payee_id), 0::numeric) ELSE 0::numeric END), 0::numeric) AS actual_hours, COALESCE(sum(CASE WHEN e.category = 'labor_internal'::expense_category THEN e.amount ELSE 0::numeric END), 0::numeric) AS actual_cost FROM projects p_1 LEFT JOIN expenses e ON e.project_id = p_1.id AND e.category = 'labor_internal'::expense_category AND e.is_split = false WHERE p_1.category = 'construction'::project_category GROUP BY p_1.id), has_labor AS (SELECT DISTINCT p_1.id AS project_id FROM projects p_1 WHERE p_1.category = 'construction'::project_category AND ((EXISTS (SELECT 1 FROM estimates est JOIN estimate_line_items eli ON eli.estimate_id = est.id WHERE est.project_id = p_1.id AND est.status = 'approved'::estimate_status AND est.is_current_version = true AND eli.category = 'labor_internal'::expense_category)) OR (EXISTS (SELECT 1 FROM expenses e WHERE e.project_id = p_1.id AND e.category = 'labor_internal'::expense_category AND e.is_split = false)))) SELECT p.id AS project_id, p.project_number, p.project_name, p.client_name, p.status, COALESCE(et.estimated_hours, 0::numeric) AS estimated_hours, COALESCE(et.estimated_cost, 0::numeric) AS estimated_cost, COALESCE(ext.actual_hours, 0::numeric) AS actual_hours, COALESCE(ext.actual_cost, 0::numeric) AS actual_cost, COALESCE(et.estimated_hours, 0::numeric) - COALESCE(ext.actual_hours, 0::numeric) AS hours_variance, COALESCE(et.estimated_cost, 0::numeric) - COALESCE(ext.actual_cost, 0::numeric) AS cost_variance FROM projects p JOIN has_labor hl ON hl.project_id = p.id LEFT JOIN estimate_totals et ON et.project_id = p.id LEFT JOIN expense_totals ext ON ext.project_id = p.id;

CREATE OR REPLACE VIEW reporting.weekly_labor_hours AS
SELECT p.id AS payee_id, p.payee_name AS employee_name, p.employee_number, p.hourly_rate, e.expense_date - EXTRACT(dow FROM e.expense_date)::integer AS week_start_sunday, e.expense_date - EXTRACT(dow FROM e.expense_date)::integer + 6 AS week_end_saturday, round(sum(CASE WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN EXTRACT(epoch FROM e.end_time - e.start_time) / 3600::numeric - COALESCE(e.lunch_duration_minutes::numeric / 60::numeric, 0::numeric) ELSE e.amount / COALESCE(p.hourly_rate, 75::numeric) END), 2) AS total_hours, round(sum(CASE WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN EXTRACT(epoch FROM e.end_time - e.start_time) / 3600::numeric ELSE e.amount / COALESCE(p.hourly_rate, 75::numeric) END), 2) AS gross_hours, round(sum(e.amount), 2) AS total_cost, count(*) AS entry_count, count(*) FILTER (WHERE e.approval_status = 'approved'::text) AS approved_entries, count(*) FILTER (WHERE e.approval_status = 'pending'::text OR e.approval_status IS NULL) AS pending_entries, count(*) FILTER (WHERE e.approval_status = 'rejected'::text) AS rejected_entries FROM expenses e JOIN payees p ON p.id = e.payee_id WHERE e.category = 'labor_internal'::expense_category GROUP BY p.id, p.payee_name, p.employee_number, p.hourly_rate, (e.expense_date - EXTRACT(dow FROM e.expense_date)::integer);

-- Note: AI functions that were dropped by CASCADE will be recreated
-- by their original migration file (20260125070347_ai_action_functions.sql)
-- when it re-runs on fresh database deployments.

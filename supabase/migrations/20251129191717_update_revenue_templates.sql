-- Update report templates to use actual revenue where appropriate
-- This migration updates existing templates to integrate actual revenue (total_invoiced)

-- 1. Update Project Profitability Analysis to use actual revenue
UPDATE public.saved_reports
SET 
  description = 'Analyze profit margins and financial performance using actual invoiced revenue',
  config = jsonb_set(
    jsonb_set(
      config,
      '{fields}',
      '["project_number", "project_name", "client_name", "total_invoiced", "total_expenses", "current_margin", "margin_percentage", "revenue_variance", "status"]'::jsonb
    ),
    '{description}',
    '"Analyze profit margins and financial performance using actual invoiced revenue"'::jsonb
  )
WHERE name = 'Project Profitability Analysis' AND is_template = true;

-- 2. Update Active Projects Dashboard to show both estimated and actual revenue
UPDATE public.saved_reports
SET 
  description = 'Overview of current projects with budget tracking, expense monitoring, and billing progress',
  config = jsonb_set(
    jsonb_set(
      config,
      '{fields}',
      '["project_number", "project_name", "client_name", "status", "contracted_amount", "total_invoiced", "revenue_variance_percent", "total_expenses", "margin_percentage", "budget_utilization_percent"]'::jsonb
    ),
    '{description}',
    '"Overview of current projects with budget tracking, expense monitoring, and billing progress"'::jsonb
  )
WHERE name = 'Active Projects Dashboard' AND is_template = true;

-- 3. Update Projects Summary to include actual revenue
UPDATE public.saved_reports
SET 
  description = 'Comprehensive overview of all projects organized by status with estimated and actual revenue',
  config = jsonb_set(
    jsonb_set(
      config,
      '{fields}',
      '["project_number", "project_name", "client_name", "status", "start_date", "end_date", "contracted_amount", "total_invoiced", "invoice_count", "total_expenses"]'::jsonb
    ),
    '{description}',
    '"Comprehensive overview of all projects organized by status with estimated and actual revenue"'::jsonb
  )
WHERE name = 'Projects Summary' AND is_template = true;


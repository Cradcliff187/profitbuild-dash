-- Seed core report templates
-- Creates 11 essential report templates organized by category

-- Financial Performance Templates
INSERT INTO public.saved_reports (name, description, category, config, is_template)
VALUES
(
  'Budget vs Actual by Project',
  'Compare estimated costs to actual expenses for each project with variance analysis',
  'financial',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "client_name", "estimate_cost", "total_expenses", "cost_variance", "cost_variance_percent", "status"],
    "filters": {},
    "sort_by": "cost_variance_percent",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  true
),
(
  'Project Profitability Analysis',
  'Analyze profit margins and financial performance across all projects',
  'financial',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "client_name", "contracted_amount", "total_expenses", "current_margin", "margin_percentage", "status"],
    "filters": {},
    "sort_by": "margin_percentage",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  true
),
(
  'Cost Variance Report',
  'Track cost overruns and savings by project with detailed variance metrics',
  'financial',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "estimate_cost", "total_expenses", "cost_variance", "cost_variance_percent", "status"],
    "filters": {},
    "sort_by": "cost_variance",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  true
);

-- Project Management Templates
INSERT INTO public.saved_reports (name, description, category, config, is_template)
VALUES
(
  'Active Projects Dashboard',
  'Overview of current projects with budget tracking and expense monitoring',
  'operational',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "client_name", "status", "contracted_amount", "total_expenses", "margin_percentage", "budget_utilization_percent"],
    "filters": {
      "filter_0": {"field": "status", "operator": "in", "value": ["in_progress", "approved"]}
    },
    "sort_by": "project_number",
    "sort_dir": "ASC",
    "limit": 100
  }'::jsonb,
  true
),
(
  'Projects Summary',
  'Comprehensive overview of all projects organized by status',
  'operational',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "client_name", "status", "start_date", "end_date", "contracted_amount", "total_expenses"],
    "filters": {},
    "sort_by": "created_at",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  true
),
(
  'Contingency Utilization',
  'Track contingency fund usage and remaining contingency across projects',
  'operational',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "contingency_amount", "contingency_remaining", "contingency_utilization_percent", "status"],
    "filters": {},
    "sort_by": "contingency_utilization_percent",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  true
);

-- Cost Analysis Templates
INSERT INTO public.saved_reports (name, description, category, config, is_template)
VALUES
(
  'Expense Report by Category',
  'Detailed breakdown of expenses by category, project, and approval status',
  'financial',
  '{
    "data_source": "expenses",
    "fields": ["project_name", "category", "expense_date", "amount", "payee_name", "description", "approval_status"],
    "filters": {},
    "sort_by": "expense_date",
    "sort_dir": "DESC",
    "limit": 500
  }'::jsonb,
  true
),
(
  'Quote Comparison',
  'Compare vendor quotes by project with pricing and status analysis',
  'vendor',
  '{
    "data_source": "quotes",
    "fields": ["project_name", "quote_number", "payee_name", "total_amount", "status", "date_received", "date_expires"],
    "filters": {},
    "sort_by": "date_received",
    "sort_dir": "DESC",
    "limit": 200
  }'::jsonb,
  true
),
(
  'Change Order Impact Analysis',
  'Analyze the effects of change orders on project budgets and margins',
  'financial',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "change_order_revenue", "change_order_cost", "change_order_count", "contracted_amount", "current_margin"],
    "filters": {
      "filter_0": {"field": "change_order_count", "operator": "greater_than", "value": "0"}
    },
    "sort_by": "change_order_revenue",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  true
);

-- Time & Labor Templates
INSERT INTO public.saved_reports (name, description, category, config, is_template)
VALUES
(
  'Time Entries Summary',
  'Labor hours and costs by employee, project, and approval status',
  'operational',
  '{
    "data_source": "time_entries",
    "fields": ["worker_name", "project_name", "expense_date", "hours", "hourly_rate", "amount", "approval_status"],
    "filters": {},
    "sort_by": "expense_date",
    "sort_dir": "DESC",
    "limit": 500
  }'::jsonb,
  true
),
(
  'Internal Labor Costs',
  'Track internal labor expenses by project with detailed cost breakdown',
  'operational',
  '{
    "data_source": "internal_costs",
    "fields": ["project_name", "category", "worker_name", "hours", "amount", "expense_date", "approval_status"],
    "filters": {},
    "sort_by": "expense_date",
    "sort_dir": "DESC",
    "limit": 500
  }'::jsonb,
  true
);

-- Add helpful comment
COMMENT ON TABLE public.saved_reports IS 'Stores saved report configurations and system templates';


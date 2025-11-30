-- Add new revenue comparison templates
-- These templates help compare estimated vs actual revenue

-- 1. Revenue Reconciliation Report
INSERT INTO public.saved_reports (name, description, category, config, is_template)
VALUES
(
  'Revenue Reconciliation',
  'Compare estimated contract amounts to actual invoiced revenue with variance analysis',
  'financial',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "client_name", "contracted_amount", "total_invoiced", "revenue_variance", "revenue_variance_percent", "invoice_count", "status"],
    "filters": {
      "filter_0": {
        "field": "total_invoiced",
        "operator": "greater_than",
        "value": "0"
      }
    },
    "sort_by": "revenue_variance",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- 2. Billing Progress by Project
INSERT INTO public.saved_reports (name, description, category, config, is_template)
VALUES
(
  'Billing Progress by Project',
  'Track billing progress for active projects showing estimated vs actual revenue',
  'financial',
  '{
    "data_source": "projects",
    "fields": ["project_number", "project_name", "contracted_amount", "total_invoiced", "revenue_variance_percent", "invoice_count", "status"],
    "filters": {
      "filter_0": {
        "field": "status",
        "operator": "in",
        "value": ["in_progress", "approved"]
      }
    },
    "sort_by": "revenue_variance_percent",
    "sort_dir": "ASC",
    "limit": 100
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;


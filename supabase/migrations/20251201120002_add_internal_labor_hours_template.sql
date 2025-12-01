-- Add Internal Labor Hours Tracking report template

INSERT INTO public.saved_reports (name, description, category, config, is_template)
VALUES (
  'Internal Labor Hours Tracking',
  'Track estimated vs actual hours and costs for internal labor across all projects',
  'operational',
  '{
    "data_source": "internal_labor_hours",
    "fields": [
      "project_number",
      "project_name", 
      "client_name",
      "status",
      "estimated_hours",
      "actual_hours",
      "hours_variance",
      "estimated_cost",
      "actual_cost",
      "cost_variance"
    ],
    "filters": {},
    "sort_by": "project_number",
    "sort_dir": "ASC",
    "limit": 500
  }'::jsonb,
  true
);


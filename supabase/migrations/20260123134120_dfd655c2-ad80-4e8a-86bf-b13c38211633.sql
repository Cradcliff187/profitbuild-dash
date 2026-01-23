-- Create the weekly_labor_hours view for aggregated employee time by week (Sunday start)
CREATE OR REPLACE VIEW reporting.weekly_labor_hours AS
SELECT 
  p.id as payee_id,
  p.payee_name as employee_name,
  p.employee_number,
  p.hourly_rate,
  -- Calculate week start (Sunday) from expense_date
  (e.expense_date::date - CAST(EXTRACT(DOW FROM e.expense_date::date) AS INTEGER))::date 
    as week_start_sunday,
  -- End of week (Saturday)
  (e.expense_date::date - CAST(EXTRACT(DOW FROM e.expense_date::date) AS INTEGER) + 6)::date 
    as week_end_saturday,
  -- Total net hours (after lunch deduction)
  ROUND(SUM(
    CASE 
      WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL 
      THEN (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) 
           - COALESCE(e.lunch_duration_minutes::numeric / 60, 0)
      ELSE e.amount / COALESCE(p.hourly_rate, 75)
    END
  )::numeric, 2) as total_hours,
  -- Gross hours (before lunch)
  ROUND(SUM(
    CASE 
      WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL 
      THEN (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
      ELSE e.amount / COALESCE(p.hourly_rate, 75)
    END
  )::numeric, 2) as gross_hours,
  -- Total labor cost
  ROUND(SUM(e.amount)::numeric, 2) as total_cost,
  -- Entry count
  COUNT(*) as entry_count,
  -- Breakdown by approval status
  COUNT(*) FILTER (WHERE e.approval_status = 'approved') as approved_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'pending' OR e.approval_status IS NULL) as pending_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'rejected') as rejected_entries
FROM expenses e
JOIN payees p ON p.id = e.payee_id
WHERE e.category = 'labor_internal'
GROUP BY 
  p.id, p.payee_name, p.employee_number, p.hourly_rate,
  (e.expense_date::date - CAST(EXTRACT(DOW FROM e.expense_date::date) AS INTEGER))::date;

-- Add a comment for documentation
COMMENT ON VIEW reporting.weekly_labor_hours IS 'Aggregated labor hours by employee per week, with Sunday as the first day of the week. Used for payroll and time reporting.';

-- Insert the report template
INSERT INTO saved_reports (name, description, category, is_template, config, created_by)
SELECT 
  'Weekly Labor Hours by Employee',
  'Employee time entries aggregated by week (Sunday-Saturday) showing total hours and labor costs',
  'operational',
  true,
  '{
    "data_source": "weekly_labor_hours",
    "fields": [
      "employee_number", 
      "employee_name", 
      "week_start_sunday", 
      "total_hours", 
      "gross_hours",
      "total_cost",
      "entry_count"
    ],
    "filters": {},
    "sort_by": "week_start_sunday",
    "sort_dir": "DESC",
    "limit": 100
  }'::jsonb,
  (SELECT id FROM profiles LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM saved_reports WHERE name = 'Weekly Labor Hours by Employee' AND is_template = true
);
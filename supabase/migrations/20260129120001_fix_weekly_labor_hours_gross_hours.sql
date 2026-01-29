-- Fix gross_hours calculation in weekly_labor_hours view
-- gross_hours must be CALCULATED from start_time/end_time, not referenced from expenses table
-- Also create/replace public.weekly_labor_hours so execute_simple_report('weekly_labor_hours') resolves.
-- total_hours: net billable (with lunch deduction when start/end exist); no e.hours column, so compute from time or amount/rate.

DROP VIEW IF EXISTS public.weekly_labor_hours;
CREATE VIEW public.weekly_labor_hours AS
SELECT 
  py.employee_number,
  py.payee_name as employee_name,
  date_trunc('week', e.expense_date)::date as week_start_sunday,
  date_trunc('week', e.expense_date)::date + interval '6 days' as week_end_saturday,
  round(SUM(
    CASE 
      WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600 - COALESCE(e.lunch_duration_minutes::numeric / 60, 0)
      ELSE
        e.amount / NULLIF(COALESCE(py.hourly_rate, 75), 0)
    END
  ), 2) as total_hours,
  round(SUM(
    CASE 
      WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600
      ELSE
        e.amount / NULLIF(COALESCE(py.hourly_rate, 75), 0)
    END
  ), 2) as gross_hours,
  round(SUM(e.amount), 2) as total_cost,
  py.hourly_rate,
  COUNT(*) as entry_count,
  COUNT(*) FILTER (WHERE e.approval_status = 'approved') as approved_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'pending' OR e.approval_status IS NULL) as pending_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'rejected') as rejected_entries
FROM expenses e
JOIN payees py ON e.payee_id = py.id
WHERE e.category = 'labor_internal'
  AND py.is_internal = true
GROUP BY 
  py.employee_number,
  py.payee_name,
  py.hourly_rate,
  date_trunc('week', e.expense_date)
ORDER BY 
  week_start_sunday DESC,
  py.payee_name;

COMMENT ON VIEW public.weekly_labor_hours IS 'Weekly labor hours aggregation by employee with gross hours calculated from start_time/end_time';

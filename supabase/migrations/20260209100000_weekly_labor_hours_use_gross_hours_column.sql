-- Update weekly_labor_hours view to use stored expenses.gross_hours column
-- instead of calculating from start_time/end_time in the view.
-- total_hours: net billable (with lunch deduction when start/end exist).
-- gross_hours: from stored column SUM(e.gross_hours).

DROP VIEW IF EXISTS public.weekly_labor_hours;
CREATE VIEW public.weekly_labor_hours AS
SELECT
  py.employee_number,
  py.payee_name AS employee_name,
  date_trunc('week', e.expense_date)::date AS week_start_sunday,
  date_trunc('week', e.expense_date)::date + interval '6 days' AS week_end_saturday,
  round(SUM(
    CASE
      WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600 - COALESCE(e.lunch_duration_minutes::numeric / 60, 0)
      ELSE
        e.amount / NULLIF(COALESCE(py.hourly_rate, 75), 0)
    END
  ), 2) AS total_hours,
  round(SUM(e.gross_hours), 2) AS gross_hours,
  round(SUM(e.amount), 2) AS total_cost,
  py.hourly_rate,
  COUNT(*) AS entry_count,
  COUNT(*) FILTER (WHERE e.approval_status = 'approved') AS approved_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'pending' OR e.approval_status IS NULL) AS pending_entries,
  COUNT(*) FILTER (WHERE e.approval_status = 'rejected') AS rejected_entries
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

COMMENT ON VIEW public.weekly_labor_hours IS 'Weekly labor hours aggregation by employee. total_hours = net billable; gross_hours = SUM(expenses.gross_hours).';

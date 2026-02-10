-- Add net/billable hours column to expenses.
-- Auto-calculated by trigger: gross_hours minus lunch when lunch_taken = true.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS hours NUMERIC(10, 4);

COMMENT ON COLUMN expenses.hours IS
  'Net billable hours (gross_hours minus lunch). Auto-calculated by trigger.';

-- Backfill existing records
UPDATE expenses
SET hours = CASE
  WHEN gross_hours IS NOT NULL AND lunch_taken = true
    THEN GREATEST(gross_hours - COALESCE(lunch_duration_minutes, 0) / 60.0, 0)
  WHEN gross_hours IS NOT NULL
    THEN gross_hours
  ELSE NULL
END
WHERE category = 'labor_internal';

-- Replace trigger function to set BOTH gross_hours and hours
CREATE OR REPLACE FUNCTION calculate_gross_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category = 'labor_internal'
     AND NEW.start_time IS NOT NULL
     AND NEW.end_time IS NOT NULL THEN
    NEW.gross_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
    NEW.hours := GREATEST(
      NEW.gross_hours - CASE
        WHEN NEW.lunch_taken = true
        THEN COALESCE(NEW.lunch_duration_minutes, 0) / 60.0
        ELSE 0
      END, 0);
  ELSE
    NEW.gross_hours := NULL;
    NEW.hours := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to also fire on lunch field changes
DROP TRIGGER IF EXISTS trigger_calculate_gross_hours ON expenses;
CREATE TRIGGER trigger_calculate_gross_hours
  BEFORE INSERT OR UPDATE OF start_time, end_time, category, lunch_taken, lunch_duration_minutes
  ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gross_hours();

-- Update weekly_labor_hours view to use stored columns for both total_hours and gross_hours
DROP VIEW IF EXISTS public.weekly_labor_hours;
CREATE VIEW public.weekly_labor_hours AS
SELECT
  py.employee_number,
  py.payee_name AS employee_name,
  date_trunc('week', e.expense_date)::date AS week_start_sunday,
  date_trunc('week', e.expense_date)::date + interval '6 days' AS week_end_saturday,
  round(SUM(e.hours), 2) AS total_hours,
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

COMMENT ON VIEW public.weekly_labor_hours IS 'Weekly labor hours aggregation by employee. total_hours = SUM(expenses.hours); gross_hours = SUM(expenses.gross_hours).';

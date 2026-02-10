-- Add gross_hours column to expenses table
-- Total shift duration in hours (end_time - start_time). Auto-calculated by trigger.
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS gross_hours NUMERIC(10, 4);

COMMENT ON COLUMN expenses.gross_hours IS
  'Total shift duration in hours (end_time - start_time). Auto-calculated by trigger.';

-- Backfill existing records
UPDATE expenses
SET gross_hours = EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
WHERE start_time IS NOT NULL
  AND end_time IS NOT NULL
  AND category = 'labor_internal';

-- Create trigger function
CREATE OR REPLACE FUNCTION calculate_gross_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category = 'labor_internal'
     AND NEW.start_time IS NOT NULL
     AND NEW.end_time IS NOT NULL THEN
    NEW.gross_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  ELSE
    NEW.gross_hours := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_calculate_gross_hours ON expenses;
CREATE TRIGGER trigger_calculate_gross_hours
  BEFORE INSERT OR UPDATE OF start_time, end_time, category
  ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gross_hours();

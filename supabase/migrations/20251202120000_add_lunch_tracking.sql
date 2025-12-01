-- Add lunch tracking columns to expenses table
ALTER TABLE expenses 
ADD COLUMN lunch_taken boolean DEFAULT false,
ADD COLUMN lunch_duration_minutes integer DEFAULT 30;

-- Add constraint: lunch_duration only meaningful when lunch_taken is true
-- Valid durations: 15, 30, 45, 60, 90, 120 minutes
ALTER TABLE expenses 
ADD CONSTRAINT valid_lunch_duration 
CHECK (
  lunch_taken = false 
  OR (lunch_duration_minutes IS NOT NULL AND lunch_duration_minutes BETWEEN 15 AND 120)
);

-- Add index for reporting queries
CREATE INDEX idx_expenses_lunch_taken ON expenses(lunch_taken) WHERE category = 'labor_internal';

-- Add comment for documentation
COMMENT ON COLUMN expenses.lunch_taken IS 'Whether a lunch break was taken during this time entry';
COMMENT ON COLUMN expenses.lunch_duration_minutes IS 'Duration of lunch break in minutes (15-120). Only applicable when lunch_taken is true.';


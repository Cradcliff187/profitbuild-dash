-- Phase 1: Add proper time tracking columns to expenses table

-- Add start_time and end_time columns (nullable for backward compatibility)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;

-- Create indexes for performance (only on labor_internal entries)
CREATE INDEX IF NOT EXISTS idx_expenses_start_time 
ON public.expenses(start_time) 
WHERE category = 'labor_internal';

CREATE INDEX IF NOT EXISTS idx_expenses_end_time 
ON public.expenses(end_time) 
WHERE category = 'labor_internal';

-- Migrate existing time data from description field (best-effort)
-- This extracts times like "08:30 AM - 05:00 PM" from description
UPDATE public.expenses
SET 
  start_time = (
    CASE 
      WHEN description ~* '(\d{1,2}:\d{2}\s*(AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))' THEN
        -- Extract start time and convert to timestamp
        (expense_date || ' ' || 
         (regexp_match(description, '(\d{1,2}:\d{2}\s*(AM|PM))\s*-', 'i'))[1]
        )::timestamp with time zone
      ELSE NULL
    END
  ),
  end_time = (
    CASE 
      WHEN description ~* '(\d{1,2}:\d{2}\s*(AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))' THEN
        -- Extract end time and convert to timestamp
        (expense_date || ' ' || 
         (regexp_match(description, '-\s*(\d{1,2}:\d{2}\s*(AM|PM))', 'i'))[1]
        )::timestamp with time zone
      ELSE NULL
    END
  )
WHERE category = 'labor_internal'
  AND start_time IS NULL 
  AND end_time IS NULL
  AND description IS NOT NULL;
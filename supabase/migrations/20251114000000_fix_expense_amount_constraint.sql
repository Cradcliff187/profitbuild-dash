-- Fix expense amount constraint to allow 0 for active timers
-- Active timers have end_time = NULL and amount will be calculated on clock-out

-- Drop the existing constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS positive_amount;

-- Add new constraint that allows amount >= 0 (including 0 for active timers)
ALTER TABLE public.expenses ADD CONSTRAINT positive_amount CHECK (amount >= 0::numeric);

-- Add comment
COMMENT ON CONSTRAINT positive_amount ON public.expenses IS 'Amount must be >= 0. Active timers (end_time IS NULL) can have amount = 0 until clock-out.';


-- Add is_auto_generated column to estimates table
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.estimates.is_auto_generated IS 'Indicates if estimate was automatically generated (e.g., from quick work order form) vs user-created';

-- Update existing auto-generated estimates
-- These are estimates with status='approved' and no line items (created by QuickWorkOrderForm)
UPDATE public.estimates e
SET is_auto_generated = true
WHERE e.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.estimate_line_items eli 
    WHERE eli.estimate_id = e.id
  )
  AND e.is_auto_generated = false;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_estimates_is_auto_generated ON public.estimates(is_auto_generated);


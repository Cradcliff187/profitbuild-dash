-- Add approval workflow fields to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS submitted_for_approval_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id);

-- Add check constraint for valid statuses
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_approval_status_check;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_approval_status_check
CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected', 'locked'));

-- Create indexes for approval queries
CREATE INDEX IF NOT EXISTS idx_expenses_approval_status 
ON public.expenses(approval_status, submitted_for_approval_at);

CREATE INDEX IF NOT EXISTS idx_expenses_approved_by 
ON public.expenses(approved_by);

-- Update existing labor_internal entries to 'approved' status
UPDATE public.expenses
SET approval_status = 'approved', approved_at = created_at
WHERE category = 'labor_internal' AND approval_status = 'draft';

-- Function to notify managers of pending approvals
CREATE OR REPLACE FUNCTION notify_pending_time_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When time entry is submitted for approval
  IF NEW.approval_status = 'pending' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'pending') THEN
    -- Log the submission (in production, this would send notifications)
    RAISE NOTICE 'Time entry % submitted for approval by worker %', NEW.id, NEW.payee_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_time_entry_submitted ON public.expenses;

CREATE TRIGGER on_time_entry_submitted
AFTER UPDATE ON public.expenses
FOR EACH ROW
WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
EXECUTE FUNCTION notify_pending_time_entries();
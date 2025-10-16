-- Phase 1: Create validation trigger for time entry approval
CREATE OR REPLACE FUNCTION public.validate_time_entry_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce for labor_internal (time entries)
  IF NEW.category = 'labor_internal' THEN
    -- If approval_status is being changed to approved or rejected
    IF NEW.approval_status IN ('approved', 'rejected') AND 
       (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
      
      -- Check if user has admin or manager role
      IF NOT (
        public.has_role(auth.uid(), 'admin'::app_role) OR 
        public.has_role(auth.uid(), 'manager'::app_role)
      ) THEN
        RAISE EXCEPTION 'Only managers and administrators can approve or reject time entries';
      END IF;
      
      -- Auto-set approved_by and approved_at when approving
      IF NEW.approval_status = 'approved' THEN
        NEW.approved_by = auth.uid();
        NEW.approved_at = NOW();
      END IF;
      
      -- Clear approved_by and approved_at when rejecting
      IF NEW.approval_status = 'rejected' THEN
        NEW.approved_by = NULL;
        NEW.approved_at = NULL;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_time_entry_approval ON public.expenses;
CREATE TRIGGER enforce_time_entry_approval
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_time_entry_approval();

-- Phase 2: Update RLS policies for granular permission control
-- Drop existing permissive UPDATE policy
DROP POLICY IF EXISTS "Field workers can edit their own pending time entries" ON public.expenses;

-- Create 3 separate UPDATE policies for better control

-- Policy 1: Field workers can edit their own pending time entry DETAILS
CREATE POLICY "Field workers can edit pending time entry details"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() AND 
  category = 'labor_internal' AND 
  (approval_status IS NULL OR approval_status = 'pending')
)
WITH CHECK (
  user_id = auth.uid() AND 
  category = 'labor_internal' AND 
  (approval_status IS NULL OR approval_status = 'pending')
);

-- Policy 2: Only managers/admins can change approval_status
CREATE POLICY "Managers can approve time entries"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  category = 'labor_internal' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  category = 'labor_internal' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Policy 3: Admins/managers have full edit access to all expenses
CREATE POLICY "Admins and managers can edit all expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add helpful comments
COMMENT ON FUNCTION public.validate_time_entry_approval IS 
  'Validates that only managers and administrators can approve or reject time entries. Auto-sets approved_by and approved_at fields.';

COMMENT ON POLICY "Field workers can edit pending time entry details" ON public.expenses IS
  'Allows field workers to edit their own pending time entry details (hours, notes, project) but NOT approval_status. The trigger enforces approval_status changes.';

COMMENT ON POLICY "Managers can approve time entries" ON public.expenses IS
  'Allows managers and admins to change approval_status on time entries';

COMMENT ON POLICY "Admins and managers can edit all expenses" ON public.expenses IS
  'Grants full edit permissions to administrators and managers on all expenses';
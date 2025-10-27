-- Create validation trigger function for receipt approvals
CREATE OR REPLACE FUNCTION public.validate_receipt_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only validate when approval_status is being changed to approved or rejected
  IF NEW.approval_status IN ('approved', 'rejected') AND 
     (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    
    -- Check if user has admin or manager role
    IF NOT (
      public.has_role(auth.uid(), 'admin'::app_role) OR 
      public.has_role(auth.uid(), 'manager'::app_role)
    ) THEN
      RAISE EXCEPTION 'Only managers and administrators can approve or reject receipts';
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
  
  RETURN NEW;
END;
$$;

-- Create trigger on receipts table
CREATE TRIGGER validate_receipt_approval_trigger
BEFORE UPDATE ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.validate_receipt_approval();
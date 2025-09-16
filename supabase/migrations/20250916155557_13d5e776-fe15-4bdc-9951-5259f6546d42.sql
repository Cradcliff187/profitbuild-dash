-- Fix security warning by updating the validation function with proper search_path
CREATE OR REPLACE FUNCTION public.validate_change_order_approval()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status is approved, ensure approved_date and approved_by are set
  IF NEW.status = 'approved' AND (NEW.approved_date IS NULL OR NEW.approved_by IS NULL) THEN
    RAISE EXCEPTION 'Approved change orders must have approved_date and approved_by set';
  END IF;
  
  -- If status is not approved, clear approved_date and approved_by
  IF NEW.status != 'approved' THEN
    NEW.approved_date := NULL;
    NEW.approved_by := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;
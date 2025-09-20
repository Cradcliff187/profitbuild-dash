-- FIX REMAINING SECURITY WARNINGS
-- Update all functions to have proper search_path set for security compliance

-- Fix all existing functions that may be missing search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Update other existing functions
CREATE OR REPLACE FUNCTION public.validate_quote_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status is accepted, ensure accepted_date is set
  IF NEW.status = 'accepted' AND NEW.accepted_date IS NULL THEN
    NEW.accepted_date := now();
  END IF;
  
  -- If status is not accepted, clear accepted_date
  IF NEW.status != 'accepted' THEN
    NEW.accepted_date := NULL;
  END IF;
  
  -- If status is rejected, ensure rejection_reason is provided
  IF NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR NEW.rejection_reason = '') THEN
    RAISE EXCEPTION 'Rejected quotes must have a rejection reason';
  END IF;
  
  -- If status is not rejected, clear rejection_reason
  IF NEW.status != 'rejected' THEN
    NEW.rejection_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

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
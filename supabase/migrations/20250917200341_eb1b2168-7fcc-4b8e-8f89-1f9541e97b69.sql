-- Add quote status tracking fields
ALTER TABLE public.quotes 
ADD COLUMN accepted_date timestamp with time zone,
ADD COLUMN estimate_line_item_id uuid,
ADD COLUMN rejection_reason text;

-- Rename date_expires to valid_until for better naming
ALTER TABLE public.quotes 
RENAME COLUMN date_expires TO valid_until;

-- Create validation trigger for quote status
CREATE OR REPLACE FUNCTION public.validate_quote_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Create trigger for quote status validation
CREATE TRIGGER validate_quote_status_trigger
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_quote_status();
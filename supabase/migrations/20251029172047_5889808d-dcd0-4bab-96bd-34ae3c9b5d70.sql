-- Step 1: One-time repair - sync sequence_number to match quote_number suffix
WITH parsed AS (
  SELECT 
    id,
    (regexp_match(quote_number, '-(\d+)$'))[1]::int AS seq
  FROM public.quotes
  WHERE quote_number ~ '-\d+$'
)
UPDATE public.quotes q
SET sequence_number = p.seq
FROM parsed p
WHERE q.id = p.id
  AND (q.sequence_number IS DISTINCT FROM p.seq);

-- Step 2: Create trigger function to keep sequence_number synced with quote_number
CREATE OR REPLACE FUNCTION public.sync_quote_sequence_from_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Extract numeric suffix from quote_number and sync to sequence_number
  IF NEW.quote_number IS NOT NULL AND NEW.quote_number ~ '-\d+$' THEN
    NEW.sequence_number := (regexp_match(NEW.quote_number, '-(\d+)$'))[1]::int;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS quotes_sync_sequence ON public.quotes;

-- Create trigger to auto-sync sequence_number on insert/update
CREATE TRIGGER quotes_sync_sequence
BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.sync_quote_sequence_from_number();

-- Step 3: Make generate_quote_number robust by scanning actual quote_number strings
CREATE OR REPLACE FUNCTION public.generate_quote_number(
  project_number_param text, 
  project_id_param uuid, 
  estimate_id_param uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  estimate_sequence integer;
  next_quote_sequence integer;
  base_prefix text;
  result_number text;
BEGIN
  -- Get estimate sequence number
  SELECT sequence_number INTO estimate_sequence
  FROM public.estimates
  WHERE id = estimate_id_param;
  
  -- Build base prefix: PROJECT_NUMBER-QTE-EST_SEQ-
  base_prefix := project_number_param || '-QTE-' || LPAD(COALESCE(estimate_sequence, 1)::text, 2, '0') || '-';
  
  -- Find max numeric suffix from existing quote_number strings with this prefix
  -- Use regex to extract trailing digits and get the max
  SELECT COALESCE(MAX((regexp_match(quote_number, '-(\d+)$'))[1]::int), 0) + 1
  INTO next_quote_sequence
  FROM public.quotes
  WHERE quote_number LIKE base_prefix || '%'
    AND quote_number ~ '-\d+$';
  
  -- Format: PROJECT_NUMBER-QTE-EST_SEQ-QUOTE_SEQ
  result_number := base_prefix || LPAD(next_quote_sequence::text, 2, '0');
  
  RETURN result_number;
END;
$$;
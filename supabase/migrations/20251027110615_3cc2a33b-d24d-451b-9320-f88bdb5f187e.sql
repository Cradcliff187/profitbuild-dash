-- Update get_next_project_number function to use 225 prefix
CREATE OR REPLACE FUNCTION public.get_next_project_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_counter integer;
  next_counter integer;
  base_number integer := 225;
  result_number text;
BEGIN
  -- Get current counter
  SELECT setting_value::integer INTO current_counter
  FROM public.system_settings
  WHERE setting_key = 'project_counter';
  
  -- If no counter exists, start with 225000
  IF current_counter IS NULL THEN
    current_counter := 225000;
  END IF;
  
  -- Increment counter
  next_counter := current_counter + 1;
  
  -- Update counter in database
  UPDATE public.system_settings
  SET setting_value = next_counter::text,
      updated_at = now()
  WHERE setting_key = 'project_counter';
  
  -- Format as 225-XXX (extract last 3 digits and pad with zeros)
  result_number := base_number::text || '-' || LPAD((next_counter % 1000)::text, 3, '0');
  
  RETURN result_number;
END;
$function$;
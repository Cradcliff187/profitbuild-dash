-- Create a system settings table to manage counters and configuration
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for system settings access
CREATE POLICY "Allow all access to system settings" 
ON public.system_settings 
FOR ALL 
USING (true);

-- Insert initial project counter (user mentioned their current number is like 125-144)
INSERT INTO public.system_settings (setting_key, setting_value, description) 
VALUES ('project_counter', '125144', 'Current project counter for sequential numbering (format: base-increment)');

-- Add sequence tracking columns to projects, estimates, and quotes for hierarchy
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sequence_number integer;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS sequence_number integer DEFAULT 1;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sequence_number integer DEFAULT 1;

-- Add work order sequence tracking
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS work_order_counter integer DEFAULT 0;

-- Create function to get next project number
CREATE OR REPLACE FUNCTION public.get_next_project_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_counter integer;
  next_counter integer;
  base_number integer := 125;
  result_number text;
BEGIN
  -- Get current counter
  SELECT setting_value::integer INTO current_counter
  FROM public.system_settings
  WHERE setting_key = 'project_counter';
  
  -- If no counter exists, start with 125144
  IF current_counter IS NULL THEN
    current_counter := 125144;
  END IF;
  
  -- Increment counter
  next_counter := current_counter + 1;
  
  -- Update counter in database
  UPDATE public.system_settings
  SET setting_value = next_counter::text,
      updated_at = now()
  WHERE setting_key = 'project_counter';
  
  -- Format as XXX-XXX (e.g., 125-145)
  result_number := base_number::text || '-' || (next_counter - 125000)::text;
  
  RETURN result_number;
END;
$function$;

-- Create function to generate hierarchical estimate number
CREATE OR REPLACE FUNCTION public.generate_estimate_number(project_number_param text, project_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  next_sequence integer;
  result_number text;
BEGIN
  -- Get next sequence number for estimates in this project
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_sequence
  FROM public.estimates
  WHERE project_id = project_id_param;
  
  -- Format: PROJECT_NUMBER-EST-XX
  result_number := project_number_param || '-EST-' || LPAD(next_sequence::text, 2, '0');
  
  RETURN result_number;
END;
$function$;

-- Create function to generate hierarchical quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number(project_number_param text, project_id_param uuid, estimate_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  estimate_sequence integer;
  next_quote_sequence integer;
  result_number text;
BEGIN
  -- Get estimate sequence number
  SELECT sequence_number INTO estimate_sequence
  FROM public.estimates
  WHERE id = estimate_id_param;
  
  -- Get next quote sequence for this estimate
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_quote_sequence
  FROM public.quotes
  WHERE estimate_id = estimate_id_param;
  
  -- Format: PROJECT_NUMBER-QTE-EST_SEQ-QUOTE_SEQ
  result_number := project_number_param || '-QTE-' || 
                   LPAD(COALESCE(estimate_sequence, 1)::text, 2, '0') || '-' ||
                   LPAD(next_quote_sequence::text, 2, '0');
  
  RETURN result_number;
END;
$function$;

-- Create function to generate work order number
CREATE OR REPLACE FUNCTION public.generate_work_order_number(project_number_param text, project_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  next_sequence integer;
  result_number text;
BEGIN
  -- Get and increment work order counter for this project
  UPDATE public.projects
  SET work_order_counter = COALESCE(work_order_counter, 0) + 1
  WHERE id = project_id_param
  RETURNING work_order_counter INTO next_sequence;
  
  -- Format: PROJECT_NUMBER-WO-XX
  result_number := project_number_param || '-WO-' || LPAD(next_sequence::text, 2, '0');
  
  RETURN result_number;
END;
$function$;

-- Create trigger to auto-assign sequence numbers when inserting estimates
CREATE OR REPLACE FUNCTION public.set_estimate_sequence_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Set sequence number if not already set
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM public.estimates
    WHERE project_id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-assign sequence numbers when inserting quotes
CREATE OR REPLACE FUNCTION public.set_quote_sequence_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Set sequence number if not already set
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM public.quotes
    WHERE estimate_id = NEW.estimate_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add triggers
CREATE TRIGGER set_estimate_sequence_trigger
  BEFORE INSERT ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_estimate_sequence_number();

CREATE TRIGGER set_quote_sequence_trigger
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_quote_sequence_number();

-- Create trigger to set project sequence number from project_number
CREATE OR REPLACE FUNCTION public.set_project_sequence_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Extract sequence from project_number (e.g., "125-144" -> 144)
  IF NEW.project_number IS NOT NULL AND NEW.sequence_number IS NULL THEN
    NEW.sequence_number := (split_part(NEW.project_number, '-', 2))::integer;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_project_sequence_trigger
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_sequence_number();
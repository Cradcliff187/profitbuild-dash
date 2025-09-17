-- Add versioning fields to estimates table
ALTER TABLE public.estimates 
ADD COLUMN version_number integer DEFAULT 1,
ADD COLUMN parent_estimate_id uuid REFERENCES public.estimates(id),
ADD COLUMN is_current_version boolean DEFAULT true,
ADD COLUMN valid_for_days integer DEFAULT 30;

-- Create indexes for efficient queries
CREATE INDEX idx_estimates_parent_estimate_id ON public.estimates(parent_estimate_id);
CREATE INDEX idx_estimates_project_current_version ON public.estimates(project_id, is_current_version);

-- Create function to ensure only one current version per estimate family
CREATE OR REPLACE FUNCTION public.ensure_single_current_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If this estimate is being marked as current version
  IF NEW.is_current_version = true THEN
    -- Find the root estimate (either this one or its parent)
    DECLARE
      root_estimate_id uuid;
    BEGIN
      IF NEW.parent_estimate_id IS NULL THEN
        root_estimate_id := NEW.id;
      ELSE
        root_estimate_id := NEW.parent_estimate_id;
      END IF;
      
      -- Set all other versions in this family to not current
      UPDATE public.estimates 
      SET is_current_version = false 
      WHERE (id = root_estimate_id OR parent_estimate_id = root_estimate_id)
        AND id != NEW.id;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to enforce single current version
CREATE TRIGGER ensure_single_current_version_trigger
  BEFORE INSERT OR UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_current_version();

-- Create function to calculate valid_until date based on valid_for_days
CREATE OR REPLACE FUNCTION public.calculate_estimate_valid_until()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Calculate valid_until based on date_created and valid_for_days
  IF NEW.date_created IS NOT NULL AND NEW.valid_for_days IS NOT NULL THEN
    NEW.valid_until = NEW.date_created + INTERVAL '1 day' * NEW.valid_for_days;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically calculate valid_until
CREATE TRIGGER calculate_estimate_valid_until_trigger
  BEFORE INSERT OR UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_estimate_valid_until();

-- Create function to create new estimate version
CREATE OR REPLACE FUNCTION public.create_estimate_version(
  source_estimate_id uuid,
  new_version_number integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_estimate_id uuid;
  source_estimate RECORD;
  next_version_number integer;
  root_estimate_id uuid;
BEGIN
  -- Get source estimate
  SELECT * INTO source_estimate FROM public.estimates WHERE id = source_estimate_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source estimate not found';
  END IF;
  
  -- Determine root estimate ID
  IF source_estimate.parent_estimate_id IS NULL THEN
    root_estimate_id := source_estimate_id;
  ELSE
    root_estimate_id := source_estimate.parent_estimate_id;
  END IF;
  
  -- Calculate next version number if not provided
  IF new_version_number IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO next_version_number
    FROM public.estimates 
    WHERE id = root_estimate_id OR parent_estimate_id = root_estimate_id;
  ELSE
    next_version_number := new_version_number;
  END IF;
  
  -- Create new estimate version
  INSERT INTO public.estimates (
    project_id,
    estimate_number,
    date_created,
    total_amount,
    status,
    notes,
    valid_for_days,
    revision_number,
    contingency_percent,
    contingency_used,
    version_number,
    parent_estimate_id,
    is_current_version
  ) VALUES (
    source_estimate.project_id,
    source_estimate.estimate_number || '-v' || next_version_number,
    CURRENT_DATE,
    source_estimate.total_amount,
    'draft',
    source_estimate.notes,
    source_estimate.valid_for_days,
    source_estimate.revision_number,
    source_estimate.contingency_percent,
    0, -- Reset contingency_used for new version
    next_version_number,
    root_estimate_id,
    false -- New versions start as non-current
  ) RETURNING id INTO new_estimate_id;
  
  -- Copy line items from source estimate
  INSERT INTO public.estimate_line_items (
    estimate_id,
    category,
    description,
    quantity,
    rate,
    total,
    unit,
    sort_order
  )
  SELECT 
    new_estimate_id,
    category,
    description,
    quantity,
    rate,
    total,
    unit,
    sort_order
  FROM public.estimate_line_items
  WHERE estimate_id = source_estimate_id;
  
  RETURN new_estimate_id;
END;
$function$;
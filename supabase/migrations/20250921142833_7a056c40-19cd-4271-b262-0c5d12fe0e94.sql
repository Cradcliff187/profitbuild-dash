-- Fix create_estimate_version function to exclude generated columns
CREATE OR REPLACE FUNCTION public.create_estimate_version(source_estimate_id uuid, new_version_number integer DEFAULT NULL::integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    is_current_version,
    default_markup_percent,
    target_margin_percent
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
    false, -- New versions start as non-current
    source_estimate.default_markup_percent,
    source_estimate.target_margin_percent
  ) RETURNING id INTO new_estimate_id;
  
  -- Copy line items from source estimate (excluding generated columns)
  INSERT INTO public.estimate_line_items (
    estimate_id,
    category,
    description,
    quantity,
    rate,
    unit,
    sort_order,
    cost_per_unit,
    markup_percent,
    markup_amount
  )
  SELECT 
    new_estimate_id,
    category,
    description,
    quantity,
    rate,
    unit,
    sort_order,
    cost_per_unit,
    markup_percent,
    markup_amount
  FROM public.estimate_line_items
  WHERE estimate_id = source_estimate_id;
  
  RETURN new_estimate_id;
END;
$function$;
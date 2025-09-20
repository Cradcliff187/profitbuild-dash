-- FIX REMAINING NON-TRIGGER FUNCTIONS
-- Update all remaining functions (non-trigger) with proper security settings

CREATE OR REPLACE FUNCTION public.create_estimate_version(source_estimate_id uuid, new_version_number integer DEFAULT NULL::integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_margin_thresholds(project_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_margin_pct DECIMAL(5,2);
  min_threshold DECIMAL(5,2);
  target_threshold DECIMAL(5,2);
BEGIN
  -- Get current margin percentage and thresholds
  SELECT p.margin_percentage, p.minimum_margin_threshold, p.target_margin
  INTO current_margin_pct, min_threshold, target_threshold
  FROM public.projects p
  WHERE p.id = project_id_param;
  
  -- Return threshold status
  IF current_margin_pct IS NULL THEN
    RETURN 'unknown';
  ELSIF current_margin_pct < min_threshold THEN
    RETURN 'critical';
  ELSIF current_margin_pct < target_threshold THEN
    RETURN 'at_risk';
  ELSIF current_margin_pct >= 30.0 THEN
    RETURN 'excellent';
  ELSE
    RETURN 'on_target';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contingency_remaining()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update contingency remaining for the related project
  IF TG_TABLE_NAME = 'estimates' THEN
    UPDATE public.projects
    SET contingency_remaining = public.calculate_contingency_remaining(NEW.project_id)
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
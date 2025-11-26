-- Fix duplicate_quote_for_estimate to exclude generated columns
CREATE OR REPLACE FUNCTION public.duplicate_quote_for_estimate(
  source_quote_id uuid,
  target_estimate_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_quote_id uuid;
  source_quote RECORD;
  target_estimate RECORD;
  new_quote_number text;
BEGIN
  -- Get source quote
  SELECT * INTO source_quote 
  FROM public.quotes 
  WHERE id = source_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source quote not found';
  END IF;
  
  -- Get target estimate
  SELECT * INTO target_estimate
  FROM public.estimates
  WHERE id = target_estimate_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target estimate not found';
  END IF;
  
  -- Verify same project
  IF source_quote.project_id != target_estimate.project_id THEN
    RAISE EXCEPTION 'Quote and estimate must be in the same project';
  END IF;
  
  -- Generate new quote number
  new_quote_number := public.generate_quote_number(
    (SELECT project_number FROM public.projects WHERE id = target_estimate.project_id),
    target_estimate.project_id,
    target_estimate_id
  );
  
  -- Create new quote
  INSERT INTO public.quotes (
    project_id,
    estimate_id,
    quote_number,
    payee_id,
    status,
    notes,
    valid_until,
    accepted_date
  ) VALUES (
    source_quote.project_id,
    target_estimate_id,
    new_quote_number,
    source_quote.payee_id,
    'pending',
    source_quote.notes,
    source_quote.valid_until,
    NULL
  ) RETURNING id INTO new_quote_id;
  
  -- Copy line items (EXCLUDE generated columns: total, total_cost, total_markup)
  INSERT INTO public.quote_line_items (
    quote_id,
    category,
    description,
    quantity,
    rate,
    cost_per_unit,
    markup_percent,
    markup_amount,
    unit,
    sort_order
  )
  SELECT 
    new_quote_id,
    category,
    description,
    quantity,
    rate,
    cost_per_unit,
    markup_percent,
    markup_amount,
    unit,
    sort_order
  FROM public.quote_line_items
  WHERE quote_id = source_quote_id;
  
  RETURN new_quote_id;
END;
$function$;
-- Fix duplicate_quote_for_estimate function to restore missing fields
-- and fix existing corrupted quotes with $0.00 totals

-- Step 1: Update the function to restore all missing fields
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
  next_sequence_number integer;
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
  
  -- Get next sequence number
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_sequence_number
  FROM public.quotes
  WHERE estimate_id = target_estimate_id;
  
  -- Create new quote with all required fields restored
  INSERT INTO public.quotes (
    project_id,
    estimate_id,
    quote_number,
    payee_id,
    status,
    notes,
    valid_until,
    accepted_date,
    total_amount,
    includes_materials,
    includes_labor,
    sequence_number,
    date_received
  ) VALUES (
    source_quote.project_id,
    target_estimate_id,
    new_quote_number,
    source_quote.payee_id,
    'pending',
    COALESCE(source_quote.notes, '') || E'\n\n[Duplicated from ' || source_quote.quote_number || ']',
    source_quote.valid_until,
    NULL,
    source_quote.total_amount,
    source_quote.includes_materials,
    source_quote.includes_labor,
    next_sequence_number,
    CURRENT_DATE
  ) RETURNING id INTO new_quote_id;
  
  -- Copy line items (exclude generated columns but include estimate_line_item_id)
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
    sort_order,
    estimate_line_item_id
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
    sort_order,
    estimate_line_item_id
  FROM public.quote_line_items
  WHERE quote_id = source_quote_id;
  
  RETURN new_quote_id;
END;
$function$;

-- Step 2: Fix existing corrupted quotes where total_amount is 0 but line items have totals
UPDATE quotes q
SET total_amount = (
  SELECT COALESCE(SUM(total), 0) 
  FROM quote_line_items 
  WHERE quote_id = q.id
)
WHERE total_amount = 0
AND EXISTS (
  SELECT 1 FROM quote_line_items 
  WHERE quote_id = q.id AND total > 0
);
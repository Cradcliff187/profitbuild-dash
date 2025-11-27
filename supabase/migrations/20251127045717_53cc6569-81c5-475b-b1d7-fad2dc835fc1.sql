-- Fix duplicate_quote_for_estimate to intelligently match line items by description
-- and fix existing corrupted quote line items

-- Step 1: Update function to match line items to TARGET estimate by description
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
  
  -- Create new quote with all required fields
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
  
  -- Copy line items WITH intelligent matching to TARGET estimate by description
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
    qli.category,
    qli.description,
    qli.quantity,
    qli.rate,
    qli.cost_per_unit,
    qli.markup_percent,
    qli.markup_amount,
    qli.unit,
    qli.sort_order,
    -- Match to TARGET estimate line item by description
    (SELECT eli.id 
     FROM estimate_line_items eli
     WHERE eli.estimate_id = target_estimate_id
       AND LOWER(TRIM(eli.description)) = LOWER(TRIM(qli.description))
     LIMIT 1)
  FROM public.quote_line_items qli
  WHERE qli.quote_id = source_quote_id;
  
  RETURN new_quote_id;
END;
$function$;

-- Step 2: Fix existing corrupted quote line items with NULL estimate_line_item_id
-- by matching them to their quote's estimate line items by description
UPDATE quote_line_items qli
SET estimate_line_item_id = (
  SELECT eli.id 
  FROM estimate_line_items eli
  JOIN quotes q ON q.estimate_id = eli.estimate_id
  WHERE q.id = qli.quote_id
    AND LOWER(TRIM(eli.description)) = LOWER(TRIM(qli.description))
  LIMIT 1
)
WHERE qli.estimate_line_item_id IS NULL
AND EXISTS (
  SELECT 1 
  FROM estimate_line_items eli
  JOIN quotes q ON q.estimate_id = eli.estimate_id
  WHERE q.id = qli.quote_id
    AND LOWER(TRIM(eli.description)) = LOWER(TRIM(qli.description))
);
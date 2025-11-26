-- Create function to duplicate a quote for a different estimate
CREATE OR REPLACE FUNCTION public.duplicate_quote_for_estimate(
  source_quote_id UUID,
  target_estimate_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  new_quote_id UUID;
  source_quote RECORD;
  target_estimate RECORD;
  new_quote_number TEXT;
  next_sequence_number INTEGER;
BEGIN
  -- Get source quote
  SELECT * INTO source_quote 
  FROM quotes 
  WHERE id = source_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source quote not found';
  END IF;
  
  -- Get target estimate
  SELECT * INTO target_estimate 
  FROM estimates 
  WHERE id = target_estimate_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target estimate not found';
  END IF;
  
  -- Validate that target estimate is in the same project
  IF source_quote.project_id != target_estimate.project_id THEN
    RAISE EXCEPTION 'Target estimate must be in the same project as the source quote';
  END IF;
  
  -- Generate new quote number for the target estimate
  new_quote_number := generate_quote_number(
    target_estimate.project_id::text,
    target_estimate.project_id,
    target_estimate_id
  );
  
  -- Get next sequence number
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_sequence_number
  FROM quotes
  WHERE estimate_id = target_estimate_id;
  
  -- Create new quote
  INSERT INTO quotes (
    project_id,
    estimate_id,
    payee_id,
    quote_number,
    sequence_number,
    date_received,
    status,
    valid_until,
    includes_materials,
    includes_labor,
    total_amount,
    notes
  ) VALUES (
    target_estimate.project_id,
    target_estimate_id,
    source_quote.payee_id,
    new_quote_number,
    next_sequence_number,
    CURRENT_DATE,
    'pending',
    source_quote.valid_until,
    source_quote.includes_materials,
    source_quote.includes_labor,
    source_quote.total_amount,
    COALESCE(source_quote.notes, '') || E'\n\n[Duplicated from quote ' || source_quote.quote_number || ']'
  ) RETURNING id INTO new_quote_id;
  
  -- Copy line items (WITHOUT estimate_line_item_id - user must re-link)
  INSERT INTO quote_line_items (
    quote_id,
    category,
    description,
    quantity,
    rate,
    cost_per_unit,
    markup_percent,
    markup_amount,
    total,
    total_cost,
    total_markup
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
    total,
    total_cost,
    total_markup
  FROM quote_line_items
  WHERE quote_id = source_quote_id;
  
  RETURN new_quote_id;
END;
$function$;
-- Add project_number to templates that have project_name but are missing project_number
-- This ensures project identification is always clear in reports

-- Update "Expense Report by Category" template
UPDATE public.saved_reports
SET config = jsonb_set(
  config,
  '{fields}',
  (
    SELECT jsonb_agg(field ORDER BY 
      CASE WHEN field = 'project_number' THEN 0
           WHEN field = 'project_name' THEN 1
           ELSE 2 END)
    FROM (
      SELECT 'project_number'::text as field
      UNION ALL
      SELECT field::text
      FROM jsonb_array_elements_text(config->'fields') as field
      WHERE field != 'project_number'
    ) sub
  )
)
WHERE name = 'Expense Report by Category'
  AND is_template = true
  AND config->'fields' @> '["project_name"]'::jsonb
  AND NOT (config->'fields' @> '["project_number"]'::jsonb);

-- Update "Quote Comparison" template
UPDATE public.saved_reports
SET config = jsonb_set(
  config,
  '{fields}',
  (
    SELECT jsonb_agg(field ORDER BY 
      CASE WHEN field = 'project_number' THEN 0
           WHEN field = 'project_name' THEN 1
           ELSE 2 END)
    FROM (
      SELECT 'project_number'::text as field
      UNION ALL
      SELECT field::text
      FROM jsonb_array_elements_text(config->'fields') as field
      WHERE field != 'project_number'
    ) sub
  )
)
WHERE name = 'Quote Comparison'
  AND is_template = true
  AND config->'fields' @> '["project_name"]'::jsonb
  AND NOT (config->'fields' @> '["project_number"]'::jsonb);

-- Update "Time Entries Summary" template
UPDATE public.saved_reports
SET config = jsonb_set(
  config,
  '{fields}',
  (
    SELECT jsonb_agg(field ORDER BY 
      CASE WHEN field = 'project_number' THEN 0
           WHEN field = 'project_name' THEN 1
           ELSE 2 END)
    FROM (
      SELECT 'project_number'::text as field
      UNION ALL
      SELECT field::text
      FROM jsonb_array_elements_text(config->'fields') as field
      WHERE field != 'project_number'
    ) sub
  )
)
WHERE name = 'Time Entries Summary'
  AND is_template = true
  AND config->'fields' @> '["project_name"]'::jsonb
  AND NOT (config->'fields' @> '["project_number"]'::jsonb);

-- Update "Internal Labor Costs" template
UPDATE public.saved_reports
SET config = jsonb_set(
  config,
  '{fields}',
  (
    SELECT jsonb_agg(field ORDER BY 
      CASE WHEN field = 'project_number' THEN 0
           WHEN field = 'project_name' THEN 1
           ELSE 2 END)
    FROM (
      SELECT 'project_number'::text as field
      UNION ALL
      SELECT field::text
      FROM jsonb_array_elements_text(config->'fields') as field
      WHERE field != 'project_number'
    ) sub
  )
)
WHERE name = 'Internal Labor Costs'
  AND is_template = true
  AND config->'fields' @> '["project_name"]'::jsonb
  AND NOT (config->'fields' @> '["project_number"]'::jsonb);


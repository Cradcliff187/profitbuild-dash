-- Increase markup percentage precision from 2 to 3 decimal places
-- This allows for more precise markup calculations in construction estimates
-- Example: 25.375% instead of just 25.5%

-- Step 1: Drop generated columns that depend on markup_percent in estimate_line_items
ALTER TABLE public.estimate_line_items 
DROP COLUMN price_per_unit,
DROP COLUMN total_markup;

-- Step 2: Alter markup_percent column type in estimate_line_items
ALTER TABLE public.estimate_line_items 
ALTER COLUMN markup_percent TYPE NUMERIC(6,3);

-- Step 3: Recreate generated columns in estimate_line_items with new precision
ALTER TABLE public.estimate_line_items 
ADD COLUMN price_per_unit NUMERIC GENERATED ALWAYS AS (
  CASE
    WHEN markup_percent IS NOT NULL THEN cost_per_unit * (1::numeric + markup_percent / 100::numeric)
    WHEN markup_amount IS NOT NULL THEN cost_per_unit + markup_amount
    ELSE cost_per_unit
  END
) STORED;

ALTER TABLE public.estimate_line_items 
ADD COLUMN total_markup NUMERIC GENERATED ALWAYS AS (
  quantity * CASE
    WHEN markup_percent IS NOT NULL THEN cost_per_unit * (markup_percent / 100::numeric)
    WHEN markup_amount IS NOT NULL THEN markup_amount
    ELSE 0::numeric
  END
) STORED;

-- Step 4: Drop generated column that depends on markup_percent in quote_line_items
ALTER TABLE public.quote_line_items 
DROP COLUMN total_markup;

-- Step 5: Alter markup_percent column type in quote_line_items
ALTER TABLE public.quote_line_items 
ALTER COLUMN markup_percent TYPE NUMERIC(6,3);

-- Step 6: Recreate generated column in quote_line_items with new precision
ALTER TABLE public.quote_line_items 
ADD COLUMN total_markup NUMERIC GENERATED ALWAYS AS (
  CASE
    WHEN markup_percent IS NOT NULL THEN (quantity * cost_per_unit) * (markup_percent / 100::numeric)
    WHEN markup_amount IS NOT NULL THEN quantity * markup_amount
    ELSE 0::numeric
  END
) STORED;

-- Step 7: Alter estimates table columns (no generated column dependencies)
ALTER TABLE public.estimates 
ALTER COLUMN default_markup_percent TYPE NUMERIC(6,3),
ALTER COLUMN target_margin_percent TYPE NUMERIC(6,3);

-- Add comments explaining the precision
COMMENT ON COLUMN public.estimate_line_items.markup_percent IS 
  'Markup percentage with 3 decimal precision (e.g., 25.375%)';
COMMENT ON COLUMN public.quote_line_items.markup_percent IS 
  'Markup percentage with 3 decimal precision (e.g., 25.375%)';
COMMENT ON COLUMN public.estimates.default_markup_percent IS 
  'Default markup percentage with 3 decimal precision (e.g., 25.000%)';
COMMENT ON COLUMN public.estimates.target_margin_percent IS 
  'Target margin percentage with 3 decimal precision (e.g., 20.000%)';
-- Add cost and markup tracking fields to quote_line_items table
ALTER TABLE public.quote_line_items 
ADD COLUMN cost_per_unit numeric DEFAULT 0,
ADD COLUMN markup_percent numeric DEFAULT NULL,
ADD COLUMN markup_amount numeric DEFAULT NULL;

-- Add generated columns for calculated totals
ALTER TABLE public.quote_line_items
ADD COLUMN total_cost numeric GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
ADD COLUMN total_markup numeric GENERATED ALWAYS AS (
  CASE 
    WHEN markup_percent IS NOT NULL THEN quantity * cost_per_unit * (markup_percent / 100)
    WHEN markup_amount IS NOT NULL THEN quantity * markup_amount
    ELSE 0
  END
) STORED;

-- Update existing records to have default cost_per_unit = rate for backward compatibility
UPDATE public.quote_line_items 
SET cost_per_unit = COALESCE(rate, 0) 
WHERE cost_per_unit = 0;
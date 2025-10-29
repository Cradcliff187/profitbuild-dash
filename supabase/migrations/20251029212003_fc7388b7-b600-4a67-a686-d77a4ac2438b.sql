-- Allow negative markup percentages for line items
-- This enables strategic pricing below cost for loss leaders, discounts, and corrections

-- Drop and recreate the validation function with updated range
DROP TRIGGER IF EXISTS validate_line_item_markup_trigger ON public.estimate_line_items;
DROP FUNCTION IF EXISTS public.validate_line_item_markup();

CREATE OR REPLACE FUNCTION public.validate_line_item_markup()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure only one markup method is used
  IF NEW.markup_percent IS NOT NULL AND NEW.markup_amount IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot use both markup_percent and markup_amount. Choose one markup method.';
  END IF;
  
  -- Validate markup_percent range (allow negative down to -100%)
  IF NEW.markup_percent IS NOT NULL AND (NEW.markup_percent < -100 OR NEW.markup_percent > 1000) THEN
    RAISE EXCEPTION 'markup_percent must be between -100 and 1000';
  END IF;
  
  -- Validate markup_amount is not negative (dollar amounts should be positive)
  IF NEW.markup_amount IS NOT NULL AND NEW.markup_amount < 0 THEN
    RAISE EXCEPTION 'markup_amount must be positive';
  END IF;
  
  -- Validate cost_per_unit is not negative  
  IF NEW.cost_per_unit IS NOT NULL AND NEW.cost_per_unit < 0 THEN
    RAISE EXCEPTION 'cost_per_unit cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER validate_line_item_markup_trigger
  BEFORE INSERT OR UPDATE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_line_item_markup();
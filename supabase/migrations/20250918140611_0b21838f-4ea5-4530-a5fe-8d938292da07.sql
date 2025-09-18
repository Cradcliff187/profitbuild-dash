-- Add cost and markup columns to estimate_line_items table
ALTER TABLE public.estimate_line_items 
ADD COLUMN cost_per_unit DECIMAL(12,2) DEFAULT 0,
ADD COLUMN markup_percent DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN markup_amount DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN price_per_unit DECIMAL(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN markup_percent IS NOT NULL THEN cost_per_unit * (1 + markup_percent/100)
    WHEN markup_amount IS NOT NULL THEN cost_per_unit + markup_amount
    ELSE cost_per_unit
  END
) STORED,
ADD COLUMN total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * COALESCE(cost_per_unit, 0)) STORED,
ADD COLUMN total_markup DECIMAL(12,2) GENERATED ALWAYS AS (
  quantity * (
    CASE 
      WHEN markup_percent IS NOT NULL THEN cost_per_unit * (markup_percent/100)
      WHEN markup_amount IS NOT NULL THEN markup_amount
      ELSE 0
    END
  )
) STORED;

-- Create function to validate markup fields (only one should be used)
CREATE OR REPLACE FUNCTION public.validate_line_item_markup()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure only one markup method is used
  IF NEW.markup_percent IS NOT NULL AND NEW.markup_amount IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot use both markup_percent and markup_amount. Choose one markup method.';
  END IF;
  
  -- Validate markup_percent range
  IF NEW.markup_percent IS NOT NULL AND (NEW.markup_percent < 0 OR NEW.markup_percent > 1000) THEN
    RAISE EXCEPTION 'markup_percent must be between 0 and 1000';
  END IF;
  
  -- Validate markup_amount is positive
  IF NEW.markup_amount IS NOT NULL AND NEW.markup_amount < 0 THEN
    RAISE EXCEPTION 'markup_amount must be positive';
  END IF;
  
  -- Validate cost_per_unit is not negative  
  IF NEW.cost_per_unit IS NOT NULL AND NEW.cost_per_unit < 0 THEN
    RAISE EXCEPTION 'cost_per_unit cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for markup validation
CREATE TRIGGER validate_line_item_markup_trigger
  BEFORE INSERT OR UPDATE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_line_item_markup();

-- Create function to sync rate field with price_per_unit for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_line_item_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- If rate is updated but price fields are not set, populate cost_per_unit
  IF NEW.rate IS NOT NULL AND NEW.rate != OLD.rate AND NEW.cost_per_unit = 0 THEN
    NEW.cost_per_unit = NEW.rate; -- Assume no markup initially
  END IF;
  
  -- Keep rate in sync with price_per_unit for backward compatibility
  IF NEW.price_per_unit IS NOT NULL THEN
    NEW.rate = NEW.price_per_unit;
  END IF;
  
  -- Update total based on price_per_unit if available, otherwise use rate
  IF NEW.price_per_unit IS NOT NULL THEN
    NEW.total = NEW.quantity * NEW.price_per_unit;
  ELSIF NEW.rate IS NOT NULL THEN
    NEW.total = NEW.quantity * NEW.rate;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rate synchronization
CREATE TRIGGER sync_line_item_rate_trigger
  BEFORE INSERT OR UPDATE ON public.estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_line_item_rate();

-- Migrate existing data: populate cost_per_unit from rate for existing records
UPDATE public.estimate_line_items 
SET cost_per_unit = COALESCE(rate, 0) 
WHERE cost_per_unit = 0 AND rate IS NOT NULL;
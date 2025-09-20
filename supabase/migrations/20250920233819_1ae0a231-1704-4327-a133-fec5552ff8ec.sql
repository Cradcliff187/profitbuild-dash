-- CONSOLIDATED COST/MARKUP MIGRATION - CLEAN VERSION
-- This migration consolidates all cost/markup functionality into a single, idempotent migration

-- Step 1: Add cost/markup columns to estimate_line_items (if not exists)
ALTER TABLE public.estimate_line_items 
ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS markup_percent NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS markup_amount NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS total_markup NUMERIC(15,2);

-- Step 2: Add cost/markup columns to estimates (if not exists)
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS default_markup_percent NUMERIC(5,2) DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS target_margin_percent NUMERIC(5,2) DEFAULT 20.0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15,2) DEFAULT 0;

-- Step 3: Create or replace validation trigger for markup
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Step 4: Create or replace trigger
DROP TRIGGER IF EXISTS validate_line_item_markup_trigger ON public.estimate_line_items;
CREATE TRIGGER validate_line_item_markup_trigger
  BEFORE INSERT OR UPDATE ON public.estimate_line_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_line_item_markup();

-- Step 5: Create or replace rate sync function
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Step 6: Create or replace sync trigger
DROP TRIGGER IF EXISTS sync_line_item_rate_trigger ON public.estimate_line_items;
CREATE TRIGGER sync_line_item_rate_trigger
  BEFORE INSERT OR UPDATE ON public.estimate_line_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_line_item_rate();
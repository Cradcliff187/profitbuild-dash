-- DATABASE CLEANUP MIGRATION
-- Remove orphaned backup tables and functions from previous migrations

-- Clean up backup tables (keep the ones that may still be needed)
DROP TABLE IF EXISTS public.estimate_line_items_backup_migration CASCADE;
DROP TABLE IF EXISTS public.estimates_backup_migration CASCADE;

-- Clean up orphaned views and functions from previous migrations
DROP VIEW IF EXISTS public.migration_report CASCADE;
DROP FUNCTION IF EXISTS public.rollback_cost_migration() CASCADE;
DROP FUNCTION IF EXISTS public.execute_cost_migration() CASCADE;
DROP FUNCTION IF EXISTS public.execute_revised_cost_migration() CASCADE;

-- Fix function search path security warning by ensuring proper search_path
CREATE OR REPLACE FUNCTION public.validate_line_item_markup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.sync_line_item_rate()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
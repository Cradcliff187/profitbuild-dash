-- =====================================================
-- COMPLETE ESTIMATE COST/MARKUP MIGRATION 
-- =====================================================
-- All functions included, handles estimates without line items

-- Step 1: Create backup tables
DROP TABLE IF EXISTS public.estimate_line_items_backup_20240101;
DROP TABLE IF EXISTS public.estimates_backup_20240101;

CREATE TABLE public.estimate_line_items_backup_20240101 AS 
SELECT *, now() as backup_created_at FROM public.estimate_line_items;

CREATE TABLE public.estimates_backup_20240101 AS 
SELECT *, now() as backup_created_at FROM public.estimates;

-- Step 2: Add CHECK constraints for data validation
ALTER TABLE public.estimate_line_items 
DROP CONSTRAINT IF EXISTS check_cost_per_unit_non_negative;

ALTER TABLE public.estimate_line_items 
ADD CONSTRAINT check_cost_per_unit_non_negative 
CHECK (cost_per_unit >= 0);

ALTER TABLE public.estimate_line_items 
DROP CONSTRAINT IF EXISTS check_markup_percent_reasonable;

ALTER TABLE public.estimate_line_items 
ADD CONSTRAINT check_markup_percent_reasonable 
CHECK (markup_percent >= -100 AND markup_percent <= 1000);

ALTER TABLE public.estimate_line_items 
DROP CONSTRAINT IF EXISTS check_price_per_unit_non_negative;

ALTER TABLE public.estimate_line_items 
ADD CONSTRAINT check_price_per_unit_non_negative 
CHECK (price_per_unit >= 0);

-- Step 3: Create cost population function
CREATE OR REPLACE FUNCTION public.populate_cost_from_rate()
RETURNS void AS $$
DECLARE
  line_item RECORD;
  calculated_cost DECIMAL(15,2);
BEGIN
  -- For existing line items, calculate cost assuming 15% markup
  -- Formula: cost = rate / 1.15 (since rate = cost * 1.15)
  FOR line_item IN 
    SELECT id, rate, quantity 
    FROM public.estimate_line_items 
    WHERE cost_per_unit = 0 AND rate > 0
  LOOP
    calculated_cost := line_item.rate / 1.15;
    
    UPDATE public.estimate_line_items 
    SET 
      cost_per_unit = calculated_cost,
      price_per_unit = line_item.rate,
      total_cost = line_item.quantity * calculated_cost,
      total_markup = line_item.quantity * (line_item.rate - calculated_cost),
      markup_percent = 15.0
    WHERE id = line_item.id;
  END LOOP;
  
  RAISE NOTICE 'Cost population completed for existing line items';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Execute the migration directly (no complex validation for now)
DO $$
DECLARE
  estimates_updated integer := 0;
  line_items_updated integer := 0;
BEGIN
  -- Update all estimates to have default_markup_percent = 15 if not already set
  UPDATE public.estimates 
  SET 
    default_markup_percent = 15.0,
    target_margin_percent = COALESCE(target_margin_percent, 20.0),
    updated_at = now()
  WHERE default_markup_percent IS NULL OR default_markup_percent = 0;
  
  GET DIAGNOSTICS estimates_updated = ROW_COUNT;
  
  -- Update line items that have rates but no cost data
  UPDATE public.estimate_line_items 
  SET 
    cost_per_unit = rate / 1.15,
    price_per_unit = rate,
    total_cost = quantity * (rate / 1.15),
    total_markup = quantity * (rate - (rate / 1.15)),
    markup_percent = 15.0
  WHERE cost_per_unit = 0 AND rate > 0;
  
  GET DIAGNOSTICS line_items_updated = ROW_COUNT;
  
  RAISE NOTICE 'Migration completed: % estimates updated, % line items updated', estimates_updated, line_items_updated;
END;
$$;

-- Step 5: Create rollback function
CREATE OR REPLACE FUNCTION public.rollback_cost_migration()
RETURNS void AS $$
BEGIN
  -- Restore from backup tables
  DELETE FROM public.estimate_line_items;
  INSERT INTO public.estimate_line_items 
  SELECT id, estimate_id, category, description, quantity, rate, total, unit, sort_order, created_at, 
         cost_per_unit, price_per_unit, markup_percent, markup_amount, total_cost, total_markup, quickbooks_item_id
  FROM public.estimate_line_items_backup_20240101;
  
  DELETE FROM public.estimates;
  INSERT INTO public.estimates 
  SELECT id, project_id, estimate_number, date_created, total_amount, status, notes, valid_until, 
         revision_number, created_by, created_at, updated_at, contingency_percent, contingency_amount, 
         contingency_used, version_number, parent_estimate_id, is_current_version, valid_for_days, 
         default_markup_percent, target_margin_percent, total_cost
  FROM public.estimates_backup_20240101;
  
  RAISE NOTICE 'Rollback completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Display migration results
SELECT 
  'estimates' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE default_markup_percent = 15.0) as with_default_markup,
  COUNT(*) FILTER (WHERE target_margin_percent IS NOT NULL) as with_target_margin
FROM public.estimates
UNION ALL
SELECT 
  'estimate_line_items' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE cost_per_unit > 0) as with_costs,
  COUNT(*) FILTER (WHERE markup_percent IS NOT NULL) as with_markup
FROM public.estimate_line_items;
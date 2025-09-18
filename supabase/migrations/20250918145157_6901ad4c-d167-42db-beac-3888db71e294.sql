-- =====================================================
-- SIMPLIFIED COST/MARKUP MIGRATION - FINAL VERSION
-- =====================================================
-- Only updates non-generated columns and adds constraints

-- Step 1: Create backup tables
DROP TABLE IF EXISTS public.estimate_line_items_backup_migration;
DROP TABLE IF EXISTS public.estimates_backup_migration;

CREATE TABLE public.estimate_line_items_backup_migration AS 
SELECT *, now() as backup_created_at FROM public.estimate_line_items;

CREATE TABLE public.estimates_backup_migration AS 
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

-- Step 3: Update existing estimates to have default markup settings
UPDATE public.estimates 
SET 
  default_markup_percent = 15.0,
  target_margin_percent = COALESCE(target_margin_percent, 20.0),
  updated_at = now()
WHERE default_markup_percent IS NULL OR default_markup_percent = 0;

-- Step 4: Update line items - only non-generated columns
-- Calculate cost assuming 15% markup for existing items with rates but no costs
UPDATE public.estimate_line_items 
SET 
  cost_per_unit = rate / 1.15,
  markup_percent = 15.0
WHERE cost_per_unit = 0 AND rate > 0;

-- Step 5: Create rollback function for safety
CREATE OR REPLACE FUNCTION public.rollback_cost_migration_final()
RETURNS void AS $$
BEGIN
  -- Restore from backup tables
  DELETE FROM public.estimate_line_items;
  INSERT INTO public.estimate_line_items 
  SELECT id, estimate_id, category, description, quantity, rate, total, unit, sort_order, created_at, 
         cost_per_unit, price_per_unit, markup_percent, markup_amount, total_cost, total_markup, quickbooks_item_id
  FROM public.estimate_line_items_backup_migration;
  
  DELETE FROM public.estimates;
  INSERT INTO public.estimates 
  SELECT id, project_id, estimate_number, date_created, total_amount, status, notes, valid_until, 
         revision_number, created_by, created_at, updated_at, contingency_percent, contingency_amount, 
         contingency_used, version_number, parent_estimate_id, is_current_version, valid_for_days, 
         default_markup_percent, target_margin_percent, total_cost
  FROM public.estimates_backup_migration;
  
  RAISE NOTICE 'Rollback completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Display migration results
SELECT 
  'Migration Results' as section,
  jsonb_build_object(
    'estimates_with_default_markup', (SELECT COUNT(*) FROM public.estimates WHERE default_markup_percent = 15.0),
    'estimates_with_target_margin', (SELECT COUNT(*) FROM public.estimates WHERE target_margin_percent IS NOT NULL),
    'line_items_with_costs', (SELECT COUNT(*) FROM public.estimate_line_items WHERE cost_per_unit > 0),
    'line_items_with_markup', (SELECT COUNT(*) FROM public.estimate_line_items WHERE markup_percent IS NOT NULL),
    'total_estimates', (SELECT COUNT(*) FROM public.estimates),
    'total_line_items', (SELECT COUNT(*) FROM public.estimate_line_items),
    'backup_tables_created', true,
    'constraints_added', true
  ) as details;
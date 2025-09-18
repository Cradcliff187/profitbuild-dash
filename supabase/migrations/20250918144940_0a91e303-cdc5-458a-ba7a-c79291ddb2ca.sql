-- =====================================================
-- ESTIMATE LINE ITEMS COST/MARKUP MIGRATION
-- =====================================================
-- This migration adds cost/markup functionality with full backup and validation

-- Step 1: Create backup tables for audit trail
CREATE TABLE IF NOT EXISTS public.estimate_line_items_backup_20240101 AS 
SELECT *, now() as backup_created_at FROM public.estimate_line_items;

CREATE TABLE IF NOT EXISTS public.estimates_backup_20240101 AS 
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

-- Step 3: Create migration utility functions
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

-- Step 4: Create validation function
CREATE OR REPLACE FUNCTION public.verify_totals_integrity()
RETURNS TABLE(
  estimate_id uuid,
  original_total numeric,
  calculated_total numeric,
  difference numeric,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as estimate_id,
    e.total_amount as original_total,
    COALESCE(SUM(eli.total), 0) as calculated_total,
    e.total_amount - COALESCE(SUM(eli.total), 0) as difference,
    CASE 
      WHEN ABS(e.total_amount - COALESCE(SUM(eli.total), 0)) < 0.01 THEN 'PASS'
      ELSE 'FAIL'
    END as status
  FROM public.estimates e
  LEFT JOIN public.estimate_line_items eli ON e.id = eli.estimate_id
  GROUP BY e.id, e.total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create comprehensive migration function
CREATE OR REPLACE FUNCTION public.migrate_line_item_costs()
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}';
  before_count integer;
  after_count integer;
  validation_results RECORD;
  estimates_updated integer := 0;
BEGIN
  -- Get counts before migration
  SELECT COUNT(*) INTO before_count FROM public.estimate_line_items;
  
  -- Update all estimates to have default_markup_percent = 15 if not already set
  UPDATE public.estimates 
  SET 
    default_markup_percent = 15.0,
    target_margin_percent = COALESCE(target_margin_percent, 20.0),
    updated_at = now()
  WHERE default_markup_percent IS NULL OR default_markup_percent = 0;
  
  GET DIAGNOSTICS estimates_updated = ROW_COUNT;
  
  -- Populate costs from existing rates
  PERFORM public.populate_cost_from_rate();
  
  -- Get counts after migration
  SELECT COUNT(*) INTO after_count FROM public.estimate_line_items;
  
  -- Verify totals integrity
  FOR validation_results IN 
    SELECT * FROM public.verify_totals_integrity() WHERE status = 'FAIL'
  LOOP
    RAISE EXCEPTION 'Total integrity check failed for estimate %: expected %, got %, difference %', 
      validation_results.estimate_id, 
      validation_results.original_total, 
      validation_results.calculated_total,
      validation_results.difference;
  END LOOP;
  
  -- Build result summary
  result := jsonb_build_object(
    'migration_completed_at', now(),
    'line_items_before', before_count,
    'line_items_after', after_count,
    'estimates_updated', estimates_updated,
    'validation_status', 'PASSED',
    'backup_tables_created', true
  );
  
  RAISE NOTICE 'Migration completed successfully: %', result;
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create rollback function
CREATE OR REPLACE FUNCTION public.rollback_cost_migration()
RETURNS void AS $$
BEGIN
  -- Restore from backup tables
  TRUNCATE public.estimate_line_items;
  INSERT INTO public.estimate_line_items 
  SELECT id, estimate_id, category, description, quantity, rate, total, unit, sort_order, created_at, 
         cost_per_unit, price_per_unit, markup_percent, markup_amount, total_cost, total_markup, quickbooks_item_id
  FROM public.estimate_line_items_backup_20240101;
  
  TRUNCATE public.estimates;
  INSERT INTO public.estimates 
  SELECT id, project_id, estimate_number, date_created, total_amount, status, notes, valid_until, 
         revision_number, created_by, created_at, updated_at, contingency_percent, contingency_amount, 
         contingency_used, version_number, parent_estimate_id, is_current_version, valid_for_days, 
         default_markup_percent, target_margin_percent, total_cost
  FROM public.estimates_backup_20240101;
  
  RAISE NOTICE 'Rollback completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Execute the migration
SELECT public.migrate_line_item_costs();

-- Step 8: Create migration report
CREATE OR REPLACE VIEW public.migration_report AS
SELECT 
  'estimate_line_items' as table_name,
  (SELECT COUNT(*) FROM public.estimate_line_items) as current_count,
  (SELECT COUNT(*) FROM public.estimate_line_items_backup_20240101) as backup_count,
  (SELECT COUNT(*) FROM public.estimate_line_items WHERE cost_per_unit > 0) as items_with_costs,
  (SELECT COUNT(*) FROM public.estimate_line_items WHERE markup_percent IS NOT NULL) as items_with_markup
UNION ALL
SELECT 
  'estimates' as table_name,
  (SELECT COUNT(*) FROM public.estimates) as current_count,
  (SELECT COUNT(*) FROM public.estimates_backup_20240101) as backup_count,
  (SELECT COUNT(*) FROM public.estimates WHERE default_markup_percent = 15.0) as estimates_with_default_markup,
  (SELECT COUNT(*) FROM public.estimates WHERE target_margin_percent IS NOT NULL) as estimates_with_target_margin;

-- Display final migration report
SELECT * FROM public.migration_report;
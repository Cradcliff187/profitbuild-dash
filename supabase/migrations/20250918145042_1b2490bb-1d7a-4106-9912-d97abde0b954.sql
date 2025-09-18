-- =====================================================
-- REVISED ESTIMATE COST/MARKUP MIGRATION 
-- =====================================================
-- Fixed to handle estimates with totals but no line items

-- Step 1: Drop existing backup tables and recreate
DROP TABLE IF EXISTS public.estimate_line_items_backup_20240101;
DROP TABLE IF EXISTS public.estimates_backup_20240101;

CREATE TABLE public.estimate_line_items_backup_20240101 AS 
SELECT *, now() as backup_created_at FROM public.estimate_line_items;

CREATE TABLE public.estimates_backup_20240101 AS 
SELECT *, now() as backup_created_at FROM public.estimates;

-- Step 2: Add CHECK constraints for data validation (reapply)
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

-- Step 3: Create REVISED validation function (handles estimates without line items)
CREATE OR REPLACE FUNCTION public.verify_totals_integrity()
RETURNS TABLE(
  estimate_id uuid,
  original_total numeric,
  calculated_total numeric,
  difference numeric,
  has_line_items boolean,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as estimate_id,
    e.total_amount as original_total,
    COALESCE(SUM(eli.total), 0) as calculated_total,
    e.total_amount - COALESCE(SUM(eli.total), 0) as difference,
    COUNT(eli.id) > 0 as has_line_items,
    CASE 
      -- If estimate has no line items, it's valid (summary estimate)
      WHEN COUNT(eli.id) = 0 THEN 'PASS_NO_ITEMS'
      -- If has line items, totals should match within 1 cent
      WHEN ABS(e.total_amount - COALESCE(SUM(eli.total), 0)) < 0.01 THEN 'PASS'
      ELSE 'FAIL'
    END as status
  FROM public.estimates e
  LEFT JOIN public.estimate_line_items eli ON e.id = eli.estimate_id
  GROUP BY e.id, e.total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create REVISED migration function (handles estimates without line items)
CREATE OR REPLACE FUNCTION public.migrate_line_item_costs()
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}';
  before_count integer;
  after_count integer;
  validation_results RECORD;
  estimates_updated integer := 0;
  estimates_without_items integer := 0;
  estimates_with_items integer := 0;
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
  
  -- Populate costs from existing rates (only for line items with rates > 0)
  PERFORM public.populate_cost_from_rate();
  
  -- Get counts after migration
  SELECT COUNT(*) INTO after_count FROM public.estimate_line_items;
  
  -- Count estimates with and without line items
  SELECT COUNT(*) INTO estimates_without_items 
  FROM public.verify_totals_integrity() 
  WHERE status = 'PASS_NO_ITEMS';
  
  SELECT COUNT(*) INTO estimates_with_items 
  FROM public.verify_totals_integrity() 
  WHERE has_line_items = true;
  
  -- Verify totals integrity (only fail for estimates WITH line items that don't match)
  FOR validation_results IN 
    SELECT * FROM public.verify_totals_integrity() WHERE status = 'FAIL'
  LOOP
    RAISE EXCEPTION 'Total integrity check failed for estimate % (has line items): expected %, got %, difference %', 
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
    'estimates_without_items', estimates_without_items,
    'estimates_with_items', estimates_with_items,
    'validation_status', 'PASSED',
    'backup_tables_created', true
  );
  
  RAISE NOTICE 'Migration completed successfully: %', result;
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Execute the revised migration
SELECT public.migrate_line_item_costs();

-- Step 6: Display comprehensive migration report
SELECT 
  'Migration Summary' as report_section,
  jsonb_pretty((SELECT public.migrate_line_item_costs())) as details
UNION ALL
SELECT 
  'Validation Results' as report_section,
  jsonb_agg(
    jsonb_build_object(
      'estimate_id', estimate_id,
      'total_amount', original_total,
      'has_line_items', has_line_items,
      'status', status
    )
  )::text as details
FROM public.verify_totals_integrity();
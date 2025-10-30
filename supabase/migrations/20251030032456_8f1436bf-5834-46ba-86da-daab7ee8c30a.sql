-- =====================================================
-- CLEANUP: Remove Duplicate Estimate Line Items
-- =====================================================
-- This migration removes duplicate estimate_line_items that were created
-- by the old "delete all, insert all" logic in EstimateForm.tsx.
-- It keeps the OLDEST instance of each duplicate (first created).
-- =====================================================

-- Step 1: Create backup table for safety
CREATE TABLE IF NOT EXISTS estimate_line_items_backup_20251030 AS
SELECT * FROM estimate_line_items;

-- Step 2: Delete duplicate line items (keep oldest instance)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY estimate_id, category, description, quantity, cost_per_unit, rate
      ORDER BY created_at ASC  -- Keep the FIRST created (oldest)
    ) AS rn
  FROM estimate_line_items
)
DELETE FROM estimate_line_items
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Recalculate estimate totals based on corrected line items
WITH line_item_totals AS (
  SELECT 
    estimate_id,
    SUM(quantity * COALESCE(rate, 0)) as calculated_total,
    SUM(quantity * COALESCE(cost_per_unit, 0)) as calculated_cost
  FROM estimate_line_items
  GROUP BY estimate_id
)
UPDATE estimates e
SET 
  total_amount = COALESCE(lit.calculated_total, 0),
  total_cost = COALESCE(lit.calculated_cost, 0),
  updated_at = now()
FROM line_item_totals lit
WHERE e.id = lit.estimate_id
  AND (
    e.total_amount IS DISTINCT FROM lit.calculated_total 
    OR e.total_cost IS DISTINCT FROM lit.calculated_cost
  );
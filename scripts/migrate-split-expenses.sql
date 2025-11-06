-- Migration script: Update existing split expenses to use SYS-000 parent project
-- This script ensures all expenses with splits are moved to the SYS-000 container project
-- Run this on development database first, then production after testing
-- Script is IDEMPOTENT - safe to run multiple times

-- ============================================================================
-- Step 1: Ensure SYS-000 project exists
-- ============================================================================
INSERT INTO projects (
  project_number, 
  project_name, 
  client_name,
  status, 
  project_type,
  created_at, 
  updated_at
)
VALUES (
  'SYS-000', 
  'Multiple Projects',
  'System',
  'in_progress',
  'construction_project',
  NOW(), 
  NOW()
)
ON CONFLICT (project_number) DO UPDATE
SET 
  project_name = 'Multiple Projects',
  updated_at = NOW();

-- ============================================================================
-- Step 2: Find and update all parent expenses that have splits
-- ============================================================================
-- This query identifies expenses with existing splits and updates them to SYS-000
WITH split_parents AS (
  SELECT DISTINCT expense_id
  FROM expense_splits
)
UPDATE expenses
SET 
  project_id = (SELECT id FROM projects WHERE project_number = 'SYS-000' LIMIT 1),
  is_split = true,
  updated_at = NOW()
WHERE id IN (SELECT expense_id FROM split_parents)
  AND (
    project_id != (SELECT id FROM projects WHERE project_number = 'SYS-000' LIMIT 1)
    OR is_split IS NULL 
    OR is_split = false
  );

-- ============================================================================
-- Step 3: Verification Query - Log results for manual review
-- ============================================================================
-- This shows statistics about the migration
SELECT 
  'Migration Results' as report_section,
  COUNT(DISTINCT e.id) as total_split_expenses,
  COUNT(DISTINCT CASE 
    WHEN p.project_number = 'SYS-000' THEN e.id 
  END) as expenses_with_sys000,
  COUNT(DISTINCT CASE 
    WHEN e.is_split = true THEN e.id 
  END) as expenses_marked_split,
  SUM(e.amount) as total_parent_amount,
  SUM(es.split_amount) as total_split_amount
FROM expenses e
INNER JOIN expense_splits es ON es.expense_id = e.id
LEFT JOIN projects p ON p.id = e.project_id
GROUP BY report_section;

-- ============================================================================
-- Step 4: Detailed verification - Show all migrated expenses
-- ============================================================================
SELECT 
  e.id as expense_id,
  p.project_number as current_project,
  e.amount as parent_amount,
  e.is_split,
  COUNT(es.id) as split_count,
  SUM(es.split_amount) as total_splits,
  STRING_AGG(
    CONCAT(sp.project_number, ': $', es.split_amount::text), 
    ', ' 
    ORDER BY es.created_at
  ) as split_details
FROM expenses e
LEFT JOIN projects p ON p.id = e.project_id
LEFT JOIN expense_splits es ON es.expense_id = e.id
LEFT JOIN projects sp ON sp.id = es.project_id
WHERE EXISTS (
  SELECT 1 FROM expense_splits WHERE expense_id = e.id
)
GROUP BY e.id, p.project_number, e.amount, e.is_split
ORDER BY e.created_at DESC;

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- All expenses with splits should now have:
--   - project_id pointing to SYS-000 project UUID
--   - is_split = true
--   - Individual splits remain in expense_splits with their original project references
--
-- Example before:
--   expenses: id=abc, project_id=proj-123, amount=100, is_split=null
--   expense_splits: expense_id=abc, project_id=proj-456, split_amount=60
--                   expense_id=abc, project_id=proj-789, split_amount=40
--
-- Example after:
--   expenses: id=abc, project_id=SYS-000-UUID, amount=100, is_split=true
--   expense_splits: expense_id=abc, project_id=proj-456, split_amount=60
--                   expense_id=abc, project_id=proj-789, split_amount=40
-- ============================================================================

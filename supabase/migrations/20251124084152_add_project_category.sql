-- ============================================================================
-- Migration: Add Project Category System
-- Purpose: Replace hardcoded project_number filtering with category-based filtering
-- 
-- Categories:
-- - 'construction': Real job projects (default) - visible everywhere
-- - 'system': Internal projects (SYS-000, 000-UNASSIGNED) - completely hidden
-- - 'overhead': Overhead buckets (001-GAS, 002-GA) - visible in expenses/receipts only
-- ============================================================================

-- Step 1: Create enum type for project categories
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_category') THEN
    CREATE TYPE project_category AS ENUM ('construction', 'system', 'overhead');
  END IF;
END $$;

-- Step 2: Add category column with safe default
-- All existing projects become 'construction' by default
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS category project_category NOT NULL DEFAULT 'construction';

-- Step 3: Update existing special projects to correct categories

-- System projects - completely hidden from UI
UPDATE projects 
SET category = 'system' 
WHERE project_number IN ('SYS-000', '000-UNASSIGNED')
  AND (category IS NULL OR category != 'system');

-- Overhead projects - visible only in expense/receipt contexts
UPDATE projects 
SET category = 'overhead' 
WHERE project_number = '001-GAS'
  AND (category IS NULL OR category != 'overhead');

-- Step 4: Create index for filtering performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

-- Step 5: Add helpful comment
COMMENT ON COLUMN projects.category IS 
'Project category for filtering: construction (real jobs shown everywhere), system (hidden internal projects), overhead (expense/receipt only)';



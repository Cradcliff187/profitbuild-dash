-- Fix Project 124-067: Set approved estimate as current version
-- This ensures that approved estimates are always marked as the current version

-- First, fix Project 124-067 specifically
UPDATE estimates
SET is_current_version = true, updated_at = NOW()
WHERE project_id = (SELECT id FROM projects WHERE project_number = '124-067')
  AND status = 'approved';

-- Set all non-approved estimates for Project 124-067 as not current
UPDATE estimates
SET is_current_version = false, updated_at = NOW()
WHERE project_id = (SELECT id FROM projects WHERE project_number = '124-067')
  AND status != 'approved';

-- Global cleanup: For ALL projects, ensure only approved estimates are current
-- Step 1: Set all approved estimates as current version
UPDATE estimates
SET is_current_version = true, updated_at = NOW()
WHERE status = 'approved';

-- Step 2: Set all non-approved estimates as not current version
UPDATE estimates
SET is_current_version = false, updated_at = NOW()
WHERE status != 'approved';
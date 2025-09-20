-- Convert existing estimates to estimate family structure
-- This migration restructures existing estimates to follow the family versioning model

-- First, let's identify the earliest estimate for each project to make it the parent
WITH project_estimates AS (
  SELECT 
    project_id,
    MIN(created_at) as earliest_created_at
  FROM estimates
  GROUP BY project_id
),
earliest_estimates AS (
  SELECT DISTINCT ON (e.project_id)
    e.id,
    e.project_id,
    e.created_at
  FROM estimates e
  INNER JOIN project_estimates pe ON e.project_id = pe.project_id 
    AND e.created_at = pe.earliest_created_at
  ORDER BY e.project_id, e.created_at
),
numbered_estimates AS (
  SELECT 
    e.id,
    e.project_id,
    e.created_at,
    ee.id as parent_id,
    ROW_NUMBER() OVER (PARTITION BY e.project_id ORDER BY e.created_at) as version_num,
    ROW_NUMBER() OVER (PARTITION BY e.project_id ORDER BY e.created_at DESC) as reverse_order
  FROM estimates e
  LEFT JOIN earliest_estimates ee ON e.project_id = ee.project_id
)
-- Update all estimates to set proper parent_estimate_id, version_number, and is_current_version
UPDATE estimates 
SET 
  parent_estimate_id = CASE 
    WHEN ne.version_num = 1 THEN NULL  -- First estimate has no parent
    ELSE ne.parent_id  -- All others point to the first estimate as parent
  END,
  version_number = ne.version_num,
  is_current_version = (ne.reverse_order = 1)  -- Only the latest version is current
FROM numbered_estimates ne
WHERE estimates.id = ne.id;

-- Update estimate numbers to include version info for child estimates
UPDATE estimates 
SET estimate_number = estimate_number || '-v' || version_number
WHERE parent_estimate_id IS NOT NULL AND estimate_number NOT LIKE '%-v%';
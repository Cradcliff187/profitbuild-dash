-- Add trigger to ensure single current version per estimate family
CREATE TRIGGER ensure_single_current_version_trigger
  BEFORE INSERT OR UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_current_version();

-- Fix existing data: establish proper version relationships
-- First, identify estimates that should be grouped as versions based on project_id and estimate_number base
WITH estimate_families AS (
  SELECT 
    project_id,
    REGEXP_REPLACE(estimate_number, '-v\d+$', '') as base_estimate_number,
    MIN(date_created) as first_created_date
  FROM public.estimates
  GROUP BY project_id, REGEXP_REPLACE(estimate_number, '-v\d+$', '')
  HAVING COUNT(*) > 1
),
parent_estimates AS (
  SELECT DISTINCT
    e.id,
    e.project_id,
    REGEXP_REPLACE(e.estimate_number, '-v\d+$', '') as base_estimate_number
  FROM public.estimates e
  JOIN estimate_families ef ON e.project_id = ef.project_id 
    AND REGEXP_REPLACE(e.estimate_number, '-v\d+$', '') = ef.base_estimate_number
    AND e.date_created = ef.first_created_date
)
UPDATE public.estimates 
SET 
  parent_estimate_id = CASE 
    WHEN e.id = pe.id THEN NULL -- This is the parent
    ELSE pe.id -- This is a child version
  END,
  version_number = CASE
    WHEN e.id = pe.id THEN 1 -- Parent is version 1
    ELSE ROW_NUMBER() OVER (
      PARTITION BY pe.id 
      ORDER BY e.date_created, e.created_at
    ) + 1 -- Children get incremental version numbers
  END,
  is_current_version = CASE
    WHEN e.id = pe.id THEN false -- Parent is not current by default
    WHEN e.id = (
      SELECT id FROM public.estimates e2 
      WHERE (e2.id = pe.id OR e2.parent_estimate_id = pe.id)
      ORDER BY e2.date_created DESC, e2.created_at DESC 
      LIMIT 1
    ) THEN true -- Latest version is current
    ELSE false
  END
FROM public.estimates e
JOIN parent_estimates pe ON e.project_id = pe.project_id 
  AND REGEXP_REPLACE(e.estimate_number, '-v\d+$', '') = pe.base_estimate_number;
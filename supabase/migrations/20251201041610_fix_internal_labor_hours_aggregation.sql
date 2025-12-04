-- Fix the internal_labor_hours_by_project view to prevent duplicate aggregation
-- The issue is that LEFT JOINs can create cartesian products when there are multiple expenses
-- We need to aggregate estimates and expenses separately, then combine them

CREATE OR REPLACE VIEW reporting.internal_labor_hours_by_project AS
WITH estimate_totals AS (
  SELECT 
    p.id as project_id,
    COALESCE(SUM(CASE 
      WHEN eli.category = 'labor_internal' AND (
        UPPER(TRIM(COALESCE(eli.unit, ''))) IN ('HR', 'HRS', 'HOUR', 'HOURS', 'H', '') 
        OR eli.unit IS NULL
      ) THEN eli.quantity
      ELSE 0
    END), 0) as estimated_hours,
    COALESCE(SUM(CASE 
      WHEN eli.category = 'labor_internal' THEN eli.total_cost
      ELSE 0
    END), 0) as estimated_cost
  FROM projects p
  LEFT JOIN estimates est ON est.project_id = p.id 
    AND est.status = 'approved' 
    AND est.is_current_version = true
  LEFT JOIN estimate_line_items eli ON eli.estimate_id = est.id 
    AND eli.category = 'labor_internal'
  WHERE p.category = 'construction'
  GROUP BY p.id
),
expense_totals AS (
  SELECT 
    p.id as project_id,
    COALESCE(SUM(CASE 
      WHEN e.category = 'labor_internal' AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (e.end_time::time - e.start_time::time)) / 3600
      WHEN e.category = 'labor_internal' AND e.description IS NOT NULL THEN
        CAST(REGEXP_REPLACE(e.description, '[^0-9.]', '', 'g') AS NUMERIC)
      WHEN e.category = 'labor_internal' AND e.payee_id IS NOT NULL THEN
        e.amount / NULLIF((SELECT hourly_rate FROM payees WHERE id = e.payee_id), 0)
      ELSE 0
    END), 0) as actual_hours,
    COALESCE(SUM(CASE 
      WHEN e.category = 'labor_internal' THEN e.amount
      ELSE 0
    END), 0) as actual_cost
  FROM projects p
  LEFT JOIN expenses e ON e.project_id = p.id 
    AND e.category = 'labor_internal'
    AND e.is_split = false
  WHERE p.category = 'construction'
  GROUP BY p.id
),
has_labor AS (
  SELECT DISTINCT p.id as project_id
  FROM projects p
  WHERE p.category = 'construction'
    AND (
      EXISTS (
        SELECT 1 
        FROM estimates est
        JOIN estimate_line_items eli ON eli.estimate_id = est.id
        WHERE est.project_id = p.id
          AND est.status = 'approved'
          AND est.is_current_version = true
          AND eli.category = 'labor_internal'
      )
      OR EXISTS (
        SELECT 1
        FROM expenses e
        WHERE e.project_id = p.id
          AND e.category = 'labor_internal'
          AND e.is_split = false
      )
    )
)
SELECT 
  p.id as project_id,
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  COALESCE(et.estimated_hours, 0) as estimated_hours,
  COALESCE(et.estimated_cost, 0) as estimated_cost,
  COALESCE(ext.actual_hours, 0) as actual_hours,
  COALESCE(ext.actual_cost, 0) as actual_cost,
  COALESCE(et.estimated_hours, 0) - COALESCE(ext.actual_hours, 0) as hours_variance,
  COALESCE(et.estimated_cost, 0) - COALESCE(ext.actual_cost, 0) as cost_variance
FROM projects p
INNER JOIN has_labor hl ON hl.project_id = p.id
LEFT JOIN estimate_totals et ON et.project_id = p.id
LEFT JOIN expense_totals ext ON ext.project_id = p.id;

GRANT SELECT ON reporting.internal_labor_hours_by_project TO authenticated;

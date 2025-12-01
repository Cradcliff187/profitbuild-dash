-- Create database view for internal labor hours aggregation by project
-- Shows estimated vs actual hours and costs for internal labor (excluding management)

CREATE OR REPLACE VIEW reporting.internal_labor_hours_by_project AS
SELECT 
  p.id as project_id,
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  
  -- Estimated hours and costs from approved estimate
  COALESCE(SUM(CASE 
    WHEN eli.category = 'labor_internal' AND eli.unit = 'hours' THEN eli.quantity
    WHEN eli.category = 'labor_internal' AND eli.unit IS NULL THEN eli.quantity
    ELSE 0
  END), 0) as estimated_hours,
  
  COALESCE(SUM(CASE 
    WHEN eli.category = 'labor_internal' THEN eli.total_cost
    ELSE 0
  END), 0) as estimated_cost,
  
  -- Actual hours and costs from expenses
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
  END), 0) as actual_cost,
  
  -- Variance calculations
  COALESCE(SUM(CASE 
    WHEN eli.category = 'labor_internal' AND eli.unit = 'hours' THEN eli.quantity
    WHEN eli.category = 'labor_internal' AND eli.unit IS NULL THEN eli.quantity
    ELSE 0
  END), 0) - COALESCE(SUM(CASE 
    WHEN e.category = 'labor_internal' AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (e.end_time::time - e.start_time::time)) / 3600
    WHEN e.category = 'labor_internal' AND e.description IS NOT NULL THEN
      CAST(REGEXP_REPLACE(e.description, '[^0-9.]', '', 'g') AS NUMERIC)
    WHEN e.category = 'labor_internal' AND e.payee_id IS NOT NULL THEN
      e.amount / NULLIF((SELECT hourly_rate FROM payees WHERE id = e.payee_id), 0)
    ELSE 0
  END), 0) as hours_variance,
  
  COALESCE(SUM(CASE 
    WHEN eli.category = 'labor_internal' THEN eli.total_cost
    ELSE 0
  END), 0) - COALESCE(SUM(CASE 
    WHEN e.category = 'labor_internal' THEN e.amount
    ELSE 0
  END), 0) as cost_variance
  
FROM projects p
LEFT JOIN estimates est ON est.project_id = p.id 
  AND est.status = 'approved' 
  AND est.is_current_version = true
LEFT JOIN estimate_line_items eli ON eli.estimate_id = est.id 
  AND eli.category = 'labor_internal'
LEFT JOIN expenses e ON e.project_id = p.id 
  AND e.category = 'labor_internal'
  AND e.is_split = false
WHERE p.category = 'construction'
GROUP BY p.id, p.project_number, p.project_name, p.client_name, p.status
HAVING COALESCE(SUM(CASE 
  WHEN eli.category = 'labor_internal' THEN 1
  ELSE 0
END), 0) > 0  -- Only projects with internal labor in estimate
   OR COALESCE(SUM(CASE 
     WHEN e.category = 'labor_internal' THEN 1
     ELSE 0
   END), 0) > 0;  -- Or projects with actual internal labor expenses

GRANT SELECT ON reporting.internal_labor_hours_by_project TO authenticated;


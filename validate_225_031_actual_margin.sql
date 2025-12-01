-- Validate actual margin calculation for project 225-031
-- This query checks the stored value vs manual calculation

-- First, get the project ID
WITH project_info AS (
  SELECT id, project_number, project_name
  FROM projects
  WHERE project_number = '225-031'
)

-- Get stored values from projects table
SELECT 
  p.project_number,
  p.project_name,
  p.actual_margin as stored_actual_margin,
  p.total_invoiced as stored_total_invoiced,
  p.total_expenses as stored_total_expenses,
  
  -- Get values from reporting view
  rf.total_invoiced as view_total_invoiced,
  rf.total_expenses as view_total_expenses,
  
  -- Manual calculation using same logic as calculate_project_margins function
  (
    SELECT COALESCE(SUM(COALESCE(rs.split_amount, pr.amount)), 0)
    FROM project_revenues pr
    LEFT JOIN revenue_splits rs ON rs.revenue_id = pr.id AND rs.project_id = p.id
    WHERE (pr.is_split = FALSE AND pr.project_id = p.id)
       OR (pr.is_split = TRUE AND rs.id IS NOT NULL)
  ) as manual_total_invoiced,
  
  (
    SELECT COALESCE(SUM(amount), 0) + COALESCE(SUM(es.split_amount), 0)
    FROM expenses e
    LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.project_id = e.project_id
    WHERE e.project_id = p.id AND e.is_split = FALSE
  ) as manual_total_expenses,
  
  -- Calculate actual margin manually
  (
    SELECT COALESCE(SUM(COALESCE(rs.split_amount, pr.amount)), 0)
    FROM project_revenues pr
    LEFT JOIN revenue_splits rs ON rs.revenue_id = pr.id AND rs.project_id = p.id
    WHERE (pr.is_split = FALSE AND pr.project_id = p.id)
       OR (pr.is_split = TRUE AND rs.id IS NOT NULL)
  ) - (
    SELECT COALESCE(SUM(amount), 0) + COALESCE(SUM(es.split_amount), 0)
    FROM expenses e
    LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.project_id = e.project_id
    WHERE e.project_id = p.id AND e.is_split = FALSE
  ) as manual_actual_margin,
  
  -- Breakdown of revenues
  (
    SELECT jsonb_agg(jsonb_build_object(
      'revenue_id', pr.id,
      'amount', pr.amount,
      'is_split', pr.is_split,
      'split_amount', rs.split_amount,
      'split_project_id', rs.project_id
    ))
    FROM project_revenues pr
    LEFT JOIN revenue_splits rs ON rs.revenue_id = pr.id
    WHERE (pr.is_split = FALSE AND pr.project_id = p.id)
       OR (pr.is_split = TRUE AND rs.project_id = p.id)
  ) as revenue_breakdown,
  
  -- Breakdown of expenses
  (
    SELECT jsonb_agg(jsonb_build_object(
      'expense_id', e.id,
      'amount', e.amount,
      'is_split', e.is_split,
      'split_amount', es.split_amount,
      'split_project_id', es.project_id
    ))
    FROM expenses e
    LEFT JOIN expense_splits es ON es.expense_id = e.id
    WHERE (e.is_split = FALSE AND e.project_id = p.id)
       OR (e.is_split = TRUE AND es.project_id = p.id)
  ) as expense_breakdown

FROM projects p
LEFT JOIN reporting.project_financials rf ON rf.id = p.id
WHERE p.project_number = '225-031';


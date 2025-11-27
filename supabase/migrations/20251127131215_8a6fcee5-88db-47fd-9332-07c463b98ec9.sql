-- ============================================================================
-- Phase 1: Remove duplicate revenue records
-- ============================================================================
-- This keeps the oldest record for each unique combination of:
-- (amount, invoice_date, invoice_number, description)
-- Expected to remove 8 duplicate records

DELETE FROM project_revenues 
WHERE id NOT IN (
  SELECT DISTINCT ON (amount, invoice_date, COALESCE(invoice_number, ''), description) id
  FROM project_revenues
  ORDER BY amount, invoice_date, COALESCE(invoice_number, ''), description, created_at ASC
);

-- ============================================================================
-- Phase 2: Add unique constraint to prevent future duplicates
-- ============================================================================
-- This constraint ensures no duplicate revenue records can be inserted
-- based on the same detection logic: amount + date + invoice# + description

CREATE UNIQUE INDEX idx_project_revenues_unique_transaction 
ON project_revenues(
  amount, 
  invoice_date, 
  COALESCE(invoice_number, ''), 
  description
);

-- ============================================================================
-- Verification: Show remaining revenue records grouped by project
-- ============================================================================
SELECT 
  COALESCE(p.project_number, '000-UNASSIGNED') as project,
  COUNT(*) as revenue_count,
  SUM(pr.amount) as total_amount
FROM project_revenues pr
LEFT JOIN projects p ON p.id = pr.project_id
GROUP BY p.project_number
ORDER BY p.project_number NULLS FIRST;
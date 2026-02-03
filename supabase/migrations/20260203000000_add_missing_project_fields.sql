-- Add missing project fields for labor tracking and contingency management
-- These fields are referenced in ProjectOperationalDashboard but were never added to the schema

-- Add contingency_amount to track the original/total contingency budget
-- contingency_remaining already exists and is maintained by triggers
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS contingency_amount numeric;

-- Add labor hour tracking fields
-- estimated_hours: planned labor hours from approved estimates
-- actual_hours: tracked labor hours from time entries/expenses
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS estimated_hours numeric;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS actual_hours numeric;

-- Add comments for clarity
COMMENT ON COLUMN projects.contingency_amount IS 'Original contingency budget amount set at project approval';
COMMENT ON COLUMN projects.estimated_hours IS 'Total estimated labor hours from approved estimate line items';
COMMENT ON COLUMN projects.actual_hours IS 'Total actual labor hours tracked via time entries and labor expenses';

-- Note: These fields will need to be populated/maintained by:
-- 1. contingency_amount: Set when project is approved (or via change order updates)
-- 2. estimated_hours: Calculated from estimate_line_items where category='labor_internal' and status='approved'
-- 3. actual_hours: Calculated from expenses where category='labor_internal' (same logic as reporting.internal_labor_hours_by_project view)

-- Grant appropriate permissions
GRANT SELECT ON projects TO authenticated;

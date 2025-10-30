-- Fix line item deletion: Update RLS policy to allow project-based access
-- This prevents 409 Conflict errors and duplicate line items when editing estimates

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins/managers can manage estimate line items" ON estimate_line_items;

-- Create updated policy that includes project access via can_access_project()
-- This aligns the ALL policy with the SELECT policy for consistency
CREATE POLICY "Manage estimate line items based on role and project access"
ON estimate_line_items
FOR ALL
TO authenticated
USING (
  -- Allow if user has no roles (backward compatibility)
  (NOT has_any_role(auth.uid())) OR
  -- Allow admins and managers
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  -- Allow users with access to the estimate's project
  (EXISTS (
    SELECT 1 
    FROM estimates e
    WHERE e.id = estimate_line_items.estimate_id
    AND can_access_project(auth.uid(), e.project_id)
  ))
)
WITH CHECK (
  -- Same logic for insert/update operations
  (NOT has_any_role(auth.uid())) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  (EXISTS (
    SELECT 1 
    FROM estimates e
    WHERE e.id = estimate_line_items.estimate_id
    AND can_access_project(auth.uid(), e.project_id)
  ))
);
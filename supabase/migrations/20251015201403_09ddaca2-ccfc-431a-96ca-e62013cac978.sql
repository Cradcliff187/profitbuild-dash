-- Drop the existing restrictive SELECT policy on payees
DROP POLICY IF EXISTS "View payees based on role" ON payees;

-- Create a new, more granular SELECT policy that allows field workers to view internal labor payees
CREATE POLICY "View payees based on role"
ON payees
FOR SELECT
TO authenticated
USING (
  -- Users with no roles can view all (backward compatibility)
  (NOT has_any_role(auth.uid())) 
  OR 
  -- Admins and managers can view all payees
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  has_role(auth.uid(), 'manager'::app_role)
  OR
  -- Field workers can view internal labor payees only (needed for Time Tracker)
  (has_role(auth.uid(), 'field_worker'::app_role) AND is_internal = true AND provides_labor = true)
);
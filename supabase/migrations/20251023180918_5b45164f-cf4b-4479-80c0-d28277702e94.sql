-- Drop the old policy that allows field workers to see all time entries
DROP POLICY IF EXISTS "Users can view expenses for accessible projects" ON public.expenses;

-- Create new policy with time entry isolation for field workers
CREATE POLICY "Users can view expenses with proper access control"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  -- Admins and managers can see everything
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  
  -- Field workers: only see own time entries, but can see other expenses on accessible projects
  (
    has_role(auth.uid(), 'field_worker'::app_role) AND (
      -- For time entries: must be their own
      (category = 'labor_internal'::expense_category AND user_id = auth.uid()) OR
      -- For other expenses: use project access
      (category != 'labor_internal'::expense_category AND can_access_project(auth.uid(), project_id))
    )
  ) OR
  
  -- Users with no roles (backward compatibility)
  (NOT has_any_role(auth.uid()) AND can_access_project(auth.uid(), project_id))
);
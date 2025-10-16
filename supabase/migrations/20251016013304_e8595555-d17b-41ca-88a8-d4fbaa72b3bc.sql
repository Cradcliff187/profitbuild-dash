-- Phase 1: Fix RLS Policy for Time Entry Editing
-- Drop the misleading policy
DROP POLICY IF EXISTS "Users can edit their own draft expenses" ON public.expenses;

-- Create corrected policy allowing field workers to edit pending time entries
CREATE POLICY "Field workers can edit their own pending time entries"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (
    user_id = auth.uid() AND 
    category = 'labor_internal' AND
    (approval_status IS NULL OR approval_status = 'pending')
  )
)
WITH CHECK (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (
    user_id = auth.uid() AND 
    category = 'labor_internal' AND 
    (approval_status IS NULL OR approval_status = 'pending')
  )
);

-- Phase 2: Update DELETE Policy
-- Drop existing policy
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

-- Create new policy allowing field workers to delete pending time entries
CREATE POLICY "Users can delete their own pending time entries"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (
    user_id = auth.uid() AND 
    category = 'labor_internal' AND 
    (approval_status IS NULL OR approval_status = 'pending')
  )
);

-- Phase 3: Fix Project Visibility (Original Option A)
-- Use CASCADE to drop function and recreate
DROP FUNCTION IF EXISTS public.can_access_project(uuid, uuid) CASCADE;

-- Create updated function with time tracking support
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    -- Admins and managers can access all projects
    public.has_role(_user_id, 'admin'::app_role) OR
    public.has_role(_user_id, 'manager'::app_role) OR
    -- Field workers can view active projects for time tracking
    (public.has_role(_user_id, 'field_worker'::app_role) AND 
     EXISTS (
       SELECT 1 FROM public.projects 
       WHERE id = _project_id 
         AND status IN ('in_progress', 'approved')
     )) OR
    -- Field workers can view projects where they have expenses (historical)
    (public.has_role(_user_id, 'field_worker'::app_role) AND
     EXISTS (
       SELECT 1 FROM public.expenses
       WHERE project_id = _project_id
         AND user_id = _user_id
     )) OR
    -- Field workers can view explicitly assigned projects
    (public.has_role(_user_id, 'field_worker'::app_role) AND 
     EXISTS (
       SELECT 1 FROM public.project_assignments 
       WHERE user_id = _user_id 
         AND project_id = _project_id
     )) OR
    -- Users with no roles can access everything (backward compatibility)
    NOT public.has_any_role(_user_id)
$function$;

-- Recreate dropped policies that depend on can_access_project function
-- Projects table
CREATE POLICY "View projects based on role"
ON public.projects
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  can_access_project(auth.uid(), id)
);

-- Expenses table
CREATE POLICY "Users can create expenses for accessible projects"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT has_any_role(auth.uid())) OR 
  (can_access_project(auth.uid(), project_id) AND 
   ((user_id IS NULL) OR (user_id = auth.uid())) AND 
   ((attachment_url IS NULL) OR (attachment_url ~~ (('%'::text || (auth.uid())::text) || '%'::text))))
);

CREATE POLICY "Users can view expenses for accessible projects"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  can_access_project(auth.uid(), project_id)
);

-- Estimates table
CREATE POLICY "View estimates based on role"
ON public.estimates
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  can_access_project(auth.uid(), project_id)
);

-- Estimate line items table
CREATE POLICY "View estimate line items based on role"
ON public.estimate_line_items
FOR SELECT
TO authenticated
USING (
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

-- Quotes table
CREATE POLICY "View quotes based on role"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  can_access_project(auth.uid(), project_id)
);

-- Quote line items table
CREATE POLICY "View quote line items based on role"
ON public.quote_line_items
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (EXISTS (
    SELECT 1
    FROM quotes q
    WHERE q.id = quote_line_items.quote_id 
      AND can_access_project(auth.uid(), q.project_id)
  ))
);

-- Change orders table
CREATE POLICY "View change orders based on role"
ON public.change_orders
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  can_access_project(auth.uid(), project_id)
);

-- Add comment explaining the logic
COMMENT ON FUNCTION public.can_access_project IS 
  'Determines if a user can access a project. Field workers can view active projects for time tracking and historical projects where they have expenses.';
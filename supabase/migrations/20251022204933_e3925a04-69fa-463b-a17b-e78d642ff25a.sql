-- Drop existing function (CASCADE will drop dependent policies)
DROP FUNCTION IF EXISTS public.can_access_project(_user_id uuid, _project_id uuid) CASCADE;

-- Recreate simplified function: field workers get access to ALL projects
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Admins and managers can access all projects
    public.has_role(_user_id, 'admin'::app_role) OR
    public.has_role(_user_id, 'manager'::app_role) OR
    -- Field workers can access ALL projects (universal access)
    public.has_role(_user_id, 'field_worker'::app_role) OR
    -- Users with no roles can access everything (backward compatibility)
    NOT public.has_any_role(_user_id)
$$;

-- Recreate RLS policy for projects table
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

-- Recreate RLS policy for expenses table
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

-- Recreate RLS policy for change_orders table
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

-- Recreate RLS policy for estimates table
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

-- Recreate RLS policy for estimate_line_items table
CREATE POLICY "View estimate line items based on role"
ON public.estimate_line_items
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (EXISTS (
    SELECT 1 FROM estimates e 
    WHERE e.id = estimate_line_items.estimate_id 
    AND can_access_project(auth.uid(), e.project_id)
  ))
);

-- Recreate RLS policy for quotes table
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

-- Recreate RLS policy for quote_line_items table
CREATE POLICY "View quote line items based on role"
ON public.quote_line_items
FOR SELECT
TO authenticated
USING (
  (NOT has_any_role(auth.uid())) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (EXISTS (
    SELECT 1 FROM quotes q 
    WHERE q.id = quote_line_items.quote_id 
    AND can_access_project(auth.uid(), q.project_id)
  ))
);
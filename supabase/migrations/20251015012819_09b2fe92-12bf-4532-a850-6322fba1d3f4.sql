-- ============================================================================
-- PHASE 1: ROLE SYSTEM FOUNDATION
-- ============================================================================

-- Create role enum (admin, manager, field_worker as requested)
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'field_worker');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create project_assignments table for field workers
CREATE TABLE public.project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- Add user_id to expenses table for receipt validation
ALTER TABLE public.expenses ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Populate user_id from existing data (use approved_by or updated_by as fallback)
UPDATE public.expenses 
SET user_id = COALESCE(approved_by, updated_by)
WHERE user_id IS NULL;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (prevent RLS recursion)
-- ============================================================================

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user has ANY role assigned
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Check if user can access a specific project
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins and managers can access all projects
    public.has_role(_user_id, 'admin') OR
    public.has_role(_user_id, 'manager') OR
    -- Field workers can only access assigned projects
    (public.has_role(_user_id, 'field_worker') AND 
     EXISTS (SELECT 1 FROM public.project_assignments WHERE user_id = _user_id AND project_id = _project_id)) OR
    -- Users with no roles can access everything (backward compatibility)
    NOT public.has_any_role(_user_id)
$$;

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- user_roles RLS
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- project_assignments RLS
CREATE POLICY "Users can view their assignments"
ON public.project_assignments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins/managers can manage assignments"
ON public.project_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ============================================================================
-- PHASE 2: REPLACE ALL "ALLOW ALL ACCESS" POLICIES
-- ============================================================================

-- PROJECTS
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;

CREATE POLICY "View projects based on role"
ON public.projects
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.can_access_project(auth.uid(), id)
);

CREATE POLICY "Admins/managers can modify projects"
ON public.projects
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- EXPENSES
DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;

CREATE POLICY "Users can create expenses for accessible projects"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  (public.can_access_project(auth.uid(), project_id) AND
   (user_id IS NULL OR user_id = auth.uid()) AND
   (attachment_url IS NULL OR attachment_url LIKE '%' || auth.uid()::text || '%'))
);

CREATE POLICY "Users can view expenses for accessible projects"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.can_access_project(auth.uid(), project_id)
);

CREATE POLICY "Users can edit their own draft expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  (user_id = auth.uid() AND (approval_status IS NULL OR approval_status = 'draft'))
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  (user_id = auth.uid() AND (approval_status IS NULL OR approval_status = 'draft'))
);

CREATE POLICY "Admins can delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

-- CLIENTS
DROP POLICY IF EXISTS "Allow all access to clients" ON public.clients;

CREATE POLICY "View clients based on role"
ON public.clients
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins/managers can manage clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- PAYEES
DROP POLICY IF EXISTS "Allow all access to payees" ON public.payees;

CREATE POLICY "View payees based on role"
ON public.payees
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins/managers can manage payees"
ON public.payees
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- ESTIMATES
DROP POLICY IF EXISTS "Allow all access to estimates" ON public.estimates;

CREATE POLICY "View estimates based on role"
ON public.estimates
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.can_access_project(auth.uid(), project_id)
);

CREATE POLICY "Admins/managers can manage estimates"
ON public.estimates
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- ESTIMATE LINE ITEMS
DROP POLICY IF EXISTS "Allow all access to estimate line items" ON public.estimate_line_items;

CREATE POLICY "View estimate line items based on role"
ON public.estimate_line_items
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  EXISTS (
    SELECT 1 FROM public.estimates e
    WHERE e.id = estimate_id AND public.can_access_project(auth.uid(), e.project_id)
  )
);

CREATE POLICY "Admins/managers can manage estimate line items"
ON public.estimate_line_items
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- QUOTES
DROP POLICY IF EXISTS "Allow all access to quotes" ON public.quotes;

CREATE POLICY "View quotes based on role"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.can_access_project(auth.uid(), project_id)
);

CREATE POLICY "Admins/managers can manage quotes"
ON public.quotes
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- QUOTE LINE ITEMS
DROP POLICY IF EXISTS "Allow all access to quote line items" ON public.quote_line_items;

CREATE POLICY "View quote line items based on role"
ON public.quote_line_items
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_id AND public.can_access_project(auth.uid(), q.project_id)
  )
);

CREATE POLICY "Admins/managers can manage quote line items"
ON public.quote_line_items
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- CHANGE ORDERS
DROP POLICY IF EXISTS "Allow all access to change orders" ON public.change_orders;

CREATE POLICY "View change orders based on role"
ON public.change_orders
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.can_access_project(auth.uid(), project_id)
);

CREATE POLICY "Admins/managers can manage change orders"
ON public.change_orders
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- PROJECT REVENUES
DROP POLICY IF EXISTS "Allow all access to project revenues" ON public.project_revenues;

CREATE POLICY "View project revenues based on role"
ON public.project_revenues
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins/managers can manage project revenues"
ON public.project_revenues
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- EXPENSE LINE ITEM CORRELATIONS
DROP POLICY IF EXISTS "Allow all access to expense correlations" ON public.expense_line_item_correlations;

CREATE POLICY "View expense correlations based on role"
ON public.expense_line_item_correlations
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins/managers can manage expense correlations"
ON public.expense_line_item_correlations
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- QUICKBOOKS ACCOUNT MAPPINGS
DROP POLICY IF EXISTS "Allow all access to account mappings" ON public.quickbooks_account_mappings;

CREATE POLICY "View account mappings based on role"
ON public.quickbooks_account_mappings
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can manage account mappings"
ON public.quickbooks_account_mappings
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

-- SYSTEM SETTINGS (ADMIN ONLY - no backward compatibility)
DROP POLICY IF EXISTS "Allow all access to system settings" ON public.system_settings;

CREATE POLICY "Only admins can access system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- QUICKBOOKS SYNC LOG
DROP POLICY IF EXISTS "Users can access sync logs from their company" ON public.quickbooks_sync_log;

CREATE POLICY "View sync logs based on role"
ON public.quickbooks_sync_log
FOR SELECT
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can manage sync logs"
ON public.quickbooks_sync_log
FOR ALL
TO authenticated
USING (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  NOT public.has_any_role(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- RECEIPT VALIDATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_expense_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if user_id is set (skip for backward compatibility records)
  IF NEW.user_id IS NOT NULL AND NEW.attachment_url IS NOT NULL THEN
    -- Check that receipt URL contains the user's ID
    IF NEW.attachment_url NOT LIKE '%' || NEW.user_id::text || '%' THEN
      RAISE EXCEPTION 'Receipt URL must belong to the user creating the expense';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_expense_receipt_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_expense_receipt();

-- Fix RLS policies to allow admins and employees to edit time entries properly

-- Drop existing conflicting UPDATE policies on expenses
DROP POLICY IF EXISTS "Admins and managers can edit all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Field workers can edit pending time entry details" ON public.expenses;
DROP POLICY IF EXISTS "Managers can approve time entries" ON public.expenses;

-- Create clearer, non-conflicting policies for time entry updates

-- 1. Admins and managers can update ANY expense (including approved/locked time entries)
CREATE POLICY "Admins and managers can update all expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  NOT has_any_role(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  NOT has_any_role(auth.uid())
);

-- 2. Employees can edit their own time entries if they are pending, rejected, or null status
CREATE POLICY "Employees can edit their own time entries"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  category = 'labor_internal'::expense_category
  AND user_id = auth.uid()
  AND NOT is_locked
  AND (
    approval_status IS NULL 
    OR approval_status = 'pending'
    OR approval_status = 'rejected'
  )
)
WITH CHECK (
  category = 'labor_internal'::expense_category
  AND user_id = auth.uid()
  AND NOT is_locked
  AND (
    approval_status IS NULL 
    OR approval_status = 'pending'
    OR approval_status = 'rejected'
  )
);

-- Note: Policies are PERMISSIVE (OR logic), so either policy passing will allow the update

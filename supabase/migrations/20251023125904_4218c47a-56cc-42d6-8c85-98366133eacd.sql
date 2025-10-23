-- Add INSERT policies for time entries (labor_internal expenses)

-- Field workers can create their own time entries
CREATE POLICY "Field workers can create time entries"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  category = 'labor_internal'::expense_category
  AND user_id = auth.uid()
  AND (approval_status IS NULL OR approval_status = 'pending')
);

-- Admins/managers can create time entries for any worker
CREATE POLICY "Admins/managers can create time entries"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  category = 'labor_internal'::expense_category
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);
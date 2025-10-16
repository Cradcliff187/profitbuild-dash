-- Drop existing policy
DROP POLICY IF EXISTS "View payees based on role" ON public.payees;

-- Create new policy that allows field workers to see both internal labor and external vendors
CREATE POLICY "Select payees by role"
ON public.payees
FOR SELECT
TO authenticated
USING (
  (NOT public.has_any_role(auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR (
    public.has_role(auth.uid(), 'field_worker'::app_role)
    AND (
      -- Keep internal labor visible for time entries
      (is_internal = true AND provides_labor = true)
      -- Allow external vendors/suppliers for receipts
      OR (is_internal = false)
    )
    AND is_active = true
  )
);
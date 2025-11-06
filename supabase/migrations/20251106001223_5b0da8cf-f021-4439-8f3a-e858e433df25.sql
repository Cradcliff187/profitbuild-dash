-- Add policy to allow admins/managers to insert non-labor expenses
CREATE POLICY "Admins/managers can create regular expenses"
ON public.expenses
FOR INSERT
WITH CHECK (
  (category != 'labor_internal'::expense_category) 
  AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);
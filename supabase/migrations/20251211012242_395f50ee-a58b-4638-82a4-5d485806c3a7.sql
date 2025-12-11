-- Allow field workers to create new payees
CREATE POLICY "Field workers can create payees"
ON public.payees
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'field_worker'::app_role));
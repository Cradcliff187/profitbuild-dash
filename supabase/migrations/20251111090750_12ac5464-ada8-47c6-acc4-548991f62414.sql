-- Drop the overly permissive policy on receipts table
DROP POLICY IF EXISTS "Allow all authenticated users full access to receipts" ON public.receipts;

-- Admins and managers can view all receipts
CREATE POLICY "Admins/managers can view all receipts"
ON public.receipts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Field workers can only view their own receipts
CREATE POLICY "Field workers can view own receipts"
ON public.receipts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Admins and managers can manage all receipts
CREATE POLICY "Admins/managers can manage all receipts"
ON public.receipts
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Field workers can insert their own receipts
CREATE POLICY "Field workers can insert own receipts"
ON public.receipts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Field workers can update their own pending receipts
CREATE POLICY "Field workers can update own pending receipts"
ON public.receipts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() AND 
  (approval_status IS NULL OR approval_status = 'pending')
)
WITH CHECK (
  user_id = auth.uid()
);

-- Field workers can delete their own pending receipts
CREATE POLICY "Field workers can delete own pending receipts"
ON public.receipts
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() AND 
  (approval_status IS NULL OR approval_status = 'pending')
);
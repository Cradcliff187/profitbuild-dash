-- Create receipts table for standalone receipt storage
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  amount numeric(15,2) NOT NULL,
  payee_id uuid REFERENCES public.payees(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  description text,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX receipts_user_id_idx ON public.receipts(user_id);
CREATE INDEX receipts_payee_id_idx ON public.receipts(payee_id);
CREATE INDEX receipts_project_id_idx ON public.receipts(project_id);
CREATE INDEX receipts_captured_at_idx ON public.receipts(captured_at DESC);

-- RLS Policies
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own receipts"
  ON public.receipts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own receipts"
  ON public.receipts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own receipts"
  ON public.receipts FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all receipts"
  ON public.receipts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER set_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add receipt_id to expenses table for future linking
ALTER TABLE public.expenses 
  ADD COLUMN receipt_id uuid REFERENCES public.receipts(id) ON DELETE SET NULL;

CREATE INDEX expenses_receipt_id_idx ON public.expenses(receipt_id);

-- Delete existing receipt-created expenses (ghost expenses with attachment_url)
DELETE FROM public.expenses 
WHERE category = 'other' 
  AND transaction_type = 'expense'
  AND (description IS NULL OR description IN ('Receipt', ''))
  AND attachment_url IS NOT NULL;
-- ============================================
-- PHASE 1: Add Approval Columns to Receipts
-- ============================================

-- Step 1: Add new columns
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS submitted_for_approval_at timestamp with time zone DEFAULT now();

-- Step 2: Add index
CREATE INDEX IF NOT EXISTS idx_receipts_approval_status 
ON public.receipts(approval_status);

-- Step 3: Add comments
COMMENT ON COLUMN public.receipts.approval_status IS 'Approval status: pending, approved, or rejected';
COMMENT ON COLUMN public.receipts.approved_by IS 'User ID of admin/manager who approved/rejected the receipt';
COMMENT ON COLUMN public.receipts.approved_at IS 'Timestamp when receipt was approved';
COMMENT ON COLUMN public.receipts.rejection_reason IS 'Reason provided when receipt is rejected';
COMMENT ON COLUMN public.receipts.submitted_for_approval_at IS 'Timestamp when receipt was submitted for approval';

-- Step 4: Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update pending receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Admins can view all receipts" ON public.receipts;
DROP POLICY IF EXISTS "Admins can approve receipts" ON public.receipts;

-- Step 5: Create super permissive policies
CREATE POLICY "Allow all authenticated users full access to receipts"
ON public.receipts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
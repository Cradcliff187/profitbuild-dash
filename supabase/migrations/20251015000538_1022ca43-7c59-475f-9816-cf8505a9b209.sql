-- Add offline sync metadata columns to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS created_offline boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS synced_at timestamptz,
ADD COLUMN IF NOT EXISTS local_id text;

-- Create index for local_id lookups
CREATE INDEX IF NOT EXISTS idx_expenses_local_id 
ON public.expenses(local_id) 
WHERE local_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.expenses.created_offline IS 'Flag indicating entry was created while device was offline';
COMMENT ON COLUMN public.expenses.synced_at IS 'Timestamp when offline entry was synced to server';
COMMENT ON COLUMN public.expenses.local_id IS 'Local UUID from offline queue for correlation and deduplication';
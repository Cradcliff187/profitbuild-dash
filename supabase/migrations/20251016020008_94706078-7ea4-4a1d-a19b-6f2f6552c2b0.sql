-- Update expenses.approval_status default to 'pending' instead of 'draft'
ALTER TABLE public.expenses 
ALTER COLUMN approval_status SET DEFAULT 'pending';
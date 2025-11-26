-- Add do_not_exceed column for work orders (T&M cap)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS do_not_exceed NUMERIC(12,2) NULL;

COMMENT ON COLUMN public.projects.do_not_exceed IS 'Not-to-exceed amount for T&M work orders';


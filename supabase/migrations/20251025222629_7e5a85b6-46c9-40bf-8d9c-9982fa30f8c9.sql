-- Add user_id column to link payees to auth users
ALTER TABLE public.payees 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payees_user_id ON public.payees(user_id);

-- Add helpful comment
COMMENT ON COLUMN public.payees.user_id IS 'Links internal labor payees to their auth.users account for time tracking';

-- Update payees with matching user_id based on email (one-time migration)
UPDATE public.payees p
SET user_id = prof.id
FROM public.profiles prof
WHERE p.email = prof.email
  AND p.is_internal = true
  AND p.provides_labor = true
  AND prof.is_active = true
  AND p.user_id IS NULL;
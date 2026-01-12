-- Add last_active_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for performance (admins will query this frequently)
CREATE INDEX idx_profiles_last_active_at ON public.profiles(last_active_at DESC NULLS LAST);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.last_active_at IS 'Timestamp of last user activity in the application (updated via heartbeat/route changes)';

-- Backfill existing users with their last sign-in or created_at
UPDATE public.profiles p
SET last_active_at = COALESCE(
  (SELECT last_sign_in_at FROM auth.users WHERE id = p.id),
  p.created_at
)
WHERE last_active_at IS NULL;

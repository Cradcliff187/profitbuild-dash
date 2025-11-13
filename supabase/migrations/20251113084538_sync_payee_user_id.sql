-- =====================================================
-- Sync payees.user_id for internal labor workers
-- =====================================================
-- This migration ensures that internal labor payees are automatically
-- linked to their auth user accounts for proper time tracking functionality.

-- 1. Backfill existing internal labor payees with missing user_id
UPDATE public.payees p
SET user_id = prof.id
FROM public.profiles prof
WHERE p.email = prof.email
  AND p.is_internal = true
  AND p.provides_labor = true
  AND p.user_id IS NULL;

-- 2. Create function to automatically sync payee user_id
CREATE OR REPLACE FUNCTION public.sync_payee_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process internal labor payees with email
  IF NEW.is_internal = true AND NEW.provides_labor = true AND NEW.email IS NOT NULL THEN
    -- Try to find matching profile and update user_id
    UPDATE public.payees
    SET user_id = prof.id
    FROM public.profiles prof
    WHERE payees.id = NEW.id
      AND payees.email = prof.email
      AND payees.user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger on payees table
CREATE TRIGGER trigger_sync_payee_user_id
  AFTER INSERT OR UPDATE OF email, is_internal, provides_labor
  ON public.payees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payee_user_id();

-- 4. Create trigger on profiles table to sync when profile email changes
CREATE OR REPLACE FUNCTION public.sync_profile_to_payee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a profile email is updated, sync to matching internal labor payees
  IF NEW.email IS DISTINCT FROM OLD.email OR TG_OP = 'INSERT' THEN
    UPDATE public.payees
    SET user_id = NEW.id
    WHERE email = NEW.email
      AND is_internal = true
      AND provides_labor = true
      AND user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_profile_to_payee
  AFTER INSERT OR UPDATE OF email
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_payee();

-- 5. Add helpful comments
COMMENT ON FUNCTION public.sync_payee_user_id() IS 'Automatically links internal labor payees to their auth user account when payee is created or updated';
COMMENT ON FUNCTION public.sync_profile_to_payee() IS 'Automatically links profiles to internal labor payees when profile email is created or updated';


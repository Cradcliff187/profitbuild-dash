-- Phase 3: Remove unused authentication complexity columns from profiles table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS must_change_password,
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS failed_login_attempts,
  DROP COLUMN IF EXISTS account_locked_until;
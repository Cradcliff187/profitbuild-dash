-- Phase 1: Restore must_change_password column
ALTER TABLE public.profiles 
  ADD COLUMN must_change_password BOOLEAN DEFAULT false;

-- Index for fast login checks
CREATE INDEX idx_profiles_must_change_password 
  ON public.profiles(must_change_password) 
  WHERE must_change_password = true;

COMMENT ON COLUMN public.profiles.must_change_password IS 
  'True if user logged in with temporary password and must change it';
-- Create view joining profiles and auth data for user authentication status
-- Using security_invoker = on to enforce RLS from underlying tables
CREATE OR REPLACE VIEW public.user_auth_status
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.must_change_password,
  au.last_sign_in_at,
  au.confirmed_at,
  (au.encrypted_password IS NOT NULL) as has_password
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- Grant SELECT permission to authenticated users
-- Access is controlled by RLS on the profiles table (admins only)
GRANT SELECT ON public.user_auth_status TO authenticated;
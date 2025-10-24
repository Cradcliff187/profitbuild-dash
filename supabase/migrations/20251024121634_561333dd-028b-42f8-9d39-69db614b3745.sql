-- Drop the broken view
DROP VIEW IF EXISTS public.user_auth_status;

-- Create a SECURITY DEFINER function that admins can call to get user auth status
CREATE OR REPLACE FUNCTION public.get_user_auth_status()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  must_change_password boolean,
  last_sign_in_at timestamptz,
  confirmed_at timestamptz,
  has_password boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can view user authentication status';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.must_change_password,
    au.last_sign_in_at,
    au.confirmed_at,
    (au.encrypted_password IS NOT NULL) as has_password
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.email;
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.get_user_auth_status() TO authenticated;
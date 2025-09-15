-- Fix function search path security issues

-- Update the update_updated_at_column function to set search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update the get_user_company_id function to set search_path
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
  -- This would typically link to a user_profiles table
  -- For now, return the first company (modify based on your user-company relationship)
  RETURN (SELECT id FROM public.companies LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
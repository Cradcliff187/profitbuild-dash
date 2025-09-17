-- Add business fields to payees table
ALTER TABLE public.payees 
ADD COLUMN insurance_expires date,
ADD COLUMN license_number text,
ADD COLUMN permit_issuer boolean DEFAULT false,
ADD COLUMN hourly_rate numeric(10,2);

-- Create function to set default hourly rate for internal labor
CREATE OR REPLACE FUNCTION public.set_default_hourly_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default hourly rate to 75 for internal labor providers
  IF NEW.is_internal = true AND NEW.provides_labor = true AND NEW.hourly_rate IS NULL THEN
    NEW.hourly_rate = 75.00;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to automatically set hourly rate
CREATE TRIGGER set_payee_hourly_rate
  BEFORE INSERT OR UPDATE ON public.payees
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_hourly_rate();
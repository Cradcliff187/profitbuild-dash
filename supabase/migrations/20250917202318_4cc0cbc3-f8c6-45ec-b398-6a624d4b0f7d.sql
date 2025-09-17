-- Add contingency fields to estimates table
ALTER TABLE public.estimates 
ADD COLUMN contingency_percent NUMERIC DEFAULT 10.0,
ADD COLUMN contingency_amount NUMERIC,
ADD COLUMN contingency_used NUMERIC DEFAULT 0;

-- Create function to calculate contingency amount
CREATE OR REPLACE FUNCTION public.calculate_contingency_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate contingency amount based on total_amount and contingency_percent
  IF NEW.total_amount IS NOT NULL AND NEW.contingency_percent IS NOT NULL THEN
    NEW.contingency_amount = NEW.total_amount * (NEW.contingency_percent / 100);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate contingency amount
CREATE TRIGGER calculate_estimates_contingency
  BEFORE INSERT OR UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_contingency_amount();
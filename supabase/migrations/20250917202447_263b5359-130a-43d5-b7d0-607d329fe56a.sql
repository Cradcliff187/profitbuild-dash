-- Fix security warning: Add search_path to contingency calculation function
CREATE OR REPLACE FUNCTION public.calculate_contingency_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate contingency amount based on total_amount and contingency_percent
  IF NEW.total_amount IS NOT NULL AND NEW.contingency_percent IS NOT NULL THEN
    NEW.contingency_amount = NEW.total_amount * (NEW.contingency_percent / 100);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;
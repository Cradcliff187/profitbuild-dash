-- Add margin threshold columns to projects table
ALTER TABLE public.projects 
ADD COLUMN contingency_remaining DECIMAL(15,2),
ADD COLUMN minimum_margin_threshold DECIMAL(5,2) DEFAULT 10.0,
ADD COLUMN target_margin DECIMAL(5,2) DEFAULT 20.0;

-- Create function to calculate contingency remaining
CREATE OR REPLACE FUNCTION public.calculate_contingency_remaining(project_id_param UUID)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_contingency DECIMAL(15,2) := 0;
  used_contingency DECIMAL(15,2) := 0;
  remaining_contingency DECIMAL(15,2) := 0;
BEGIN
  -- Get total contingency and used contingency from current estimate
  SELECT COALESCE(e.contingency_amount, 0), COALESCE(e.contingency_used, 0)
  INTO total_contingency, used_contingency
  FROM public.estimates e
  WHERE e.project_id = project_id_param AND e.is_current_version = true
  LIMIT 1;
  
  -- Calculate remaining contingency
  remaining_contingency := total_contingency - used_contingency;
  
  RETURN GREATEST(remaining_contingency, 0); -- Never return negative
END;
$$;

-- Create function to check margin thresholds
CREATE OR REPLACE FUNCTION public.check_margin_thresholds(project_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_margin_pct DECIMAL(5,2);
  min_threshold DECIMAL(5,2);
  target_threshold DECIMAL(5,2);
BEGIN
  -- Get current margin percentage and thresholds
  SELECT p.margin_percentage, p.minimum_margin_threshold, p.target_margin
  INTO current_margin_pct, min_threshold, target_threshold
  FROM public.projects p
  WHERE p.id = project_id_param;
  
  -- Return threshold status
  IF current_margin_pct IS NULL THEN
    RETURN 'unknown';
  ELSIF current_margin_pct < min_threshold THEN
    RETURN 'critical';
  ELSIF current_margin_pct < target_threshold THEN
    RETURN 'at_risk';
  ELSIF current_margin_pct >= 30.0 THEN
    RETURN 'excellent';
  ELSE
    RETURN 'on_target';
  END IF;
END;
$$;

-- Update the calculate_project_margins function to include contingency remaining
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_expenses DECIMAL(15,2) := 0;
  accepted_quotes_total DECIMAL(15,2) := 0;
  contracted_amt DECIMAL(15,2) := 0;
  calculated_margin DECIMAL(15,2) := 0;
  margin_pct DECIMAL(5,2) := 0;
  contingency_rem DECIMAL(15,2) := 0;
BEGIN
  -- Calculate total expenses for the project
  SELECT COALESCE(SUM(e.amount), 0)
  INTO total_expenses
  FROM public.expenses e
  WHERE e.project_id = project_id_param;
  
  -- Calculate total accepted quotes for the project
  SELECT COALESCE(SUM(q.total_amount), 0)
  INTO accepted_quotes_total
  FROM public.quotes q
  WHERE q.project_id = project_id_param AND q.status = 'accepted';
  
  -- Use accepted quotes total as contracted amount if available
  contracted_amt := accepted_quotes_total;
  
  -- Calculate current margin (contracted amount - actual expenses)
  calculated_margin := COALESCE(contracted_amt, 0) - total_expenses;
  
  -- Calculate margin percentage
  IF contracted_amt > 0 THEN
    margin_pct := (calculated_margin / contracted_amt) * 100;
  ELSE
    margin_pct := 0;
  END IF;
  
  -- Calculate contingency remaining
  contingency_rem := public.calculate_contingency_remaining(project_id_param);
  
  -- Update the project with calculated values
  UPDATE public.projects
  SET 
    total_accepted_quotes = accepted_quotes_total,
    contracted_amount = CASE 
      WHEN contracted_amount IS NULL THEN contracted_amt 
      ELSE contracted_amount 
    END,
    current_margin = calculated_margin,
    margin_percentage = margin_pct,
    contingency_remaining = contingency_rem,
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$$;

-- Create trigger to update contingency remaining when estimates change
CREATE OR REPLACE FUNCTION public.update_contingency_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update contingency remaining for the related project
  IF TG_TABLE_NAME = 'estimates' THEN
    UPDATE public.projects
    SET contingency_remaining = public.calculate_contingency_remaining(NEW.project_id)
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER update_contingency_on_estimate_change
  AFTER INSERT OR UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contingency_remaining();

-- Update existing projects with default threshold values and calculate contingency remaining
UPDATE public.projects 
SET 
  minimum_margin_threshold = 10.0,
  target_margin = 20.0;

-- Calculate contingency remaining for all existing projects
UPDATE public.projects 
SET contingency_remaining = public.calculate_contingency_remaining(id);

-- Recalculate margins for all existing projects to include contingency remaining
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM public.projects LOOP
    PERFORM public.calculate_project_margins(project_record.id);
  END LOOP;
END $$;
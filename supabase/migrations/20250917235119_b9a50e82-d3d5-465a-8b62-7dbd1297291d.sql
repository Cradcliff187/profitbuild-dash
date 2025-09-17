-- Add margin tracking columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contracted_amount DECIMAL(15,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_accepted_quotes DECIMAL(15,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS current_margin DECIMAL(15,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2);

-- Function to calculate project margins based on quotes and expenses
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_expenses DECIMAL(15,2) := 0;
  accepted_quotes_total DECIMAL(15,2) := 0;
  contracted_amt DECIMAL(15,2) := 0;
  calculated_margin DECIMAL(15,2) := 0;
  margin_pct DECIMAL(5,2) := 0;
BEGIN
  -- Calculate total expenses for the project
  SELECT COALESCE(SUM(amount), 0)
  INTO total_expenses
  FROM public.expenses
  WHERE project_id = project_id_param;
  
  -- Calculate total accepted quotes for the project
  SELECT COALESCE(SUM(total_amount), 0)
  INTO accepted_quotes_total
  FROM public.quotes
  WHERE project_id = project_id_param AND status = 'accepted';
  
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
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$$;

-- Function to update project margins when related data changes
CREATE OR REPLACE FUNCTION public.update_project_financial_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle different trigger scenarios
  IF TG_TABLE_NAME = 'quotes' THEN
    -- Update margins when quote status changes
    IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.total_amount IS DISTINCT FROM NEW.total_amount) THEN
      PERFORM public.calculate_project_margins(NEW.project_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    -- Update margins when expenses are added/updated/deleted
    IF TG_OP = 'DELETE' THEN
      PERFORM public.calculate_project_margins(OLD.project_id);
    ELSE
      PERFORM public.calculate_project_margins(NEW.project_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'change_orders' THEN
    -- Update contracted amount when change orders are approved
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      UPDATE public.projects 
      SET 
        contracted_amount = COALESCE(contracted_amount, 0) + NEW.amount,
        updated_at = NOW()
      WHERE id = NEW.project_id;
      
      -- Recalculate margins with new contracted amount
      PERFORM public.calculate_project_margins(NEW.project_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to automatically update project margins
DROP TRIGGER IF EXISTS update_project_margins_on_quote_change ON public.quotes;
CREATE TRIGGER update_project_margins_on_quote_change
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_financial_totals();

DROP TRIGGER IF EXISTS update_project_margins_on_expense_change ON public.expenses;
CREATE TRIGGER update_project_margins_on_expense_change
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_financial_totals();

DROP TRIGGER IF EXISTS update_project_margins_on_change_order ON public.change_orders;
CREATE TRIGGER update_project_margins_on_change_order
  AFTER UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_financial_totals();

-- Populate initial margin data for existing projects
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM public.projects LOOP
    PERFORM public.calculate_project_margins(project_record.id);
  END LOOP;
END;
$$;
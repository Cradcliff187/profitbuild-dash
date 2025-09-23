-- Fix contract value logic to use approved estimate total instead of accepted quotes

-- Update the calculate_project_margins function to use approved estimate total
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_expenses DECIMAL(15,2) := 0;
  accepted_quotes_total DECIMAL(15,2) := 0;
  approved_estimate_total DECIMAL(15,2) := 0;
  contracted_amt DECIMAL(15,2) := 0;
  calculated_margin DECIMAL(15,2) := 0;
  margin_pct DECIMAL(5,2) := 0;
  contingency_rem DECIMAL(15,2) := 0;
  change_order_client_total DECIMAL(15,2) := 0;
  change_order_cost_total DECIMAL(15,2) := 0;
  change_order_margin_total DECIMAL(15,2) := 0;
BEGIN
  -- Calculate total expenses for the project
  SELECT COALESCE(SUM(e.amount), 0)
  INTO total_expenses
  FROM public.expenses e
  WHERE e.project_id = project_id_param;
  
  -- Calculate total accepted quotes for the project (keep for backward compatibility)
  SELECT COALESCE(SUM(q.total_amount), 0)
  INTO accepted_quotes_total
  FROM public.quotes q
  WHERE q.project_id = project_id_param AND q.status = 'accepted';
  
  -- Get approved estimate total (this is the real contracted amount)
  SELECT COALESCE(e.total_amount, 0)
  INTO approved_estimate_total
  FROM public.estimates e
  WHERE e.project_id = project_id_param AND e.status = 'approved'
  ORDER BY e.updated_at DESC
  LIMIT 1;
  
  -- Calculate change order impacts (approved only)
  SELECT 
    COALESCE(SUM(co.client_amount), 0),
    COALESCE(SUM(co.cost_impact), 0),
    COALESCE(SUM(co.margin_impact), 0)
  INTO change_order_client_total, change_order_cost_total, change_order_margin_total
  FROM public.change_orders co
  WHERE co.project_id = project_id_param AND co.status = 'approved';
  
  -- Use approved estimate total plus approved change orders as contracted amount
  -- If no approved estimate exists, fall back to accepted quotes for backward compatibility
  IF approved_estimate_total > 0 THEN
    contracted_amt := approved_estimate_total + change_order_client_total;
  ELSE
    contracted_amt := accepted_quotes_total + change_order_client_total;
  END IF;
  
  -- Add change order cost impact to total expenses
  total_expenses := total_expenses + change_order_cost_total;
  
  -- Calculate current margin (contracted amount - actual expenses)
  calculated_margin := COALESCE(contracted_amt, 0) - total_expenses;
  
  -- Calculate margin percentage
  IF contracted_amt > 0 THEN
    margin_pct := (calculated_margin / contracted_amt) * 100;
  ELSE
    margin_pct := 0;
  END IF;
  
  -- Calculate contingency remaining (including contingency used by change orders)
  contingency_rem := public.calculate_contingency_remaining(project_id_param);
  
  -- Update the project with calculated values
  UPDATE public.projects
  SET 
    total_accepted_quotes = accepted_quotes_total,
    contracted_amount = contracted_amt, -- Now based on approved estimate
    current_margin = calculated_margin,
    margin_percentage = margin_pct,
    contingency_remaining = contingency_rem,
    updated_at = NOW()
  WHERE id = project_id_param;
END;
$function$;

-- Create function to sync contract amount when estimate status changes
CREATE OR REPLACE FUNCTION public.sync_contract_on_estimate_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If estimate status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Un-approve any other estimates for this project
    UPDATE public.estimates 
    SET status = 'sent' 
    WHERE project_id = NEW.project_id 
      AND status = 'approved' 
      AND id != NEW.id;
    
    -- Update project status to approved if it's not already
    UPDATE public.projects
    SET 
      status = CASE 
        WHEN status = 'estimating' OR status = 'quoted' THEN 'approved'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Recalculate project margins whenever estimate status changes
  PERFORM public.calculate_project_margins(NEW.project_id);
  
  RETURN NEW;
END;
$function$;

-- Create trigger for estimate status changes
DROP TRIGGER IF EXISTS sync_contract_on_estimate_status_trigger ON public.estimates;
CREATE TRIGGER sync_contract_on_estimate_status_trigger
  AFTER UPDATE OF status ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contract_on_estimate_status();

-- Backfill existing data by recalculating all project margins
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM public.projects LOOP
    PERFORM public.calculate_project_margins(project_record.id);
  END LOOP;
END $$;
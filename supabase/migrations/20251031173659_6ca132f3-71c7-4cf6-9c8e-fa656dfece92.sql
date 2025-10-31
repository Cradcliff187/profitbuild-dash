-- Fix change order trigger to use client_amount instead of amount
CREATE OR REPLACE FUNCTION public.update_project_financial_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        contracted_amount = COALESCE(contracted_amount, 0) + NEW.client_amount,
        updated_at = NOW()
      WHERE id = NEW.project_id;
      
      -- Recalculate margins with new contracted amount
      PERFORM public.calculate_project_margins(NEW.project_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix existing project 225-007 data
UPDATE public.projects
SET contracted_amount = 37385.75
WHERE project_number = '225-007';

-- Recalculate margins for project 225-007
SELECT public.calculate_project_margins(id)
FROM public.projects
WHERE project_number = '225-007';
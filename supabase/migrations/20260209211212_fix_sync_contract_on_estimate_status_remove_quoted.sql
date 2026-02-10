-- Fix sync_contract_on_estimate_status: remove stale 'quoted' reference and only advance status from early stages.
-- project_status no longer includes 'quoted'. Only advance to 'approved' when project is in early stage (estimating).
-- When enum gains 'draft'/'pending', expand CASE to: WHEN status IN ('draft','pending','estimating') THEN 'approved'.

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

    -- Update project status to approved only when in early stage (never regress)
    UPDATE public.projects
    SET
      status = CASE
        WHEN status = 'estimating' THEN 'approved'
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

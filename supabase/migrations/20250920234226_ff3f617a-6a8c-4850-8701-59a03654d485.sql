-- FINAL SECURITY FIX - Update remaining functions with proper search_path
-- This addresses all remaining Function Search Path Mutable warnings

-- Update all remaining functions to have proper security settings
CREATE OR REPLACE FUNCTION public.set_default_hourly_rate()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set default hourly rate to 75 for internal labor providers
  IF NEW.is_internal = true AND NEW.provides_labor = true AND NEW.hourly_rate IS NULL THEN
    NEW.hourly_rate = 75.00;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_contingency_amount()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate contingency amount based on total_amount and contingency_percent
  IF NEW.total_amount IS NOT NULL AND NEW.contingency_percent IS NOT NULL THEN
    NEW.contingency_amount = NEW.total_amount * (NEW.contingency_percent / 100);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_single_current_version()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this estimate is being marked as current version
  IF NEW.is_current_version = true THEN
    -- Find the root estimate (either this one or its parent)
    DECLARE
      root_estimate_id uuid;
    BEGIN
      IF NEW.parent_estimate_id IS NULL THEN
        root_estimate_id := NEW.id;
      ELSE
        root_estimate_id := NEW.parent_estimate_id;
      END IF;
      
      -- Set all other versions in this family to not current
      UPDATE public.estimates 
      SET is_current_version = false 
      WHERE (id = root_estimate_id OR parent_estimate_id = root_estimate_id)
        AND id != NEW.id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_estimate_valid_until()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate valid_until based on date_created and valid_for_days
  IF NEW.date_created IS NOT NULL AND NEW.valid_for_days IS NOT NULL THEN
    NEW.valid_until = NEW.date_created + INTERVAL '1 day' * NEW.valid_for_days;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_financial_totals()
RETURNS TRIGGER 
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
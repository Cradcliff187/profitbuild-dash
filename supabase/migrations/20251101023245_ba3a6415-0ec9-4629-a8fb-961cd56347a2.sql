-- Migration: Add triggers to automatically calculate project margins and backfill existing projects
-- This ensures all financial fields (contracted_amount, projected_margin, contingency_remaining, etc.) 
-- are automatically recalculated whenever related data changes

-- Create trigger function that calls calculate_project_margins
CREATE OR REPLACE FUNCTION trigger_calculate_project_margins()
RETURNS TRIGGER AS $$
DECLARE
  target_project_id UUID;
BEGIN
  -- Determine project_id based on which table triggered this
  IF TG_TABLE_NAME = 'estimates' THEN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'estimate_line_items' THEN
    SELECT project_id INTO target_project_id 
    FROM estimates 
    WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
  ELSIF TG_TABLE_NAME = 'quotes' THEN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'quote_line_items' THEN
    SELECT project_id INTO target_project_id 
    FROM quotes 
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'change_orders' THEN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  END IF;

  -- Skip system projects
  IF target_project_id IS NOT NULL THEN
    PERFORM calculate_project_margins(target_project_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS calculate_margins_on_estimate_change ON estimates;
DROP TRIGGER IF EXISTS calculate_margins_on_estimate_line_item_change ON estimate_line_items;
DROP TRIGGER IF EXISTS calculate_margins_on_quote_change ON quotes;
DROP TRIGGER IF EXISTS calculate_margins_on_quote_line_item_change ON quote_line_items;
DROP TRIGGER IF EXISTS calculate_margins_on_expense_change ON expenses;
DROP TRIGGER IF EXISTS calculate_margins_on_change_order_change ON change_orders;

-- Create triggers on all relevant tables
CREATE TRIGGER calculate_margins_on_estimate_change
AFTER INSERT OR UPDATE OR DELETE ON estimates
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

CREATE TRIGGER calculate_margins_on_estimate_line_item_change
AFTER INSERT OR UPDATE OR DELETE ON estimate_line_items
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

CREATE TRIGGER calculate_margins_on_quote_change
AFTER INSERT OR UPDATE OR DELETE ON quotes
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

CREATE TRIGGER calculate_margins_on_quote_line_item_change
AFTER INSERT OR UPDATE OR DELETE ON quote_line_items
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

CREATE TRIGGER calculate_margins_on_expense_change
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

CREATE TRIGGER calculate_margins_on_change_order_change
AFTER INSERT OR UPDATE OR DELETE ON change_orders
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

-- Backfill: Calculate margins for all existing real projects
DO $$
DECLARE
  proj RECORD;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR proj IN 
    SELECT id, project_number, project_name 
    FROM projects 
    WHERE project_number NOT IN ('SYS-000', '000-UNASSIGNED')
    ORDER BY created_at DESC
  LOOP
    BEGIN
      PERFORM calculate_project_margins(proj.id);
      success_count := success_count + 1;
      RAISE NOTICE 'Calculated margins for % - %', proj.project_number, proj.project_name;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Failed to calculate margins for %: %', proj.project_number, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete. Success: %, Errors: %', success_count, error_count;
END $$;
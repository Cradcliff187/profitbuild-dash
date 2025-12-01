-- Add triggers for project_revenues and revenue_splits to recalculate margins
-- CRITICAL: Without these triggers, actual_margin won't update when invoices are added

-- Update trigger function to handle project_revenues and revenue_splits
CREATE OR REPLACE FUNCTION trigger_calculate_project_margins()
RETURNS TRIGGER AS $$
DECLARE
  target_project_id UUID;
  project_ids UUID[];
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
  ELSIF TG_TABLE_NAME = 'expense_splits' THEN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'change_orders' THEN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'project_revenues' THEN
    -- For direct revenues, use project_id
    IF COALESCE(NEW.is_split, false) = false OR (TG_OP = 'DELETE' AND COALESCE(OLD.is_split, false) = false) THEN
      target_project_id := COALESCE(NEW.project_id, OLD.project_id);
    ELSE
      -- For split revenues, get all projects that have splits for this revenue
      IF TG_OP = 'DELETE' THEN
        SELECT array_agg(DISTINCT project_id) INTO project_ids
        FROM revenue_splits
        WHERE revenue_id = OLD.id;
      ELSE
        SELECT array_agg(DISTINCT project_id) INTO project_ids
        FROM revenue_splits
        WHERE revenue_id = NEW.id;
      END IF;
      
      -- Recalculate for all projects with splits
      IF project_ids IS NOT NULL THEN
        FOREACH target_project_id IN ARRAY project_ids
        LOOP
          PERFORM calculate_project_margins(target_project_id);
        END LOOP;
        RETURN COALESCE(NEW, OLD);
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'revenue_splits' THEN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  END IF;

  -- Single project recalculation
  IF target_project_id IS NOT NULL THEN
    PERFORM calculate_project_margins(target_project_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for project_revenues and revenue_splits
DROP TRIGGER IF EXISTS calculate_margins_on_revenue_change ON project_revenues;
CREATE TRIGGER calculate_margins_on_revenue_change
AFTER INSERT OR UPDATE OR DELETE ON project_revenues
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

DROP TRIGGER IF EXISTS calculate_margins_on_revenue_split_change ON revenue_splits;
CREATE TRIGGER calculate_margins_on_revenue_split_change
AFTER INSERT OR UPDATE OR DELETE ON revenue_splits
FOR EACH ROW EXECUTE FUNCTION trigger_calculate_project_margins();

-- Force recalculation of all projects to ensure actual_margin is correct
DO $$
DECLARE
  project_record RECORD;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR project_record IN 
    SELECT id, project_number 
    FROM projects 
    WHERE category = 'construction'
    ORDER BY project_number
  LOOP
    BEGIN
      PERFORM calculate_project_margins(project_record.id);
      success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Failed to calculate margins for %: %', project_record.project_number, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Recalculation complete. Success: %, Errors: %', success_count, error_count;
END $$;


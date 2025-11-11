-- Fix expense_splits foreign key constraint to allow project deletion
-- Change from ON DELETE RESTRICT to ON DELETE CASCADE

-- Drop the existing restrictive constraint
ALTER TABLE public.expense_splits 
DROP CONSTRAINT IF EXISTS expense_splits_project_id_fkey;

-- Re-add with CASCADE to match other project-related tables
ALTER TABLE public.expense_splits
ADD CONSTRAINT expense_splits_project_id_fkey 
FOREIGN KEY (project_id) 
REFERENCES public.projects(id) 
ON DELETE CASCADE;

-- Update delete_project_cascade function to handle expense_splits
CREATE OR REPLACE FUNCTION public.delete_project_cascade(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_estimate_ids uuid[];
  v_expense_ids uuid[];
  v_quote_ids uuid[];
BEGIN
  -- Authorization: admins/managers or users with project access
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.can_access_project(auth.uid(), p_project_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not authorized to delete this project';
  END IF;

  -- Collect IDs for dependent records
  SELECT array_agg(id) INTO v_estimate_ids FROM public.estimates WHERE project_id = p_project_id;
  SELECT array_agg(id) INTO v_expense_ids FROM public.expenses WHERE project_id = p_project_id;
  SELECT array_agg(id) INTO v_quote_ids FROM public.quotes WHERE project_id = p_project_id;

  -- 0. Delete expense splits FIRST (before correlations and expenses)
  DELETE FROM public.expense_splits WHERE project_id = p_project_id;

  -- 1. Delete expense correlations
  IF v_expense_ids IS NOT NULL THEN
    DELETE FROM public.expense_line_item_correlations WHERE expense_id = ANY(v_expense_ids);
    DELETE FROM public.expense_line_item_correlations WHERE expense_split_id IN (
      SELECT id FROM public.expense_splits WHERE expense_id = ANY(v_expense_ids)
    );
  END IF;

  -- 2. Delete quote line items (by quote_id and by linked estimate_line_items)
  IF v_quote_ids IS NOT NULL AND array_length(v_quote_ids, 1) > 0 THEN
    DELETE FROM public.quote_line_items WHERE quote_id = ANY(v_quote_ids);
  END IF;

  IF v_estimate_ids IS NOT NULL AND array_length(v_estimate_ids, 1) > 0 THEN
    DELETE FROM public.quote_line_items 
    WHERE estimate_line_item_id IN (
      SELECT id FROM public.estimate_line_items WHERE estimate_id = ANY(v_estimate_ids)
    );
  END IF;

  -- 3. Delete quotes
  DELETE FROM public.quotes WHERE project_id = p_project_id;

  -- 4. Delete estimate line items
  IF v_estimate_ids IS NOT NULL THEN
    DELETE FROM public.estimate_line_items WHERE estimate_id = ANY(v_estimate_ids);
  END IF;

  -- 5. Delete estimates
  DELETE FROM public.estimates WHERE project_id = p_project_id;

  -- 6. Delete expenses
  DELETE FROM public.expenses WHERE project_id = p_project_id;

  -- 7. Delete change orders
  DELETE FROM public.change_orders WHERE project_id = p_project_id;

  -- 8. Delete project revenues
  DELETE FROM public.project_revenues WHERE project_id = p_project_id;

  -- 9. Delete project media
  DELETE FROM public.project_media WHERE project_id = p_project_id;

  -- 10. Delete project assignments
  DELETE FROM public.project_assignments WHERE project_id = p_project_id;

  -- 11. Delete project notes
  DELETE FROM public.project_notes WHERE project_id = p_project_id;

  -- 12. Delete project documents
  DELETE FROM public.project_documents WHERE project_id = p_project_id;

  -- 13. Receipts: remove project reference
  UPDATE public.receipts SET project_id = NULL WHERE project_id = p_project_id;

  -- 14. Finally delete the project
  DELETE FROM public.projects WHERE id = p_project_id;
END;
$function$;
-- Fix: Allow expense_id to be nullable when correlating expense splits
-- The check_expense_or_split constraint requires expense_id OR expense_split_id, not both
-- This was missing from the original expense splits migration

ALTER TABLE public.expense_line_item_correlations
ALTER COLUMN expense_id DROP NOT NULL;

-- Add comments explaining the mutual exclusivity design
COMMENT ON COLUMN public.expense_line_item_correlations.expense_id IS 
  'References expenses table. Must be NULL when expense_split_id is set (mutually exclusive per check_expense_or_split constraint)';

COMMENT ON COLUMN public.expense_line_item_correlations.expense_split_id IS 
  'References expense_splits table. Must be NULL when expense_id is set (mutually exclusive per check_expense_or_split constraint)';
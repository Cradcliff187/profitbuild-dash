-- Migration: Add Change Order Line Item Payee Support and Expense Correlation

-- 1. Add payee_id to change_order_line_items
ALTER TABLE public.change_order_line_items 
ADD COLUMN IF NOT EXISTS payee_id uuid REFERENCES public.payees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_change_order_line_items_payee 
ON public.change_order_line_items(payee_id);

COMMENT ON COLUMN public.change_order_line_items.payee_id IS 
'The payee/subcontractor who will perform this work or supply materials';

-- 2. Add change_order_line_item_id to expense_line_item_correlations
ALTER TABLE public.expense_line_item_correlations 
ADD COLUMN IF NOT EXISTS change_order_line_item_id uuid 
REFERENCES public.change_order_line_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expense_correlations_co_line_item 
ON public.expense_line_item_correlations(change_order_line_item_id);

COMMENT ON COLUMN public.expense_line_item_correlations.change_order_line_item_id IS 
'Links an expense to a specific change order line item for variance tracking';
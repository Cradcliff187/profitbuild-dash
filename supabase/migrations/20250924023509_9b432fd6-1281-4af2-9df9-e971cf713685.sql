-- Trigger for quotes changes
CREATE OR REPLACE TRIGGER recalculate_on_quote_change
AFTER INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_project_financial_totals();

-- Trigger for expenses changes  
CREATE OR REPLACE TRIGGER recalculate_on_expense_change
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_project_financial_totals();

-- Trigger for change orders
CREATE OR REPLACE TRIGGER recalculate_on_change_order
AFTER UPDATE ON public.change_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_project_financial_totals();
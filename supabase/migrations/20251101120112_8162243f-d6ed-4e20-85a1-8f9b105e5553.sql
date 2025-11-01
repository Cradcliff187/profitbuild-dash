-- Drop the trigger first, then the function (with CASCADE to handle dependencies)
DROP TRIGGER IF EXISTS trigger_create_expenses_from_change_order ON public.change_orders;
DROP FUNCTION IF EXISTS public.create_expenses_from_change_order() CASCADE;
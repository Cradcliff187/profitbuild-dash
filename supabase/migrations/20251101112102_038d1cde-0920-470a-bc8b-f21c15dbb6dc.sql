-- PHASE 1: Remove actual_margin everywhere

-- Drop the actual_margin column from projects table
ALTER TABLE public.projects DROP COLUMN IF EXISTS actual_margin;

-- Update calculate_project_margins function to remove actual_margin_calc
CREATE OR REPLACE FUNCTION public.calculate_project_margins(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  approved_estimate_total numeric := 0;
  approved_estimate_cost numeric := 0;
  change_order_client_total numeric := 0;
  change_order_cost_total numeric := 0;
  contingency_billed_total numeric := 0;
  accepted_quotes_total numeric := 0;
  actual_expenses_total numeric := 0;
  contracted_amt numeric := 0;
  original_margin_calc numeric := 0;
  current_margin_calc numeric := 0;
  projected_margin_calc numeric := 0;
  margin_percent numeric := 0;
  original_est_costs_calc numeric := 0;
  adjusted_est_costs_calc numeric := 0;
BEGIN
  -- Get approved estimate totals
  SELECT COALESCE(SUM(eli.total), 0), COALESCE(SUM(eli.quantity * eli.cost_per_unit), 0)
  INTO approved_estimate_total, approved_estimate_cost
  FROM estimate_line_items eli
  JOIN estimates e ON eli.estimate_id = e.id
  WHERE e.project_id = project_id_param
    AND e.status = 'approved';

  -- Get change order totals (approved only)
  SELECT 
    COALESCE(SUM(client_amount), 0),
    COALESCE(SUM(cost_impact), 0),
    COALESCE(SUM(contingency_billed_to_client), 0)
  INTO change_order_client_total, change_order_cost_total, contingency_billed_total
  FROM change_orders
  WHERE project_id = project_id_param
    AND status = 'approved';

  -- Get accepted quotes total
  SELECT COALESCE(SUM(qli.total), 0)
  INTO accepted_quotes_total
  FROM quote_line_items qli
  JOIN quotes q ON qli.quote_id = q.id
  WHERE q.project_id = project_id_param
    AND q.status = 'accepted';

  -- Get actual expenses total
  SELECT COALESCE(SUM(amount), 0)
  INTO actual_expenses_total
  FROM expenses
  WHERE project_id = project_id_param;

  -- Calculate contracted amount
  contracted_amt := approved_estimate_total + change_order_client_total + contingency_billed_total;

  -- Calculate original margin (from approved estimate only)
  original_margin_calc := approved_estimate_total - approved_estimate_cost;

  -- Calculate current margin (contracted - actual expenses)
  current_margin_calc := contracted_amt - actual_expenses_total;

  -- Calculate original and adjusted estimated costs
  original_est_costs_calc := approved_estimate_cost;
  
  -- Adjusted costs = original estimate cost + change order costs
  -- For quotes, we use the quote costs if they exist, otherwise fall back to estimate costs
  SELECT COALESCE(SUM(qli.quantity * qli.cost_per_unit), 0)
  INTO adjusted_est_costs_calc
  FROM quote_line_items qli
  JOIN quotes q ON qli.quote_id = q.id
  WHERE q.project_id = project_id_param
    AND q.status = 'accepted';

  -- If no accepted quotes, use original estimate costs
  IF adjusted_est_costs_calc = 0 THEN
    adjusted_est_costs_calc := original_est_costs_calc;
  END IF;

  -- Add change order costs to adjusted costs
  adjusted_est_costs_calc := adjusted_est_costs_calc + change_order_cost_total;

  -- Calculate projected margin (contracted - adjusted estimated costs)
  projected_margin_calc := contracted_amt - adjusted_est_costs_calc;

  -- Calculate margin percentage
  IF contracted_amt > 0 THEN
    margin_percent := (projected_margin_calc / contracted_amt) * 100;
  ELSE
    margin_percent := 0;
  END IF;

  -- Update the project with all calculated values
  UPDATE projects
  SET
    contracted_amount = contracted_amt,
    total_accepted_quotes = accepted_quotes_total,
    original_margin = original_margin_calc,
    current_margin = current_margin_calc,
    projected_margin = projected_margin_calc,
    margin_percentage = margin_percent,
    original_est_costs = original_est_costs_calc,
    adjusted_est_costs = adjusted_est_costs_calc,
    updated_at = now()
  WHERE id = project_id_param;
END;
$function$;

-- Update project_financial_summary view to remove actual_margin_percentage and fix table reference
DROP VIEW IF EXISTS public.project_financial_summary;
CREATE VIEW public.project_financial_summary AS
SELECT 
  p.id AS project_id,
  p.project_name,
  p.project_number,
  p.client_name,
  p.status,
  p.contracted_amount,
  
  -- Revenue
  COALESCE(SUM(DISTINCT e.total_amount), 0) AS total_estimated,
  COALESCE(SUM(DISTINCT pr.amount), 0) AS total_invoiced,
  COUNT(DISTINCT pr.id) AS invoice_count,
  
  -- Change Orders
  COALESCE(SUM(DISTINCT co.client_amount), 0) AS change_order_revenue,
  COALESCE(SUM(DISTINCT co.cost_impact), 0) AS change_order_costs,
  
  -- Expenses
  COALESCE(SUM(DISTINCT ex.amount), 0) AS total_expenses,
  COUNT(DISTINCT ex.id) AS expense_count,
  
  -- Profit and Margin Calculations
  (COALESCE(SUM(DISTINCT pr.amount), 0) + COALESCE(SUM(DISTINCT co.client_amount), 0)) - 
  (COALESCE(SUM(DISTINCT ex.amount), 0) + COALESCE(SUM(DISTINCT co.cost_impact), 0)) AS actual_profit,
  
  -- Current Margin Percentage (contract - actual expenses) / contract
  CASE 
    WHEN p.contracted_amount > 0 THEN 
      ((p.contracted_amount - COALESCE(SUM(DISTINCT ex.amount), 0)) / p.contracted_amount) * 100
    ELSE 0 
  END AS current_margin_percentage,
  
  -- Variances
  COALESCE(SUM(DISTINCT e.total_amount), 0) - COALESCE(SUM(DISTINCT pr.amount), 0) AS revenue_variance,
  COALESCE(SUM(DISTINCT e.total_amount), 0) - COALESCE(SUM(DISTINCT ex.amount), 0) AS cost_variance

FROM projects p
LEFT JOIN estimates e ON e.project_id = p.id AND e.status = 'approved'
LEFT JOIN project_revenues pr ON pr.project_id = p.id
LEFT JOIN change_orders co ON co.project_id = p.id AND co.status = 'approved'
LEFT JOIN expenses ex ON ex.project_id = p.id
WHERE can_access_project(auth.uid(), p.id)
GROUP BY p.id, p.project_name, p.project_number, p.client_name, p.status, p.contracted_amount;

-- PHASE 2: Add change_order_line_items system

-- Create change_order_line_items table
CREATE TABLE public.change_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  description text NOT NULL,
  quantity numeric DEFAULT 1 CHECK (quantity > 0),
  unit text,
  cost_per_unit numeric DEFAULT 0 CHECK (cost_per_unit >= 0),
  price_per_unit numeric DEFAULT 0 CHECK (price_per_unit >= 0),
  
  -- Computed columns (like estimate_line_items)
  total_cost numeric GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  total_price numeric GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  markup_amount numeric GENERATED ALWAYS AS ((quantity * price_per_unit) - (quantity * cost_per_unit)) STORED,
  
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_change_order_line_items_change_order_id 
  ON public.change_order_line_items(change_order_id);

-- RLS Policies for change_order_line_items
ALTER TABLE public.change_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/managers can manage change order line items"
  ON public.change_order_line_items
  FOR ALL
  USING (
    (NOT has_any_role(auth.uid())) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    (NOT has_any_role(auth.uid())) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "View change order line items based on role"
  ON public.change_order_line_items
  FOR SELECT
  USING (
    (NOT has_any_role(auth.uid())) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    EXISTS (
      SELECT 1 FROM change_orders co
      WHERE co.id = change_order_line_items.change_order_id
        AND can_access_project(auth.uid(), co.project_id)
    )
  );

-- Function to sync line items to change order totals
CREATE OR REPLACE FUNCTION public.sync_change_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  co_id uuid;
  total_cost_sum numeric;
  total_price_sum numeric;
BEGIN
  -- Get the change_order_id
  IF TG_OP = 'DELETE' THEN
    co_id := OLD.change_order_id;
  ELSE
    co_id := NEW.change_order_id;
  END IF;

  -- Calculate sums from line items
  SELECT 
    COALESCE(SUM(total_cost), 0),
    COALESCE(SUM(total_price), 0)
  INTO total_cost_sum, total_price_sum
  FROM change_order_line_items
  WHERE change_order_id = co_id;

  -- Update change_orders table
  UPDATE change_orders
  SET 
    cost_impact = total_cost_sum,
    client_amount = total_price_sum,
    margin_impact = total_price_sum - total_cost_sum,
    updated_at = now()
  WHERE id = co_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Trigger on line items table to sync totals
CREATE TRIGGER trigger_sync_change_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.change_order_line_items
FOR EACH ROW
EXECUTE FUNCTION sync_change_order_totals();

-- Function to auto-create expenses from approved change orders
CREATE OR REPLACE FUNCTION public.create_expenses_from_change_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Insert expenses for each line item
    INSERT INTO public.expenses (
      project_id,
      category,
      description,
      amount,
      expense_date,
      payee_id,
      transaction_type,
      is_planned,
      approval_status
    )
    SELECT 
      NEW.project_id,
      coli.category,
      'CO-' || NEW.change_order_number || ': ' || coli.description,
      coli.total_cost,
      COALESCE(NEW.approved_date, CURRENT_DATE),
      NULL, -- No payee assigned yet
      'check', -- Default transaction type
      true, -- Mark as planned expense
      'approved' -- Auto-approve since CO is approved
    FROM change_order_line_items coli
    WHERE coli.change_order_id = NEW.id
      AND coli.total_cost > 0; -- Only create expense if there's a cost
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger on change_orders table to create expenses
CREATE TRIGGER trigger_create_expenses_from_change_order
AFTER UPDATE ON public.change_orders
FOR EACH ROW
EXECUTE FUNCTION create_expenses_from_change_order();
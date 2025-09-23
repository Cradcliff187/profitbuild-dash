-- Create revenue/income tracking table
CREATE TABLE public.project_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  invoice_number TEXT,
  client_id UUID,
  amount DECIMAL(15,2) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  account_name TEXT,
  account_full_name TEXT,
  quickbooks_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_revenues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to project revenues" 
ON public.project_revenues 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_project_revenues_project_id ON public.project_revenues(project_id);
CREATE INDEX idx_project_revenues_client_id ON public.project_revenues(client_id);
CREATE INDEX idx_project_revenues_invoice_date ON public.project_revenues(invoice_date);

-- Create trigger for updated_at
CREATE TRIGGER update_project_revenues_updated_at
BEFORE UPDATE ON public.project_revenues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create enhanced expense categories enum if needed (checking current enum)
DO $$ 
BEGIN
  -- Add any missing expense categories
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'office_expenses' AND enumtypid = 'public.expense_category'::regtype) THEN
    ALTER TYPE public.expense_category ADD VALUE 'office_expenses';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'vehicle_expenses' AND enumtypid = 'public.expense_category'::regtype) THEN
    ALTER TYPE public.expense_category ADD VALUE 'vehicle_expenses';
  END IF;
EXCEPTION
  WHEN others THEN
    -- Ignore if enum doesn't exist or other errors
    NULL;
END $$;

-- Create line item correlation tracking
CREATE TABLE public.expense_line_item_correlations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  estimate_line_item_id UUID REFERENCES public.estimate_line_items(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  correlation_type TEXT NOT NULL CHECK (correlation_type IN ('estimated', 'quoted', 'unplanned', 'change_order')),
  confidence_score DECIMAL(5,2), -- 0-100 confidence in the correlation
  auto_correlated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_line_item_correlations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to expense correlations" 
ON public.expense_line_item_correlations 
FOR ALL 
USING (true);

-- Create indexes
CREATE INDEX idx_expense_correlations_expense_id ON public.expense_line_item_correlations(expense_id);
CREATE INDEX idx_expense_correlations_estimate_line_item_id ON public.expense_line_item_correlations(estimate_line_item_id);
CREATE INDEX idx_expense_correlations_quote_id ON public.expense_line_item_correlations(quote_id);

-- Create trigger for updated_at
CREATE TRIGGER update_expense_correlations_updated_at
BEFORE UPDATE ON public.expense_line_item_correlations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create project financial summary view for comprehensive reporting
CREATE OR REPLACE VIEW public.project_financial_summary AS
SELECT 
  p.id as project_id,
  p.project_name,
  p.project_number,
  p.client_name,
  p.status,
  
  -- Estimate totals
  COALESCE(est.total_estimated, 0) as total_estimated,
  COALESCE(est.contingency_amount, 0) as contingency_amount,
  
  -- Revenue totals
  COALESCE(rev.total_invoiced, 0) as total_invoiced,
  COALESCE(rev.invoice_count, 0) as invoice_count,
  
  -- Expense totals
  COALESCE(exp.total_expenses, 0) as total_expenses,
  COALESCE(exp.expense_count, 0) as expense_count,
  
  -- Quote totals (accepted quotes)
  COALESCE(quotes.total_quoted, 0) as total_quoted,
  COALESCE(quotes.quote_count, 0) as accepted_quote_count,
  
  -- Change order impact
  COALESCE(co.client_amount, 0) as change_order_revenue,
  COALESCE(co.cost_impact, 0) as change_order_costs,
  
  -- Calculated margins
  (COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) - 
  (COALESCE(exp.total_expenses, 0) + COALESCE(co.cost_impact, 0)) as actual_profit,
  
  CASE 
    WHEN (COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) > 0 
    THEN ((COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) - 
          (COALESCE(exp.total_expenses, 0) + COALESCE(co.cost_impact, 0))) / 
         (COALESCE(rev.total_invoiced, 0) + COALESCE(co.client_amount, 0)) * 100
    ELSE 0 
  END as actual_margin_percentage,
  
  -- Variance calculations
  COALESCE(est.total_estimated, 0) - (COALESCE(exp.total_expenses, 0) + COALESCE(co.cost_impact, 0)) as cost_variance,
  COALESCE(est.total_estimated, 0) - COALESCE(rev.total_invoiced, 0) as revenue_variance

FROM public.projects p

-- Estimate data
LEFT JOIN (
  SELECT 
    e.project_id,
    SUM(e.total_amount) as total_estimated,
    SUM(e.contingency_amount) as contingency_amount
  FROM public.estimates e
  WHERE e.status = 'approved' AND e.is_current_version = true
  GROUP BY e.project_id
) est ON p.id = est.project_id

-- Revenue data
LEFT JOIN (
  SELECT 
    r.project_id,
    SUM(r.amount) as total_invoiced,
    COUNT(*) as invoice_count
  FROM public.project_revenues r
  GROUP BY r.project_id
) rev ON p.id = rev.project_id

-- Expense data
LEFT JOIN (
  SELECT 
    e.project_id,
    SUM(e.amount) as total_expenses,
    COUNT(*) as expense_count
  FROM public.expenses e
  GROUP BY e.project_id
) exp ON p.id = exp.project_id

-- Quote data (accepted quotes)
LEFT JOIN (
  SELECT 
    q.project_id,
    SUM(q.total_amount) as total_quoted,
    COUNT(*) as quote_count
  FROM public.quotes q
  WHERE q.status = 'accepted'
  GROUP BY q.project_id
) quotes ON p.id = quotes.project_id

-- Change order data (approved only)
LEFT JOIN (
  SELECT 
    co.project_id,
    SUM(co.client_amount) as client_amount,
    SUM(co.cost_impact) as cost_impact
  FROM public.change_orders co
  WHERE co.status = 'approved'
  GROUP BY co.project_id
) co ON p.id = co.project_id;
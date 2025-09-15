-- Create enum types
CREATE TYPE project_type AS ENUM ('construction_project', 'work_order');
CREATE TYPE project_status AS ENUM ('estimating', 'quoted', 'in_progress', 'complete', 'cancelled');
CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');
CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE expense_category AS ENUM ('labor_internal', 'subcontractors', 'materials', 'equipment', 'other');
CREATE TYPE transaction_type AS ENUM ('expense', 'bill', 'check', 'credit_card', 'cash');
CREATE TYPE sync_type AS ENUM ('import', 'export');
CREATE TYPE sync_status AS ENUM ('success', 'failed', 'pending');

-- Create updated_at function for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. COMPANIES table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    quickbooks_company_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. VENDORS table
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone_numbers TEXT,
    billing_address TEXT,
    account_number TEXT,
    quickbooks_vendor_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PROJECTS table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_number TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    project_type project_type DEFAULT 'construction_project',
    status project_status DEFAULT 'estimating',
    start_date DATE,
    end_date DATE,
    address TEXT,
    quickbooks_job_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_project_number_format CHECK (project_number ~ '^[A-Za-z0-9]+-[A-Za-z0-9]+$')
);

-- 4. ESTIMATES table
CREATE TABLE public.estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    estimate_number TEXT UNIQUE NOT NULL,
    revision_number INTEGER DEFAULT 1,
    date_created DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status estimate_status DEFAULT 'draft',
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ESTIMATE_LINE_ITEMS table
CREATE TABLE public.estimate_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit TEXT,
    rate DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    sort_order INTEGER DEFAULT 0,
    quickbooks_item_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. QUOTES table
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    quote_number TEXT UNIQUE NOT NULL,
    date_received DATE DEFAULT CURRENT_DATE,
    date_expires DATE,
    status quote_status DEFAULT 'pending',
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. QUOTE_LINE_ITEMS table
CREATE TABLE public.quote_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    estimate_line_item_id UUID REFERENCES public.estimate_line_items(id),
    category expense_category NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit TEXT,
    rate DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. EXPENSES table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id),
    transaction_type transaction_type NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    category expense_category NOT NULL,
    account_name TEXT,
    account_full_name TEXT,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    invoice_number TEXT,
    is_planned BOOLEAN DEFAULT false,
    quickbooks_transaction_id TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. QUICKBOOKS_SYNC_LOG table
CREATE TABLE public.quickbooks_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type sync_type NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    quickbooks_id TEXT,
    status sync_status DEFAULT 'pending',
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_vendors_company_id ON public.vendors(company_id);
CREATE INDEX idx_vendors_quickbooks_id ON public.vendors(quickbooks_vendor_id);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_number ON public.projects(project_number);
CREATE INDEX idx_projects_quickbooks_id ON public.projects(quickbooks_job_id);
CREATE INDEX idx_estimates_project_id ON public.estimates(project_id);
CREATE INDEX idx_estimates_number ON public.estimates(estimate_number);
CREATE INDEX idx_estimate_line_items_estimate_id ON public.estimate_line_items(estimate_id);
CREATE INDEX idx_quotes_project_id ON public.quotes(project_id);
CREATE INDEX idx_quotes_estimate_id ON public.quotes(estimate_id);
CREATE INDEX idx_quotes_vendor_id ON public.quotes(vendor_id);
CREATE INDEX idx_quotes_number ON public.quotes(quote_number);
CREATE INDEX idx_quote_line_items_quote_id ON public.quote_line_items(quote_id);
CREATE INDEX idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX idx_expenses_vendor_id ON public.expenses(vendor_id);
CREATE INDEX idx_expenses_quickbooks_id ON public.expenses(quickbooks_transaction_id);
CREATE INDEX idx_sync_log_entity ON public.quickbooks_sync_log(entity_type, entity_id);
CREATE INDEX idx_sync_log_quickbooks_id ON public.quickbooks_sync_log(quickbooks_id);

-- Create updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_sync_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
  -- This would typically link to a user_profiles table
  -- For now, return the first company (modify based on your user-company relationship)
  RETURN (SELECT id FROM public.companies LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies based on company_id
CREATE POLICY "Users can access their company data" ON public.companies
  FOR ALL USING (id = public.get_user_company_id());

CREATE POLICY "Users can access vendors from their company" ON public.vendors
  FOR ALL USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can access projects from their company" ON public.projects
  FOR ALL USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can access estimates from their company projects" ON public.estimates
  FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company_id()));

CREATE POLICY "Users can access estimate line items from their company" ON public.estimate_line_items
  FOR ALL USING (estimate_id IN (
    SELECT e.id FROM public.estimates e 
    JOIN public.projects p ON e.project_id = p.id 
    WHERE p.company_id = public.get_user_company_id()
  ));

CREATE POLICY "Users can access quotes from their company projects" ON public.quotes
  FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company_id()));

CREATE POLICY "Users can access quote line items from their company" ON public.quote_line_items
  FOR ALL USING (quote_id IN (
    SELECT q.id FROM public.quotes q 
    JOIN public.projects p ON q.project_id = p.id 
    WHERE p.company_id = public.get_user_company_id()
  ));

CREATE POLICY "Users can access expenses from their company projects" ON public.expenses
  FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE company_id = public.get_user_company_id()));

CREATE POLICY "Users can access sync logs from their company" ON public.quickbooks_sync_log
  FOR ALL USING (true); -- Modify based on your sync log access requirements
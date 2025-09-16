-- 1. Create QuickBooks Account Mappings Table
CREATE TABLE public.quickbooks_account_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  app_category expense_category NOT NULL,
  qb_account_name TEXT NOT NULL,
  qb_account_full_path TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, app_category)
);

-- Enable RLS on account mappings
ALTER TABLE public.quickbooks_account_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy for company access
CREATE POLICY "Users can access their company account mappings" 
ON public.quickbooks_account_mappings 
FOR ALL 
USING (company_id = get_user_company_id());

-- Add trigger for timestamps
CREATE TRIGGER update_quickbooks_account_mappings_updated_at
BEFORE UPDATE ON public.quickbooks_account_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default mappings for existing expense categories
INSERT INTO public.quickbooks_account_mappings (company_id, app_category, qb_account_name, qb_account_full_path) 
SELECT 
  c.id,
  category::expense_category,
  CASE 
    WHEN category = 'labor' THEN 'Labor Costs'
    WHEN category = 'materials' THEN 'Materials & Supplies'
    WHEN category = 'equipment' THEN 'Equipment Rental'
    WHEN category = 'subcontractors' THEN 'Subcontractor Costs'
    WHEN category = 'other' THEN 'Other Project Expenses'
  END,
  CASE 
    WHEN category = 'labor' THEN 'Expenses:Job Expenses:Labor Costs'
    WHEN category = 'materials' THEN 'Expenses:Job Expenses:Materials & Supplies'
    WHEN category = 'equipment' THEN 'Expenses:Job Expenses:Equipment Rental'
    WHEN category = 'subcontractors' THEN 'Expenses:Job Expenses:Subcontractor Costs'
    WHEN category = 'other' THEN 'Expenses:Job Expenses:Other Project Expenses'
  END
FROM companies c
CROSS JOIN (
  VALUES ('labor'), ('materials'), ('equipment'), ('subcontractors'), ('other')
) AS categories(category);

-- 2. Add QB formatted number to projects
ALTER TABLE public.projects 
ADD COLUMN qb_formatted_number TEXT 
GENERATED ALWAYS AS (
  CASE 
    WHEN project_number ~ '^[A-Z]{3}-[0-9]{3}$' THEN project_number
    WHEN project_number ~ '^[A-Z]{3}[0-9]{3}$' THEN 
      SUBSTRING(project_number, 1, 3) || '-' || SUBSTRING(project_number, 4, 3)
    ELSE project_number
  END
) STORED;

-- 3. Add terms to vendors
ALTER TABLE public.vendors 
ADD COLUMN terms TEXT DEFAULT 'Net 30';

-- 4. Add job_type to projects
ALTER TABLE public.projects 
ADD COLUMN job_type TEXT;
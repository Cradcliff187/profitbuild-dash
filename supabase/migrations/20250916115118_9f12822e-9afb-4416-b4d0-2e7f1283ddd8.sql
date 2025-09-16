-- Fix the default mappings to use correct expense category enum values
DELETE FROM public.quickbooks_account_mappings;

-- Insert correct default mappings
INSERT INTO public.quickbooks_account_mappings (company_id, app_category, qb_account_name, qb_account_full_path) 
SELECT 
  c.id,
  category::expense_category,
  CASE 
    WHEN category = 'labor_internal' THEN 'Labor (Internal)'
    WHEN category = 'materials' THEN 'Materials & Supplies'
    WHEN category = 'equipment' THEN 'Equipment Rental'
    WHEN category = 'subcontractors' THEN 'Subcontractor Costs'
    WHEN category = 'other' THEN 'Other Project Expenses'
  END,
  CASE 
    WHEN category = 'labor_internal' THEN 'Expenses:Job Expenses:Labor (Internal)'
    WHEN category = 'materials' THEN 'Expenses:Job Expenses:Materials & Supplies'
    WHEN category = 'equipment' THEN 'Expenses:Job Expenses:Equipment Rental'
    WHEN category = 'subcontractors' THEN 'Expenses:Job Expenses:Subcontractor Costs'
    WHEN category = 'other' THEN 'Expenses:Job Expenses:Other Project Expenses'
  END
FROM companies c
CROSS JOIN (
  VALUES ('labor_internal'), ('materials'), ('equipment'), ('subcontractors'), ('other')
) AS categories(category);
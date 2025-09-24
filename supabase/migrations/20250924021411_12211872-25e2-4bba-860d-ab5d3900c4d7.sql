ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS adjusted_est_costs DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_est_costs DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN public.projects.adjusted_est_costs IS 'Total estimated costs using accepted quotes where available, plus internal labor and change order costs';
COMMENT ON COLUMN public.projects.original_est_costs IS 'Original total cost from approved estimate line items';
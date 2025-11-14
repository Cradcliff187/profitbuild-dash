-- Add project creation fields to branch_bids table
ALTER TABLE public.branch_bids
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS project_type TEXT CHECK (project_type IN ('construction_project', 'work_order')),
ADD COLUMN IF NOT EXISTS job_type TEXT;

-- Add index for client_id for searching
CREATE INDEX IF NOT EXISTS idx_branch_bids_client_id ON public.branch_bids(client_id);

-- Add comment
COMMENT ON COLUMN public.branch_bids.client_id IS 'Foreign key to clients table for future project creation';
COMMENT ON COLUMN public.branch_bids.address IS 'Project address for future project creation';
COMMENT ON COLUMN public.branch_bids.project_type IS 'Project type: construction_project or work_order';
COMMENT ON COLUMN public.branch_bids.job_type IS 'Optional job type classification';


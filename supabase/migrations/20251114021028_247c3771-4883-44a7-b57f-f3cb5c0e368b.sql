-- Add missing columns to branch_bids table
ALTER TABLE branch_bids
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS project_type TEXT CHECK (project_type IN ('construction_project', 'work_order')),
ADD COLUMN IF NOT EXISTS job_type TEXT;

-- Add index for client_id for better query performance
CREATE INDEX IF NOT EXISTS idx_branch_bids_client_id ON branch_bids(client_id);
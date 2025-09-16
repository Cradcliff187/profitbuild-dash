-- First, add project_id column to quotes table if it doesn't exist
DO $$ 
BEGIN
    -- Add project_id column to quotes table (will reference projects)
    IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_name='quotes' AND column_name='project_id') THEN
        ALTER TABLE quotes ADD COLUMN project_id uuid;
    END IF;
END $$;

-- Update existing quotes to link to projects via estimates
UPDATE quotes 
SET project_id = e.project_id 
FROM estimates e 
WHERE quotes.estimate_id = e.id 
AND quotes.project_id IS NULL;

-- Create projects for any estimates that don't have associated projects
INSERT INTO projects (
    id, 
    project_name, 
    client_name, 
    project_number, 
    project_type, 
    status, 
    company_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    COALESCE(e.project_name, 'Project for ' || e.estimate_number),
    COALESCE(e.client_name, 'Unknown Client'),
    'EST-' || e.estimate_number,
    'construction_project'::project_type,
    CASE 
        WHEN e.status = 'draft' THEN 'estimating'::project_status
        WHEN e.status = 'sent' THEN 'quoted'::project_status  
        WHEN e.status = 'approved' THEN 'approved'::project_status
        ELSE 'estimating'::project_status
    END,
    get_user_company_id(),
    e.created_at,
    e.updated_at
FROM estimates e
WHERE NOT EXISTS (
    SELECT 1 FROM projects p WHERE p.id = e.project_id
)
AND e.project_id IS NOT NULL;

-- For estimates without any project_id, create new projects and link them
DO $$
DECLARE
    estimate_record RECORD;
    new_project_id UUID;
BEGIN
    FOR estimate_record IN 
        SELECT * FROM estimates WHERE project_id IS NULL
    LOOP
        new_project_id := gen_random_uuid();
        
        -- Create new project
        INSERT INTO projects (
            id,
            project_name,
            client_name, 
            project_number,
            project_type,
            status,
            company_id,
            created_at,
            updated_at
        ) VALUES (
            new_project_id,
            COALESCE(estimate_record.project_name, 'Project for ' || estimate_record.estimate_number),
            COALESCE(estimate_record.client_name, 'Unknown Client'),
            'EST-' || estimate_record.estimate_number,
            'construction_project',
            CASE 
                WHEN estimate_record.status = 'draft' THEN 'estimating'::project_status
                WHEN estimate_record.status = 'sent' THEN 'quoted'::project_status
                WHEN estimate_record.status = 'approved' THEN 'approved'::project_status
                ELSE 'estimating'::project_status
            END,
            get_user_company_id(),
            estimate_record.created_at,
            estimate_record.updated_at
        );
        
        -- Link estimate to new project
        UPDATE estimates SET project_id = new_project_id WHERE id = estimate_record.id;
        
        -- Update any quotes that reference this estimate
        UPDATE quotes SET project_id = new_project_id WHERE estimate_id = estimate_record.id;
    END LOOP;
END $$;

-- Ensure all quotes have project_id populated
UPDATE quotes 
SET project_id = e.project_id 
FROM estimates e 
WHERE quotes.estimate_id = e.id 
AND quotes.project_id IS NULL;

-- Make project_id NOT NULL after data migration
ALTER TABLE quotes ALTER COLUMN project_id SET NOT NULL;
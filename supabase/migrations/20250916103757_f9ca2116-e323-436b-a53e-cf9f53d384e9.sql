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
    'Project for ' || e.estimate_number,
    'Unknown Client',
    'EST-' || e.estimate_number,
    'construction_project'::project_type,
    'estimating'::project_status,
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
            'Project for ' || estimate_record.estimate_number,
            'Unknown Client',
            'EST-' || estimate_record.estimate_number,
            'construction_project',
            'estimating',
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
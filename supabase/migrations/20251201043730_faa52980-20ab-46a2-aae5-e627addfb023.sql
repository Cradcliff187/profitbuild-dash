-- Add missing foreign key constraints for project_revenues only
-- revenue_splits FK constraints already exist from previous migration

-- Check and add FK: project_revenues.project_id -> projects.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_revenues_project_id_fkey'
  ) THEN
    ALTER TABLE public.project_revenues
    ADD CONSTRAINT project_revenues_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Check and add FK: project_revenues.client_id -> clients.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_revenues_client_id_fkey'
  ) THEN
    ALTER TABLE public.project_revenues
    ADD CONSTRAINT project_revenues_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES public.clients(id) 
    ON DELETE SET NULL;
  END IF;
END $$;
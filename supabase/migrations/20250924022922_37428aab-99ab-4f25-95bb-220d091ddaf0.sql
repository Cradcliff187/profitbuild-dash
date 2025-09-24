-- Populate cost and margin data for all existing projects
-- This executes the calculate_project_margins function for every project
DO $$
DECLARE
    project_record RECORD;
BEGIN
    -- Loop through all projects and calculate their margins
    FOR project_record IN SELECT id FROM public.projects LOOP
        PERFORM public.calculate_project_margins(project_record.id);
    END LOOP;
    
    RAISE NOTICE 'Successfully calculated margins for all projects';
END $$;
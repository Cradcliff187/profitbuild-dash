-- Update SYS-000 project name to be more user-friendly
UPDATE projects
SET 
  project_name = 'Multiple Projects',
  updated_at = NOW()
WHERE project_number = 'SYS-000';
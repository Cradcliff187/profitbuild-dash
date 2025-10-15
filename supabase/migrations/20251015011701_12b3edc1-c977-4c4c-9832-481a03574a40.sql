-- Create system project for unassigned receipts if it doesn't exist
INSERT INTO public.projects (
  project_number,
  project_name,
  client_name,
  project_type,
  status,
  sequence_number
)
SELECT 
  'SYS-000',
  'Unassigned Receipts',
  'System',
  'work_order',
  'in_progress',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects WHERE project_number = 'SYS-000'
);
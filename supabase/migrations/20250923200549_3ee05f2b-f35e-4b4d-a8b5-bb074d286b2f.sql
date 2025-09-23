-- Create default "Unassigned" client and project for import transactions without project assignments

-- First, create the unassigned client (using 'residential' as it's a valid type)
INSERT INTO public.clients (
  id,
  client_name,
  company_name,
  client_type,
  email,
  phone,
  billing_address,
  notes,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Unassigned',
  'Unassigned Client',
  'residential',
  'unassigned@system.com',
  'N/A',
  'System Default Address',
  'Default client for unassigned transactions during import',
  true
) ON CONFLICT (id) DO NOTHING;

-- Then create the unassigned project
INSERT INTO public.projects (
  id,
  project_number,
  project_name,
  client_name,
  client_id,
  project_type,
  status,
  job_type,
  address,
  payment_terms,
  minimum_margin_threshold,
  target_margin,
  sequence_number
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '000-UNASSIGNED',
  'Unassigned Transactions',
  'Unassigned',
  '00000000-0000-0000-0000-000000000001',
  'construction_project',
  'in_progress',
  'Administrative',
  'System Default',
  'Net 30',
  0.0,
  0.0,
  0
) ON CONFLICT (id) DO NOTHING;
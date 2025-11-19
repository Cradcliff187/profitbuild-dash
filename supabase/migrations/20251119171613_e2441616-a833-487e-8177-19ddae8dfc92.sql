-- Create placeholder project for gas-related work
-- This is an operational project visible only in time tracking & expenses

INSERT INTO public.projects (
  id,
  project_number,
  project_name,
  client_name,
  project_type,
  status,
  job_type,
  address,
  payment_terms,
  minimum_margin_threshold,
  target_margin,
  sequence_number,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',  -- Fixed UUID for gas project
  '001-GAS',
  'Gas Division Work',
  'Gas Division',
  'work_order',
  'in_progress',
  'Maintenance',
  'Various Locations',
  'Net 30',
  0.0,
  0.0,
  1,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
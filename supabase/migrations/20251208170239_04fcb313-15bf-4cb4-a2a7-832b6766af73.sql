-- ============================================================================
-- Migration: Add PTO Overhead Projects (Sick, Vacation, Holiday)
-- Purpose: Create overhead projects for employee PTO tracking in time tracker
-- ============================================================================

-- Insert Sick Time project
INSERT INTO public.projects (
  id,
  project_number,
  project_name,
  client_name,
  project_type,
  status,
  job_type,
  category,
  address,
  payment_terms,
  minimum_margin_threshold,
  target_margin,
  sequence_number,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000008',
  '006-SICK',
  'Sick Time',
  'Overhead',
  'work_order',
  'in_progress',
  'PTO',
  'overhead',
  'Paid Time Off',
  'N/A',
  0.0,
  0.0,
  6,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE SET 
  category = 'overhead',
  project_name = 'Sick Time',
  job_type = 'PTO',
  updated_at = NOW();

-- Insert Vacation Time project
INSERT INTO public.projects (
  id,
  project_number,
  project_name,
  client_name,
  project_type,
  status,
  job_type,
  category,
  address,
  payment_terms,
  minimum_margin_threshold,
  target_margin,
  sequence_number,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000009',
  '007-VAC',
  'Vacation Time',
  'Overhead',
  'work_order',
  'in_progress',
  'PTO',
  'overhead',
  'Paid Time Off',
  'N/A',
  0.0,
  0.0,
  7,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE SET 
  category = 'overhead',
  project_name = 'Vacation Time',
  job_type = 'PTO',
  updated_at = NOW();

-- Insert Holiday Time project
INSERT INTO public.projects (
  id,
  project_number,
  project_name,
  client_name,
  project_type,
  status,
  job_type,
  category,
  address,
  payment_terms,
  minimum_margin_threshold,
  target_margin,
  sequence_number,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-00000000000a',
  '008-HOL',
  'Holiday Time',
  'Overhead',
  'work_order',
  'in_progress',
  'PTO',
  'overhead',
  'Paid Time Off',
  'N/A',
  0.0,
  0.0,
  8,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE SET 
  category = 'overhead',
  project_name = 'Holiday Time',
  job_type = 'PTO',
  updated_at = NOW();
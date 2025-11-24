-- ============================================================================
-- Migration: Add Overhead Projects (Auto Maintenance, Tools, Meals)
-- Purpose: Create 003-AM, 004-TOOL, and 005-MEAL projects for overhead expense tracking
-- 
-- IMPORTANT: Run this AFTER 001_add_project_category.sql
-- ============================================================================

-- ============================================================================
-- Project 1: 003-AM (Auto Maintenance)
-- ============================================================================
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
  '00000000-0000-0000-0000-000000000005',  -- Fixed UUID for AM project
  '003-AM',
  'Auto Maintenance',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',  -- Key: This category controls all filtering behavior
  'Various Locations',
  'N/A',
  0.0,
  0.0,
  3,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  category = 'overhead',
  project_name = 'Auto Maintenance',
  updated_at = NOW();

-- Handle case where project_number already exists with different UUID
INSERT INTO public.projects (
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
  '003-AM',
  'Auto Maintenance',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',
  'Various Locations',
  'N/A',
  0.0,
  0.0,
  3,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE
SET 
  category = 'overhead',
  updated_at = NOW();

-- ============================================================================
-- Project 2: 004-TOOL (Tools)
-- ============================================================================
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
  '00000000-0000-0000-0000-000000000006',  -- Fixed UUID for TOOL project
  '004-TOOL',
  'Tools',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',  -- Key: This category controls all filtering behavior
  'Various Locations',
  'N/A',
  0.0,
  0.0,
  4,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  category = 'overhead',
  project_name = 'Tools',
  updated_at = NOW();

-- Handle case where project_number already exists with different UUID
INSERT INTO public.projects (
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
  '004-TOOL',
  'Tools',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',
  'Various Locations',
  'N/A',
  0.0,
  0.0,
  4,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE
SET 
  category = 'overhead',
  updated_at = NOW();

-- ============================================================================
-- Project 3: 005-MEAL (Meals)
-- ============================================================================
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
  '00000000-0000-0000-0000-000000000007',  -- Fixed UUID for MEAL project
  '005-MEAL',
  'Meals & Entertainment',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',  -- Key: This category controls all filtering behavior
  'Various Locations',
  'N/A',
  0.0,
  0.0,
  5,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  category = 'overhead',
  project_name = 'Meals & Entertainment',
  updated_at = NOW();

-- Handle case where project_number already exists with different UUID
INSERT INTO public.projects (
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
  '005-MEAL',
  'Meals & Entertainment',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',
  'Various Locations',
  'N/A',
  0.0,
  0.0,
  5,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE
SET 
  category = 'overhead',
  updated_at = NOW();

-- ============================================================================
-- Verification - Check all overhead projects
-- ============================================================================
-- SELECT project_number, project_name, category, status
-- FROM projects 
-- WHERE category = 'overhead'
-- ORDER BY sequence_number;


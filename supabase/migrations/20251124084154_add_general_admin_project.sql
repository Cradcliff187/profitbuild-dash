-- ============================================================================
-- Migration: Add General & Administrative Overhead Project
-- Purpose: Create 002-GA project for general admin expenses
-- 
-- IMPORTANT: Run this AFTER 001_add_project_category.sql
-- ============================================================================

-- Insert new overhead project with fixed UUID
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
  '00000000-0000-0000-0000-000000000004',  -- Fixed UUID for GA project
  '002-GA',
  'General & Administrative',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',  -- Key: This category controls all filtering behavior
  'Office/Administrative',
  'N/A',
  0.0,
  0.0,
  2,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  category = 'overhead',
  project_name = 'General & Administrative',
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
  '002-GA',
  'General & Administrative',
  'Overhead',
  'work_order',
  'in_progress',
  'Administrative',
  'overhead',
  'Office/Administrative',
  'N/A',
  0.0,
  0.0,
  2,
  NOW(),
  NOW()
) ON CONFLICT (project_number) DO UPDATE
SET 
  category = 'overhead',
  updated_at = NOW();



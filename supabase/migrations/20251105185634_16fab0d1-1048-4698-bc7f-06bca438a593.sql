-- Create test project 124-067 UC Montgomery Exam Room
INSERT INTO projects (
  project_number,
  project_name,
  client_name,
  status,
  project_type,
  sequence_number,
  minimum_margin_threshold,
  target_margin,
  payment_terms,
  job_type,
  created_at,
  updated_at
) VALUES (
  '124-067',
  'UC Montgomery Exam Room',
  'Test Client - UC Health',
  'estimating',
  'construction_project',
  67,
  10.0,
  20.0,
  'Net 30',
  'Healthcare',
  now(),
  now()
);
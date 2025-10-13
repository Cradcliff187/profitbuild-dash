-- Create internal labor payees for quick time entry
INSERT INTO payees (payee_name, payee_type, is_internal, provides_labor, hourly_rate, is_active) 
VALUES
  ('Internal Labor - General', 'internal_labor', true, true, 75.00, true),
  ('Project Manager', 'internal_labor', true, true, 85.00, true),
  ('Carpentry Crew', 'internal_labor', true, true, 70.00, true),
  ('Framing Crew', 'internal_labor', true, true, 70.00, true),
  ('Finishing Crew', 'internal_labor', true, true, 65.00, true)
ON CONFLICT (id) DO NOTHING;
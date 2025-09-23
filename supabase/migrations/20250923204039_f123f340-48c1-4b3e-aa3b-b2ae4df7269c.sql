-- Update project number from 803-332 to 124-144
UPDATE public.projects 
SET 
  project_number = '124-144',
  sequence_number = 144,
  updated_at = NOW()
WHERE id = 'adc56b2a-1fb3-45f4-8b74-b1157b17e3c4';
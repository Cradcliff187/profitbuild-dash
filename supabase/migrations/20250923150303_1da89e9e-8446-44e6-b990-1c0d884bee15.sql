-- Update contingency remaining for all projects using corrected calculation
UPDATE public.projects 
SET contingency_remaining = public.calculate_contingency_remaining(id);
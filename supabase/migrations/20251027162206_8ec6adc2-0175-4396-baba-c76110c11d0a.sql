-- Update default markup percentage from 15% to 25%
ALTER TABLE public.estimates 
ALTER COLUMN default_markup_percent SET DEFAULT 25.0;

-- Optionally update existing draft estimates to use the new default
-- (only affects drafts, preserves approved/sent estimates)
UPDATE public.estimates 
SET default_markup_percent = 25.0
WHERE status = 'draft' 
  AND default_markup_percent = 15.0;
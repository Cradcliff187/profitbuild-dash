-- Add is_draft column to estimates table
ALTER TABLE public.estimates 
ADD COLUMN is_draft boolean NOT NULL DEFAULT false;

-- Add index for better performance when filtering drafts
CREATE INDEX idx_estimates_is_draft ON public.estimates(is_draft);

-- Update existing estimates where status = 'draft' to set is_draft = true
UPDATE public.estimates 
SET is_draft = true 
WHERE status = 'draft';
-- Add quote detail fields to quotes table
ALTER TABLE public.quotes 
ADD COLUMN includes_materials boolean NOT NULL DEFAULT true,
ADD COLUMN includes_labor boolean NOT NULL DEFAULT true;
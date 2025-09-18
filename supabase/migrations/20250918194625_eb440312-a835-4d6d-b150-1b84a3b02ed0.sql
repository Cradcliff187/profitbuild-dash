-- Add payment_terms column to projects table
ALTER TABLE public.projects 
ADD COLUMN payment_terms TEXT DEFAULT 'Net 30';
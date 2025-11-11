-- Add customer_po_number field to projects table
ALTER TABLE public.projects 
ADD COLUMN customer_po_number TEXT NULL;

COMMENT ON COLUMN public.projects.customer_po_number IS 'Customer purchase order number for tracking and billing purposes';
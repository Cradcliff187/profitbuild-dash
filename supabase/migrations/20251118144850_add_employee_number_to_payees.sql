-- Add employee_number column to payees table
-- This is an optional field for internal labor employees for identification purposes

ALTER TABLE public.payees 
ADD COLUMN employee_number TEXT;

-- Add index for faster lookups
CREATE INDEX idx_payees_employee_number ON public.payees(employee_number) 
WHERE employee_number IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.payees.employee_number IS 'Optional employee number for internal labor employees';


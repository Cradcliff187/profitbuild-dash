-- Rename vendor_name column to payee_name in payees table
ALTER TABLE public.payees RENAME COLUMN vendor_name TO payee_name;
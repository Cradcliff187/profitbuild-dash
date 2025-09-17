-- Add payee type fields to the payees table
ALTER TABLE public.payees 
ADD COLUMN payee_type text DEFAULT 'subcontractor',
ADD COLUMN provides_labor boolean DEFAULT false,
ADD COLUMN provides_materials boolean DEFAULT false,
ADD COLUMN requires_1099 boolean DEFAULT false,
ADD COLUMN is_internal boolean DEFAULT false;
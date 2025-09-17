-- Migration: Rename vendors table to payees
-- This better represents that payees can be subcontractors, suppliers, or internal

-- Phase 1: Create the new payees table with identical structure to vendors
CREATE TABLE public.payees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL,
    email TEXT,
    phone_numbers TEXT,
    billing_address TEXT,
    full_name TEXT,
    account_number TEXT,
    terms TEXT DEFAULT 'Net 30',
    is_active BOOLEAN DEFAULT true,
    quickbooks_vendor_id TEXT,
    sync_status sync_status DEFAULT NULL,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payees table
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for payees (same as vendors)
CREATE POLICY "Allow all access to payees" ON payees FOR ALL USING (true);

-- Copy all data from vendors to payees
INSERT INTO public.payees SELECT * FROM public.vendors;

-- Phase 2: Update foreign key columns in related tables
-- Update expenses table
ALTER TABLE expenses RENAME COLUMN vendor_id TO payee_id;

-- Update quotes table  
ALTER TABLE quotes RENAME COLUMN vendor_id TO payee_id;

-- Phase 3: Add foreign key constraints to new payee_id columns
ALTER TABLE expenses ADD CONSTRAINT expenses_payee_id_fkey 
    FOREIGN KEY (payee_id) REFERENCES public.payees(id);

ALTER TABLE quotes ADD CONSTRAINT quotes_payee_id_fkey 
    FOREIGN KEY (payee_id) REFERENCES public.payees(id);

-- Phase 4: Create indexes on new payee_id columns for performance
CREATE INDEX idx_expenses_payee_id ON expenses(payee_id);
CREATE INDEX idx_quotes_payee_id ON quotes(payee_id);

-- Phase 5: Create updated timestamp trigger for payees
CREATE TRIGGER update_payees_updated_at
    BEFORE UPDATE ON public.payees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 6: Drop the old vendors table (this will cascade and remove old constraints)
DROP TABLE public.vendors CASCADE;
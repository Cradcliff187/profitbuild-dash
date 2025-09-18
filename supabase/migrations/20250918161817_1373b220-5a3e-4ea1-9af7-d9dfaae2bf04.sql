-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  mailing_address TEXT,
  client_type TEXT CHECK (client_type IN ('residential', 'commercial', 'government', 'nonprofit')) DEFAULT 'residential',
  payment_terms TEXT DEFAULT 'Net 30',
  tax_exempt BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  quickbooks_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for clients
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true);

-- Add client_id to projects table
ALTER TABLE public.projects ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Create index on client_id for better performance
CREATE INDEX idx_projects_client_id ON public.projects(client_id);

-- Migrate existing client names to clients table and update projects
WITH unique_clients AS (
  SELECT DISTINCT client_name 
  FROM public.projects 
  WHERE client_name IS NOT NULL AND client_name != ''
),
inserted_clients AS (
  INSERT INTO public.clients (client_name)
  SELECT client_name FROM unique_clients
  RETURNING id, client_name
)
UPDATE public.projects 
SET client_id = ic.id
FROM inserted_clients ic
WHERE projects.client_name = ic.client_name;

-- Add trigger for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
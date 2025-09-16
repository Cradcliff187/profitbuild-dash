-- Create change order status enum
CREATE TYPE public.change_order_status AS ENUM ('pending', 'approved', 'rejected');

-- Create change_orders table
CREATE TABLE public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_order_number text NOT NULL,
  description text NOT NULL,
  reason_for_change text,
  amount numeric DEFAULT 0,
  status change_order_status DEFAULT 'pending',
  requested_date date DEFAULT CURRENT_DATE,
  approved_date date,
  approved_by uuid, -- References auth.users but stored as uuid only
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_change_orders_project_id ON public.change_orders(project_id);
CREATE INDEX idx_change_orders_status ON public.change_orders(status);
CREATE INDEX idx_change_orders_requested_date ON public.change_orders(requested_date);
CREATE INDEX idx_change_orders_approved_by ON public.change_orders(approved_by);

-- Add unique constraint for change order numbers per project
CREATE UNIQUE INDEX idx_change_orders_number_project ON public.change_orders(project_id, change_order_number);

-- Enable Row Level Security
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can access change orders from their company projects"
ON public.change_orders
FOR ALL
USING (project_id IN (
  SELECT id FROM projects 
  WHERE company_id = get_user_company_id()
));

-- Add trigger for automatic updated_at timestamp updates
CREATE TRIGGER update_change_orders_updated_at
BEFORE UPDATE ON public.change_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create validation function for change order constraints
CREATE OR REPLACE FUNCTION public.validate_change_order_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is approved, ensure approved_date and approved_by are set
  IF NEW.status = 'approved' AND (NEW.approved_date IS NULL OR NEW.approved_by IS NULL) THEN
    RAISE EXCEPTION 'Approved change orders must have approved_date and approved_by set';
  END IF;
  
  -- If status is not approved, clear approved_date and approved_by
  IF NEW.status != 'approved' THEN
    NEW.approved_date := NULL;
    NEW.approved_by := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add validation trigger
CREATE TRIGGER validate_change_order_approval_trigger
BEFORE INSERT OR UPDATE ON public.change_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_change_order_approval();
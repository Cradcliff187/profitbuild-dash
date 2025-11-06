-- Phase 1: Database Foundation for Expense Splits

-- 1. Create expense_splits table
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  split_amount NUMERIC(15,2) NOT NULL CHECK (split_amount > 0),
  split_percentage NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  CONSTRAINT valid_split_percentage CHECK (
    split_percentage IS NULL OR 
    (split_percentage >= 0 AND split_percentage <= 100)
  )
);

-- Add indexes for performance
CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_project_id ON public.expense_splits(project_id);
CREATE INDEX idx_expense_splits_created_at ON public.expense_splits(created_at DESC);

-- 2. Add expense_split_id column to expense_line_item_correlations
ALTER TABLE public.expense_line_item_correlations
ADD COLUMN expense_split_id UUID REFERENCES public.expense_splits(id) ON DELETE CASCADE;

-- Add index for expense_split_id
CREATE INDEX idx_correlations_split_id ON public.expense_line_item_correlations(expense_split_id);

-- Add check constraint: must reference either expense_id OR expense_split_id (not both)
ALTER TABLE public.expense_line_item_correlations
ADD CONSTRAINT check_expense_or_split CHECK (
  (expense_id IS NOT NULL AND expense_split_id IS NULL) OR
  (expense_id IS NULL AND expense_split_id IS NOT NULL)
);

-- 3. Add is_split flag to expenses table
ALTER TABLE public.expenses
ADD COLUMN is_split BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for filtering split expenses
CREATE INDEX idx_expenses_is_split ON public.expenses(is_split);

-- 4. Create validation trigger to ensure splits don't exceed expense amount
CREATE OR REPLACE FUNCTION public.validate_expense_splits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expense_amount NUMERIC;
  total_splits NUMERIC;
BEGIN
  -- Get original expense amount
  SELECT amount INTO expense_amount
  FROM public.expenses
  WHERE id = NEW.expense_id;
  
  -- Calculate total of all splits for this expense
  SELECT COALESCE(SUM(split_amount), 0) INTO total_splits
  FROM public.expense_splits
  WHERE expense_id = NEW.expense_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);
  
  -- Add current split amount
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    total_splits := total_splits + NEW.split_amount;
  END IF;
  
  -- Validate total doesn't exceed expense amount (allow 0.01 tolerance for rounding)
  IF total_splits > expense_amount + 0.01 THEN
    RAISE EXCEPTION 'Total split amounts ($%) cannot exceed expense amount ($%)', 
      total_splits, expense_amount;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_expense_splits
BEFORE INSERT OR UPDATE ON public.expense_splits
FOR EACH ROW
EXECUTE FUNCTION public.validate_expense_splits();

-- 5. Create trigger to auto-sync is_split flag on expenses table
CREATE OR REPLACE FUNCTION public.sync_expense_is_split()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Set is_split to TRUE when splits are created
    UPDATE public.expenses
    SET is_split = TRUE
    WHERE id = NEW.expense_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if any splits remain, if not set is_split to FALSE
    IF NOT EXISTS (
      SELECT 1 FROM public.expense_splits 
      WHERE expense_id = OLD.expense_id
    ) THEN
      UPDATE public.expenses
      SET is_split = FALSE
      WHERE id = OLD.expense_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_sync_expense_is_split
AFTER INSERT OR UPDATE OR DELETE ON public.expense_splits
FOR EACH ROW
EXECUTE FUNCTION public.sync_expense_is_split();

-- 6. Enable RLS on expense_splits table
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for expense_splits (mirror expenses table access)

-- Policy: Users can view expense splits with proper access
CREATE POLICY "Users can view expense splits with proper access"
ON public.expense_splits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    WHERE expenses.id = expense_splits.expense_id
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'manager'::app_role) OR
      can_access_project(auth.uid(), expenses.project_id)
    )
  )
);

-- Policy: Admins/managers can create expense splits
CREATE POLICY "Admins/managers can create expense splits"
ON public.expense_splits FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Policy: Admins/managers can update expense splits
CREATE POLICY "Admins/managers can update expense splits"
ON public.expense_splits FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Policy: Admins/managers can delete expense splits
CREATE POLICY "Admins/managers can delete expense splits"
ON public.expense_splits FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add updated_at trigger for expense_splits
CREATE TRIGGER update_expense_splits_updated_at
BEFORE UPDATE ON public.expense_splits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
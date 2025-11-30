-- Migration: Add Revenue Splitting Support
-- Description: Enables splitting invoices/revenues across multiple projects
-- Pattern: Mirrors existing expense_splits implementation
-- Run this migration in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add is_split column to project_revenues
-- ============================================================================

ALTER TABLE public.project_revenues 
ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.project_revenues.is_split IS 
  'When true, this revenue is split across multiple projects via revenue_splits table. Parent project_id should be SYS-000.';

-- ============================================================================
-- STEP 2: Create revenue_splits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.revenue_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  revenue_id UUID NOT NULL REFERENCES public.project_revenues(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  
  -- Split allocation
  split_amount NUMERIC(15,2) NOT NULL CHECK (split_amount > 0),
  split_percentage NUMERIC(5,2),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_revenue_project UNIQUE (revenue_id, project_id)
);

-- Add table comment
COMMENT ON TABLE public.revenue_splits IS 
  'Allocates a single invoice/revenue across multiple projects. Child table of project_revenues.';

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_revenue_splits_revenue_id 
  ON public.revenue_splits(revenue_id);

CREATE INDEX IF NOT EXISTS idx_revenue_splits_project_id 
  ON public.revenue_splits(project_id);

CREATE INDEX IF NOT EXISTS idx_revenue_splits_created_at 
  ON public.revenue_splits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_revenues_is_split 
  ON public.project_revenues(is_split) 
  WHERE is_split = true;

-- ============================================================================
-- STEP 4: Create updated_at trigger
-- ============================================================================

-- Trigger function (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to revenue_splits
DROP TRIGGER IF EXISTS update_revenue_splits_updated_at ON public.revenue_splits;
CREATE TRIGGER update_revenue_splits_updated_at
  BEFORE UPDATE ON public.revenue_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 5: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.revenue_splits ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
-- (Matches existing expense_splits pattern - adjust if your app has different requirements)
CREATE POLICY "Allow all for authenticated users" ON public.revenue_splits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: Ensure SYS-000 project exists (for split parents)
-- ============================================================================

INSERT INTO public.projects (
  project_number, 
  project_name, 
  client_name,
  status, 
  project_type,
  category,
  created_at, 
  updated_at
)
VALUES (
  'SYS-000', 
  'Multiple Projects',
  'System',
  'in_progress',
  'construction_project',
  'system',
  now(), 
  now()
)
ON CONFLICT (project_number) DO UPDATE
SET 
  project_name = 'Multiple Projects',
  category = 'system',
  updated_at = now();

-- ============================================================================
-- STEP 7: Helper function to get project revenue with splits handled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_project_revenue_total(p_project_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  direct_revenue NUMERIC;
  split_revenue NUMERIC;
BEGIN
  -- Get direct (non-split) revenues for this project
  SELECT COALESCE(SUM(amount), 0)
  INTO direct_revenue
  FROM public.project_revenues
  WHERE project_id = p_project_id
    AND (is_split = false OR is_split IS NULL);
  
  -- Get split revenues allocated to this project
  SELECT COALESCE(SUM(rs.split_amount), 0)
  INTO split_revenue
  FROM public.revenue_splits rs
  WHERE rs.project_id = p_project_id;
  
  RETURN direct_revenue + split_revenue;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_project_revenue_total(UUID) IS 
  'Returns total revenue for a project, correctly handling split revenues.';

-- ============================================================================
-- STEP 8: Validation function for split totals
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_revenue_split_total()
RETURNS TRIGGER AS $$
DECLARE
  parent_amount NUMERIC;
  splits_total NUMERIC;
  diff NUMERIC;
BEGIN
  -- Get parent revenue amount
  SELECT amount INTO parent_amount
  FROM public.project_revenues
  WHERE id = NEW.revenue_id;
  
  -- Get sum of all splits for this revenue (including the new/updated one)
  SELECT COALESCE(SUM(split_amount), 0) INTO splits_total
  FROM public.revenue_splits
  WHERE revenue_id = NEW.revenue_id;
  
  -- Calculate difference (allow 0.01 tolerance for rounding)
  diff := ABS(splits_total - parent_amount);
  
  -- Log warning if splits don't match (but don't block - validation happens in app)
  IF diff > 0.01 THEN
    RAISE NOTICE 'Revenue split total (%) does not match parent amount (%). Difference: %', 
      splits_total, parent_amount, diff;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Apply validation trigger (uncomment if you want DB-level validation)
-- DROP TRIGGER IF EXISTS validate_revenue_splits ON public.revenue_splits;
-- CREATE TRIGGER validate_revenue_splits
--   AFTER INSERT OR UPDATE ON public.revenue_splits
--   FOR EACH ROW
--   EXECUTE FUNCTION public.validate_revenue_split_total();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table was created
SELECT 
  'revenue_splits table' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'revenue_splits'
  ) as exists;

-- Verify column was added
SELECT 
  'is_split column' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_revenues' 
    AND column_name = 'is_split'
  ) as exists;

-- Verify indexes
SELECT 
  indexname as index_name,
  tablename as table_name
FROM pg_indexes 
WHERE tablename IN ('revenue_splits', 'project_revenues')
  AND indexname LIKE '%split%'
ORDER BY tablename, indexname;

-- Verify SYS-000 exists
SELECT project_number, project_name, category
FROM public.projects
WHERE project_number = 'SYS-000';

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
/*
-- To undo this migration:
DROP TRIGGER IF EXISTS update_revenue_splits_updated_at ON public.revenue_splits;
DROP TRIGGER IF EXISTS validate_revenue_splits ON public.revenue_splits;
DROP FUNCTION IF EXISTS public.validate_revenue_split_total();
DROP FUNCTION IF EXISTS public.get_project_revenue_total(UUID);
DROP TABLE IF EXISTS public.revenue_splits;
ALTER TABLE public.project_revenues DROP COLUMN IF EXISTS is_split;
*/

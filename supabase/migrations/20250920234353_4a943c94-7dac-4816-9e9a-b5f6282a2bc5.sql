-- FIX THE LAST REMAINING FUNCTION
-- Update the rollback function that's still there

CREATE OR REPLACE FUNCTION public.rollback_cost_migration_final()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'This rollback function is deprecated. All migrations have been consolidated.';
END;
$$;
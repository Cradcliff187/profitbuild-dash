-- Remove 'quoted' from project_status enum by converting existing rows to 'estimating'
-- The 'quoted' status was redundant with 'estimating' and has been removed from the application.

-- Step 1: Update any existing projects/work orders that have 'quoted' status to 'estimating'
UPDATE projects
SET status = 'estimating', updated_at = now()
WHERE status = 'quoted';

-- Step 2: Remove 'quoted' from the project_status enum
-- PostgreSQL requires recreating the enum to remove a value.
-- We use a safe approach: rename old enum, create new one, update columns, drop old.

-- Only proceed if 'quoted' still exists in the enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'quoted'
    AND enumtypid = 'project_status'::regtype
  ) THEN
    -- Rename the old enum
    ALTER TYPE project_status RENAME TO project_status_old;

    -- Create new enum without 'quoted'
    CREATE TYPE project_status AS ENUM (
      'estimating',
      'approved',
      'in_progress',
      'complete',
      'on_hold',
      'cancelled'
    );

    -- Update columns that use the old enum to use the new one
    ALTER TABLE projects
      ALTER COLUMN status TYPE project_status
      USING status::text::project_status;

    -- Drop the old enum
    DROP TYPE project_status_old;
  END IF;
END $$;

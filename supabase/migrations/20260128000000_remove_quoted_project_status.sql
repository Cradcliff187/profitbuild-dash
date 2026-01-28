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
DECLARE
  has_quoted boolean;
  old_default text;
BEGIN
  -- Check if 'quoted' exists in the enum
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'quoted'
    AND enumtypid = 'project_status'::regtype
  ) INTO has_quoted;

  IF has_quoted THEN
    -- Store the current default value
    SELECT pg_get_expr(adbin, adrelid)
    INTO old_default
    FROM pg_attrdef
    JOIN pg_attribute ON pg_attribute.attrelid = pg_attrdef.adrelid 
      AND pg_attribute.attnum = pg_attrdef.adnum
    JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
    WHERE pg_class.relname = 'projects'
      AND pg_attribute.attname = 'status';

    -- Drop the default temporarily
    ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;

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

    -- Restore the default (it will automatically use the new enum type)
    IF old_default IS NOT NULL THEN
      EXECUTE format('ALTER TABLE projects ALTER COLUMN status SET DEFAULT %s', 
        replace(old_default, 'project_status_old', 'project_status'));
    END IF;

    -- Drop the old enum
    DROP TYPE project_status_old;
  END IF;
END $$;

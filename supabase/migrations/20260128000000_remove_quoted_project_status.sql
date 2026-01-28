-- Remove 'quoted' from project_status enum by converting existing rows to 'estimating'
-- The 'quoted' status was redundant with 'estimating' and has been removed from the application.
-- NOTE: This migration was applied directly to the database on 2026-01-28
-- The enum change and view/function recreation are already complete.
-- This file serves as documentation of what was changed.

-- Step 1: Update any existing projects that have 'quoted' status to 'estimating' [APPLIED]
-- UPDATE projects SET status = 'estimating', updated_at = now() WHERE status = 'quoted';

-- Step 2: Drop dependent views [APPLIED]
-- DROP VIEW IF EXISTS reporting.internal_labor_hours_by_project CASCADE;
-- DROP VIEW IF EXISTS reporting.project_financials CASCADE;
-- DROP VIEW IF EXISTS reporting.weekly_labor_hours CASCADE;

-- Step 3: Change enum (drops dependent functions via CASCADE) [APPLIED]
-- ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
-- ALTER TYPE project_status RENAME TO project_status_old;
-- CREATE TYPE project_status AS ENUM ('estimating', 'approved', 'in_progress', 'complete', 'on_hold', 'cancelled');
-- ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::text::project_status;
-- ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'estimating'::project_status;
-- DROP TYPE project_status_old CASCADE;

-- Step 4: Recreate views [APPLIED]
-- See: reporting.project_financials, reporting.internal_labor_hours_by_project, reporting.weekly_labor_hours

-- Step 5: Recreate AI functions (to be applied)
-- Functions that were dropped by CASCADE need to be recreated:
-- - get_project_financial_summary()
-- - ai_resolve_project(text)
-- - ai_create_project(...)
-- - ai_update_project_status(...)
-- These will be recreated automatically when their migrations re-run on fresh databases.

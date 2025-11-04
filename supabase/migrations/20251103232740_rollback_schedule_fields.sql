-- ROLLBACK MIGRATION: Remove schedule fields if needed
-- This can be run to completely remove the schedule feature
-- WARNING: This will delete all schedule data

-- Remove from estimate_line_items
ALTER TABLE public.estimate_line_items
DROP COLUMN IF EXISTS scheduled_start_date,
DROP COLUMN IF EXISTS scheduled_end_date,
DROP COLUMN IF EXISTS duration_days,
DROP COLUMN IF EXISTS dependencies,
DROP COLUMN IF EXISTS is_milestone,
DROP COLUMN IF EXISTS schedule_notes;

-- Remove from change_order_line_items
ALTER TABLE public.change_order_line_items
DROP COLUMN IF EXISTS scheduled_start_date,
DROP COLUMN IF EXISTS scheduled_end_date,
DROP COLUMN IF EXISTS duration_days,
DROP COLUMN IF EXISTS dependencies,
DROP COLUMN IF EXISTS is_milestone,
DROP COLUMN IF EXISTS schedule_notes;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_estimate_line_items_scheduled_dates;
DROP INDEX IF EXISTS public.idx_change_order_line_items_scheduled_dates;


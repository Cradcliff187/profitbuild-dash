-- IMPORTANT: This migration is 100% ADDITIVE ONLY
-- It only adds new columns, never modifies existing ones
-- All new columns are nullable and optional

-- Add scheduling fields to estimate_line_items
ALTER TABLE public.estimate_line_items
ADD COLUMN IF NOT EXISTS scheduled_start_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_notes TEXT;

-- Add same fields to change_order_line_items
ALTER TABLE public.change_order_line_items
ADD COLUMN IF NOT EXISTS scheduled_start_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_end_date DATE,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_notes TEXT;

-- Add indexes for performance (non-blocking)
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_scheduled_dates 
  ON public.estimate_line_items(scheduled_start_date, scheduled_end_date)
  WHERE scheduled_start_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_change_order_line_items_scheduled_dates 
  ON public.change_order_line_items(scheduled_start_date, scheduled_end_date)
  WHERE scheduled_start_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.estimate_line_items.scheduled_start_date IS 'Optional: User-defined start date for this task in project schedule';
COMMENT ON COLUMN public.estimate_line_items.scheduled_end_date IS 'Optional: User-defined or calculated end date for this task';
COMMENT ON COLUMN public.estimate_line_items.duration_days IS 'Optional: Number of calendar days for task completion';
COMMENT ON COLUMN public.estimate_line_items.dependencies IS 'Optional: JSON array of task IDs that must complete before this task: [{"task_id": "uuid", "task_name": "string", "task_type": "estimate|change_order", "type": "finish-to-start"}]';
COMMENT ON COLUMN public.estimate_line_items.is_milestone IS 'Optional: Mark this task as a milestone';
COMMENT ON COLUMN public.estimate_line_items.schedule_notes IS 'Optional: User notes about scheduling considerations for this task';

COMMENT ON COLUMN public.change_order_line_items.scheduled_start_date IS 'Optional: User-defined start date for this task in project schedule';
COMMENT ON COLUMN public.change_order_line_items.scheduled_end_date IS 'Optional: User-defined or calculated end date for this task';
COMMENT ON COLUMN public.change_order_line_items.duration_days IS 'Optional: Number of calendar days for task completion';
COMMENT ON COLUMN public.change_order_line_items.dependencies IS 'Optional: JSON array of task IDs that must complete before this task: [{"task_id": "uuid", "task_name": "string", "task_type": "estimate|change_order", "type": "finish-to-start"}]';
COMMENT ON COLUMN public.change_order_line_items.is_milestone IS 'Optional: Mark this task as a milestone';
COMMENT ON COLUMN public.change_order_line_items.schedule_notes IS 'Optional: User notes about scheduling considerations for this task';


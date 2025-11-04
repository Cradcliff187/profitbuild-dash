-- Force type regeneration to include schedule fields
-- This migration adds helpful comments without changing any data

COMMENT ON TABLE estimate_line_items IS 'Estimate line items with scheduling support (scheduled_start_date, scheduled_end_date, schedule_notes, duration_days, dependencies, is_milestone)';

COMMENT ON TABLE change_order_line_items IS 'Change order line items with scheduling support (scheduled_start_date, scheduled_end_date, schedule_notes, duration_days, dependencies, is_milestone)';

COMMENT ON COLUMN estimate_line_items.scheduled_start_date IS 'Planned start date for this line item work';
COMMENT ON COLUMN estimate_line_items.scheduled_end_date IS 'Planned end date for this line item work';
COMMENT ON COLUMN estimate_line_items.schedule_notes IS 'Special scheduling considerations or constraints';
COMMENT ON COLUMN estimate_line_items.duration_days IS 'Duration in days for this work item';
COMMENT ON COLUMN estimate_line_items.dependencies IS 'JSONB array of task dependencies';
COMMENT ON COLUMN estimate_line_items.is_milestone IS 'Whether this is a project milestone';

COMMENT ON COLUMN change_order_line_items.scheduled_start_date IS 'Planned start date for this line item work';
COMMENT ON COLUMN change_order_line_items.scheduled_end_date IS 'Planned end date for this line item work';
COMMENT ON COLUMN change_order_line_items.schedule_notes IS 'Special scheduling considerations or constraints';
COMMENT ON COLUMN change_order_line_items.duration_days IS 'Duration in days for this work item';
COMMENT ON COLUMN change_order_line_items.dependencies IS 'JSONB array of task dependencies';
COMMENT ON COLUMN change_order_line_items.is_milestone IS 'Whether this is a project milestone';
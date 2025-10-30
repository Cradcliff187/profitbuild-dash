-- Remove unused legacy column from quotes table
-- This column was never used (always NULL) and was intended for linking entire quotes to single estimate lines
-- The actual functionality uses quote_line_items.estimate_line_item_id instead

-- Drop the foreign key constraint first
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_estimate_line_item_id_fkey;

-- Drop the unused column
ALTER TABLE quotes DROP COLUMN IF EXISTS estimate_line_item_id;
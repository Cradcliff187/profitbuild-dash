-- Fix foreign key constraint to allow deleting estimate line items
-- Quote line items will have their estimate_line_item_id set to NULL instead of blocking deletion

-- Drop the existing constraint
ALTER TABLE quote_line_items 
DROP CONSTRAINT IF EXISTS quote_line_items_estimate_line_item_id_fkey;

-- Re-add with SET NULL on delete
ALTER TABLE quote_line_items
ADD CONSTRAINT quote_line_items_estimate_line_item_id_fkey
FOREIGN KEY (estimate_line_item_id)
REFERENCES estimate_line_items(id)
ON DELETE SET NULL;
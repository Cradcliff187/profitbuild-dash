-- Add change_order_line_item_id to quote_line_items for proper source tracking
ALTER TABLE quote_line_items 
ADD COLUMN change_order_line_item_id UUID REFERENCES change_order_line_items(id);

-- Add index for performance
CREATE INDEX idx_quote_line_items_co_line_item_id ON quote_line_items(change_order_line_item_id);
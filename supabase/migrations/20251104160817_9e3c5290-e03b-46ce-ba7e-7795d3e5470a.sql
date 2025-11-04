-- Enable realtime replication for schedule tables
ALTER TABLE estimate_line_items REPLICA IDENTITY FULL;
ALTER TABLE change_order_line_items REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE estimate_line_items;
ALTER PUBLICATION supabase_realtime ADD TABLE change_order_line_items;
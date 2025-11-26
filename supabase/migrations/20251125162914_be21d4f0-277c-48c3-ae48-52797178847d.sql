-- Enable real-time updates for quotes tables
-- Set REPLICA IDENTITY FULL for complete row data during updates
ALTER TABLE quotes REPLICA IDENTITY FULL;
ALTER TABLE quote_line_items REPLICA IDENTITY FULL;

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE quote_line_items;
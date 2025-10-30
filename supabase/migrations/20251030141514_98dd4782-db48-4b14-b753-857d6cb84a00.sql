-- Enable realtime updates for estimates table
ALTER TABLE public.estimates REPLICA IDENTITY FULL;

-- Add estimates table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.estimates;
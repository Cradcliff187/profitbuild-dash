-- Enable realtime updates for project_media table
ALTER TABLE public.project_media REPLICA IDENTITY FULL;

-- Add table to realtime publication so clients can subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_media;

-- Grant necessary permissions for realtime to work
GRANT SELECT ON public.project_media TO anon, authenticated;
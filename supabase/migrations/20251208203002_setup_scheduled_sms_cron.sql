-- Migration: setup_scheduled_sms_cron.sql
-- Set up pg_cron job to trigger process-scheduled-sms edge function every minute

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests (not http extension)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: This cron job will call the edge function every minute
-- The edge function itself checks which schedules should run based on cron expressions or datetime
-- 
-- IMPORTANT: Replace [SERVICE_ROLE_KEY] with your actual service role key
-- You can find it in Supabase Dashboard > Settings > API > service_role key
-- 
-- To set this up manually:
-- 1. Get your service role key from Supabase Dashboard
-- 2. Run this SQL in the Supabase SQL Editor:
--
-- SELECT cron.schedule(
--   'process-scheduled-sms',
--   '* * * * *',  -- Run every minute
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://clsjdxwbsjbhjibvlqbz.supabase.co/functions/v1/process-scheduled-sms',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer [YOUR_SERVICE_ROLE_KEY_HERE]'
--       ),
--       body := '{}'::jsonb
--     ) AS request_id;
--   $$
-- );
--
-- To unschedule (if needed):
-- SELECT cron.unschedule('process-scheduled-sms');

-- Alternative: Use a function that reads from a secrets table
-- This is safer than hardcoding the key, but requires setting up a secrets table
-- For now, we'll document the manual setup process above

-- Create a helper function to check if cron job exists
CREATE OR REPLACE FUNCTION check_scheduled_sms_cron_job()
RETURNS TABLE(jobid bigint, schedule text, command text)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jobid,
    schedule::text,
    command::text
  FROM cron.job
  WHERE jobname = 'process-scheduled-sms';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_scheduled_sms_cron_job IS 'Check if the scheduled SMS cron job is configured';

-- Note: The actual cron job setup should be done manually via Supabase SQL Editor
-- with the service role key, as it cannot be hardcoded in migrations for security reasons


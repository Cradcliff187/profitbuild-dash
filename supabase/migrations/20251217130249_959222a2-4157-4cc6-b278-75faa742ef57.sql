-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove existing job if it exists (idempotent)
SELECT cron.unschedule('process-scheduled-sms') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-sms');

-- Schedule the job to run every minute
SELECT cron.schedule(
  'process-scheduled-sms',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://clsjdxwbsjbhjibvlqbz.supabase.co/functions/v1/process-scheduled-sms',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
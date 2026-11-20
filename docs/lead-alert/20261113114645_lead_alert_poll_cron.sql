-- Applied 2026-11-13 through the Supabase connector (already in the database).
-- Lead alert timer: call the lead-alert function once a minute.
-- The key is read from the settings row at run time, so it is never written here.
-- To pause the alert without touching this job: update lead_alert_settings set enabled = false.
select cron.unschedule('lead-alert-poll') where exists (select 1 from cron.job where jobname = 'lead-alert-poll');

select cron.schedule(
  'lead-alert-poll',
  '* * * * *',
  $job$
  select net.http_post(
    url := 'https://clsjdxwbsjbhjibvlqbz.supabase.co/functions/v1/lead-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-lead-alert-key', (select poll_key::text from public.lead_alert_settings where id)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  ) as request_id;
  $job$
);

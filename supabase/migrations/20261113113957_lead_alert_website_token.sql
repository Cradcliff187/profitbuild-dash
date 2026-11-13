-- Applied 2026-11-13 through the Supabase connector (already in the database).
-- Lead alert: keep the short-lived website read token between runs, so the
-- website sees about one sign-in an hour instead of one a minute.
alter table public.lead_alert_settings
  add column if not exists website_token text,
  add column if not exists website_token_expires_at timestamptz;

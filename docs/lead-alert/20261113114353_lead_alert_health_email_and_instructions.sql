-- Applied 2026-11-13 through the Supabase connector (already in the database).
-- Lead alert: who gets e-mails about the alert itself (down, low credits), and an
-- optional replacement for the screen's built-in instructions, both changeable
-- without a deploy.
alter table public.lead_alert_settings
  add column if not exists health_email_to text[] not null default '{}',
  add column if not exists screen_instructions text;

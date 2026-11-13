-- Applied 2026-11-13 through the Supabase connector (already in the database).
-- Lead alert: mark made-up test leads so they are never counted as real forms.
alter table public.lead_alert_forms
  add column if not exists is_test boolean not null default false;

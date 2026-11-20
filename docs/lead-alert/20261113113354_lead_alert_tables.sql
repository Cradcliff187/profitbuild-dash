-- Applied 2026-11-13 through the Supabase connector (already in the database).
-- Website lead alert (edge function "lead-alert", pg_cron job "lead-alert-poll").
-- Two new tables, nothing existing is altered.
--   lead_alert_settings : one row. Who is texted, limits, on/off, health state.
--   lead_alert_forms    : one row per website contact form, with the screen's
--                         verdict, what was sent, and any ruling a person made.

create table if not exists public.lead_alert_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  poll_key uuid not null default gen_random_uuid(),
  website_url text,
  website_anon_key text,
  text_profile_ids uuid[] not null default '{}',
  health_profile_ids uuid[] not null default '{}',
  email_to text[] not null default '{}',
  system_sender_id uuid references public.profiles(id),
  max_texts_per_hour integer not null default 5,
  fail_alert_after integer not null default 15,
  low_credit_threshold integer not null default 25,
  live_since timestamptz,
  status text not null default 'not_started',
  last_ok_at timestamptz,
  last_error text,
  consecutive_failures integer not null default 0,
  outage_alerted boolean not null default false,
  textbelt_quota integer,
  low_credit_alerted_at timestamptz,
  cap_alerted_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.lead_alert_settings is
  'Single-row configuration and health state for the website lead alert. Service role only.';

create table if not exists public.lead_alert_forms (
  submission_id uuid primary key,
  submitted_at timestamptz not null,
  name text,
  organization text,
  email text,
  phone text,
  project_scope text,
  message text,
  industry text,
  preferred_contact text,
  project_timeline text,
  referral_source text,
  status text not null default 'pending'
    check (status in ('pending', 'done', 'no_text', 'failed', 'backfill')),
  verdict text check (verdict in ('lead', 'lead_not_fit', 'not_lead', 'junk', 'unscreened')),
  reason text,
  summary text,
  attempts integer not null default 0,
  claimed_at timestamptz not null default now(),
  texted_at timestamptz,
  text_results jsonb not null default '[]'::jsonb,
  emailed_at timestamptz,
  ruling text check (ruling in ('lead', 'lead_not_fit', 'not_lead', 'junk')),
  ruling_note text,
  ruling_by text,
  ruling_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.lead_alert_forms is
  'One row per website contact form seen by the lead alert: verdict, what was texted, and any ruling by a person.';

create index if not exists lead_alert_forms_submitted_at_idx on public.lead_alert_forms (submitted_at desc);
create index if not exists lead_alert_forms_pending_idx on public.lead_alert_forms (claimed_at) where status = 'pending';

alter table public.lead_alert_settings enable row level security;
alter table public.lead_alert_forms enable row level security;

-- Settings: no policy on purpose (service role only; holds the poll key).
-- Forms: admins may read (for a future screen in the app); only the service role writes.
drop policy if exists "Admins can view lead alert forms" on public.lead_alert_forms;
create policy "Admins can view lead alert forms"
  on public.lead_alert_forms
  for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

insert into public.lead_alert_settings (id) values (true) on conflict (id) do nothing;

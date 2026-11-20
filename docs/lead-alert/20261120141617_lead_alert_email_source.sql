-- Applied 2026-11-20 through the Supabase connector (already in the database).
-- Lead alert: outside e-mail to the info@ addresses goes through the same screen and texts as a website form.
-- Additive only. The e-mail side stays off (email_enabled = false) until the read-only Gmail key is in place.

-- 1. lead_alert_forms also holds e-mails. source says which; an e-mail is never recorded twice.
alter table public.lead_alert_forms
  add column if not exists source text not null default 'form',
  add column if not exists gmail_message_id text,
  add column if not exists gmail_thread_id text,
  add column if not exists subject text,
  add column if not exists sent_to text,
  add column if not exists in_spam boolean not null default false;

alter table public.lead_alert_forms
  drop constraint if exists lead_alert_forms_source_check;
alter table public.lead_alert_forms
  add constraint lead_alert_forms_source_check check (source in ('form', 'email'));

create unique index if not exists lead_alert_forms_gmail_message_id_key
  on public.lead_alert_forms (gmail_message_id)
  where gmail_message_id is not null;

-- 2. Settings for the e-mail side. Everything that can change without a deploy.
alter table public.lead_alert_settings
  add column if not exists email_enabled boolean not null default false,
  add column if not exists email_mailbox text not null default '<the watched mailbox>', -- the real address is in the database, not written here
  add column if not exists email_match_addresses text[] not null default array['info@teamradcliff.com', 'info@radcliffcg.com'],
  add column if not exists email_match_list_ids text[] not null default array['info.teamradcliff.com'],
  add column if not exists email_skip_senders text[] not null default array['noreply@rcgwork.com', 'noreply-spamdigest'],
  add column if not exists email_skip_subject_prefixes text[] not null default array['New Contact Form Submission', 'Moderator''s spam report'],
  add column if not exists email_internal_domains text[] not null default array['radcliffcg.com', 'teamradcliff.com', 'rcgwork.com', 'radcliffconstructiongroup.com'],
  add column if not exists email_live_since timestamptz,
  add column if not exists email_status text not null default 'off',
  add column if not exists email_last_ok_at timestamptz,
  add column if not exists email_last_error text,
  add column if not exists email_consecutive_failures integer not null default 0,
  add column if not exists email_outage_alerted boolean not null default false;

-- 3. One cursor per mailbox and reader. The lead alert is the first reader; the CRM mail logger adds its own row.
create table if not exists public.mail_sync_state (
  mailbox text not null,
  consumer text not null,
  history_id text,
  seen_ids jsonb not null default '[]'::jsonb,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (mailbox, consumer)
);

alter table public.mail_sync_state enable row level security;
-- No policies on purpose: only the service role (edge functions) reads or writes it.

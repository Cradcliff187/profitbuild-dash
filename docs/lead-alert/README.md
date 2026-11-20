# Lead alert

Edge function `lead-alert`, called every minute by the pg_cron job `lead-alert-poll`. It texts and e-mails the
owners about a real job request from two places:

| Source | Read from | Recorded as |
|---|---|---|
| Website contact form | the website's `contact_submissions` table (read-only login) | `lead_alert_forms.source = 'form'` |
| E-mail to an info@ address | the watched mailbox through Gmail, Spam included (read-only key) | `lead_alert_forms.source = 'email'` |

Both go through the same screen, texts, e-mail copy, hourly cap and health warnings. An e-mail is recorded once
(`gmail_message_id` is unique). The website's own form notices and the alert's own copies are skipped, so a form
never texts twice. The two sides fail separately: a Gmail outage does not stop form texts, and the reverse.

Settings live in `public.lead_alert_settings` (one row). The e-mail side: `email_enabled`, `email_mailbox`,
`email_match_addresses`, `email_match_list_ids`, `email_skip_senders`, `email_skip_subject_prefixes`,
`email_internal_domains`. State: `email_status` (`off`, `waiting_for_gmail_key`, `live`, `mailbox_unreachable`).

The SQL that built the tables is in this folder. The files in `supabase/migrations/` are placeholders, as the
repo's migration rules require.

## The Gmail reader

`supabase/functions/_shared/gmailReader.ts`. Read-only; it cannot send, label or delete. It is written for the CRM
mail logger to reuse: the logger adds its own row to `public.mail_sync_state` (`consumer = 'mail_logger'`) and
calls the same functions.

Each run: Gmail history since the stored history id, plus Gmail's own search for mail to the watched addresses
over the last 2 days (8 after a lost cursor). Headers are read first; a body is fetched only for outside mail to
a watched address.

## Turning the e-mail side on

1. Google Cloud, project `rcg-service-agent`: service account `rcg-mail-logger`, no project roles, one JSON key.
2. Google Admin console, Security > API controls > Domain-wide delegation: the account's client id with
   `https://www.googleapis.com/auth/gmail.readonly` (add `gmail.compose` when the CRM drafts job is built).
3. The key goes into the function secret `GMAIL_READER_SA_JSON` and nowhere else. Delete the downloaded file.
4. Deploy with the CLI (the function is over the size the connector handles safely):
   `npx supabase functions deploy lead-alert --project-ref clsjdxwbsjbhjibvlqbz --no-verify-jwt`
5. `selftest` and check `email.gmail_read_ok` is true.
6. `email_lookback` (days 14) until `remaining` is 0. It records and screens past mail and texts nobody.
7. `update lead_alert_settings set email_enabled = true`. The next run sets `email_live_since`; nothing older is
   ever texted.
8. `test_lead`, then one real e-mail from an outside address to info@teamradcliff.com.

Not covered: mail the Google Group holds as suspected spam never reaches any mailbox, so the reader cannot see
it. It stays in the group's pending list until a moderator releases it.

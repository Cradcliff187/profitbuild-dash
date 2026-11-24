# rcg-sales skill — update to match what exists (Nov 24 2026)

The account copy of `rcg-sales/SKILL.md` names eleven `sales_*` functions. Until Nov 24 2026 none
of them existed in the RCG Work database (`clsjdxwbsjbhjibvlqbz`), so the chat fell back to raw SQL.
The functions below are live now (CLAUDE.md Rule 46, SQL in `docs/sales-desk-functions.sql`).
Paste this table over the skill's "The agent door" table in `C:\Dev\rcg-skills\skills\rcg-sales\SKILL.md`
and drop the rows it does not have.

## What changed against the skill's table

| Skill said | Now |
|---|---|
| `sales_list_due()` | **exists** — `sales_list_due(p_since timestamptz default null)`; one row per open lead with `attention` (overdue · due_today · new_unanswered · stale · no_next_step · none), person, owner, linked jobs, `touches_since` when `p_since` is given. Leads only. |
| `sales_pipeline()` | **exists** — jsonb: `open_by_stage`, `open_leads`, `closed_last_30d`, `touches_last_7d`, `leads_created_last_30d`. **No estimate or job statuses**: those live on Matt's sheet. |
| `sales_find_or_add_contact(name, email, phone, company, client_id, title)` | **exists** as `sales_find_or_add_contact(p_name, p_email, p_phone, p_client_id, p_title, p_notes, p_written_by)`. No free-text `company`: pass the client id, or leave null for a prospect. Matches e-mail → phone digits → name + client. |
| `sales_log_touch(target_type, target_id, kind, when, summary, body, gmail_message_id, agent_key, written_by)` | **exists** — `sales_log_touch(p_target_type, p_target_id, p_kind, p_occurred_at, p_summary, p_body, p_gmail_message_id, p_agent_key, p_written_by, p_attachments jsonb, p_metadata jsonb)`. Attachments: `[{"url": "...", "title": "..."}]` for links, or `{"media_id": ...}` for `bid_media` uploads. |
| `sales_create_lead(contact_id, source, name, address, project_type, size_band, owner_user)` | **exists** — `sales_create_lead(p_name, p_source, p_contact_id, p_client_id, p_address, p_project_type, p_job_type, p_size_band, p_owner_user_id, p_source_detail, p_description, p_written_by)`. `p_owner_user_id` is **required** from the chat (there is no signed-in user; it becomes `created_by` and the owner). |
| *(not in the skill)* | **new** — `sales_update_lead(p_lead_id, p_patch jsonb, p_written_by)` for the facts learned while Talking (address, size_band, job_type, source_detail, client_id, contact_id, owner_user_id, description, name, project_type). Stage and next step are refused here. |
| `sales_set_stage(lead_id, stage, reason)` | **exists** — `sales_set_stage(p_lead_id, p_stage, p_reason, p_written_by)`. Closing needs one of `linked_to_job · we_passed · no_fit · went_cold · lost_before_estimate`. |
| `sales_set_next_step(target_type, target_id, text, due_date, owner_user)` | **exists, leads only** — `sales_set_next_step(p_lead_id, p_text, p_due_date, p_owner_user_id, p_written_by)`. Jobs and clients have no next-step column. |
| `sales_request_estimate(lead_id, job_name, client_id, address, project_type)` | **exists, but it creates a JOB, not an estimate** — alias of `sales_create_job(p_lead_id, p_job_name, p_client_id, p_client_name, p_address, p_project_type, p_written_by)` → `(job_id, job_number)`. Mints the next number, project at Estimating, links it, moves the lead to Estimate requested. Needs a client: pass `p_client_id`, or `p_client_name` to find-or-create one. **No draft estimate row and no Drive folder name come back** — the bid package lives in `rcg-bid`'s Drive folder, and Matt's sheet owns the status. |
| `sales_close_estimate(...)` | **not built** — estimates are not a system of record in the app (Chris, Nov 24). Won/lost/dead and the three closing questions belong on the lead's timeline as a touch (`kind = note`, metadata `{outcome, competitors, delta_band, why}`) until the design says otherwise. |
| `sales_write_draft(...)` | **not built** — nothing turns a row into a Gmail draft today. Log the draft as a touch with `kind = draft` (`awaiting_ok` is set for you) and put the text in `body`. |
| `sales_write_daily_note(...)` | **not built** — the board reads nothing from RCG Work yet. Keep writing the Drive note. |

## Rules that still hold

- Every call carries `p_written_by` = your task or chat name. It is stored on the row, and the
  triggers copy it onto the stage-change and link rows they write.
- Read before you say: `select * from sales_list_due();` first.
- **Never write a table directly, never INSERT a `projects` row.** `sales_create_job` is the only
  way a number is minted from the chat; Matt's sheet is the source of truth for that number, and the
  app row gets renumbered to match if they differ.
- Never `bid_notes`: the app no longer reads it. Notes are touches.
- No function moves a stage or a next step on its own, and none ever will under the Nov 7 rule.

## Example: the Buckeye lead, done the right way

```sql
-- the person (already exists; this returns the same id)
select sales_find_or_add_contact('David Kerns', 'dr.dkerns@gmail.com', '937-291-3780', null, null, null, 'rcg-sales-chat');
-- a touch
select sales_log_touch('lead', '3fe2b337-d20f-458b-aea0-0ca4f13a7cb0', 'email_out', now(),
  'Sent the estimate', null, null, 'buckeye:estimate-sent:2026-11-30', 'rcg-sales-chat');
-- the next step
select sales_set_next_step('3fe2b337-d20f-458b-aea0-0ca4f13a7cb0', 'Call David to walk through the number', date '2026-12-03', null, 'rcg-sales-chat');
-- the hand-off (only when Chris says so)
select * from sales_create_job('3fe2b337-d20f-458b-aea0-0ca4f13a7cb0', 'Buckeye Home Health - restrooms and office flooring', null, 'Buckeye Home Health Care', null, null, 'rcg-sales-chat');
```

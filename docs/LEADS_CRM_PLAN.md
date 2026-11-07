# Leads → CRM: what is wrong, what is missing, what to build (2026-11-07)

Status (Nov 7 2026): **PR A + PR B shipped** on `claude/epic-thompson-ga92ym` (schema applied to
production as `20261107164112_leads_crm_record`; see CLAUDE.md Rule 44). Chris's addendum, Nov 7:
**no automated decision-making** — every stage/status/next-step value is written by a person; code
only derives flags and logs history. So the chase cadence, "went quiet", `sales_*` agent door, mail
logger and SMS (PR C's automation half and all of PR E) are **not** built and would need to propose,
never act. Decision 2 landed as "keep the bar, change its slots" (Log touch · Camera · Attach), not
removal — it matches the project hub and breaks nothing. Original text follows.

This is the RCG Work build plan the sales design
(`sales-design-2026-10-23.md`, RCG Operations › Sales › `_system`) said would live here. Read that
design first; where this plan and the design disagree, the design wins unless Chris changes it.

Companion rules: CLAUDE.md Rule 42 (leads link to jobs, never take a number), Rule 38 (contacts),
Rule 37 (hub + drill-downs on mobile, one navigation layer per screen), Rule 15 (one composer).

---

## 1. Where the pipeline actually is (live numbers, 2026-11-07)

| What | Count |
|---|---|
| Leads (`branch_bids`, not deleted) — **ever** | 3 (1 estimate requested, 2 closed) |
| Lead notes / lead media in the last 90 days | 0 / 0 |
| Construction projects created in the last 365 days | 179 |
| Projects at status `estimating` | 66 (median age 85 days; 22 untouched 90+ days) |
| Projects with no estimate at all | 76 |
| Current-version estimates at `sent` | 42, all 90+ days old, **$2.51M** |
| Estimates marked `sent` in the last 90 days | 0 |
| Clients / contacts | 64 active / 78 |

The Leads screen is not where RCG's funnel lives. Jobs enter as `projects` (Matt's job folders →
tracker sync) and then sit at `estimating`; estimates are marked `sent` and never touched again. The
design called this out on 10/23 (gaps A, E, G, H) and nothing has moved since. **Polishing the Leads
UI without fixing the entry point produces a beautiful empty room.** Recommendation 0 below is the
one that matters.

Of the 10/23 design, what shipped (PR #220, Rule 42): `source`, `stage` + close reason, lead ↔ job
links, the hero + edit sheet. What did not ship: a **person** on the lead, an **owner**, a **next
step with a date**, `last_contact`, size band, the **timeline** (`lead_timeline`), the
**estimate chase cadence**, the **three closing questions**, `request_estimate`, speed-to-lead SMS,
the mail logger, the `sales_*` agent door, the board views. None of the `sales_*` functions exist in
the database today; `cron.job` has one row.

---

## 2. Design defects in what exists today

### Mobile lead page (`BranchBidDetail` at < 768px)
1. **Two navigation layers on one screen** — a tab strip (Notes · Media · Docs) inside the app shell
   plus a fixed bottom bar (Note · Camera · Attach). This is the exact shape Rule 37 retired on the
   project hub in July.
2. **Duplicated actions**: "Link to job" and "Edit details" are in the header kebab AND in the hero
   (Link button in the Linked-jobs box; Edit behind the address empty state). Same verb, two homes.
3. **Duplicated upload affordances**: the Docs tab still renders `BidDocumentUpload`'s "Upload
   Documents / Choose File" dropzone on mobile while the bar's Attach also uploads documents. Rule 22
   gated the *media* bulk uploader behind `!isMobile` but not the document one.
4. **Composer copy lies on mobile**: the Notes empty state says "Add your first note above" while the
   composer is hidden (`hideComposer`) and lives in the bar.
5. **List cards have a tap AND a "View Details" action** that do the same thing.
6. **Nothing a salesperson needs on a phone**: no tap-to-call, no text, no "log a call" in one tap, no
   next step. The three capture buttons are the field-worker bar transplanted onto a sales record.

### Desktop lead page
7. **Silos instead of a record**: Notes, Media and Docs are three tabs; stage changes, link events and
   close reasons appear nowhere. A CRM record is one chronological story with the facts pinned beside
   it (HubSpot / Pipedrive / Buildertrend / JobTread all converge on left facts · center timeline ·
   right next-step/related).
8. **Three composers again** (Rule 15 lesson): `BidNotesTimeline`'s inline textarea+mic,
   `BidNoteComposer` (sheet), and the project `NoteComposer` all exist and drift.
9. **No person**: the lead carries a `client_id`, not a human. Rule 38's `contacts` table (78 rows,
   `client_id` nullable — prospects allowed) is unused by Leads. "Client" is the wrong noun for a
   prospect who has never bought anything.
10. **No owner, no next step, no last-contact** — so no "due today" view, no staleness, no sort by
    attention. The list's four stat cards count stages; none of them counts *overdue*.
11. **No win/loss capture** on estimates (design gap F). `estimates.status` has `rejected` but no
    who-else / how-far-off / why-us.

### Information architecture
12. Leads sits under **ESTIMATING** in the sidebar with a `Package` icon. The design's vocabulary is
    explicit: a lead is a conversation, an estimate is a number; two streams. Put Sales where it is
    findable (a **SALES** group: Leads · Follow-ups · Clients) and give it a sales icon.

---

## 3. What you are missing (the short list)

1. **The funnel boundary with Matt's tracker** — decide whether jobs start as leads (design §4.6:
   "Request estimate" creates the job) or the pipeline view must read `projects.status = 'estimating'`
   as a second stream. Today it is neither, which is why both screens are empty of truth.
2. **A person on the lead** (contact: name · phone · email · title · company), matched before created.
3. **Owner + next step + due date** — the one field that drives follow-up (design rule 3).
4. **One activity timeline** per lead / job / client (notes, calls, emails, texts, meetings, site
   walks, stage changes, links, photos, docs) — `lead_timeline`.
5. **The estimate chase** (+3 / +10 / +21 / +45 / quiet at 60) — the biggest dollars in the company are
   the 42 sent estimates nobody is chasing.
6. **The three closing questions** on every won / lost / dead estimate.
7. **A "due today" landing** (mine: overdue → due → New unanswered → stale 14d) on desktop AND phone.
8. **Phone-first touch logging**: Call · Text · Directions · "Log a touch" (kind chips + voice) in
   under a minute (design test #4).
9. **Dedupe at intake**: email → contact, domain → client, name + company → contact (design rule 6).
10. **Speed-to-lead**: website form → lead row + SMS in 15 minutes (design test #1); mail logger.

---

## 4. Target design

### 4.1 Data (one additive migration; readable SQL goes in `docs/` per the migration rules)

`branch_bids` + `contact_id → contacts` (nullable; prospects allowed), `owner_user_id → auth.users`,
`next_step text`, `next_step_due date`, `size_band text` (CHECK: under_25k · 25_100k · 100_500k ·
500k_1m · over_1m), `last_contact_at timestamptz` (trigger-maintained from the timeline).

`lead_timeline` (new): `id`, `target_type` CHECK (lead · job · client), `target_id uuid`, `kind`
CHECK (note · call · email_in · email_out · text · meeting · site_walk · stage_change · link ·
draft), `occurred_at`, `summary`, `body`, `written_by text`, `user_id`, `gmail_message_id` (UNIQUE
where not null), `agent_key` (UNIQUE where not null), `awaiting_ok bool`, `attachments jsonb`
(media/doc refs), `created_at`. Indexes on `(target_type, target_id, occurred_at desc)`. RLS =
admin/manager. `bid_notes` is read through a UNION view until backfilled, then retired (Rule 20's
read-side-union pattern, not dual-write).

`estimates` + `sent_at`, `next_chase_at`, `chase_step smallint`, `outcome` CHECK (won · lost · dead),
`competitors text`, `delta_band` CHECK (under_5 · 5_15 · over_15 · unknown), `outcome_why text`,
`closed_at`, `closed_by`, `lead_id → branch_bids` (nullable). Trigger: status → `sent` stamps
`sent_at` and `next_chase_at = sent_at + 3d`.

Agent door (`sales_*` SECURITY DEFINER functions, own role, no table grants) exactly as the design
§4.2 lists them; the UI calls the same functions so there is one write path.

### 4.2 Desktop lead page — a CRM record, not tabs

Three columns at ≥1024px (stack at tablet widths, Tailwind breakpoints, never `useIsMobile`):

- **Left — the facts** (sticky): person (name · title · company; phone and email as actions), client
  if any, stage pill (`LeadStageControl`, unchanged), source, owner, size band, address
  (`ProjectAddressLocator` card), created-by line. One pencil opens `LeadEditSheet`. Nothing else
  edits here.
- **Center — the timeline**: `TouchComposer` on top (kind chips: Note · Call · Email · Text · Meeting ·
  Site walk; textarea; `VoiceNoteButton`; paperclip → Take photo / Record video / Upload file, same
  three code paths as Rule 15; **every save asks for the next step + date, prefilled from the last
  one**). Below it, every `lead_timeline` row newest-first with day headers; photos render inline as
  thumbnails, documents as rows; stage changes and links render as system events. Filters as chips
  (All · Notes · Calls & meetings · Email · Photos · Docs) replace the Media / Docs tabs.
- **Right — what's next**: Next step card (text · due · owner · Done / Reschedule / Reassign),
  Linked jobs (the existing chips + "Link to job" — its ONLY home), Estimates on linked jobs with
  status/age/next chase, and a **Request estimate** button (calls `sales_request_estimate`; the job
  gets the number, the lead never does — Rule 42 unchanged).

Delete: `BidNotesTimeline`'s inline composer, `BidNoteComposer`, `BidDocumentUpload`'s dropzone as a
tab, `BidMediaGallery` as a tab (it becomes the Photos filter + the lightbox). `BidMediaBulkUpload`
stays reachable from the composer paperclip.

### 4.3 Mobile lead page — hub + drill-downs (Rule 37), one action layer

- **Hero**: person + company, stage pill, the next step in Today's `border-l-2 border-primary` block
  with Done / Reschedule, and a row of four 44px actions: **Call · Text · Directions · Log a touch**.
  Call/Text are `tel:` / `sms:` links to the contact's phone (hidden when there is none, with "Add a
  phone" inline). Log a touch opens the `TouchComposer` sheet.
- **Rows** (shared `HubRow`): Activity (N) · Photos (N) · Documents (N) · Linked jobs (N) ·
  Estimates (N). Each opens full-viewport with a back row; `?tab=` deep-links keep working.
- **Bottom bar**: keep `BidQuickActionBar` as capture-only (Camera · Attach) **or** fold Camera/Attach
  into the hero action row and remove the bar. Recommendation: **remove the bar**; a sales record is
  not a job site, and Rule 37 is one layer per screen. Photos still land via the composer paperclip
  and the Photos drill-down's own "+".
- **Header kebab**: Edit details only. Link to job lives in the Linked jobs row. No duplicates.
- Tab strip: deleted.

### 4.4 Leads list → Pipeline

Desktop: default **Follow-ups** view (mine · all): overdue → due today → New unanswered > 1 business
day → Talking stale 14d; each row is person · lead · stage · next step · due · last contact · owner.
Second view **Board** (stage columns; cards show next-step due, days since contact, size band, owner
avatar; drag = `sales_set_stage`). Third view the existing **Table** (keep `EntityFilterBar`, column
selector, export). **Until open leads exceed ~20, the Follow-ups list is the landing, not the
board** — a kanban with three cards is an empty room. The page also carries an **Estimates out**
strip (42 today) by age bucket with next chase, because that is where the dollars are.

Mobile: the Follow-ups list only (cards: person · lead · due chip · stage), FAB = New lead, kebab =
Export. Tap → hub.

Stat tiles become the design's board tiles: **Overdue follow-ups · New, unanswered · Stale 14d ·
Estimates out 45d+**. Counts, never dollars, on anything that can be pushed or e-mailed.

### 4.5 New lead (intake) — match before create

Name or phone or email first; live match against contacts (email → contact, domain → client, name +
company → contact) with "Use existing" / "New person". Then lead name, source (required), size band,
address, next step (default "Reply", due = next business day). On save: `sales_create_lead` +
`sales_set_next_step`. Voice intake on mobile ("talked to Dan at Mercy about the 3rd-floor refresh,
wants a number by the 10th") is the composer's job once a lead exists; a dictation-to-lead parser is
phase 3.

### 4.6 Estimates: chase + close

On the estimates list and the project Estimates tab, a `sent` estimate shows age, chase step and next
chase date; "Log chase" writes a timeline row on the job and advances the step. Changing status away
from `sent` opens **Close estimate**: outcome · who else priced it · how far off (band) — won asks
"why us". Fields required; this replaces Bid_Log for Competitor Pricing.

### 4.7 Navigation

Sidebar group **SALES**: Leads (icon `Handshake` or `Inbox`), Follow-ups (badge = mine overdue),
Clients. ESTIMATING keeps Estimates · Quotes. `/leads` stays the URL; `/leads/follow-ups` is the new
default landing. Field workers: no change (allowlist untouched).

---

## 5. Order of work

| PR | Scope | Schema? | Done when |
|---|---|---|---|
| **A — Cleanup (now)** | Delete the mobile tab strip, kebab duplicates, Docs dropzone on mobile, list-card duplicate action; hub + drill-downs on mobile; desktop three-column record with a **client-side** timeline built from `bid_notes` + `bid_media` + stage/link events (`closed_at`, link `created_at`); one `TouchComposer` (note + voice + paperclip) replacing three composers; Call/Text/Directions from `clients.phone` until contacts land | No | Zero duplicate affordances; one nav layer per screen; the three composers are one file |
| **B — The record** | `contact_id`, `owner_user_id`, next step + due, size band, `last_contact_at`, `lead_timeline` + union view over `bid_notes`; `sales_find_or_add_contact`, `sales_log_touch`, `sales_set_stage`, `sales_set_next_step`, `sales_list_due`, `sales_pipeline`; intake with match-before-create; Follow-ups view + tiles; SALES sidebar group | Yes | Design tests #4 and #5 pass by hand |
| **C — Estimates** | `sent_at` / chase / outcome columns + trigger; chase UI; Close-estimate dialog; `sales_request_estimate`; `sales_close_estimate`; Estimates-out strip on Pipeline | Yes | Every `sent` estimate has a next chase date; every close carries the three answers |
| **D — Cleanup decisions** | The design's step 1: one sheet of 76 no-estimate jobs · 42 stale sent · 22 untouched; Chris + Matt mark each; code applies | Data only | Pipeline numbers match the sheet |
| **E — Automation** | Website form → lead + SMS (pg_cron + `send-sms`); mail logger + drafts-out (service account, design §4.3); `v_sales_*` views for the board | Yes | Design tests #1, #3, #6 |

PR A has no dependency and fixes what the screenshot shows. PRs B and C are the CRM. Do not start E
before B.

---

## 6. Chris decides (defaults in bold)

1. **Funnel boundary** — **new inbound starts as a lead; "Request estimate" creates the job**; the
   tracker sync keeps creating jobs from Matt's folders **and** links them to a lead when the folder
   name matches an open lead (no change to numbering, Rule 43). Alternative: pipeline reads
   `estimating` projects as a second stream only.
2. Mobile bottom bar on leads — **remove**; Camera/Attach move into the composer and the Photos row.
3. Media / Docs tabs on desktop — **fold into the timeline with filter chips**; alternative: keep a
   compact Files section in the right rail.
4. Default owner — **the creator**; reassign from the Next-step card.
5. Default landing for `/leads` — **Follow-ups (mine)**; board appears when open leads exceed 20.
6. Chase cadence / stage limits / size bands — **as the design** (+3 · +10 · +21 · +45 · quiet 60;
   New 1 business day; Talking stale 14 days).
7. Who sees Sales — **admin + manager** (unchanged); Matt is admin.
8. Go on PR A **now**; B and C after the cleanup sheet (PR D) is marked.

---

## 7. Do not

- Add a Convert / Create-project button under `/leads` (Rule 42).
- Build a kanban as the landing while there are three leads.
- Add realtime channels or `auth.getUser()` on any of these paths (Gotchas #53–#56, #63).
- Keep two composers or two homes for the same verb. One timeline, one composer, one next step.
- Put dollars in a tile that can be pushed, e-mailed, or headlined (design rule 8).

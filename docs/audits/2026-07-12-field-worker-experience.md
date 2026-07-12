# Field-Worker Experience Audit

**Audit date:** 2026-07-12
**Branch:** `audit/field-worker-experience`
**Type:** Read-only intelligence audit. No implementation, no schema changes. This documents current
state so we can design against it.

**Ground rules applied:** reuse-first (no new tables/columns/infra proposed unless existing options
are proven unable to carry the requirement); notification rails documented, not re-invented; every
finding cites file:line; every existing behavior documented before any change is contemplated.

> **Repo reality reminder:** all `supabase/migrations/*.sql` files are placeholder comments
> (CLAUDE.md "Critical Migration Rules"). Trigger and RPC **bodies** live only in the Supabase DB;
> code references cite them by name. Client-side enforcement (the field-worker route guard) is a UX
> boundary — the security boundary is RLS, and RLS hardening is explicitly deferred
> (`AppLayout.tsx:189-190`).

---

## §1 — Current-state map of field-worker surfaces

**Anchor: the allowlist.** Field-worker access is an **allowlist** (Gotcha #44), not a denylist —
`isFieldWorkerAllowed(path)` at `AppLayout.tsx:191-205`. It gates on `isFieldWorkerOnly`
(`AppLayout.tsx:100`, `:208`) — a *pure* field worker (`RoleContext.tsx:78` =
`isFieldWorker && !isAdmin && !isManager`), so an admin who also clocks time is **not** restricted.
Anything not on the list → `navigate('/time-tracker', {replace:true})` (`:210`). New admin routes are
auto-blocked without editing this file.

| Allowlisted route | Rule (AppLayout.tsx) | Page / top component | Data (hooks/queries) | Field-worker actions | Mobile vs desktop |
|---|---|---|---|---|---|
| `/time-tracker` | `:192` | `TimeTracker.tsx` → `MobileTimeTracker.tsx` | imperative `supabase` (no react-query): `loadInitialData` (`:366`) projects `.in(status).range(0,499)` + payees `provides_labor`; `loadTodayEntries` (`:450`, own `user_id` when non-admin `:488-490`); `loadActiveTimers` (`:159`) | clock in/out (insert/update `expenses`), manual entry dialogs, add receipt, lunch toggle | **mobile-only layout** (no `useIsMobile` branch); tabs `timer`/`entries`/`receipts` (`:101`, `?tab=` `:124-146`) |
| `/mentions` | `:193` | `Mentions.tsx` | `useUnreadMentions()` → `useQuery` on `user_notifications` unread, limit 50 (`useUnreadMentions.ts:17-27`) | mark read / mark all read; tap → `link_url?tab=notes` | mobile-first; `PageHeader.mobileActions` |
| `/training`, `/training/*` | `:194-195` | `Training.tsx` (+ `TrainingViewer`, `TrainingAdmin`) | `useMyTraining()` → `training_assignments`⋈`training_content`, `training_completions` (`useTrainingAssignments.ts:161-233`) | open lesson, mark complete (viewer) | `MobileTabSelector` (`sm:hidden`) vs desktop `TabsList`; **note `/training/admin` is reachable via `:195`** |
| `/field-media`, `/field-media/*` | `:196-197` | `FieldMedia.tsx` (+ `FieldPhotoCapture`, `FieldVideoCapture`) | `useQuery(['project-details',id])` on `projects` (`FieldMedia.tsx:43-58`); capture uses `useProjectMediaUpload`, `useCaptureMetadata` (GPS) | pick project, capture photo/video → `project_media` | `MobileTabSelector` vs desktop `TabsList`; FABs gated on `isMobile` |
| `/projects` (list) | `:198` | `Projects.tsx` (static import) | `loadProjects` (`:102`) — `projects`/`estimates`/`quotes`/`change_orders`/RPC `get_profit_analysis_data` | click-through → `/projects/:id/schedule` (`:288-294`); create/FAB **hidden** for field workers | `ProjectsList` (mobile) vs `ProjectsTableView` (desktop); **status default `['in_progress','approved']` when `isFieldWorkerOnly`** (`:55-64`) |
| `/projects/:id/schedule` | `:199` | `ProjectScheduleRoute.tsx` | device-split (`:20-36`): `MobileScheduleView` / `ProjectScheduleView`; data via `useScheduleTasks` (see §6) | view tasks; add note/media via `FieldQuickActionBar` | mobile 5-tab view; desktop Gantt |
| `/projects/:id/capture`, `/capture-video` | `:200` | `FieldPhotoCapture.tsx`, `FieldVideoCapture.tsx` | `useProjectMediaUpload(projectId)`, GPS metadata | capture → upload → `project_media`, GPS + caption flow | full-screen `fixed inset-0`; capture-native |
| `/settings` | `:201` | `Settings.tsx` | `profiles` profile; admin-only `system_settings`; `/version.json` deploy status | edit profile, notif prefs, security; admin sections hidden | responsive grids; no device branch |
| `/change-password`, `/reset-password` | `:202-203` | `ChangePassword.tsx` | — | `supabase.auth.updateUser`, clear `must_change_password` | **registered outside AppLayout** (`App.tsx:111-112`) so the guard effect never runs |

**Not reachable by pure field workers:** `/` (Dashboard) — bounced to `/time-tracker`. `/`'s
`Dashboard.tsx` is admin/manager-only in practice. Realtime is **disabled** on both `/`
(`Dashboard.tsx:65-71`) and `/time-tracker` (`MobileTimeTracker.tsx:431-448`) per Gotchas #53-56.

**Duplicated intent:** the project sub-nav mirrors the allowlist — only the Schedule item carries
`fieldWorkerSafe:true` (`projectNavigation.ts:57`), with a comment telling maintainers to keep it in
sync with the AppLayout guard.

---

## §2 — Role & filter matrix

**Roles** (`RoleContext.tsx`): `app_role` = `admin | manager | field_worker` (`:5`), loaded from
`user_roles` (`:41-44`), multi-role allowed. `isFieldWorkerOnly` (`:78`) is the load-bearing gate
(Rule 24). **Subcontractors are NOT a role** — they are `payees` rows (`payee_type='subcontractor'`,
`is_internal=false`; `types/payee.ts:1-9`). The person↔accounting bridge is `payees.user_id` (Rule
11). A W-2 field worker = auth user + `field_worker` role + linked internal payee; a subcontractor =
payee row that *may* link to a user and *may* provide labor (`provides_labor=true`).

**Access matrix** (rows = persona; a "foreman"/"PM" is just an admin/manager role holder — the app has
no separate foreman/PM role):

| Route | W-2 field worker (field_worker only) | Subcontractor-as-labor (payee + user + field_worker) | Admin / Manager |
|---|---|---|---|
| `/time-tracker` | own entries only (`:488-490`); construction projects only | same as W-2 (appears in worker picker via `provides_labor`) | sees all workers/projects; can review |
| `/projects` | active jobs default; slim cards; no create | same | full list, KPI cards, create/edit/delete |
| `/projects/:id/schedule` | view + notes/media | same | view + Gantt edit (dates/phases) |
| `/mentions`, `/training`, `/field-media`, `/settings` | yes | yes | yes |
| `/expenses`, `/quotes`, `/reports`, `/time-entries` (admin review), everything else | **blocked → `/time-tracker`** | blocked | full |

**Subcontractor pay vs W-2 (where it lives, what differs):**
- Two expense categories: `labor_internal` (W-2) and `subcontractors` (`types/expense.ts:3-4`).
- **The frontend hardcodes `category:'labor_internal'` on clock-in (`MobileTimeTracker.tsx:719`) and
  manual entry**, but the DB trigger **`enforce_time_entry_category_from_payee`** rewrites category +
  amount per payee shape on insert (`WorkerPicker.tsx:38-41`). So a labor-sub's timer entry lands with
  the correct category/amount at the DB layer — this is the single most important "weird rule" and it
  is invisible in the frontend.
- The worker picker deliberately includes both employees and labor-subs:
  `provides_labor=true AND is_active=true AND user_id IS NOT NULL` (`MobileTimeTracker.tsx:398-404`,
  `WorkerPicker.tsx:42-52`).
- CSV import: `PAYEE_TYPE_TO_CATEGORY` (`enhancedTransactionImporter.ts:205-212`) maps
  `subcontractor→subcontractors`, fired only as a fallback when category would otherwise be `OTHER`
  (Rule 6b precedence).
- Labor-cushion math **excludes subcontractor lines** — `laborCalculations.ts:73` filters
  `category === 'labor_internal'` only.
- Receipt vendor picker **excludes subcontractors** (`AddReceiptModal.tsx:407-421`, `filterInternal=false`
  + restricted `filterPayeeTypes`) — receipts are for material/vendor spend, not sub pay (Rule 7).

**Every filter (all render through `EntityFilterBar`, Rule 33).** Critical property: **filter state is
per-page `useState`, holds NO localStorage, and resets on unmount** — only *column visibility/order*
persists (`ReceiptsManagement.tsx:121-167`, `ExpensesList.tsx:224-274`). There is **one** role-varying
default in the entire app.

| Surface | Filters (label · source · default) | Role-varying? | Persistence / weirdness |
|---|---|---|---|
| Projects (`ProjectFilters.tsx:40-68`) | search; status (`PROJECT_STATUSES`); jobType; clientName (searchable, from `clients`); dateRange; budgetRange (`$`) | **YES** — status default `['in_progress','approved']` for `isFieldWorkerOnly` else `[]` (`Projects.tsx:55-64`); Clear-all resets to `[]` (drops the field default); `?status=` URL overrides | none (per-page state) |
| Time entries (`TimeEntrySearchFilters.tsx:32-51`) | status; workerIds (searchable); projectIds (searchable); dateRange | no | 500ms debounce (`TimeEntries.tsx:135`) |
| Receipts (`ReceiptSearchFilters.tsx:43-72`) | status; payeeIds; projectIds; **submittedBy** (only if submitters>0, PR #146); amount (free text); dateRange | no | **90-day window** — `dateFrom` older than window flips `setLoadAll(true)` else results clip (`ReceiptsManagement.tsx:94-102`) |
| Expenses (`ExpensesList.tsx:1661-1748`) | search; period; projects (**omitted when project-scoped**); categories; transactionTypes; matchStatuses; approvalStatuses; splitStatuses; payees; payeeTypes | no | dual-mode (prop vs `useExpensesQuery`, Rule 12) |
| Time-tracker pickers (`MobileTimeTracker.tsx`, **not** EntityFilterBar) | project: `status IN(approved,in_progress)` + construction-or-sandbox (`getProjectCategoryOrFilter`) `.range(0,499)`; worker: `provides_labor` | construction-only scope for field workers | `AddReceiptModal` sticky last-project `localStorage rcg.receipts.lastProjectId.{userId}` (construction only) |

No saved-view / preset system exists.

---

## §3 — Data model inventory for daily assignments

**Central finding: nothing in the schema natively carries "person X → project Y → day Z."** The one
person↔project link is undated; the one per-day surface has no person dimension; per-person-per-day
exists only as *after-the-fact actuals* in `expenses` (time entries).

| Candidate | Exists | Person | Project | Day | Carries per-person-per-day w/o schema change? |
|---|---|---|---|---|---|
| `schedule_notes` JSON (est/CO line items) | yes (`types.ts:902`, `:368`) | **no** | via line-item→estimate→project | phase ranges, not days | **No** — no person key; per-task, per-item; `SchedulePhase` (`types/schedule.ts:8-16`) has no assignee |
| `expenses` (time entries) | yes (`types.ts:1265`) | `user_id`/`payee_id` | `project_id` | `expense_date` | **Structurally yes, semantically no** — it's actuals; forward use overloads amount/category/approval |
| `project_assignments` | yes (`types.ts:2117-2148`) | `user_id` | `project_id` | **no date column** (`assigned_at` = creation ts) | **No** — needs a date column added |
| `projects.owner_id` | yes (`types.ts:2452`, FK→**payees**) | single payee | self | no | No |
| `crew_assignments` / `day_sheets` / `dispatch` / `allocations` / `project_members` / `project_users` / `assignments` / `crew` | **none exist** | — | — | — | — |

**`project_assignments` is the closest reuse — and it is dormant.** It is referenced only in
`docs/DATA_SCHEMA.md`, `docs/API_REFERENCE.md`, and the generated `types.ts` — **zero `src/` usage**.
Nothing reads or writes it (DATA_SCHEMA.md's claim that it's "frequently queried" is stale). Its shape
is `id, project_id, user_id, assigned_at, assigned_by` — a durable membership row, not a per-day dispatch.

**Reuse cost/benefit:**
- **`schedule_notes` JSON** — *Cost:* would require inventing a person key inside a per-item text blob
  read by both schedule loaders via one shared parser (`scheduleNotes.ts`); high risk of drift (Rule 32
  warns two loaders must stay in lockstep). *Benefit:* none. **Reject.**
- **`expenses`** — *Cost:* overloads the accounting ledger with forward (non-actual) rows carrying
  amount/category/approval semantics they shouldn't; would pollute every financial read and the labor
  triggers. *Benefit:* none for forward assignment. **Reject.**
- **`project_assignments` (extend with a date)** — *Cost:* one additive `work_date date` column (+
  optional `task_note text`, `notes text`, `created_by`/`updated_by`) on a table **nothing references**,
  so zero regression surface; but it conflates "member of project" with "dispatched on day" if the
  membership use is ever revived. *Benefit:* strictest reuse; no new table. **Viable.**
- **Minimal new table** — *Cost:* one additive table; but because `project_assignments` is unwired, a
  purpose-built table carries the *same* infra risk (additive, RLS to add) with *cleaner semantics*.
  *Benefit:* no overloading; clear intent.

**Recommendation (Chris/design owns the call):** because per-person-per-day **requires a schema change
either way** (the existing table lacks a date), the decision is semantic, not infra-risk: extend the
dormant `project_assignments` (strictest reuse) **or** add one minimal table
`crew_day_assignments (id, user_id, project_id, work_date, task_note, notes, created_at, created_by,
updated_at, updated_by)` — no more columns than that. Either is additive and can be validated on the
`SYS-TEST` sandbox (Gotcha #21: Supabase preview branches don't fully work here). **Do not** add status
enums, recurrence, or crew-grouping tables — that is over-modeling for a v1.

---

## §4 — Notification rails inventory

Three rails exist. **None is a push stack, and none should be added** — the design's notification needs
map onto existing rails.

**In-app (`user_notifications` + `note_mentions`):** table `types.ts:3800-3841` (`user_id, type,
title, body, link_url, is_read, reference_id, reference_type`). **The only writer today is
`useProjectNotes.ts:97-107` for `type:'mention'`** — despite the schema being explicitly "designed for
future types (approvals, training)". Read via `useUnreadMentions.ts`, surfaced by `NotificationBell` and
`/mentions`. **This is the rail to reuse for assignment notifications** — insert a
`type:'assignment'` row with `link_url` to the schedule; the bell + `/mentions` already render generic
rows. Realtime on this table was intentionally **removed** (Gotcha #53); updates land on refresh/refocus.

**Email (Resend via edge functions, shared `_shared/brandedTemplate.ts`):**

| Function | Trigger today | Audience |
|---|---|---|
| `send-auth-email` | server-to-server from `admin-create-user`/`admin-reset-password`/`forgot-password` | the affected user |
| `send-receipt-notification` | client invoke on receipt capture (`AddReceiptModal.tsx:246`) | fixed `receipts@radcliffcg.com`, reply-to submitter |
| `send-training-notification` | client invoke on training assign (`useTrainingAssignments.ts:112`); per-user magiclink | each assigned user |

**SMS (Textbelt, not Twilio):** `send-sms/index.ts` with **deep-links already built**
(`generateDeepLink` `:26-41`: `clock_in→/time-tracker`, `project→/projects/<id>`, etc.). Triggers:
manual (`SMSComposer.tsx:133`), scheduled campaigns (`ScheduledSMSManager.tsx:448` +
`scheduled_sms_messages` with `cron_expression`, `target_type users|roles`), cron processor
(`process-scheduled-sms`, 5-min cadence). **Audience can already be a role or a user-id set, optionally
scoped to `project_id`.**

**Push (FCM/APNS/web-push): DOES NOT EXIST.** Grep-confirmed zero matches; the SW is Workbox
GenerateSW (caching only, no `push` handler — verified against built `dist/sw.js`); Capacitor has no
push plugin (`package.json:25-31`). 

**Events the design needs (event only, not infra):** *assignment created* / *assignment changed* /
*same-day reassignment* → each is a single insert into `user_notifications` (`type:'assignment'`, link to
the field-worker Today/schedule) **plus optionally** a Textbelt SMS via the existing `send-sms`
deep-link path for same-day changes (highest urgency). **Graceful degradation without push:** in-app
`user_notifications` banner/bell (already wired) as the baseline, SMS for same-day changes (already
wired), email only if a durable record is wanted. No new rail required.

---

## §5 — Receipt capture path

End-to-end (`AddReceiptModal.tsx`, opened from the `/time-tracker` Receipts tab and clock-out flow):
1. **UI:** bottom-sheet modal (`:281`).
2. **Camera:** hidden `<input type="file" accept="image/*">` (`:359-365`) — **not** `getUserMedia`, **not**
   Capacitor Camera; the OS sheet offers camera/library/files. (Real `getUserMedia` in the app is
   audio-only, `useAudioRecording.ts`.)
3. **Validate/read:** `image/*`, max 15 MB, `FileReader` → data URL (`:146-172`).
4. **Storage:** data URL → blob → `supabase.storage.from('time-tracker-documents').upload(...)`,
   path `${user.id}/receipts/${ts}_receipt.jpg` (`:202-208`); 1-yr signed URL via
   `receiptUrls.ts`.
5. **Row:** insert into **`receipts`** (not `expenses`) with `user_id`, `image_url`, `amount`,
   `payee_id`, `project_id || SYS-000 fallback`, `captured_at` (`:216-228`). `approval_status` defaults
   DB-side; admin view treats null as `pending` (`useReceiptFiltering.ts:42`).
6. **Notify:** invoke `send-receipt-notification` (`:246`) → `receipts@radcliffcg.com`.
7. **Admin review:** `ReceiptsManagement.tsx` (from `TimeEntries.tsx` receipts tab) via `useReceiptsData.ts`
   — **90-day default window**, `MAX_ROWS=5000` (`:30-32`), "Load all" widen; stats via RPC
   `get_receipt_stats` over the full table; realtime on `receipts` (`:205`); approve/reject/bulk via
   `useReceiptActions`/`useReceiptBulkActions`, reject-requires-reason.

Receipts are **documentation only** and never feed financials (Rule 7) — the design's "Receipts" IA tab
can reuse this path verbatim.

---

## §6 — Schedule surface today

**Route:** `ProjectScheduleRoute.tsx` — feature-flagged (`isFeatureEnabled("scheduleView")`, else
`Navigate`), device-split at `:20-36` (`MobileScheduleView` vs desktop `ProjectScheduleView`).

**Data source (Rule 32 projection — no schedule table):** both loaders query approved `estimates` →
`estimate_line_items` and approved `change_orders` → `change_order_line_items`
(`useScheduleTasks.ts:80-161`; `ProjectScheduleView.tsx:140-247`), filtered to `SCHEDULABLE_CATEGORIES`.
Dates/state write back to `scheduled_start_date`/`scheduled_end_date`/`duration_days`/`dependencies`/
`schedule_notes` on the line-item rows. Realtime channels on both line-item tables.

**Mobile:** five tabs — Tasks / Notes / Media / Docs / **Materials** (`MobileScheduleView.tsx:20-28`),
URL-driven `?tab=`, count badges from separate queries (`:74-133`). Tasks render via
`FieldScheduleTable` grouped Today/This-Week/Upcoming/Completed.

**Desktop:** `gantt-task-react` with drag-reschedule + `TaskEditPanel`; `gantt/table/materials` toggle
persisted to `localStorage schedule_view_mode_${projectId}`.

**Admin edit UI for assigning people to days: NONE.** `TaskEditPanel` edits task name (read-only),
start/duration, multi-phase date ranges, dependencies, completion, and free-text notes — **no
assignee/payee/crew field**. `ScheduleTask.payee_id/payee_name` exist in the type but are hard-set to
`undefined` (`useScheduleTasks.ts:240-241`) and never populated or edited. The only "who works when"
modeling is phase-based revisits and drag-to-reschedule — task/date, never person. **There is no
spreadsheet import, no inline crew form, nothing.**

---

## §7 — Timer + manual-entry code paths (demote-not-delete)

**Timer** — `MobileTimeTracker.tsx` (1867 lines; single consumer = `TimeTracker.tsx`; route
`App.tsx:117`):
- State `activeTimer` (`:91`), 1s ticker (`:308-312`). Start: `handleClockIn`(`:676`) →
  `proceedWithClockIn`(`:691`) inserts `expenses` `category:'labor_internal'`, `end_time:null` sentinel
  (`:714-729`). Stop: `handleClockOut`(`:982`) → `completeClockOut`(`:781`) updates end_time/amount/
  lunch (`:890-902`), amount = `netHours × payee.hourly_rate` (`:835`).
- `localStorage 'activeTimer'` with **cross-user ownership guard** (`:332`, Gotcha #67); registry
  `SESSION_TIED_LOCAL_STORAGE_KEYS` in `AuthContext.tsx:22`, cleared on SIGNED_OUT.
- Pickers: worker `provides_labor` (`:398-404`), project construction-only `.range(0,499)` (`:375-381`).
- Offline via `addToQueue` (`syncQueue`, `backgroundSync.ts`).

**Manual entry** — shared module `src/components/time-entry-form/`:
- `ManualTimeEntryForm.tsx` + `ManualTimeEntrySheet.tsx` + `useTimeEntryForm.ts`. Fields: `WorkerPicker`
  (`restrictToCurrentUser` locks to self for non-admins), `ProjectPicker`, `DateField`, `TimeRangeField`,
  `LunchSection`, `HoursDisplay`, `NotesField` (writes `description`).
- Four wrapper dialogs write `expenses` with **both `hours` (paid) and `gross_hours` (shift)** (Gotcha
  #17): field `CreateTimeEntryDialog.tsx:83-107` / `EditTimeEntryDialog.tsx:193-221`; admin
  `AdminCreateTimeEntrySheet.tsx:81-105` / `AdminEditTimeEntrySheet.tsx:132-157`.

**Demote-not-delete plan — what MUST survive if the timer UI is moved/hidden:**
- `MobileTimeTracker` is **single-consumer**, so demoting its *route surface* is contained.
- But its imported children are **shared with the admin side and must be preserved**:
  - `time-entry-form/` (the whole module) — used by field `Create/EditTimeEntryDialog` **and** admin
    `AdminCreate/EditTimeEntrySheet` (`pages/TimeEntries.tsx:732,739`). Changing it risks both surfaces.
  - `LunchToggle` — field timer **and** admin `ActiveTimersTable.tsx:22`.
  - `AddReceiptModal` — field timer **and** admin `TimeEntries.tsx:30`.
  - `WeekView`, `ReceiptsList`, `ProjectScheduleSelector`, utils (`timeEntryValidation`,
    `timeEntryCalculations`, `syncQueue`, `sandboxPreferences`).
- **Routes/imports to keep:** `/time-tracker` route + `TimeTracker.tsx` shell (even if the timer becomes
  a secondary action inside a new home); the `expenses`-insert paths (clock-in/out + 4 dialogs).
- **Tests referencing it:** **NONE.** The only test file is `budgetSheetParser.test.ts` (unrelated). No
  vitest coverage guards the timer, manual entry, or admin review — so behavior changes have no safety
  net beyond live verification.

---

## §8 — Offline / PWA story

**Service worker: yes** — Workbox GenerateSW via `vite-plugin-pwa` (`vite.config.ts:102-172`), disabled in
dev (`devOptions.enabled:false`), `registerType:'prompt'`, manual registration in `main.tsx:34` with
`updateViaCache:'none'`. `skipWaiting:false`/`clientsClaim:false` (SW waits for user "Reload Now" toast,
`main.tsx:48-69`). No committed `public/sw.js` — generated at build.

**What's cached:** precache `**/*.{js,css,html,ico,png,svg,woff2}` (app shell); **one** runtime rule —
Supabase requests → `NetworkFirst`, `supabase-api`, maxEntries 50, maxAge 24h, 10s timeout
(`vite.config.ts:157-170`). Version probe `/version.json` (Gotcha #46) drives Settings' update check +
`forceUpdate` escape hatch.

**Offline data story: write-queue-centric, not read-centric.** `backgroundSync.ts` queues
`clock_out`/`edit_entry`/`delete_entry`/`media_upload` in IndexedDB (`syncQueue`), processed on `online`
(retry max 3). There is **no read prefetch** — nothing pre-caches future data.

**Prefetch "tomorrow's assignment":** net-new but **low incremental cost** — the SW already exists and
already NetworkFirst-caches Supabase responses for 24h. A prefetch would be: on a chosen event (e.g. last
clock-out of the day), fire the assignment read so the NetworkFirst cache is warm, or write the day's
assignment payload to IndexedDB alongside the existing queue. No new SW, no new caching infra — a single
read + store on an existing trigger.

---

## §9 — Gap list

Delta between current state (§1-8) and the locked design: two-sided system (admin Crew Dispatch board +
field-worker experience), persistent "next stop" ambient presence, same-day change flow with
notification, offline cache for tomorrow, best-in-class field home (Today/Time/Receipts/Projects/Notes
IA), timer demoted.

| # | Design element | Status | Smallest way to close |
|---|---|---|---|
| 1 | Per-person-per-day assignment store | **net-new** | One additive column on dormant `project_assignments` **or** one minimal `crew_day_assignments` table (§3). No enums/recurrence. Validate on SYS-TEST. |
| 2 | Admin **Crew Dispatch board** (assign person→project→day) | **net-new** | New admin route (auto-blocked for field workers) writing the §3 store; reuse `EntityFilterBar`, `ProjectPicker`, `WorkerPicker` (`provides_labor`). No new picker infra. |
| 3 | Field-worker **"next stop" ambient presence** | **partial** | Read the §3 store for `user_id`+today/tomorrow; surface on the field home. Data path new, UI primitives (cards, `MobilePageWrapper`) exist. |
| 4 | **Same-day change flow + notification** | **partial** | On dispatch mutation, insert `user_notifications` `type:'assignment'` (existing rail §4) + optional `send-sms` deep-link (existing). No new rail. |
| 5 | **Offline cache for tomorrow** | **partial** | Prefetch the §3 read on last clock-out into the existing NetworkFirst/IndexedDB layer (§8). No new SW. |
| 6 | **Field home IA** (Today / Time / Receipts / Projects / Notes) | **partial** | Recompose existing surfaces: Time=`MobileTimeTracker` (demoted), Receipts=`AddReceiptModal`+`ReceiptsList`, Projects=`Projects.tsx` field variant, Notes=`ProjectNotesTimeline`/`NoteComposer`. New shell, reused leaves. Add the new home to the allowlist (Gotcha #44). |
| 7 | **Timer demoted** | **exists (to relocate)** | Keep `MobileTimeTracker` + its shared children (§7); move it to a secondary action inside the new Today home. No deletion. |
| 8 | Notification rail for assignments | **exists** | `user_notifications` generic store already renders in bell + `/mentions`; add a writer + `type` (§4). |

---

## §10 — Risk register

| # | Risk | Severity | Mitigation | Verification |
|---|---|---|---|---|
| R1 | New field-home on `/` or a new landing re-introduces the auth-loop (Gotchas #53-56) if it mounts realtime or calls `getUser()` | **P0** | New home must have **zero realtime subscriptions** and read `user` from `useAuth()`/context, never `supabase.auth.getUser()`; keep `signIn` using `data.user` (`AuthContext.tsx:114-157`) | Log in as each role tier; watch full login→land→stay-30s; pull `auth.audit_log_entries` for `token_revoked` clusters (Gotcha #56 SQL) |
| R2 | New routes silently blocked (or field-only routes silently exposed) via the allowlist | **P1** | Add each new field-worker route to `isFieldWorkerAllowed` (`AppLayout.tsx:191-205`) **and** mark the nav item `fieldWorkerSafe` (`projectNavigation.ts`); admin routes need no change (auto-blocked). Remember the guard is UX-only — RLS is the real boundary | Sign in as pure field worker; confirm each new route lands, each admin route bounces |
| R3 | Touching the shared `time-entry-form/` module (demoting the timer) breaks the **admin** review flow | **P1** | Treat `time-entry-form/`, `LunchToggle`, `AddReceiptModal` as shared contracts; change behavior via props, not edits; no test net exists (§7) so live-verify both sides | Exercise field create/edit AND admin `AdminCreate/EditTimeEntrySheet` after any change |
| R4 | Assignment mutations don't refresh dependent views (cache fanout, Gotcha #27) | **P1** | Any write to the §3 store must invalidate every query key reading it (bell/`user_notifications`, field home, dispatch board); grep keys before shipping | Mutate, confirm bell + home + board update without F5 |
| R5 | Overloading `expenses` or `schedule_notes` to store assignments corrupts financials/schedule (Rule 1, Rule 32) | **P0** | Do **not** reuse `expenses`/`schedule_notes` for forward assignment (§3); use the dedicated store; keep all hour-cost math DB-side (Rule 1) | Confirm labor triggers/`laborCalculations` untouched; SYS-TEST margin/cushion unchanged |
| R6 | Surfacing dispatch data across roles leaks data past RLS | **P1** | Add RLS on the §3 store from day one (field worker sees own rows; admin/manager all); do not rely on the client allowlist as the boundary (`AppLayout.tsx:189-190`) | Query as a field-worker JWT in devtools; confirm only own rows return |
| R7 | The one role-varying filter default (`Projects` status) regresses when the field home reuses `Projects.tsx` | **P2** | Preserve `Projects.tsx:55-64` (`isFieldWorkerOnly ? ['in_progress','approved'] : []`); note Clear-all already drops it | Load `/projects` as field worker; confirm active-jobs default |
| R8 | Adding a push stack "because there's no push" balloons scope and adds an SW `push` handler that risks the update flow | **P2** | Push does **not** exist and is **not** required (§4); degrade gracefully to `user_notifications` + SMS; do not add FCM/APNS/web-push | Confirm no `push` handler added to the SW; `dist/sw.js` stays caching-only |
| R9 | Assignment SMS abuses/duplicates the existing Textbelt quota/cron | **P2** | Reuse `send-sms` deep-links + quota check (`check-sms-quota`); scope same-day-change SMS to genuine changes only | Send a test dispatch change; confirm one SMS, quota decremented once |
| R10 | Config surface regression | **P2 (low)** | `useSiteSetting`/`site_settings` **do not exist** (grep-confirmed); config = `featureFlags.ts` (env) + `sandboxPreferences` (localStorage). Gate new surfaces behind an env flag if staged rollout is wanted | Toggle the flag; confirm surface hides/shows |

---

*Citations reference the primary working tree `E:\profitbuild-dash\...`; duplicate copies under
`.claude/worktrees/*` were ignored. Line numbers are current as of branch `audit/field-worker-experience`.*

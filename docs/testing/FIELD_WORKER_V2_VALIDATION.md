# Field-Worker v2 — Autonomous Validation Suite

**Purpose:** validate the entire field-worker redesign (PRs #154/#155/#156/#157) end-to-end with
zero human interaction after setup. Written to be executed by a Claude Code agent with:
- the **Claude preview browser** signed in as **Tom Finn** (field-worker-only account), and
- the **Supabase MCP** (project `clsjdxwbsjbhjibvlqbz`) for seeding, assertions, and cleanup.

**Data policy:** every row this suite creates lives on the **SYS-TEST sandbox project** and is
deleted in §11. It never modifies real project data, never signs out, and never touches `payees`
or role tables.

**Fixed identifiers (production):**

| Thing | Value |
|---|---|
| Tom Finn (field_worker only) | `88e6782c-edab-458c-a80b-c18a084ca431` |
| Tom Finn internal payee (for §9) | `0cf39010-7835-42b8-8bdd-eab088119fa4` |
| Chris admin (used as `created_by` actor) | `8768d927-9096-449f-855a-24fde8a33b0b` |
| SYS-TEST project | `c63b4dea-4a69-448b-b27b-da7b41179a05` |
| Danny Boy (second field worker, negative tests) | `ee706884-33a8-4d25-a06e-74a41e05a890` |
| App URL | `http://localhost:5225` (dev) or `https://rcgwork.com` (prod) |

**Reporting:** record each numbered check as PASS / FAIL with the observed value. Suite passes
only at 100%. On any FAIL: stop, capture a screenshot + console errors, still run §11 cleanup.

---

## §0 Preconditions (operator does exactly one thing)

0.1 Operator signs in as Tom Finn in the preview browser. **Everything after this is the agent.**
0.2 Agent verifies identity — navigate to `/settings`; page shows Tom Finn's profile
    (or check `document.body` includes "Tom Finn" after opening the sidebar user chip). PASS = Tom.
0.3 Enable sandbox visibility on this device (SYS-TEST is `category='system'`, pickers include it
    only with the toggle; the Settings switch is admin-only, so set it directly):
    `javascript: localStorage.setItem('showSandboxProject', 'true')` — then verify via
    `localStorage.getItem('showSandboxProject')`. (Canonical key per
    `src/utils/sandboxPreferences.ts` — verified 2026-07-13; it has NO `rcg.` prefix.)
    PASS = value `"true"`.
0.4 SQL: confirm zero pre-existing suite rows:
    ```sql
    SELECT count(*) FROM crew_day_assignments WHERE task_note LIKE 'VALSUITE%';
    SELECT count(*) FROM expenses WHERE description LIKE 'VALSUITE%';
    ```
    PASS = 0 and 0.

## §1 Flag-OFF baseline (legacy experience byte-identical)

1.1 SQL — force Tom's flag OFF:
    ```sql
    INSERT INTO feature_flag_user_overrides (flag_id, user_id, enabled)
    SELECT id, '88e6782c-edab-458c-a80b-c18a084ca431', false
    FROM feature_flags WHERE flag_name = 'field_worker_v2'
    ON CONFLICT (flag_id, user_id) DO UPDATE SET enabled = false;
    ```
1.2 Browser — navigate `/`, wait for settle. PASS = URL is `/time-tracker`, page shows the tabbed
    timer (text contains "Timer", "Entries", "Receipts", "CLOCK IN"); no bottom Today/Time/… tab bar.
1.3 Hard reload (`window.location.reload()`) twice. PASS = still `/time-tracker` both times, no
    bounce to `/auth`.
1.4 Navigate `/receipts`. PASS = bounced to `/time-tracker` (flag-off users don't get the tab routes).

## §2 Flag-ON landing + loop matrix

2.1 SQL — flag ON (same statement as 1.1 with `true` / `enabled = true`).
2.2 Navigate `/`. PASS = URL stays `/`, page renders "Today" + the bottom tab bar
    (Today · Time · Receipts · Projects · Notes) + the Next Stop chip area.
2.3 Hard reload 3×, checking after each: URL still `/`, Today rendered, never `/auth`,
    never `/time-tracker`. PASS = 3/3 deterministic. (This is the regression test for the
    flag-resolution race fixed in `66dc4945`.)
2.4 Header title says "Today" (mobile fixed header). PASS.
2.5 Auth-log canary — SQL:
    ```sql
    SELECT count(*) FROM (
      SELECT created_at, lag(created_at) OVER (PARTITION BY payload->>'actor_username' ORDER BY created_at) AS prev
      FROM auth.audit_log_entries
      WHERE payload->>'action' = 'token_refreshed' AND created_at > NOW() - INTERVAL '30 minutes'
    ) t WHERE prev IS NOT NULL AND EXTRACT(EPOCH FROM (created_at - prev)) < 1;
    ```
    PASS = 0 (no refresh cascade).
2.6 Blocked-route bounce: navigate `/quotes`, then `/expenses`, then `/dashboard`.
    PASS = each lands back on `/` (Today) with no flash of financial data in the final DOM.

## §3 Today home content

3.1 SQL — seed today's assignment (use the CLIENT's local date for `work_date`, read it from the
    browser first via `javascript: new Date().toLocaleDateString('sv')` → `YYYY-MM-DD` = `{TODAY}`;
    compute `{TOMORROW}` likewise):
    ```sql
    INSERT INTO crew_day_assignments (user_id, project_id, work_date, start_time, task_note, created_by)
    VALUES
      ('88e6782c-edab-458c-a80b-c18a084ca431', 'c63b4dea-4a69-448b-b27b-da7b41179a05', '{TODAY}',    '07:30', 'VALSUITE today — framing east wall, gate code 4471', '8768d927-9096-449f-855a-24fde8a33b0b'),
      ('88e6782c-edab-458c-a80b-c18a084ca431', 'c63b4dea-4a69-448b-b27b-da7b41179a05', '{TOMORROW}', '08:00', 'VALSUITE tomorrow — punch list', '8768d927-9096-449f-855a-24fde8a33b0b');
    ```
3.2 Navigate `/` (or reload). PASS = hero card shows "NEXT STOP", "SYS-TEST",
    "7:30 AM", and the full task note text incl. "gate code 4471".
3.3 Tomorrow section shows the 8:00 AM punch-list row. PASS.
3.4 Week strip: today's dot is **amber** (assignment exists, no time entry yet). PASS.
3.5 Get Directions: SYS-TEST has no address → the hero renders the locator's explicit
    "No address on file" state (never a broken button). PASS.
    *(Optional richer check: assignments on a real addressed project show Get Directions →
    a sheet with Apple Maps / Google Maps / Waze / Copy — only run read-only, do not create
    rows on real projects.)*
3.6 Tap the hero card. PASS = navigates to `/projects/c63b4dea-…/schedule`, the project header
    shows SYS-TEST + the tabbed field schedule (Tasks/Notes/Media/Docs/Materials), NO Gantt,
    NO Next Stop chip overlapping the header, and BOTH bottom bars stacked (Note/Camera/Attach
    above Today/Time/…).

## §4 Next Stop chip

4.1 On `/` the chip reads "Next stop: SYS-TEST …" with the 7:30 AM pill. PASS.
4.2 Tap the chip → bottom sheet lists today's stop(s) in order. PASS.
4.3 Tap the stop row → lands on the SYS-TEST schedule route. PASS.
4.4 Chip persists on `/time-tracker`, `/receipts`, `/my-projects`, `/notes` — but NOT on
    `/projects/…` routes. PASS = all five observations.

## §5 Tab routes

5.1 **Time** (`/time-tracker`): renders FieldTimeLanding — "Add time entry" primary button,
    "Copy yesterday" + "Copy last Friday", weekly summary with day dots, Recent entries.
    NO Timer/Entries/Receipts pill strip and NO visible timer affordance (all v2 timer entry
    points removed Jul 15 2026 per usage data — Rule 35; `/time-tracker/timer` survives as the
    unlisted escape hatch checked in 5.5). PASS.
5.2 **Receipts** (`/receipts`): header "Add receipt" button present; NO floating circular FAB
    (single affordance); list shows only Tom's receipts (count must equal
    `SELECT count(*) FROM receipts WHERE user_id = '88e6782c-…'`). PASS = UI count == SQL count.
5.3 **Projects** (`/my-projects`): slim cards; includes SYS-TEST (sandbox toggle on); tapping a
    card opens that project's schedule. PASS.
5.4 **Notes** (`/notes`): project picker renders; select SYS-TEST → notes timeline + composer
    appear; back returns to the picker. PASS.
5.5 **Timer** (`/time-tracker/timer`): timer-only surface (Team member = Tom Finn, CLOCK IN,
    no pill strip), chip + tab bar still present. PASS.

## §6 Time-entry forms (the money path)

6.1 On `/time-tracker` tap "Add time entry" → the shared entry sheet opens; worker is locked to
    Tom; pick project SYS-TEST; set 08:00–12:00, no lunch; description
    `VALSUITE manual entry`; save. PASS = success toast, sheet closes.
6.2 SQL assert:
    ```sql
    SELECT count(*), max(hours), max(gross_hours) FROM expenses
    WHERE user_id = '88e6782c-…' AND description LIKE 'VALSUITE manual entry%'
      AND expense_date = '{TODAY}' AND is_time_entry = true;
    ```
    PASS = 1 row, hours = 4.00, gross_hours = 4.00.
6.3 **Auto-allocation is NOT expected here** — SYS-TEST has no task-linked assignment
    (`estimate_line_item_id` is NULL on the seeds), so:
    `SELECT count(*) FROM expense_line_item_correlations c JOIN expenses e ON e.id = c.expense_id WHERE e.description LIKE 'VALSUITE%'`
    PASS = 0. *(The positive auto-allocation path is DB-tested in §9.)*
6.4 Week strip / day dots: reload `/` — today's dot is now **filled** (entry exists), paid hours
    show 4.0. PASS.
6.5 Recent entries on `/time-tracker` lists the VALSUITE entry; tap it → edit sheet opens with
    the values; cancel. PASS.
6.6 Copy yesterday: with no entries yesterday the button is disabled/explains itself; PASS =
    no crash, sane state either way. *(If yesterday has real entries for Tom, do NOT save the
    copy — open the review sheet, verify rows render with checkboxes, then cancel.)*

## §7 Notifications loop

7.1 SQL — simulate an admin dispatching Tom for tomorrow:
    ```sql
    INSERT INTO crew_day_assignments (user_id, project_id, work_date, start_time, task_note, created_by)
    VALUES ('88e6782c-…', 'c63b4dea-…', '{TOMORROW}', '09:30', 'VALSUITE notif test', '8768d927-…')
    RETURNING id;  -- {ASN_ID}
    ```
7.2 SQL assert the trigger wrote the ping:
    `SELECT count(*) FROM user_notifications WHERE reference_id = '{ASN_ID}' AND type = 'assignment';`
    PASS = 1.
7.3 Browser: navigate anywhere (route change = refetch) → bell shows the orange dot; sidebar
    badge "Notifications" ≥ 1. PASS.
7.4 Open `/mentions` → row "New assignment: SYS-TEST … 9:30 AM … VALSUITE notif test". PASS.
7.5 Tap it. PASS = navigates to `/`, and the bell dot clears (optimistic mark-read).
7.6 SQL — reassign to Danny: `UPDATE crew_day_assignments SET user_id = '{DANNY}', updated_by = '{CHRIS}' WHERE id = '{ASN_ID}';`
    Assert: Tom got "Assignment removed…" (1 row) and Danny got "New assignment…" (1 row). PASS.
7.7 SQL — delete `{ASN_ID}`; assert Danny got "Assignment canceled…" (1 row). PASS.

## §8 RLS negatives (security)

8.1 In the browser console (runs as Tom's JWT):
    ```javascript
    // via the app's supabase client if exposed, else skip to SQL simulation below
    ```
    SQL simulation (service role, JWT-simulated as Tom):
    ```sql
    BEGIN; SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub":"88e6782c-edab-458c-a80b-c18a084ca431","role":"authenticated"}', true);
    SELECT count(*) FROM crew_day_assignments WHERE user_id != '88e6782c-edab-458c-a80b-c18a084ca431'; -- expect 0
    SELECT count(*) FROM crew_day_assignments_field_view;                                              -- own rows only
    SELECT string_agg(column_name, ',') FROM information_schema.columns WHERE table_name = 'crew_day_assignments_field_view'; -- no admin_notes
    ROLLBACK;
    ```
    PASS = 0 foreign rows; the view column list contains NO `admin_notes`.
8.2 Insert attempt as Tom (same simulation): INSERT into `crew_day_assignments` → expect
    SQLSTATE `42501`. PASS = denied.

## §9 Dispatch auto-allocation (DB chain, positive path)

Run the self-contained SQL block below (validated green 2026-07-13). It creates a draft estimate +
labor line + task-linked assignment + time entry on SYS-TEST, asserts the
`expense_line_item_correlations` row exists with `auto_correlated = true`,
`confidence_score = 95`, `correlation_type = 'estimated'`, and a note citing the assignment id —
then deletes everything it made. The fixed UUIDs make cleanup exact and the block idempotent-safe.
Bonus negative baked in: any UNLINKED same-day assignment for Tom (e.g. the §3.1 seed) must be
ignored by the trigger — the correlation must point at the linked line. PASS = 1 correlation row
as described AND zero residue afterwards.

`{TOM_PAYEE}` = Tom Finn's internal payee = `0cf39010-7835-42b8-8bdd-eab088119fa4`
(re-derive if ever stale: `SELECT id FROM payees WHERE user_id = '88e6782c-…' AND is_internal`).

```sql
-- Seed (replace {TODAY}; 12:00Z–16:00Z = 8:00 AM–12:00 PM ET)
INSERT INTO estimates (id, project_id, estimate_number, status)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'c63b4dea-4a69-448b-b27b-da7b41179a05', 'VALSUITE-EST-9', 'draft');

INSERT INTO estimate_line_items (id, estimate_id, category, description, quantity, price_per_unit, cost_per_unit, labor_hours)
VALUES ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'labor_internal', 'VALSUITE autoalloc labor line', 8, 75, 30, 8);

INSERT INTO crew_day_assignments (id, user_id, project_id, work_date, start_time, task_note, created_by, estimate_line_item_id)
VALUES ('aaaaaaaa-0000-4000-8000-000000000003', '88e6782c-edab-458c-a80b-c18a084ca431', 'c63b4dea-4a69-448b-b27b-da7b41179a05', '{TODAY}', '13:00', 'VALSUITE autoalloc linked', '8768d927-9096-449f-855a-24fde8a33b0b', 'aaaaaaaa-0000-4000-8000-000000000002');

INSERT INTO expenses (id, project_id, payee_id, user_id, category, transaction_type, amount, hours, gross_hours, start_time, end_time, expense_date, description)
VALUES ('aaaaaaaa-0000-4000-8000-000000000004', 'c63b4dea-4a69-448b-b27b-da7b41179a05', '{TOM_PAYEE}', '88e6782c-edab-458c-a80b-c18a084ca431', 'labor_internal', 'expense', 120, 4, 4, '{TODAY}T12:00:00Z', '{TODAY}T16:00:00Z', '{TODAY}', 'VALSUITE autoalloc entry');

-- Assert (expect exactly 1 row: line …0002, estimated, 95.00, auto_correlated=true, note cites …0003)
SELECT expense_id, estimate_line_item_id, correlation_type, confidence_score, auto_correlated, notes
FROM expense_line_item_correlations
WHERE expense_id = 'aaaaaaaa-0000-4000-8000-000000000004';

-- Optional UI side-trip BEFORE cleanup (covers §6.4/§6.5 read-side while §6.1 is picker-blocked):
-- reload `/` → today's dot filled + 4.0 paid hrs; /time-tracker → Recent entries row → edit sheet → Cancel.

-- Cleanup (order matters: correlation → expense → assignment → line → estimate)
DELETE FROM expense_line_item_correlations WHERE expense_id = 'aaaaaaaa-0000-4000-8000-000000000004';
DELETE FROM expenses WHERE id = 'aaaaaaaa-0000-4000-8000-000000000004';
DELETE FROM crew_day_assignments WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003';
DELETE FROM estimate_line_items WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002';
DELETE FROM estimates WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';

-- Verify zero residue (expect 0)
SELECT (SELECT count(*) FROM estimates WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001')
     + (SELECT count(*) FROM estimate_line_items WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002')
     + (SELECT count(*) FROM crew_day_assignments WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003')
     + (SELECT count(*) FROM expenses WHERE id = 'aaaaaaaa-0000-4000-8000-000000000004')
     + (SELECT count(*) FROM expense_line_item_correlations WHERE expense_id = 'aaaaaaaa-0000-4000-8000-000000000004') AS s9_residue;
```

Note: the §9 assignment INSERT fires `notify_crew_assignment_change()` — the extra unread ping for
Tom is expected and is swept by §11's notification cleanup.

## §10 Console + visual sweep

10.1 `read_console_messages(onlyErrors)` after the full walk. PASS = no NEW errors from this run
     (pre-existing HMR noise in a dev session is ignorable; production must be zero).
10.2 Screenshots at 390×844 and 768×1024 of `/`, `/time-tracker`, and the SYS-TEST schedule.
     PASS = no overlapping bars, no clipped tab labels, no horizontal page scroll.

## §11 Cleanup (ALWAYS run, even on failure)

```sql
DELETE FROM expense_line_item_correlations
  WHERE expense_id IN (SELECT id FROM expenses WHERE description LIKE 'VALSUITE%');
DELETE FROM expenses WHERE description LIKE 'VALSUITE%';
DELETE FROM crew_day_assignments WHERE task_note LIKE 'VALSUITE%';
DELETE FROM estimate_line_items WHERE description LIKE 'VALSUITE%';
DELETE FROM estimates WHERE estimate_number LIKE 'VALSUITE%';
DELETE FROM user_notifications WHERE reference_type = 'crew_day_assignment'
  AND (title LIKE '%SYS-TEST%' OR body LIKE '%VALSUITE%');
DELETE FROM activity_feed WHERE project_id = 'c63b4dea-4a69-448b-b27b-da7b41179a05'
  AND created_at > NOW() - INTERVAL '2 hours';
-- verify
SELECT (SELECT count(*) FROM expenses WHERE description LIKE 'VALSUITE%')
     + (SELECT count(*) FROM crew_day_assignments WHERE task_note LIKE 'VALSUITE%')
     + (SELECT count(*) FROM estimates WHERE estimate_number LIKE 'VALSUITE%')
     + (SELECT count(*) FROM estimate_line_items WHERE description LIKE 'VALSUITE%') AS residue; -- expect 0
```
(The correlation/line/estimate deletes are a safety net for a run that aborts mid-§9 — §9's own
cleanup normally removes them. Order matters: correlations before expenses/lines.)
Leave Tom's `field_worker_v2` override in whatever state the operator wants (default: ON for
dogfooding). Do NOT delete the override rows for Chris's accounts.

## §12 Operator-assisted appendix (NOT agent-executable — agents must never type passwords)

- Sign-out → sign-in ×3 (both flag states): lands correctly each time, no loop.
- Real-device pass on an actual iPhone + iPad (safe-area insets, `tel:` links, maps app handoff).

## Result format

```
FIELD_WORKER_V2 VALIDATION — {date} — {dev|prod}
§1 1.1–1.4: PASS/FAIL …
…
TOTAL: n/n PASS. Residue check: 0. Auth canary: 0 clusters.
```

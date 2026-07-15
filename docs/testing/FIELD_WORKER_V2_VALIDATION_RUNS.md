# Field-Worker v2 Validation — Run Log

Append one section per run of [FIELD_WORKER_V2_VALIDATION.md](FIELD_WORKER_V2_VALIDATION.md)
(newest first). Keep the suite doc itself a clean spec; observed results live here.

---

## Run 3 (§6 money path, full) — 2026-07-15 — dev, agent-executed, signed in as Tom Finn

Scope: Run 1's BLOCKED section, re-run after the ProjectPicker sandbox fix
(PR [#162](https://github.com/Cradcliff187/profitbuild-dash/pull/162), commit authored in the
task_ce6d4f8c session and adopted/cherry-picked). Verified **on the PR branch pre-merge**, then
squash-merged to `main` as `c38bab37`. Tree also included the Today project-first change
(PR [#161](https://github.com/Cradcliff187/profitbuild-dash/pull/161), merged `09abfd4e` — hero
falls back to "Your last site"; quick actions now Log time · Receipt · Note · Projects).

```
§6.1 PASS ✓ — Add Time Entry sheet: worker locked to Tom; SYS-TEST now appears in the project
   dropdown and selects ("SYS-TEST - Sandbox (Test Project)"); 8:00 AM–12:00 PM committed via the
   time pickers (Shift 4.0h / Paid 4.0h, lunch off); description "VALSUITE manual entry";
   Save → "Time entry created" toast, sheet closes.
§6.2 PASS ✓ — SQL: 1 row, hours = 4.0000, gross_hours = 4.0000, expense_date = today,
   is_time_entry = true.
§6.3 PASS ✓ — 0 expense_line_item_correlations for the VALSUITE entry (the seeded UNLINKED
   same-day assignment was correctly ignored by the auto-allocation trigger).
§6.4 PASS ✓ — Today week strip: today's dot filled ("time logged"), 4.0 paid hrs.
§6.5 PASS ✓ — Recent entries row → Edit Time Entry sheet with all values; the Run-1 caveat is
   RESOLVED: the Project field now displays "SYS-TEST - Sandbox (Test Project)" (was blank);
   Cancel leaves the row untouched.
§6.6 PASS ✓ (carried from Run 1 — no entries yesterday → button disabled, sane state).
§10.1 (this run): "[hmr] Failed to reload" noise from live-editing during the dev session —
   ignorable per the rule. One REAL pre-existing error observed twice: batch createSignedUrls
   called with an empty paths array (StorageApiError) on a field-worker surface — not from the
   changed files (none touch storage); guard-fix chip spawned (task_319611b1).
Cleanup: residue 0 (expenses, assignments, notifications, activity_feed).
```

**Suite status after Run 3: every agent-executable check (§0–§11) has now PASSed.**
Remaining: §12 operator-only appendix (sign-in cycles ×3 both flag states; real-device
iPhone/iPad pass), and production publish + `/version.json` buildTime confirmation.

---

## Run 2 (targeted §5.4 re-verify) — 2026-07-13 — dev, agent-executed, signed in as Tom Finn

Scope: re-run of Run 1's FAIL after the chip fix (PR [#159](https://github.com/Cradcliff187/profitbuild-dash/pull/159)).
Verified **on the PR branch pre-merge** (local branch at PR head; Vite dev server on the signed-in
5225 origin), then squash-merged to `main` as `dddcf394`.

```
§5.4 PASS ✓ — /notes picker → SYS-TEST → timeline + composer → back button hittable
   (elementFromPoint returns the button, rect [20,144,44,44] clear of the chip) → tap returns to
   the picker, stops sheet does NOT open.
Chip geometry PASS — chip bar flush under the 67px fixed header (y=67, computed top: 0px);
   the 67–134px blank band is gone.
Heading sweep PASS — H1 visible AND hittable on all five tabs: Today (+ date line), Time,
   Receipts, Projects, Notes picker.
Console: 0 errors. Seed cleaned (residue 0).
```

Still open after Run 2: §6.1–6.3 (ProjectPicker sandbox gap, fix in flight task_ce6d4f8c) and the
pre-existing scroll-pinning design gap PR #159 documented (chip scrolls away with the document on
long pages — behavior unchanged by the fix; follow-up chip task_fc6140d0, needs a shell-height
decision).

---

## Run 1 — 2026-07-13 — dev (localhost:5225), agent-executed, signed in as Tom Finn

```
FIELD_WORKER_V2 VALIDATION — 2026-07-13 — dev
§0 0.2 PASS (Tom Finn, tomfinn@myyahoo.com) · 0.3 PASS (showSandboxProject=true) · 0.4 PASS (0,0)
§1 1.1–1.4 PASS (flag OFF → /time-tracker legacy tabbed timer; 2/2 reloads stable; /receipts bounced)
§2 2.1–2.6 PASS (Today + 5-tab bar at /; 3/3 reload race clean; header "Today"; auth canary 0;
   /quotes /expenses /dashboard all bounce to / with no financial data in final DOM)
§3 3.1–3.6 PASS (hero: NEXT STOP · SYS-TEST · 7:30 AM · full note w/ gate code; tomorrow 8:00 row;
   Monday dot amber "assigned, no time logged"; "No address on file" state; hero → schedule route
   with 5 tabs, no Gantt, no chip, both bottom bars stacked)
§4 4.1–4.4 PASS (chip text+pill; sheet lists today's stops; stop row → schedule; chip present on
   time-tracker/receipts/my-projects/notes and absent on /projects/…)
§5 5.1 PASS (FieldTimeLanding complete, no pill strip) · 5.2 PASS (UI 1 == SQL 1, no FAB) ·
   5.3 PASS (slim cards incl. SYS-TEST → schedule) · 5.4 FAIL ✗ (see below) ·
   5.5 PASS (timer-only, Tom locked, CLOCK IN, chip + tab bar present)
§6 6.1–6.3 BLOCKED ◼ (see below) · 6.4 PASS (dot filled, 4.0 paid hrs — via §9-seeded entry) ·
   6.5 PASS* (edit sheet opens w/ correct worker/date/times/hours; Project field blank — same
   blocker as 6.1) · 6.6 PASS (0 entries yesterday → button disabled, sane)
§7 7.1–7.7 PASS (INSERT → 1 "New assignment: SYS-TEST" ping; bell dot + 3 unread; Notifications
   page row; tap → / + optimistic unread 3→2; reassign → Tom "Assignment removed" + Danny "New
   assignment"; delete → Danny "Assignment canceled", 1 row each)
§8 8.1 PASS (JWT-simulated as Tom: 0 foreign base rows; field view = own 2 rows; view columns
   contain NO admin_notes) · 8.2 PASS (INSERT denied, SQLSTATE 42501)
§9 PASS (auto-correlation row: line …0002, correlation_type=estimated, confidence 95.00,
   auto_correlated=true, note cites assignment …0003; the coexisting UNLINKED same-day assignment
   was correctly ignored; zero residue after self-cleanup)
§10 10.1 PASS (0 console errors across the entire run) · 10.2 PASS at 390×844 and 768×1024
   (no horizontal scroll; bottom bars stack 703–780 / 787–844 at 390; iPad gets the tabbed field
   schedule, NOT the admin Gantt; full-width layout confirmed via DOM rects)
§11 PASS — residue 0 (expenses, assignments, notifications, activity_feed, §9 estimate rows)

TOTAL: 39/41 executable checks PASS · 1 FAIL · 3 BLOCKED (one root cause).
Residue check: 0. Auth canary: 0 clusters (2-hour window). Tom's flag left ON.
```

### FAIL — §5.4 (+ page headings on every v2 tab): NextStopChip renders 67px too low

- `AppLayout.tsx` gives `<main>` `pt-[67px]` (fixed-header clearance) AND passes `!top-[67px]` to
  the chip. Chromium resolves the sticky constraint against the scrollport's content edge (which
  already includes the padding), so the chip is pushed from its natural y=67 to y=134 — leaving a
  blank band under the header and overlaying the first ~45px of every tab page's content.
- Worst casualty: `/notes` selected-project view — "Back to project list" button rect
  [20,144,44×44] fully under chip bar [16,142,342×44]; `elementFromPoint` at its center returns
  the chip; tapping "back" opens the stops sheet instead. Occlusion applies in BOTH chip states
  (the "No assignment today" div also swallows taps).
- All five tab pages' H1/heading blocks are hidden under the chip (cosmetic tier).
- Fix in flight: task_d2e03a93 (candidate `!top-0`; must browser-verify scroll-pinning at 390 and
  a long-page scroll). Re-run §5.4 + heading spot-check after it lands.

### BLOCKED — §6.1–6.3: time-entry ProjectPicker can't offer SYS-TEST

- `src/components/time-entry-form/fields/ProjectPicker.tsx` (~line 62) hardcodes
  `category.eq.construction` + PTO project numbers and never consults
  `getProjectCategoryOrFilter()`, so the sandbox toggle cannot surface SYS-TEST (verified: 21
  options, no SYS-TEST). The suite's data policy forbids entries on real projects → the form-save
  money path (§6.1 save, §6.2 hours assertion, §6.3 no-correlation negative) is untestable.
- Same gap makes the edit sheet's Project field render "Select project..." for SYS-TEST entries.
- Salvage: §6.4/§6.5 read-side were verified against the §9 SQL-seeded entry (now codified in the
  suite's §9 block). DB-side write semantics covered by §9.
- Fix in flight: task_ce6d4f8c. Re-run all of §6 after it lands.

### Anomalies / notes

- One-off during §2.3 prep: the page self-navigated `/` → `/projects` → 225-134 schedule with no
  agent input; not reproducible across 4 subsequent reloads. Suspected operator/other-session
  touch on the shared preview browser. Watch for recurrence.
- Doc fixes applied after this run: §0.3 canonical localStorage key (`showSandboxProject`, no
  `rcg.` prefix), §9 stub replaced with the validated self-contained SQL block (+ Tom's payee id
  added to Fixed identifiers), §11 extended with correlation/line/estimate safety-net deletes.
- §12 (operator sign-in cycles ×3 both flag states, real-device iPhone/iPad pass) remains open —
  not agent-executable.

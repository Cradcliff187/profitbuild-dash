# OPERATIONS.md — RCG Work Operational Runbook

Task- and symptom-indexed playbooks for safely operating the **application and database** of RCG
Work (ProfitBuild Dashboard). This is the *"how do I do X safely"* companion to the reference docs.

**This file does NOT restate the rules — it cross-links them.** The *why* lives in
[CLAUDE.md](../CLAUDE.md) (66 gotchas + 33 architectural rules); the shipping pipeline lives in
[docs/WORKFLOW.md](WORKFLOW.md); the data model lives in [docs/DATA_SCHEMA.md](DATA_SCHEMA.md) and
[docs/DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md). When a playbook says *"see Rule
N"* or *"see Gotcha #N"*, read it there — do not duplicate.

> **Scope note.** Every playbook below assumes you have already read the relevant CLAUDE.md rule.
> The runbook sequences the *actions*; CLAUDE.md holds the *reasoning* and the edge cases.

---

## Quick-reference cheatsheet

The ten most-reached-for playbooks:

1. [Before you push](#p-before-you-push) — the exact gate before every commit
2. [Ship a change to production](#p-ship) — merge ≠ deploy; the Lovable Publish step
3. [Inspect live data safely (read-only)](#p-inspect-data)
4. [Run a one-off write / backfill safely](#p-backfill)
5. [Add a database migration (placeholder rule)](#p-migration)
6. [Test a trigger / RLS change before shipping](#p-sandbox)
7. [Add or consume a TanStack query key without breaking cache fanout](#p-querykey)
8. [Add a page + route (+ field-worker allowlist decision)](#p-page)
9. [Symptom: query returns too few / wrong rows](#s-truncation) — the 1,000-row cap
10. [Symptom: I fixed it, merged it, but production still shows the bug](#s-notshipped)

**Stop-the-line rules:** [When Claude Code must stop and ask a human](#stop-rules).

---

## Environment & access

| Thing | Value / where |
|---|---|
| Dev server | `npm run dev` → `http://localhost:5225` (pinned, `strictPort` — see Gotcha #43) |
| Supabase project ref | `clsjdxwbsjbhjibvlqbz` |
| Production | `rcgwork.com` |
| Deploy | **Manual** via Lovable Publish dialog — NOT auto-deploy ([WORKFLOW.md](WORKFLOW.md)) |
| DB access (Claude) | Supabase MCP (`apply_migration`, `execute_sql`, `generate_typescript_types`, `list_edge_functions`, `deploy_edge_function`, `get_logs`) |
| DB access (human) | Supabase Studio SQL editor |
| Sandbox project | `SYS-TEST` / id `c63b4dea-4a69-448b-b27b-da7b41179a05` (category `system`, hidden unless Settings → Developer toggle is on) |

> ⚠️ **Every Supabase MCP call hits PRODUCTION.** There is no staging DB. `execute_sql`,
> `apply_migration`, and `deploy_edge_function` all act on live data. Preview branches do **not**
> work for this project (Gotcha #21). Treat every write as a production write — because it is.

---

<a id="stop-rules"></a>
## Stop-the-line — when Claude Code must stop and ask a human

Refuse to proceed autonomously and surface the decision to Chris when any of these is true:

1. **Direct push to `main`.** Humans/agents must PR. Only the `lovable-dev` bot may push directly
   ([WORKFLOW.md](WORKFLOW.md) branch protection). Never `git push origin main`, never force-push.
2. **A destructive / non-additive migration** — `DROP`, `ALTER … DROP`, `TRUNCATE`, a data-losing
   `UPDATE`/`DELETE`, or renaming a load-bearing column. The pre-deploy gate flags these; a human
   confirms intent and a backup exists first. (Additive `ADD COLUMN` / new index / new function is
   normal work.)
3. **Anything touching auth or the login critical path** — `AuthContext`, `supabase/client.ts`,
   session handling, RLS on `auth`-adjacent tables, or adding a realtime subscription to a
   post-login landing page. This class caused repeated P0 login loops (Gotchas #53–#56). Diagnose
   and propose; let a human approve the change and the publish.
4. **Bulk data mutation** over more than a handful of rows (recategorization, reassignment,
   dedup, deletion). Show the affected-row count and a dry-run SELECT first; get a yes.
5. **PII or credentials.** Never paste secrets, tokens, or personal data into a doc, commit, URL,
   or external service. Never enter credentials into a form.
6. **CORS changes on the 4 no-JWT edge functions** (`send-auth-email`, `forgot-password`,
   `send-receipt-notification`, `send-training-notification`) — flagged high-risk in CLAUDE.md;
   requires a staged test plan.
7. **You cannot verify the outcome.** If you can't run the app, read the row, or confirm the
   deploy landed, say so plainly rather than declaring success.

When you stop: state the rule, the exact action you were about to take, and the one question you
need answered.

---

## Application playbooks

<a id="p-page"></a>
### Add a page + route (+ field-worker allowlist decision)

**When to use** — adding a new top-level page or a new project sub-route.

**Preconditions** — know the audience (admin/manager vs field worker). Read Gotcha #44
(field-worker gating is an **allowlist**, not a denylist) and Rule 18 (project-sub-route exemption)
and Rule 24 (`isFieldWorkerOnly` vs `isFieldWorker`).

**Steps**
1. Add the page under `src/pages/` (or the route component under `src/components/project-routes/`).
2. Wire the route in `src/App.tsx`. Prefer URL-driven state over in-page `useState` view machines
   (Rule 17) so F5 / deep-links / share work.
3. **Field-worker decision — pick one:**
   - *Admin/manager only* (default): do nothing. New routes are auto-blocked by the AppLayout
     allowlist (Gotcha #44).
   - *Field-worker-safe*: add the path to `isFieldWorkerAllowed()` in
     [AppLayout.tsx](../src/components/AppLayout.tsx) **AND**, if it's a project sub-route, mark the
     `NavItem` `fieldWorkerSafe: true` in
     [projectNavigation.ts](../src/components/project-detail/projectNavigation.ts) and widen the
     exemption regex (Rule 18). Doing only one half creates a broken nav entry.
4. If the page has header actions, pass `mobileActions` too — `PageHeader` drops `actions` on
   mobile otherwise (Rule 23 / Gotcha #38).

**Verify** — [live-verify](#p-live-verify): load the route at 1366px and at mobile width; then
sign in as a field worker (see [reference dev login] in memory) and confirm they're allowed or
bounced exactly as intended.

**Rollback** — remove the route + allowlist entry; no DB state to unwind.

---

<a id="p-querykey"></a>
### Add or consume a TanStack query key without breaking cache fanout

**When to use** — any new `useQuery`/`useInfiniteQuery`, or any **direct** `supabase.from(X).insert/
update/delete` that isn't wrapped in a `useMutation`.

**Preconditions** — read Gotcha #27 (direct writes bypass invalidation) and its recursive sequel
(the fix for #27 had a #27 inside it — badge counts are separate keys).

**Steps**
1. Before writing the mutation, **grep every query key that reads the target table**:
   ```bash
   grep -rn "queryKey:.*<table-or-domain>" src/ | grep -v node_modules
   ```
   Tables commonly have fanout: `expenses` had **four** keys (search list, unapproved-count,
   dashboard stats, category rollup); `project_notes` had **two** (timeline + count badge, Gotcha
   #45); `project-data`, `project-media`, `project-documents` each have their own.
2. In the mutation's `onSuccess`, invalidate **every** matching key — not just the obvious one.
3. Financial reads: do NOT compute in JS. Read the trigger-maintained columns / the
   `reporting.project_financials` view (Rule 1, Rule 2).
4. Reading a large table? Respect the 1,000-row cap — see [truncation symptom](#s-truncation) and
   Rule 12. Never an unbounded `.select()` on `expenses`/`payees`/`projects`/`clients`.

**Verify** — perform the mutation in the running app and confirm the UI updates **without F5** —
list row, count badge, and any dependent card all move.

**Rollback** — none needed for cache logic; it's read-side only.

---

<a id="p-shared"></a>
### Extract-once / use-everywhere (single-source presentational pattern)

**When to use** — the same value or UI fragment is rendered in ≥2 places and their render logic can
drift (the exact failure behind the "project address shows in details but not header" investigation
— the header, the overview card, and the edit form each decided independently whether/how to show
`project.address`).

**Preconditions** — this is the generalization of existing consolidations: Rule 33
(`EntityFilterBar`), Rule 15 (`NoteComposer`), Rule 16 (the four quote-view cards). Follow their
shape.

**Principle** — one component/util owns *"read source X → present it"*; every surface consumes that
one thing. No surface re-derives the condition. When the rule changes (show address on all routes,
add a fallback chain, relabel), it changes in exactly one file and can't drift.

**Steps**
1. Identify the single source of truth (a column, a hook, a computed helper in `src/utils/`).
2. Build one presentational component (or one helper returning the resolved value + status) that
   encodes the display rule **once** — including the truthiness/fallback logic.
3. Replace each ad-hoc render site with the shared component. Delete the divergent copies.
4. If the rule has variants (compact vs full), express them as props on the one component, not as
   separate implementations.

**Verify** — grep confirms only one implementation remains; exercise each surface and confirm
identical behavior.

**Rollback** — revert the component + call sites in one commit.

> **Candidate for a new CLAUDE.md rule.** This pattern is currently *implied* by Rules 15/16/33 but
> not stated as a general principle. If Chris wants it codified, add it as an architectural rule
> ("Single-source presentational components — extract-once, use-everywhere") and cross-link the
> three existing instances.

---

<a id="p-edgefn"></a>
### Add or modify an edge function

**When to use** — new/changed Deno function under `supabase/functions/`.

**Preconditions** — read CLAUDE.md "Managing Edge Functions" + "Version Pinning". Pin explicit
dependency versions (never floating `@2`). Know whether the function is one of the pinned-version
criticals (the 4 `brandedTemplate` consumers, `admin-disable/enable-user`, `ai-report-assistant`).

**Steps**
1. Edit under `supabase/functions/<name>/`.
2. Deploy via CLI (preferred — Lovable's auto-pickup is unreliable, especially for
   `ai-report-assistant`):
   ```bash
   npx supabase functions deploy <name> --project-ref clsjdxwbsjbhjibvlqbz
   npx supabase functions list --project-ref clsjdxwbsjbhjibvlqbz   # confirm new version
   ```
3. If you changed KPI definitions, first run [`sync:edge-kpis`](#p-kpisync) so
   `ai-report-assistant`'s generated context is current.
4. Update the pinned version number in CLAUDE.md's tables for any critical function.
5. Push the source so the repo stays in sync with what's deployed.

**Verify** — `functions list` shows the incremented version; invoke the function (or exercise the
UI path that calls it) and check `get_logs`.

**Rollback** — redeploy the prior source. Deletions go through CLI only (`functions delete`) — MCP
has no delete tool.

---

## Database playbooks

<a id="p-inspect-data"></a>
### Inspect live data safely (read-only)

**When to use** — diagnosing "wrong data", confirming a value, checking linkage health.

**Preconditions** — MCP `execute_sql` hits prod but a `SELECT` is safe. If MCP isn't connected this
session, hand the SQL to Chris for Studio, or read it from the running app's loaded React state
(the app already fetched it).

**Steps**
1. Prefer a bounded, keyed query: `where project_number = '225-XXX'` / `limit`.
2. For "is this a data problem or a display problem", read the value at the source — the loaded
   `project` object in the app is the authoritative fetched row (this is how the address
   investigation proved `project.address = ""`).
3. Use the ready-made health-check SQL already in CLAUDE.md where one exists (Rule 6a category
   alignment; Rule 11 linkage audit; Gotcha #56 auth-cascade detector).

**Verify** — n/a (read-only).

**Rollback** — n/a.

---

<a id="p-backfill"></a>
### Run a one-off write / backfill safely

**When to use** — correcting rows, backfilling a new column, repairing orphaned references
(e.g. the Gotcha #65 correlation orphans).

**Preconditions** — this is a [stop-the-line](#stop-rules) item for anything beyond a couple of
rows. Get explicit go-ahead. Know the trigger side-effects (Rule 1, Gotcha #26 contingency chain —
never write `contingency_*`, `discount_amount`, `labor_cushion_amount`, or margin columns directly;
write the inputs and let triggers compute).

**Steps**
1. Write the **dry-run SELECT** first — exact rows + count that the write will touch. Share it.
2. Pair rows by a **stable** key. Description/content, not `sort_order` — sort order is unstable
   across versions (Gotcha #65 lesson: a `(category, sort_order)` pairing mismatched real rows).
3. Prefer an idempotent, re-runnable statement (guarded `WHERE`, `ON CONFLICT` where a unique
   index exists).
4. Apply via MCP `apply_migration` (so it's recorded) or `execute_sql` for a true one-off. If it's
   schema-affecting, follow the [migration playbook](#p-migration) for the placeholder file.
5. For large corrections consider whether a bounded RPC is safer than N client statements.

**Verify** — re-run the dry-run SELECT; expect zero remaining offenders (or the exact expected
delta). Then exercise the affected UI.

**Rollback** — you captured the before-state in step 1; write the inverse. For schema changes, see
CLAUDE.md "Critical Migration Rules".

---

<a id="p-migration"></a>
### Add a database migration (placeholder rule)

**When to use** — any schema change (new table/column/index/function/trigger/RLS policy).

**Preconditions** — read CLAUDE.md "Critical Migration Rules" in full. The three invariants:
**(1)** local `.sql` files are **placeholders only** (no real SQL), **(2)** no UTF-8 BOM, **(3)**
local file count must equal the DB migration count.

**Steps**
1. Apply the real SQL to production via MCP `apply_migration` (or Studio). Prefer **additive**
   changes.
2. Get the recorded name:
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
   ```
3. Create the matching **placeholder** file `supabase/migrations/{version}_{name}.sql` containing
   only:
   ```sql
   -- Applied via Supabase dashboard since the actual SQL is already in your database.
   ```
4. If the change exposed new tables/views/RPCs to PostgREST, regenerate types — see
   [regenerate types](#p-regen-types) (Gotcha #30). Hand-written RPC bodies referencing renamed
   columns silently rot — grep function bodies after a rename (Gotcha in the #89 resolved entry).

**Verify**
```bash
# no real SQL in any migration file:
for f in supabase/migrations/*.sql; do c=$(grep -v '^--' "$f" | grep -v '^$' | head -1); [ -n "$c" ] && echo "HAS REAL SQL: $(basename "$f")"; done
# no BOMs (expect 0):
grep -rl $'\xEF\xBB\xBF' supabase/migrations/ | wc -l
# file count == DB count:
ls supabase/migrations/*.sql | wc -l   # compare to SELECT COUNT(*) FROM supabase_migrations.schema_migrations
```
Deeper check: `node scripts/validate-db-local-migrations.mjs` after saving the
`schema_migrations` query result to `supabase/db-migrations.json`.

**Rollback** — a real-SQL-in-a-placeholder file causes the misleading *"Failed to bundle
function"* / *"relation does not exist"* CI error (Gotcha #1, #2): convert the offender back to the
placeholder comment. For the DB object itself, apply the inverse migration.

---

<a id="p-sandbox"></a>
### Test a trigger / RLS / function change before shipping

**When to use** — changing a trigger, RPC, generated column, or RLS policy where a mistake corrupts
real financial data.

**Preconditions** — the `SYS-TEST` sandbox project exists (id
`c63b4dea-4a69-448b-b27b-da7b41179a05`). It's category `system`, hidden from `/projects` unless the
Settings → Developer "Show sandbox test project" toggle is on. Preview branches are NOT an option
(Gotcha #21).

**Steps**
1. Seed the scenario against `SYS-TEST` via `execute_sql` (estimate, quote, expense, CO — whatever
   the trigger touches).
2. Apply the trigger/function change to production (there's no staging — this IS the test
   environment, scoped to a throwaway project).
3. Exercise the flow end-to-end in the running app pointed at `SYS-TEST` and read back the computed
   columns.
4. Only after it's proven on `SYS-TEST` do you run any real-data backfill.

**Verify** — computed values on `SYS-TEST` match expectations; the read side (Cost Analysis, margin
header, contingency) reflects them. The estimate-versioning fixes (#57, #65) and discount feature
were all validated this way before touching real projects.

**Rollback** — delete the seeded `SYS-TEST` rows; revert the function via inverse migration.

---

<a id="p-bulk-decision"></a>
### Bulk update: RPC vs Studio vs migration — decision tree

**When to use** — you need to change many rows.

| Situation | Use | Why |
|---|---|---|
| One-time correction, bounded, reviewed | **`apply_migration`** (recorded) or Studio SQL | Auditable, one shot |
| Repeatable server-side operation the app will call | **RPC** (`SECURITY INVOKER` unless it must bypass RLS) | Reusable, keeps logic in Postgres (Rule 1) |
| Reading >1,000 rows to decide the update | **paginated loop or an RPC**, never unbounded `.select()` | 1,000-row cap silently truncates (Gotcha #23) |
| Schema-affecting | **migration** + placeholder file | Keeps file count in sync (#p-migration) |
| Anything the user does at point-of-entry | **do NOT auto-rewrite** | Respect user intent (Rule 6b common pitfall) |

Always: dry-run SELECT → count → go-ahead → apply → re-verify.

---

<a id="p-regen-types"></a>
### Regenerate Supabase types after a schema change

**When to use** — after adding/altering a table, view, or RPC exposed to PostgREST (Gotcha #30).

**Steps**
1. MCP `generate_typescript_types` → returns `{ "types": "..." }`. Extract the `.types` field
   (don't write the JSON wrapper).
2. Write to `src/integrations/supabase/types.ts` (~140KB) and commit.

**Verify** — `npm run type-check` is clean; the new table/view/RPC autocompletes and no
`TS2769 No overload matches` errors remain on consumers.

**Rollback** — restore the prior `types.ts`.

---

## Deploy & release

<a id="p-before-you-push"></a>
### Before you push — the gate

**When to use** — before every commit that will become a PR.

**Steps**
```bash
npm run type-check     # tsc -p tsconfig.app.json (Gotcha #28: must target the app tsconfig)
npm run pre-deploy     # lint + type-check + custom safety gates (scripts/pre-deploy-checks.sh)
```
For UI changes, [live-verify](#p-live-verify) first — type-check is structural, not behavioral.

**Verify** — both green locally. If `pre-deploy` is red locally, CI will be red too.

**Rollback** — n/a (nothing shipped yet).

---

<a id="p-live-verify"></a>
### Live-verify a UI change

**When to use** — any change observable in the browser.

**Steps** — `npm run dev` (port 5225) → exercise the real flow → console shows **zero** errors.
Type-check does not catch: Radix portals that don't close, queries that silently return empty,
realtime on the wrong key, async races (WORKFLOW.md §3). Set an explicit viewport when testing
responsive/role behavior (headless `innerWidth` can read `0` → forces the mobile path).

**Verify** — the flow works end-to-end and the console is clean.

---

<a id="p-ship"></a>
### Ship a change to production (merge ≠ deploy)

**When to use** — a PR is merged and needs to go live.

**Preconditions** — **Lovable does NOT auto-deploy** (WORKFLOW.md §9, verified May 4 2026). Merging
to `main` does not publish.

**Steps**
1. Squash-merge the green PR.
2. **Open Lovable → click Publish.** Build runs ~2 min.
3. Confirm it landed:
   ```bash
   curl -sL "https://rcgwork.com/version.json?t=$(date +%s)"
   ```
   `buildTime` must be **after** your fix commit (Gotcha #46, #18). Settings → App Updates shows an
   amber "Publish pending" when `main` is ahead of the deployed build.
4. Smoke-test the real flow on `rcgwork.com` (not Lovable's preview iframe).

**Verify** — `version.json` `buildTime` is newer than the commit; the fixed flow works live. For
auth fixes, watch the full login → land → stay-30s flow and check `auth.audit_log_entries` (Gotcha
#54/#56).

**Rollback** — `git revert <sha>` → PR → green CI → squash-merge → **Publish again**. DB/storage
parts of a bad change need their own inverse (WORKFLOW.md Rollback).

> **Do not edit Lovable-managed `<head>` tags in `index.html`** (title/OG/Twitter/favicon
> `<link rel=icon>`) — the Publish dialog rewrites them and strips what it doesn't recognize (Gotcha
> #31). iOS icons / manifest / theme-color are safe to edit in code.

---

<a id="p-kpisync"></a>
### Sync KPI context after KPI changes

**When to use** — you changed anything in `src/lib/kpi-definitions/`.

**Steps**
```bash
npm run validate:kpis    # sanity-check definitions
npm run sync:edge-kpis   # regenerates ai-report-assistant/kpi-context.generated.ts
npx supabase functions deploy ai-report-assistant --project-ref clsjdxwbsjbhjibvlqbz
```
(See [docs/EDGE_FUNCTION_KPI_SYNC.md](EDGE_FUNCTION_KPI_SYNC.md) for the architecture.)

**Verify** — `functions list` shows the new version; ask the Reports AI a question whose answer
depends on the changed KPI and confirm correct SQL.

**Rollback** — redeploy the prior generated file + `index.ts`.

---

## Debugging playbooks (symptom-indexed)

<a id="s-truncation"></a>
### Symptom: a list/search returns too few or wrong rows

**Likely cause** — PostgREST's hard **1,000-row cap** silently truncated an unbounded query
(Gotcha #23; `db-max-rows = 1000` overrides any client `.range()` > 1000). No error is thrown.

**Diagnose** — find the query. Is it an unbounded `.from('expenses'|'payees'|'projects'|'clients')
.select()`? Check `count` vs `data.length`.

**Fix** — one of: route through `expenses_search` + `useExpensesQuery` (paginated); push a
server-side RPC/aggregate; or a client paginated `.range()` loop until a short page (the
`ExpenseExportModal` pattern). Never "fix" with `.limit()`. See Rule 12.

**Verify** — the count matches the DB; the previously-missing rows appear.

---

<a id="s-norefresh"></a>
### Symptom: write succeeded (toast/DB correct) but UI still shows old data

**Likely cause** — a direct Supabase write that didn't invalidate every TanStack key reading that
table (Gotcha #27). Users reach for F5.

**Fix** — see [Add/consume a query key](#p-querykey): grep all keys for the table, invalidate each
in `onSuccess`. Remember the count-badge keys are separate from the list key (Gotcha #45).

**Verify** — mutate in-app; list, badge, and dependent cards all update without reload.

---

<a id="s-notshipped"></a>
### Symptom: fixed + merged, but production still shows the bug

**Likely cause** — not published. Merge ≠ deploy.

**Diagnose**
```bash
curl -sL "https://rcgwork.com/version.json?t=$(date +%s)"
```
If `buildTime` predates your commit, Lovable hasn't published (production ran a broken build for
17h once for exactly this reason — Gotcha #53 coda).

**Fix** — [Ship a change](#p-ship): click Publish; re-check `version.json`.

**Also consider** — for edge functions, Lovable often doesn't pick them up; deploy via CLI and
`functions list`. For a stale PWA on a user's phone, Settings → App Updates → Check for Updates
runs a `version.json` probe with a Force Update escape hatch (Gotcha #46).

---

<a id="s-authloop"></a>
### Symptom: user logs in, then bounces back to /auth (login loop)

**Likely causes (in order)** — (1) client **clock skew** vs the JWT expiry margin (Gotcha #56 —
run a time-sync check on the user's machine *first*, it's the cheapest root cause); (2) a realtime
subscription on that role's post-login landing page (Gotchas #53/#55 — admin lands on `/`, field
worker on `/time-tracker`); (3) an `auth.getUser()` call in the sign-in flow racing the session
(Gotcha #54).

**Diagnose** — pull `auth.audit_log_entries` for the user; the diagnostic SQL is in Gotcha #56.
≥5 `token_refreshed` within 2s = cascade; successful `login` with no `token_revoked` but still
bouncing = the sign-in race.

**Fix** — this is a [stop-the-line](#stop-rules) area. Diagnose fully, propose, let a human approve
the change and the publish. Never add realtime to a landing page; never call `getUser()` on
mount/sign-in (use `useAuth()`/`getSession()` — also Gotcha #63).

**Verify** — full login → land → stay 30s+ with zero bounce; audit log clean.

---

<a id="s-500"></a>
### Symptom: user reports a 500 / edge function error

**Diagnose** — MCP `get_logs` for the `edge-function` (or `auth`/`postgres`) service; or Supabase
Studio → Logs. Match the timestamp to the user's action.

**Common culprits** — a renamed column referenced in a hand-written RPC/function body (grep
`pg_get_functiondef` for the old name; resolved-entry #89); a floating dependency version resolving
differently on CLI vs Lovable (pin it); a not-null constraint hit after a status commit (the
change-order auto-quote pattern, Gotcha #61).

**Fix** — patch the function; deploy via CLI; confirm via `get_logs`.

---

<a id="s-devstale"></a>
### Symptom: dev browser doesn't show my latest code

See [DEV_CLEAN_RELOAD.md](../DEV_CLEAN_RELOAD.md) — unregister the service worker + hard reload. The
PWA SW is disabled in dev, so this is usually a one-time cleanup. (That doc still says port 8080 —
the real dev port is **5225**; see [stale docs](#stale-docs) below.)

---

## Monitoring — where to look

| Question | Where |
|---|---|
| Is production current? | `curl https://rcgwork.com/version.json` vs latest `main` commit; Settings → App Updates |
| Edge function errors | MCP `get_logs` (service `edge-function`) / Studio → Logs |
| Auth incidents (login loop, cascade) | `auth.audit_log_entries` + the Gotcha #56 diagnostic SQL |
| DB / query errors | Studio → Logs (service `postgres` / `postgrest`) |
| Data-integrity health | The health-check SQL in CLAUDE.md: Rule 6a (category), Rule 11 (linkage), Rule 6a/§ verification blocks |
| Migration drift | `scripts/validate-db-local-migrations.mjs`; the file-count + BOM checks |
| Feature flag state | [supabase/FEATURE_FLAGS_STATUS.md](../supabase/FEATURE_FLAGS_STATUS.md) + `feature_flags` table |

**When to page a human (Chris):** any [stop-the-line](#stop-rules) trigger; a production 500 you
can't immediately explain; an auth incident; a bulk-data decision; or a publish that won't land
after two attempts.

---

## Testing — what's covered, what to add

- **Unit tests:** Vitest (`npm run test`, `npm run test:ui`). Coverage is thin — this codebase
  leans on **live verification in a real browser** (WORKFLOW.md §3) plus the `SYS-TEST` sandbox for
  DB/trigger changes.
- **What to add when:** a pure calculation util or a bug with a crisp input→output → add a Vitest
  case. A trigger/margin/cushion change → validate on `SYS-TEST` (a Vitest test can't exercise
  Postgres triggers). A UI flow → live-verify; don't fake it with a snapshot.
- **Client pagination** (display-only slicing, not the row-cap fix) is documented in
  [src/docs/PAGINATION.md](../src/docs/PAGINATION.md).
- **Type-check is the cheapest net** — but only because it now targets `tsconfig.app.json` (Gotcha
  #28). A sub-1s `type-check` on a 200k-line repo means it's checking nothing.

---

## Existing-docs map (read these; don't duplicate them here)

| Doc | Covers |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | **The bible** — 66 gotchas + 33 architectural rules, edge-function inventory & pinning, migration rules, feature flags |
| [docs/WORKFLOW.md](WORKFLOW.md) | Canonical shipping pipeline, branch protection ruleset, CI, Lovable Publish, rollback |
| [README.md](../README.md) | Project setup, stack, scripts, high-level schema (⚠️ some stale spots — see below) |
| [PRODUCT_OVERVIEW.md](../PRODUCT_OVERVIEW.md) | Feature documentation across all modules |
| [docs/DATA_SCHEMA.md](DATA_SCHEMA.md) | Enums, the `reporting` view, tables, indexes, policies |
| [docs/DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md) | Per-table field reference (report-builder oriented) |
| [docs/API_REFERENCE.md](API_REFERENCE.md) | Generated index of all `src/` exports (`scripts/generate-api-docs.ts`) |
| [docs/EDGE_FUNCTION_KPI_SYNC.md](EDGE_FUNCTION_KPI_SYNC.md) | The `sync:edge-kpis` architecture |
| [supabase/FEATURE_FLAGS_STATUS.md](../supabase/FEATURE_FLAGS_STATUS.md) | Current flag states |
| [DEV_CLEAN_RELOAD.md](../DEV_CLEAN_RELOAD.md) | Clearing stale dev service-worker cache |
| [src/docs/PAGINATION.md](../src/docs/PAGINATION.md) | Client-side display pagination hook/component |
| `docs/<feature>/…`, `docs/_archived/`, `docs/audits/` | Per-feature implementation specs, historical plans, completed audits |

<a id="stale-docs"></a>
### Stale / contradictory docs found during this audit (candidates for a separate ticket)

These conflict with CLAUDE.md / current reality — **not** fixed here (out of scope), flagged for a
cleanup PR:

1. **README.md** — several stale claims: dev URL `http://localhost:8080` (real: **5225**, Gotcha
   #43); *"Push to GitHub (auto-syncs to Lovable)"* and *"Backend changes deploy immediately"* and
   the whole **Deployment → "Click Update to deploy"** section contradict WORKFLOW.md's verified
   *"Lovable does NOT auto-deploy; Publish is manual"*. Also undercounts edge functions (says 27),
   pages (36), and components (README architecture block predates current counts).
2. **DEV_CLEAN_RELOAD.md** — references `http://localhost:8080` (should be 5225).
3. **DATABASE_TABLES_REFERENCE.md** (2025-11-17) & **DATA_SCHEMA.md** (2025-11-12) — predate many
   columns added since (discount fields, `default_expense_category`, procurement columns,
   contingency draw-down, `invoices`/`invoice_revenues`, labor-cushion columns). Still useful as
   orientation but not authoritative for new columns — `src/integrations/supabase/types.ts` is the
   source of truth.
4. **DATABASE_TABLES_REFERENCE.md** lists `current_margin`/`projected_margin` without the Rule 1
   deprecation note (canonical: `actual_margin` / `adjusted_est_margin`).

---

## Maintaining this file

Add a playbook when a task or incident recurs and the steps weren't written down. Keep it
**action-oriented** — the *why* belongs in a CLAUDE.md rule/gotcha (add one there in the same PR,
per the standing convention) and this file links to it. Every playbook keeps the **When / Precond /
Steps / Verify / Rollback** shape.

**Last updated:** 2026-07-12 — initial version.

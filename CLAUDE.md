# CLAUDE.md — RCG Work (ProfitBuild Dashboard)

This file is the canonical reference for Claude Code when working in this repository. Keep it accurate as the project evolves.

---

## Project Identity

| Field | Value |
|-------|-------|
| **App name** | RCG Work |
| **Company** | Radcliff Construction Group (RCG) |
| **Type** | Construction project management & financial tracking PWA |
| **Supabase project ID** | `clsjdxwbsjbhjibvlqbz` |
| **GitHub repo** | https://github.com/Cradcliff187/profitbuild-dash.git |
| **Lovable project** | https://lovable.dev/projects/8ad59cd4-cdfa-472d-b4a1-52ac194e00f2 |
| **Production PWA** | rcgwork.com |
| **Default git branch** | `main` |

---

## Essential Commands

```bash
npm run dev            # Dev server → http://localhost:8080
npm run build          # Production build → dist/
npm run lint           # ESLint on all TS files
npm run type-check     # tsc --noEmit (no build output)
npm run test           # Vitest unit tests
npm run pre-deploy     # lint + type-check (run before pushing)

# Database / maintenance
npm run create-test-project   # Seed sample data
npm run cleanup-test-data     # Remove seed data
npm run verify-migration      # Check bid-media migration alignment
npm run validate:kpis         # Validate KPI definitions
npm run sync:edge-kpis        # Sync edge function KPI context JSON
npm run upload:template       # Upload contract Word template to Storage
```

---

## Stack at a Glance

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3 + TypeScript 5.8 + Vite 5 |
| UI | shadcn/ui (Radix UI) + Tailwind CSS 3 |
| State/data | TanStack Query v5 (server state) + React Hook Form + Zod |
| Routing | React Router v6 |
| Charts | Recharts (financial), gantt-task-react (scheduling) |
| PDF/Export | jsPDF, html2pdf.js, html2canvas |
| Mobile/PWA | Capacitor v7, vite-plugin-pwa, Workbox |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Email | Resend (via edge functions) |
| SMS | Textbelt (via edge functions) |
| AI features | Supabase edge functions → OpenAI API (gpt-4o-mini for reports, Whisper for audio) |
| File handling | PapaParse (CSV), XLSX, JSZip, react-dropzone |
| Sanitization | DOMPurify (HTML sanitization for user-provided embeds) |

---

## Source Structure

```
src/
├── components/          # UI components (24 subdirectories)
│   ├── ui/              # 66 shadcn/ui base components — do NOT edit these directly
│   ├── dashboard/       # Dashboard widgets
│   ├── notes/           # Shared note components (NoteComposer [Rule 15], NoteCard, NoteInput [legacy, desktop only], NoteLightbox, VoiceNoteButton, MentionTextarea)
│   ├── notifications/   # NotificationBell (in-app mention notifications)
│   ├── schedule/        # Gantt chart, field schedule (FieldTaskCard, FieldTaskSection, FieldMediaGallery, FieldDocumentsList, FieldQuickActionBar)
│   ├── time-tracker/    # Field worker time tracking
│   ├── time-entries/    # Admin time entry management
│   ├── time-entry-form/ # Shared time entry form (rebuilt unified version, includes NotesField)
│   ├── reports/         # Report builder & templates
│   ├── contracts/       # Contract generation & management
│   ├── payment-applications/ # AIA G702/G703 billing (SOV, payment apps, PDF export)
│   └── ...              # (13 more feature directories)
├── pages/               # 37 route pages (one per major view)
├── hooks/               # 50+ custom React hooks
├── utils/               # 50+ utility/calculation modules
├── types/               # 24 TypeScript type definition files
├── lib/
│   ├── kpi-definitions/ # KPI schema, business rules, benchmarks
│   └── featureFlags.ts  # Env-based feature flags
└── integrations/
    └── supabase/        # Supabase client + generated types
```

---

## Backend: Supabase

**29 Edge Functions** deployed (verify with `mcp list_edge_functions` or `npx supabase functions list --project-ref clsjdxwbsjbhjibvlqbz`). Source lives in `supabase/functions/`.

| Group | Functions |
|-------|-----------|
| Auth | `send-auth-email`, `forgot-password`, `admin-create-user`, `admin-reset-password`, `admin-delete-user`, `admin-disable-user` |
| Notifications | `send-receipt-notification`, `send-training-notification` |
| SMS | `send-sms`, `check-sms-status`, `check-sms-quota`, `process-scheduled-sms`, `get-textbelt-key` |
| Media/AI | `enhance-caption`, `transcribe-audio`, `generate-media-report`, `generate-video-thumbnail` |
| AI (live) | `ai-report-assistant` (heavily used — Reports AI), `enrich-estimate-items` (live estimate import) |
| Contracts | `generate-contract` (template-driven subcontractor project agreement; .docx placeholder substitution via JSZip) |
| QuickBooks (CSV flow, live) | `quickbooks-connect`, `quickbooks-callback`, `quickbooks-sync-customer`, `quickbooks-sync-project`, `quickbooks-bulk-sync-customers`, `quickbooks-bulk-sync-projects`, `quickbooks-backfill-ids` |
| QuickBooks API (**in-dev — not production**) | `quickbooks-sync-receipt`, `quickbooks-sync-transactions` |
| Shared | `_shared/brandedTemplate.ts`, `_shared/quickbooks.ts` |

**Removed (Apr 15, 2026):** `ai-project-assistant` (unused, replaced by `ai-report-assistant`), `parse-estimate-import` (dead — live path is `enrich-estimate-items`). Both deleted via `npx supabase functions delete <name> --project-ref clsjdxwbsjbhjibvlqbz`.

**Removed (Apr 19, 2026):** `generate-subcontractor-contract` (orphan — deployed direct-to-Supabase in Nov 2025, entrypoint `/source/index.ts` with no repo structure, zero UI callers, superseded by the repo-managed `generate-contract` function built Dec 2025). Deleted via CLI.

### Critical: Functions That Use `_shared/brandedTemplate.ts`

These four functions MUST be deployed together with the shared file via Supabase MCP:

| Function | verify_jwt | Pinned version |
|----------|------------|----------------|
| `send-auth-email` | false | 114 |
| `send-receipt-notification` | false | 97 |
| `send-training-notification` | false | 46 |
| `generate-media-report` | true | 115 |

### Critical: `admin-disable-user` Pinned Version

| Function | verify_jwt | Pinned version | Notes |
|----------|------------|----------------|-------|
| `admin-disable-user` | true | 102 | Cascades `payees.is_active=false` for the linked internal payee (best-effort; payee failure does NOT roll back the auth disable). See Architectural Rule 11. |

### Critical: AI Report Assistant Version

The `ai-report-assistant` function uses a generated `kpi-context.generated.ts` file that must be deployed alongside `index.ts`. After any KPI definition changes, run `npm run sync:edge-kpis` to regenerate it.

| Function | verify_jwt | Pinned version | AI Model | API Key Secret |
|----------|------------|----------------|----------|----------------|
| `ai-report-assistant` | true | 71 | `gpt-4o-mini` (OpenAI) | `OPENAI_API_KEY` |

**Model history:** Switched from Lovable AI Gateway (`google/gemini-3-flash-preview` via `LOVABLE_API_KEY`) to direct OpenAI API in v5.0.0 (Apr 2026). Reasons: Lovable gateway had 6+ week deployment lag, Gemini Flash preview-tier had inconsistent SQL generation, and `OPENAI_API_KEY` was already configured for 3 other edge functions.

**SQL validation (v5.1.0):** Generated SQL is validated against the live database schema before execution. If the AI hallucinates a column name (e.g., `expenses.total_cost` instead of `expenses.amount`), the validator catches it and auto-corrects with a focused re-prompt containing only the relevant table's actual columns. This eliminates column-not-found errors without needing more few-shot examples.

**Deployment note:** Lovable does NOT reliably auto-deploy this function on git push. Always deploy via Supabase CLI (`supabase functions deploy ai-report-assistant`) or MCP after changes. The file size (~135KB across index.ts + kpi-context.generated.ts) may exceed MCP tool parameter limits — prefer CLI deployment. See "Managing Edge Functions" below for the full CLI flow.

### Managing Edge Functions

Three deployment paths, in order of preference:

**1. Normal flow — push to GitHub, Lovable auto-deploys**
```bash
git push origin <branch>
```
Works for most functions. **Does NOT reliably work for `ai-report-assistant`** — see below.

**2. CLI (preferred for anything Lovable won't pick up)**
```bash
# List all functions with current versions
npx supabase functions list --project-ref clsjdxwbsjbhjibvlqbz

# Deploy a single function (bundles files in supabase/functions/<name>/)
npx supabase functions deploy <name> --project-ref clsjdxwbsjbhjibvlqbz

# Delete a function (verified Apr 15, 2026 — works without interactive prompts)
npx supabase functions delete <name> --project-ref clsjdxwbsjbhjibvlqbz
```
CLI authentication uses a cached token from a prior `npx supabase login` — check memory for auth state before assuming. If CLI fails with auth errors, run `npx supabase login` first. **Known gotcha:** a BOM character in `.env.local` has historically blocked CLI deploys (strip with `sed -i '1s/^\xEF\xBB\xBF//' .env.local`).

**3. MCP direct deploy (emergency bypass)**
- Tool: `mcp__supabase__deploy_edge_function`
- Requires sending full file content inline — **MCP parameter limits can truncate large functions** (e.g. `ai-report-assistant` at ~135KB). Prefer CLI for anything over ~60KB.
- After deploy, push to GitHub to keep source in sync.

**MCP does NOT expose a delete tool.** Edge function deletions MUST go through CLI (option 2) or the Supabase dashboard.

### Version Pinning — Two Layers

**Layer 1: Dependency imports inside function source.** Always pin explicit versions, never floating ranges:
```typescript
// Good
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Bad — floating versions break across environments and between Lovable vs. CLI deploys
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```
Lovable and direct CLI deploys can resolve `@2` to different minor versions, causing subtle breakage only one path catches.

**Layer 2: Deployed function version numbers.** Supabase increments an integer version on every deploy. For the five critical functions below, **pin the current production version in this doc** so drift is visible on sight. After every deploy of these functions, update the version number in the tables above.

Always read full file contents (no truncation) before deploying via MCP. See `.cursorrules` for the complete deployment checklist.

---

## Database Migrations

**347 sequential migrations** in `supabase/migrations/` (as of Apr 16, 2026). File naming: `{UTC_timestamp}_{name}.sql`.

### Critical Migration Rules

#### 1. ALL local migration files MUST be placeholders

Every `.sql` file in `supabase/migrations/` must contain **only** the placeholder comment — never real SQL. The actual SQL lives in the Supabase database; local files exist solely to keep the file count in sync.

```sql
-- Applied via Supabase dashboard since the actual SQL is already in your database.
```

**Why:** Supabase validates migrations sequentially. Since early migrations are placeholders (comments that don't create tables), any later file with real SQL will fail with errors like `relation "projects" does not exist` because the tables it references were never created in that validation context.

**Health check — no real SQL in migration files:**
```bash
for f in supabase/migrations/*.sql; do
  content=$(grep -v '^--' "$f" | grep -v '^$' | head -1)
  [ -n "$content" ] && echo "HAS REAL SQL: $(basename $f)"
done
```

#### 2. No BOM characters in migration files

Migration files must not contain UTF-8 BOM (`\xEF\xBB\xBF`). BOMs cause Supabase syntax errors during deployment.

```bash
# Check for BOMs:
grep -rl $'\xEF\xBB\xBF' supabase/migrations/ | wc -l  # should be 0
```

#### 3. File count must match database

After applying any migration via `mcp_supabase_apply_migration`, immediately create a matching placeholder file locally:

```sql
-- Query to get exact recorded name:
SELECT version, name FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 1;
```

```bash
# Then create the file:
# supabase/migrations/{version}_{name}.sql
# Content: -- Applied via Supabase dashboard since the actual SQL is already in your database.
```

Local file count MUST match database migration count — mismatches cause CI/CD deployment failures (manifests as a misleading "Failed to bundle function" error).

**Health check — file count:**
```sql
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;
```
Compare to: `ls supabase/migrations/*.sql | wc -l`

---

## Feature Flags

### Database-Gated (table: `feature_flags`)

| Flag | Status | What it controls |
|------|--------|-----------------|
| `quickbooks_auto_sync` | ❌ **DISABLED** | QB Settings card, "Sync from QB" button, Sync History, Backfill modal |

Re-enable with: `UPDATE feature_flags SET enabled = true WHERE flag_name = 'quickbooks_auto_sync';`

### Environment-Based (`.env` / Vite)

| Variable | Status | Controls |
|----------|--------|---------|
| `VITE_FEATURE_SCHEDULE` | ✅ Enabled | Gantt schedule view |
| `VITE_FEATURE_AIA_BILLING` | ✅ Enabled | AIA G702/G703 payment applications (Billing tab in Project Detail) |
| `VITE_FEATURE_CONTRACTS` | ✅ Enabled | Subcontractor contract generation — hides the "Generate Contract" button in `QuoteViewRoute` and `Quotes.tsx` when set to `false`. Kill-switch only; edge function + storage pipeline remain intact. |

---

## Key Architectural Rules

### 1. Database-First Financials
All financial calculations (margins, totals, projections) live in PostgreSQL triggers and functions — **not** in frontend code. Both `projectFinancials.ts` and `margin.ts` have been **deleted** — read financial data directly from the `projects` table and `reporting.project_financials` view. Use `actual_margin` (not the deprecated `current_margin`) and `adjusted_est_margin` (not the deprecated `projected_margin`). The deprecated columns still exist in the DB but all code references use the new names exclusively.

### 1a. Canonical `ProjectStatus` Type
`src/types/project.ts` is the **single source of truth** for `ProjectStatus`. All other type files (`profit.ts`, `profitAnalysis.ts`) import from it. **Never** define project status literals in other files — always import `ProjectStatus` from `@/types/project`.

### 2. Reporting Views
- `reporting.project_financials` — Primary source for all project financial reports (53 columns: core financials, margins, estimates, cost composition flags)
- `reporting.training_status` — Training completion data for reports

### 3. Reports Use the Builder
Training reports, time reports, and all other module reports integrate with the main report builder at `/reports` — there are **no separate report pages** for individual modules.

### 4. Toast Notifications
100% migrated to `sonner`. Use `toast` from `"sonner"` everywhere. **Never** use the old Radix toast / `useToast` hook.

### 5. Component Library
Use shadcn/ui components from `src/components/ui/`. Do not edit these base components directly — wrap or compose them in feature directories instead.

### 6. Project Categories
- `construction` — Normal jobs; visible across all views
- `system` — Internal tracking (SYS-000, 000-UNASSIGNED)
- `overhead` — Expense/receipt allocation only. Eight overhead projects exist:
  - `001-GAS` Gas Expense, `002-GA` General & Administrative, `003-AM` Auto Maintenance,
    `004-TOOL` Tools, `005-MEAL` Meals & Entertainment, `006-SICK` Sick Time,
    `007-VAC` Vacation Time, `008-HOL` Holiday Time

Field workers only see construction projects in the mobile time tracker.

### 6a. Project → Category Lock (overhead projects)
The `projects.default_expense_category` column (added Apr 2026) lets an overhead project declare a single forced expense category. When set, every expense on that project is forced to that category — by trigger at the DB level, by override in the CSV importer, and by a locked Category dropdown in the manual `ExpenseForm`. **Three layers**, so the rule survives any future code path.

| Project | Forced category |
|---|---|
| `001-GAS` | `gas` |
| `003-AM` | `vehicle_maintenance` |
| `004-TOOL` | `tools` |
| `005-MEAL` | `meals` |
| `006-SICK`, `007-VAC`, `008-HOL` | `labor_internal` |
| `002-GA` | *(intentionally NULL — G&A spend is heterogeneous)* |

**Implementation:**
- DB trigger `enforce_project_default_expense_category` on `expenses` (BEFORE INSERT/UPDATE) silently rewrites `category` when the project has a forced default. No error raised — the data just lands correctly.
- `enhancedTransactionImporter.ts` performs the same override before write, populating a `project_default_category` matchLog entry.
- `ExpenseForm.tsx` disables the Category dropdown and shows "Locked to … for project XXX-YYY" when an overhead project with a forced category is selected.
- `ExpenseImportModal.tsx` preview shows a "Will be set to … (rule for XXX-YYY)" hint per row.

**Verification SQL:**
```sql
-- Should return 0 misaligned for every project with a forced category
SELECT p.project_number, COUNT(*) FILTER (WHERE e.category != p.default_expense_category) AS misaligned
FROM projects p LEFT JOIN expenses e ON e.project_id = p.id
WHERE p.default_expense_category IS NOT NULL
GROUP BY p.project_number;
```

### 7. Receipts vs. Expenses
Receipts are **documentation only** — they do NOT feed financial calculations. Financial data comes from direct expense entry or QuickBooks CSV import.

### 8. AIA G702/G703 Payment Applications
AIA billing uses a three-layer data model: **Schedule of Values (SOV)** → **Payment Applications** → **Payment Application Lines**. The SOV is generated once from an approved estimate via the `generate_sov_from_estimate()` RPC. Each payment application creates G703 lines with cumulative progress via the `create_payment_application()` RPC. All financial calculations (line totals, retainage, G702 summary roll-ups) are handled by PostgreSQL triggers — **never** in frontend code. Approved change orders auto-append to the SOV via a trigger on `change_orders`. The feature is gated behind `VITE_FEATURE_AIA_BILLING`.

**Key tables**: `schedule_of_values`, `sov_line_items`, `payment_applications`, `payment_application_lines`
**Key RPC functions**: `generate_sov_from_estimate()`, `create_payment_application()`
**Key triggers**: `calculate_payment_line_totals` (line-level), `calculate_payment_application_totals` (roll-up to G702), `add_change_order_to_sov` (auto-append CO lines)
**PDF storage**: Generated G702/G703 PDFs are saved to Supabase Storage (`project-documents` bucket, path `{projectId}/aia-billing/`) and cross-referenced in both `payment_applications` (via `g702_pdf_url`/`g703_pdf_url`) and `project_documents` (for the Documents tab). Follows the same pattern as `reportStorageUtils.ts`.

### 9. Field Worker Project View (Field Schedule)
The field schedule (`/field-schedule/:projectId`) is the primary interface for field workers on mobile. It uses a **tab-based layout** with four tabs: Tasks, Notes, Media, Docs. Each tab shows a count badge.

**Key components:**
- `FieldScheduleTable` → `FieldTaskSection` (collapsible groups: Today/Active, This Week, Upcoming, Completed) → `FieldTaskCard` (expandable with Add Note + Mark Complete buttons; Add Note opens shared `NoteComposer` sheet — see Rule 15)
- `FieldQuickActionBar` — sticky bottom bar with Note / Camera / Attach buttons. Note opens the shared `NoteComposer` sheet (Rule 15); Camera/Attach are snap-and-forget quick-capture (Rule 14)
- `FieldMediaGallery` — read-only photo/video grid using `useProjectMedia` → `PhotoLightbox`/`VideoLightbox`
- `FieldDocumentsList` — filtered to field-relevant types only: `drawing`, `permit`, `license`, `specification`. Does **NOT** show contracts, reports, or receipts.

**Notes architecture (decomposed, unified Apr 18 2026 — see Rule 15):**
- `useProjectNotes` hook — query, mutations, upload (shared by every composer + timeline)
- `NoteComposer` — **single composer component** for mobile surfaces (bar, task card). Owns textarea + mentions + voice + attach + submit. See Rule 15.
- `NoteCard` — variant-based renderer (`'default'` | `'compact'`)
- `NoteInput` — legacy composer still used by desktop `ProjectNotesTimeline` resizable-panel layout. Slated for eventual replacement by `NoteComposer presentation="inline"`.
- `VoiceNoteButton` — self-contained audio recording + Whisper transcription (used internally by `NoteComposer`, and externally by legacy `NoteInput` via `voiceNoteSlot`)
- `ProjectNotesTimeline` — timeline shell with `hideComposer` prop (mobile Notes tab passes `hideComposer` so the bar is the sole entry point)

**Task card interaction model:** Tap to expand → see admin notes, then tap "Add Note" (opens sheet composer with `taskName` context) or "Mark Complete". Notes are created as project notes with task-name prefix (e.g., `**Framing:** North wall done`). No accidental completion — checkbox was replaced with a deliberate "Mark Complete" button.

**Time entry notes:** The `ManualTimeEntryForm` includes a `NotesField` component. Notes are stored in `expenses.description`. Auto-generated time range patterns in old entries are stripped via regex when loading for edit.

### 10. @Mention Tagging & In-App Notifications
Users can @mention team members in project notes. Tagged users see a notification badge.

**Mention format:** Stored inline as `@[Display Name](userId)` in `note_text`. Display layer parses tokens and renders as styled spans. Resolved on submit via `resolveMentions()` in `mentionUtils.ts`.

**Key tables:**
- `note_mentions` — junction table: `note_id` → `project_notes`, `user_id` → `auth.users`. Enables indexed "notes mentioning me" queries.
- `user_notifications` — generic notification store: `user_id`, `type` ('mention'), `title`, `body`, `link_url`, `is_read`, `reference_id`, `reference_type`. Designed for future notification types (approvals, training, etc.). Realtime enabled.

**Key components:**
- `MentionTextarea` — textarea that detects `@` keystrokes, shows filtered employee list. Mobile: bottom Sheet. Desktop: floating dropdown. Uses `useMentionableUsers` hook (queries `payees` where `is_internal=true`, `is_active=true`, `user_id IS NOT NULL`).
- `NotificationBell` — bell icon in mobile header with orange dot when unread mentions exist.
- `Mentions` page (`/mentions`) — lists unread notifications. Tap → navigates to `/field-schedule/{projectId}?tab=notes`. Mark individual or all as read.
- Sidebar: "Mentions" nav item with `badgeCount` (visible to all users).

**Data flow:** Note created → `useProjectNotes.addNote` resolves mentions → inserts `note_mentions` + `user_notifications` rows → real-time subscription fires → `useUnreadMentions` (TanStack Query with shared key) updates all instances (bell, sidebar, mentions page) → optimistic cache update on mark-as-read for instant UI response.

**Mentionable users:** Sourced via the `get_mentionable_employees()` SECURITY DEFINER RPC, which returns one row per role-holder regardless of payee state — see Architectural Rule 11 below. Display name resolution: `payees.payee_name` → `profiles.full_name` → email local-part.

### 12. Bounded `expenses` Queries (Apr 16, 2026)
The `expenses` table is growing past 1,000 rows (1,278 at time of writing). **PostgREST's default row cap is 1,000**, so any unbounded `.from('expenses').select(...)` without `.eq()`/`.in()`/`.range()` silently drops rows — the original symptom was the All Expenses search "078" returning 5 rows instead of 8.

**Three correct patterns for reading expenses:**

1. **Global list / search / filter** — use the `public.expenses_search` view via `useExpensesQuery` hook ([src/hooks/useExpensesQuery.ts](src/hooks/useExpensesQuery.ts)):
   - The view denormalizes `expenses + payees + projects` into one row per non-split expense with a single lowercased `search_text` column.
   - `WITH (security_invoker = on)` so RLS from underlying tables still applies (admins see everything, field workers see only their rows).
   - Hook uses `useInfiniteQuery` with `.range()` pagination, `count: 'exact'`, and maps filter state to PostgREST `.ilike`/`.in`/`.gte`/`.lte` clauses.
2. **Project-scoped reads** — always use `.eq('project_id', projectId)`. Filtered example: [src/hooks/useProjectData.tsx](src/hooks/useProjectData.tsx) (`.eq('project_id', projectId).eq('is_split', false)`).
3. **Counts / aggregates** — use `.select('*', { count: 'exact', head: true })` with filters. Example: [src/hooks/useUnapprovedExpensesCount.ts](src/hooks/useUnapprovedExpensesCount.ts).

**`ExpensesList` dual-mode**: when the `expenses` prop is provided it renders pre-filtered data (project route). When omitted it falls through to `useExpensesQuery` — the All Expenses page at `/expenses` relies on this.

**Admin-only exception (partially resolved Apr 16, 2026; regression caught Apr 18)**: `BulkExpenseAllocationSheet` applies server-side `.eq('is_split', false)` + `.range(0, 9999)` + `.order('expense_date', desc)` to its candidates query. The `is_split` + ordering fixes are real wins. However, `.range(0, 9999)` does NOT actually raise the server cap in this project (see Gotcha #23 correction) — the candidate list silently truncates at 1,000 rows. At 1,288 non-split expenses today the sheet is missing ~288 candidate rows. Flagged as a Medium Priority fix: loop pagination in the query (the pattern `ExpenseExportModal` now uses), or push an RPC that returns only un-correlated expenses server-side.

### 13. Cost Bucket Views on Cost Tracking (Apr 16, 2026)

The Cost Tracking page (`/projects/:id/control`) uses a **tab toggle between two views**, both sharing a single hook:

| Tab | Component | Role |
|---|---|---|
| **Buckets** (default) | [CostBucketView](src/components/cost-tracking/CostBucketView.tsx) | Per-category rollup (Labor, Materials, Other, etc.) with collapsible rows showing line-item detail. Replaces the dense 12-column table as the default front door. |
| **Detail** | [CostBucketSummaryStrip](src/components/cost-tracking/CostBucketSummaryStrip.tsx) + existing dense table | Compact bucket strip pinned above the unchanged [LineItemControlDashboard](src/components/LineItemControlDashboard.tsx) table for power-user drill-in (per-line correlation, quote management). |

**Data source**: [useProjectCostBuckets](src/hooks/useProjectCostBuckets.ts) composes `useLineItemControl` (line items + correlations + quotes) with three supplementary reads: per-category spend from `expenses` + `expense_splits` (Rule 12 pattern), `estimate_financial_summary` (cushion config), and `estimate_line_items` (labor_hours, billing_rate, labor_cushion_amount). TanStack Query for cache + reactivity.

**Dynamic labor cushion**: the Labor bucket header is cushion-aware via a `LaborCushionState` derivation computed client-side from actual hours vs estimate. Three zones with color coding:
- 🟢 `under_est` — cushion intact (actual ≤ est hours)
- 🟡 `in_cushion` — eroding (estHours < actual ≤ capacityHours), remaining = `bakedIn − (actual − estHours) × actual_cost_rate`
- 🔴 `over_capacity` — cushion gone, excess past capacity = real cost overrun

Per-line cushion annotations on labor rows are static (sourced from `estimate_line_items.labor_cushion_amount`) because per-line actual hours require correlations which are rarely set today.

**Visual alignment**: tab toggle uses the canonical Expenses-page pattern (`MobileTabSelector` dropdown on mobile, rounded-pill `bg-muted/50 p-1` with orange active state on desktop). Expanded bucket headers get `border-l-2 border-orange-500` per `docs/design/VISUAL_HIERARCHY.md`.

**"Other" bucket as data hygiene signal**: when expenses are categorized as `other` with no matching estimate line items (common pattern for CSV imports), the bucket renders an amber warning with a recategorize CTA. Example seen on 225-078: $2,664 sat in `other` with $0 target.

### 14. Global Mobile Action Bar (Apr 16, 2026; Note button migrated to NoteComposer Apr 18)

**[FieldQuickActionBar](src/components/schedule/FieldQuickActionBar.tsx)** is the single project-scoped capture/note affordance on mobile. Rendered ONCE in [ProjectDetailView](src/components/ProjectDetailView.tsx) — persistent bottom bar visible across every project detail route (`/projects/:id`, `/control`, `/documents`, etc.). Replaced the fragmented mix of per-page FABs and per-card inline inputs.

**Three-button standard** (Slack / WhatsApp / Linear convergent pattern):

| Button | Action | Flow |
|---|---|---|
| **Note** | Opens shared [`NoteComposer`](src/components/notes/NoteComposer.tsx) in `presentation="sheet"` — full composer with mentions, voice mic, and the in-composer Attach menu (Take Photo / Record Video / Upload File) | See Rule 15 |
| **Camera** | `useCameraCapture().capturePhoto()` direct call | Fast in-the-moment photo capture that lands as an attachment-only note with empty text — no composition |
| **Attach** | Hidden `<input type="file" accept="image/*,video/*,.pdf,...">` → native sheet | Same snap-and-forget pattern as Camera but for any file type |

**Why Camera + Attach stay as independent bar buttons** (instead of being folded into NoteComposer): they serve the *snap-and-forget* workflow (no text, no composition — just drop a photo/file and move on). Forcing users into a sheet for a zero-text note would be a regression. The composer is for **compose-and-send**; the bar's Camera/Attach are for **capture-only**.

**Sticky override for inline use**: `FieldQuickActionBar`'s outer div is `position: fixed bottom-0`. When a caller wants it inline, override with `[&>div:first-child]:!static [&>div:first-child]:!shadow-none` utilities. Bottom sheets render in Radix Portal at document root regardless of trigger position.

**Content padding**: the project detail main wrapper gets `pb-20` on mobile so scrollable content never ends up hidden behind the bar.

**Not rendered on `/field-schedule/:id`** — that route is outside `ProjectDetailView` and renders its own bar. If you add a new project-scoped mobile route, prefer putting it inside `ProjectDetailView`'s Outlet so it inherits the bar automatically.

### 15. Unified `NoteComposer` (Apr 18, 2026)

**[`NoteComposer`](src/components/notes/NoteComposer.tsx)** is the single composer surface for creating a project note. Replaces three parallel implementations that previously drifted independently: `FieldQuickActionBar`'s inline Note sheet, `FieldTaskCard.TaskActions`'s cramped per-task composer, and the top-of-tab `NoteInput` card on the Notes tab.

**Contract**:

```tsx
<NoteComposer
  projectId={...}
  taskName?={...}              // optional — prepends "**{taskName}:** " to stored note_text
  presentation="inline"|"sheet" // sheet opens in a bottom Sheet; inline embeds
  open={...} onOpenChange={...} // for sheet presentation
  onSubmitted?={...}
  placeholder?={...}
  enableVoice?={true} enableAttach?={true}
/>
```

**Internal behavior**: owns text/mentions/voice/attachment/submit. Uses `useProjectNotes` for mutations (no prop-drilled handlers), `useMentionableUsers` for @ suggestions, `useCameraCapture` for photos, `useVideoCapture` for videos, built-in `VoiceNoteButton`. On submit: `resolveMentions` → optional task prefix → optional `uploadAttachment` → `addNote`.

**Attach = single paperclip → labeled menu** (Take Photo / Record Video / Upload File). Each option routes to its dedicated capture hook or a docs-only file input:

- **Take Photo** → `useCameraCapture` (`accept="image/*"` — native picker offers camera OR library)
- **Record Video** → `useVideoCapture` (`accept="video/*"`)
- **Upload File** → hidden input (`accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"`, docs only)

**Why separate code paths behind one button**: a combined `accept="image/*,video/*,.pdf,..."` input is flaky — iOS Safari sometimes drops the "Take Video" affordance, Android's combined picker deprioritizes camera access. Each hook is already tuned for its job; one visible affordance + three focused code paths beats one button with one compromised input.

**Three trigger points today**:

| Surface | Trigger | taskName |
|---|---|---|
| `FieldQuickActionBar` Note button | Tap opens composer sheet | none |
| `FieldTaskCard.TaskActions` "Add Note" button | Tap-expand task → tap Add Note → sheet opens | task name ⇒ `**Demo:** ...` |
| `ProjectNotesTimeline` desktop panel (not yet migrated) | — | — |

**NOT migrated yet**: `ProjectNotesTimeline` desktop timeline still uses the older `NoteInput` component (resizable panel layout). Fine for now; a future consolidation can evaluate whether `NoteComposer presentation="inline"` is a drop-in replacement.

**`ProjectNotesTimeline.hideComposer` prop**: callers whose surface already provides a note-entry path (`FieldSchedule.tsx:256` — has the bottom bar) pass `hideComposer` so the timeline renders list-only. Prevents two composers on one screen.

**Common pitfall**: don't prop-drill `addNote` or `uploadAttachment` handlers through to `NoteComposer` — it owns its mutations via `useProjectNotes` internally. Parents use `onSubmitted` (a void callback) for side effects like closing their own sheet or scrolling.

**Task-prefix format preserved exactly**: `**{taskName}:** {text}`. For attachment-only notes, the fallback body is the attachment type label (`Photo`, `Video`, or `{fileName}`) — matches the pre-existing `FieldTaskCard` "**Demo:** Photo" pattern and extends it to video/file.

### 16. Quote View / Edit / Compare Anatomy (Apr 21, 2026)

The quote detail surfaces (project-scoped `/projects/:id/estimates/quotes/:quoteId` and sidebar `/quotes` → View) share one presentational decomposition. The old "wrap the entire 1,638-line `QuoteForm` in `mode='view'`" pattern is **removed** from both surfaces — it bled pre-decision selection UI (competing-vendor "Quote Coverage" column, line-item checkboxes, project/estimate dropdowns) into post-approval views and rendered the contracts list twice. `QuoteForm` is now used only for `new` and `edit`.

**Four presentational cards compose the view** (all in [src/components/quotes/](src/components/quotes/)):

| Component | Role |
|---|---|
| [QuoteViewHero](src/components/quotes/QuoteViewHero.tsx) | Vendor identity · signed cost variance vs estimate (the "screaming number") · margin-if-accepted % with target-band coloring · `Status` pill (`QuoteStatusSelector`) · Edit / Contract / Compare buttons · Edit guard dialog when quote is accepted AND has a generated contract |
| [QuoteCoverageCard](src/components/quotes/QuoteCoverageCard.tsx) | Per-line-item EST → QUOTED → Δ rows; scope pills (Labor/Materials); rollup totals footer; amber "Unmatched" badge on quote_line_items with no `estimate_line_item_id` link |
| [QuoteDocumentsCard](src/components/quotes/QuoteDocumentsCard.tsx) | Unified doc home. **Quote from vendor** section: reuses existing `QuoteAttachmentUpload`, opens the PDF in the shared `PdfPreviewModal` (not a new tab). **Generated contracts** section: versioned list sorted `version DESC`, latest marked "Current" in orange, older versions fold into a "Show N previous versions" chevron. Uses `contracts.version` (integer, already in schema) and `contracts.status='superseded'` for labeling. |
| [QuoteNotesCard](src/components/quotes/QuoteNotesCard.tsx) | Auto-hides when empty. Renders `rejection_reason` + `notes` with labeled sections. |

**Peer comparison** — [QuoteComparisonPeer](src/components/quotes/QuoteComparisonPeer.tsx) replaces the old `QuoteComparison.tsx` (deleted). The old view was single-quote-vs-estimate margin math duplicated by the new hero. The peer view is genuinely different: per-line-item leaderboards ranking every quote that references the same `estimate_line_item_id`. Summary strip: lines-you-bid, with-competition, peer-vendors, you're-lowest-on. Per-line cards: rank badge (`#1 of N`), status pills, Lowest/You badges, delta-vs-estimate on each row, click-through to peer's view.

**Helpers live in [src/utils/quoteFinancials.ts](src/utils/quoteFinancials.ts)** — all client-side, no new queries needed (`useProjectContext().quotes` already has the full project set):
- `getSignedCostVariance(quote, estimates)` → powers the hero variance. Returns `status: 'under' | 'over' | 'on' | 'none'` — `'on'` is for exact-match cost (zero variance with a real baseline), `'none'` is for truly missing baseline. Don't conflate these.
- `getMarginIfAccepted(quote, estimates)` → margin %, target margin, status band (excellent / on-target / marginal / loss). Margin baseline is `getEstimateLineItemPrice` (customer sell), not cost.
- `getQuotePeersByLineItem(quote, allQuotes, estimates)` → per-line leaderboard data structure
- `countLineItemPeerQuotes(quote, allQuotes)` → # distinct OTHER quotes sharing ≥1 line item. Used to gate the `Compare vs N peers` button and the `QuotesTableView` 3-dot menu option.

**Two routes, same composition**:
- `/projects/:id/estimates/quotes/:quoteId` → [QuoteViewRoute](src/components/project-routes/QuoteViewRoute.tsx) (URL-based; Edit/Compare navigate to URLs)
- `/projects/:id/estimates/quotes/:quoteId/compare` → [QuoteComparePeerRoute](src/components/project-routes/QuoteComparePeerRoute.tsx) (peer leaderboard with URL-based navigation back to view)
- `/quotes` → [src/pages/Quotes.tsx](src/pages/Quotes.tsx) — in-page `view` state machine (`list` | `create` | `edit` | `view` | `compare`), uses the same four cards in `view` and the same peer component in `compare`

**Peer gating at line-item level** — [QuotesTableView.tsx](src/components/QuotesTableView.tsx) 3-dot menu's `Compare vs peers` item uses `countLineItemPeerQuotes`, not estimate-level count. Cross-estimate-version peer matching is NOT supported (schema has no `estimate_line_item_family_id`). If that becomes important, add the column via trigger on estimate revision — don't fall back to fuzzy (description, category) matching.

**Common pitfalls**:
1. Don't add back `QuoteForm mode="view"` on `/quotes` or the project-scoped route — that reintroduces the duplicate contracts list and the pre-decision selection UI.
2. `quote_line_items.estimate_line_item_id` can be null; `getQuotePeersByLineItem` filters these out silently. The Coverage card surfaces them as "Unmatched" so the PM knows the linkage is missing — leave that visible.
3. Gotcha #25 applies here too: both the actions cell AND the status cell in `QuotesTableView` need `<div onClick={e => e.stopPropagation()}>` wrappers. Row-click now opens View (not Compare) — without the guards, any click inside those cells navigates the page before Radix can open its popover.

### 11. Employees vs Payees (Apr 2026)

> **Users are the employees.** An employee is an `auth.users` row with at least one `user_roles` entry. The internal `payees` row (`is_internal=true`) is a **shadow record** that exists only to satisfy FK constraints on 7 accounting tables (`expenses`, `contracts`, `change_order_line_items`, `quotes`, `receipts`, `pending_payee_reviews`, `projects.owner_id`).

**The bridge is one column:** `payees.user_id` (uuid, nullable, FK to `auth.users(id)`, `ON DELETE SET NULL`). Setting it links the accounting record to the auth user. Nothing else makes the connection.

**Why this isn't collapsed into one table:** 600+ live expense rows reference internal payees. The accounting ledger is load-bearing history; we cannot rename or delete `payees`.

#### The unified surfaces

| Surface | What it does | Source |
|---|---|---|
| `/role-management` → Users & Roles table (single table) | One row per user with columns for Roles, **Messages**, **Expense & time setup**, Password, Sign-in, Actions. The three employee-facing attributes sit side-by-side: **Roles** (access), **Messages** (clickable On/Off toggle — backed by `profiles.can_be_mentioned`, defaults On if user has any role), **Expense & time setup** (payee state: Enabled / Not enabled (optional) / Required red for field workers / Unattached / Retired) with inline quick-fix buttons (Enable / Set up / Attach / Retire / Restore / Delete). The 3-dot menu has Edit / Reset Password / **Deactivate User** / Delete User. | Joins existing `get_user_auth_status` (users list) with `get_employees_audit()` keyed by `user_id`; Messages toggle writes via `set_user_can_be_mentioned(target_user_id, value)` SECURITY DEFINER RPC (admin-gated) |
| `@mention` autocomplete | Lists every active role-holder for any authenticated caller | `get_mentionable_employees()` RPC (SECURITY DEFINER bypasses cross-user RLS on profiles/auth.users) |
| `CreateUserModal` | Creates auth user → role. Auto-creates a linked internal payee **only when role is `field_worker`** (they log labor → expenses need `payee_id`). Admins/managers don't get an auto-payee — they don't need one unless they become project owners or receive expense allocations, and the admin can add one on demand from Role Management via the "Set up" ghost button in the Employee record column. | client-side after `admin-create-user` succeeds |
| `admin-disable-user` edge function (v102) | Bans auth → flips `profiles.is_active` → best-effort flips `payees.is_active=false` for the linked internal payee. Payee step is non-blocking; auth disable is the source of truth. Invoked from the **Deactivate User** menu item. | edge function |
| `PayeeForm` for `is_internal=true` payees | Banner + locked fieldset; only Notes editable. Redirects to Role Management. | UI lock |
| `/payees` page | Defaults to **excluding** internal employees. Selecting **Internal Labor** in the Type filter reveals them read-only (locked by `PayeeForm`). No separate toggle — the type filter is the single control. | `PayeesList` filter |

**UI surface history:** An earlier pass used a separate "Accounting Linkage" / "Employees" card above the Users & Roles table. That duplicated the user list and forced admins to mentally merge two views. Collapsed into the single Users & Roles table Apr 15, 2026 ([src/components/role-management/EmployeeAuditSection.tsx](src/components/role-management/EmployeeAuditSection.tsx) is still in the repo but unused — safe rollback point if needed).

#### Structural guardrails (DB level)

- **`idx_payees_user_id_internal_unique`** — unique partial index `ON payees(user_id) WHERE is_internal AND user_id IS NOT NULL`. Prevents a single auth user from having more than one linked internal payee. Auto-create handlers treat `23505` as benign (no-op success).
- `payees.user_id` FK → `auth.users(id) ON DELETE SET NULL` — deleting an auth user nulls the payee link but preserves the payee row + its expense history.

#### Common pitfalls

1. **Only field workers get auto-payees.** Admins and managers do not. They're allowed to have a payee (for project-owner assignments or occasional expense allocations) but the auto-create flow will not make one — it would clutter WorkerPicker and create unnecessary accounting records. Admin can add one on demand via Role Management → "Add anyway".
2. **`NO_PAYEE` is only a problem for field workers.** In `EmployeeAuditSection`, admin/manager users without a payee render in the collapsed "other users" section as valid, not as "needs attention". Field workers without a payee are red.
3. **Don't add an `app_role` enum value without UI guards.** `manager` exists but has zero assignments today; sidebars and time-entry forms already gate on `isManager`.
4. **Don't query `payees` directly for "who can be @mentioned".** The view of truth is the RPC. Querying payees misses role-holders whose payee row is missing or unlinked.
5. **Don't edit internal payees from `PayeeForm`.** They're locked. Use Role Management. The lock prevents drift between the auth side and the accounting side.
6. **Retire is the default soft-delete; hard Delete is reference-gated.** Role Management exposes two destructive actions on an Unattached employee record: **Retire** (flips `is_active=false`, always safe) and **Delete permanently** (hard `DELETE FROM payees`, which Postgres blocks via the 7 FK constraints if anything references it). The UI doesn't pre-check — the DB is the source of truth. On FK violation (`23503`) the hook translates the error into plain language and tells the admin to use Retire instead. The unique partial index on `(user_id) WHERE is_internal AND user_id IS NOT NULL` keeps "one active internal payee per user" invariant; inactive/retired ones are fine.

#### Verifying linkage health (admin SQL)

```sql
-- "Needs attention" count:
--   PAYEE_NOT_LINKED or PAYEE_INACTIVE (always a problem), plus
--   NO_PAYEE for field workers only (admins/managers without payees are valid)
SELECT COUNT(*)
FROM public.get_employees_audit()
WHERE linkage_status IN ('PAYEE_NOT_LINKED', 'PAYEE_INACTIVE')
   OR (linkage_status = 'NO_PAYEE' AND 'field_worker' = ANY(roles));
-- Expect zero.
```

### 17. Unified Navigation Chrome (Apr 21, 2026)

Three navigation drift points were closed in one session:

**Breadcrumbs** — single [AppBreadcrumbs](src/components/layout/AppBreadcrumbs.tsx) component renders hierarchical context. Never `aria-current` on intermediate items — only on the terminal. Hidden when `items.length < 2` (a single crumb duplicates the PageHeader title). On mobile it's gated to `items.length >= 4` on project drill-in — at 3 the section selector pill already carries the identity, and stacking them makes the header too dense. The helper [useProjectBreadcrumbs](src/components/layout/useProjectBreadcrumbs.ts) reads `useLocation` + `useParams` and resolves quote/estimate labels from the `quotes`/`estimates` arrays already loaded by `useProjectData` — no extra fetches.

All 4 pre-existing ad-hoc breadcrumb renders ([BranchBidDetail.tsx](src/pages/BranchBidDetail.tsx), [Quotes.tsx](src/pages/Quotes.tsx), [AllRevenuesLineItemsReport.tsx](src/pages/AllRevenuesLineItemsReport.tsx), [AllExpensesLineItemsReport.tsx](src/pages/AllExpensesLineItemsReport.tsx)) migrated to the shared component. Do NOT render the primitive `<Breadcrumb>` directly in new code — always use `AppBreadcrumbs`.

**URL-driven state on sidebar pages** — `/quotes`, `/expenses`, `/projects` used to be in-page `useState<'list' | 'view' | 'edit' | ...>` machines that broke F5, deep-links, and shareable URLs. They are now URL-driven:
- `/quotes` → list; `/quotes/new` → create; `/quotes/:id` → view (the 4 presentational cards from Rule 16); `/quotes/:id/edit`; `/quotes/:id/compare` (peer leaderboard). All 5 routes mount the same `Quotes.tsx` — it derives `view` from `useParams` + `useLocation` and syncs `selectedQuote` from `quotes` by URL id via a `useEffect`. Preserves existing optimistic status updates.
- `/projects/new` → standalone route ([ProjectNew.tsx](src/pages/ProjectNew.tsx)) wrapping `ProjectFormSimple`.
- `/expenses?tab=overview|list|invoices|import-history` — `useSearchParams`, omits `tab` from URL on default (overview) for clean URLs.
- `/projects/:id/control?view=buckets|detail` — same pattern. Still reads localStorage as fallback when URL has no param (preserves returning-user preference without cluttering URL).

**Section selector fix** — [ProjectDetailView.tsx](src/components/ProjectDetailView.tsx) mobile now derives `currentSection` from `segments[2]` (position after `projects`/`:id`). Was reading `segments[segments.length-1]`, which collapsed to `"new"` / `:id` on deep routes and fell through `getSectionLabel`'s "Overview" default. Breadcrumbs surfaced the bug; this fix keeps the pill honest.

### 18. Schedule URL Unification + Role Access (Apr 21, 2026)

`/projects/:id/schedule` is now the **canonical schedule URL**. Behavior:

- Mobile (`useIsMobile()`) → [MobileScheduleView](src/components/schedule/MobileScheduleView.tsx) — the Tasks / Notes / Media / Docs tab experience lifted from the old `FieldSchedule.tsx` page. Uses `?tab=` query for active tab (matches the `/field-schedule?tab=notes` pattern mention notifications already depend on).
- Desktop → unchanged Gantt (`ProjectScheduleView`).

Legacy `/field-schedule/:projectId` is a `<Navigate>` redirect (`LegacyFieldScheduleRedirect` wrapper in [App.tsx](src/App.tsx)) preserving the query string so mention-notification deep-links like `/field-schedule/X?tab=notes` land on `/projects/X/schedule?tab=notes`. **Old `src/pages/FieldSchedule.tsx` is deleted.**

**Field-worker role access** — the AppLayout guard that bounces field workers from `/projects/*` to `/time-tracker` has a **single exemption**: `/projects/:id/schedule` (matched by `/^\/projects\/[^/]+\/schedule(\/|$|\?)/`). Other sub-routes (`/expenses`, `/control`, `/billing`, `/changes`, `/estimates`) are still blocked. Consequences:

- Field workers land on the canonical schedule URL correctly (redirect preserves their workflow).
- ProjectDetailView's mobile section-selector sheet is filtered by role via `getNavigationGroups({ isFieldWorker })` in [projectNavigation.ts](src/components/project-detail/projectNavigation.ts) — items carry a `fieldWorkerSafe` flag; field workers see only flagged items (today just Schedule). Prevents broken-dead-end UX where tapping Expenses would bounce them back.
- ProjectDetailView mobile header's back arrow routes to `/time-tracker` for field workers (not `/projects`, which would redirect them anyway).

When you add a new project sub-route that field workers should reach, you must: (a) mark the corresponding `NavItem` with `fieldWorkerSafe: true`, AND (b) widen the AppLayout exemption regex. Both — doing only one creates a broken nav entry.

### 19. Mobile Capture Bar Storage Routing (Apr 21, 2026)

[FieldQuickActionBar](src/components/schedule/FieldQuickActionBar.tsx)'s three buttons were all miswiring through `project_notes` (creating empty-text notes with `attachment_url`), silently. Fixed routing:

| Surface | File type | Writes to | Visible on |
|---|---|---|---|
| **Camera (bar)** | image only (`accept="image/*"`) | `project_media` via `uploadProjectMedia()` (captures `navigator.userAgent` as `device_model`, attempts `getCurrentPosition` for GPS) | Media tab |
| **Attach (bar)** | image / video | `project_media` via `uploadProjectMedia()` (no GPS — these are usually from library, not fresh captures) | Media tab |
| **Attach (bar)** | PDF / Word / Excel / txt | `project_documents` via `uploadProjectDocument()` with `document_type: 'other'` | Docs tab (new "Field Attachments" section) |
| **NoteComposer internal attach menu** | any | `note-attachments` bucket via `useProjectNotes.uploadAttachment` (unchanged) | Notes timeline, inline with the note's text |

Key artifacts:
- New: [`uploadProjectDocument()`](src/utils/projectDocumentUpload.ts) — sibling of `uploadProjectMedia`, same rollback-on-DB-failure pattern, `{projectId}/attachments/{timestamp}-{sanitizedName}` path.
- `FieldQuickActionBar` invalidates both `['project-media', projectId]`/`['project-media-count', projectId]` AND `['project-documents', projectId]`/`['project-docs-count', projectId]` on every upload — Gotcha #27 fanout.
- [FieldDocumentsList](src/components/schedule/FieldDocumentsList.tsx) and `MobileScheduleView`'s docs-count query both include `'other'` in the type filter so field-attached PDFs are visible. New "Field Attachments" section label in FieldDocumentsList.

**Principle** — the bar's Camera/Attach are "capture and forget" flows. A raw photo with no words belongs in Media. NoteComposer's internal attach is the "compose and send" flow — a photo captioned "drywall finished, punctures need patching" belongs on the Notes timeline with that text. Don't collapse these surfaces.

### 20. Note-Attached Media on the Media Tab (Apr 21, 2026)

**Read-side UNION**, not a data migration. [`getProjectMediaList`](src/utils/projectMedia.ts) loads `project_media` as before, then queries `project_notes` for rows with non-null `attachment_url` and `attachment_type IN ('image','video')`, maps them to the `ProjectMedia` shape with `source: 'note'`, and merges both lists sorted by `taken_at ?? created_at`. No schema change, no dual-write.

Note-sourced `ProjectMedia` rows have:
- `id: \`note:${noteId}\`` — prefix so downstream code can distinguish. `MediaCommentsList` keyed on this id returns no rows (correct — the note IS the thread).
- `caption`: set to the note's `note_text`.
- `note_id`, `note_text`: populated for deep-linking.
- No `latitude`/`longitude`/`device_model`/`duration` (note attachments don't carry EXIF).

[PhotoLightbox](src/components/PhotoLightbox.tsx) guards when `source === 'note'`:
- No Delete button (ambiguous ownership; the note is the parent record).
- No Caption button (the note text IS the caption).
- No MediaCommentForm/List (the note is the conversation thread).
- Info badge: "Shared in a project note — edit or delete from the Notes tab."

[MobileScheduleView](src/components/schedule/MobileScheduleView.tsx)'s media tab badge count uses `Promise.all` of `project_media` + note-attachments so it stays honest. **Known limitation**: no realtime subscription on `project_notes` for the Media tab — updates land on next refocus (TanStack Query staleTime). Low-priority follow-up if realtime becomes important.

**Don't migrate existing note-attachments to `project_media`** — the storage bucket (`note-attachments` is public; `project-media` uses signed URLs) and metadata shape are different. The read-side merge is the long-term design.

### 21. Timeline Story View Polish (Apr 21, 2026)

[TimelineStoryView](src/components/TimelineStoryView.tsx) was rebuilt. The previous `h-40 object-cover` killed portrait-phone photos and left empty gray blocks where thumbnails failed. The new version:

- `max-h-[360px] object-contain` on thumbnails with `bg-black/5` letterbox — natural aspect preserved for every device.
- Sticky date headers with semantic labels (`Today` / `Yesterday` / `Friday, Apr 10` / `April 10, 2026` for out-of-year), `Apr 10, 2026 · 2 items` subcaption.
- Vertical spine (1px gray) with orange-ringed dot markers on each entry.
- Entry header strip: time (tabular-nums) + chips — `Video` / `From note` / device label via [`formatDeviceLabel`](src/utils/formatDeviceLabel.ts) (`"iPhone · Safari"` — NOT the raw 4-line UA, which still lives in the DB for forensics).
- Human-readable location (`location_name` preferred; falls back to compact "GPS" pill when only coords are present; lightbox still shows precise coords).
- Hover/focus affordances with `focus-visible:ring-2` for keyboard nav.
- Empty state message when no media in the period.

Raw UA is still stored on upload (all pipelines set `device_model: navigator.userAgent`). Only the display layer formats. Never render `device_model` raw — always through `formatDeviceLabel(raw)`.

### 22. Leads Detail Page Mirrors Project Detail Shape (Apr 23, 2026)

Leads was the last area still using pre-April-2026 mobile patterns (raw page header, `MobileTabSelector` dropdown for tabs, single-file attach, no sheet composer). This session brought it to parity with the Project Detail experience.

**New siblings in [src/components/bids/](src/components/bids/)**:

| Component | Sibling of | Delta |
|---|---|---|
| [`BidQuickActionBar`](src/components/bids/BidQuickActionBar.tsx) | [`FieldQuickActionBar`](src/components/schedule/FieldQuickActionBar.tsx) | Same Note / Camera / Attach three-button `fixed bottom-0` shape. Note opens `BidNoteComposer`. Camera navigates to the existing GPS-aware `/leads/:id/capture` page (not in-place). Attach uses `useBidMediaUpload.upload` which auto-routes by MIME into `bid_media` with `file_type` image/video/document. |
| [`BidNoteComposer`](src/components/bids/BidNoteComposer.tsx) | [`NoteComposer`](src/components/notes/NoteComposer.tsx) | Textarea + `VoiceNoteButton` + Send. `presentation="inline" \| "sheet"`. **Does NOT support @mentions** (no `bid_note_mentions` table), **does NOT support note-attachments** (`bid_notes` has no `attachment_url` column). Those are explicitly out of scope — Camera/Attach on the bar cover the capture-and-forget flow. |

**[BidNotesTimeline](src/components/BidNotesTimeline.tsx) `hideComposer` prop** mirrors [`ProjectNotesTimeline.hideComposer`](src/components/ProjectNotesTimeline.tsx) from Rule 15. Mobile surfaces pass `hideComposer` so the bar's sheet is the sole entry point.

**Mobile tab strip matches [`MobileScheduleView`](src/components/schedule/MobileScheduleView.tsx), not `MobileTabSelector`.** The detail page uses a custom horizontal tab strip with count badges (`Notes N`, `Media N`, `Docs N`) via `useBidNotes` + `useBidMedia`. Use `MobileTabSelector` dropdown ONLY for list pages (Expenses, Projects); detail-page tabs with badges use the strip pattern.

**Row-action semantics on [EstimateActionsMenu](src/components/EstimateActionsMenu.tsx)** clarified:
- **Duplicate Estimate** → `navigate('/projects/:id/estimates/new?sourceEstimateId=...')` → `EstimateForm`'s auto-copy effect populates line items **locally**. DB write only on explicit Save.
- **New Estimate for Project** → `navigate('/projects/:id/estimates/new')` → blank form scoped to this estimate's project.
- Previous implementation called `create_estimate_version` RPC on menu click, which eagerly persisted a row. Cancel then left an orphan draft. Now both actions are cancel-safe (see Gotcha #39).
- **Version lineage** (`parent_estimate_id`) is only created via the `New Version` button on [ProjectEstimatesView](src/components/ProjectEstimatesView.tsx). Duplicate now creates an independent standalone copy — different semantics, both intentional.

**Multi-file bulk upload** on mobile Attach surfaces: `BidQuickActionBar`, `FieldQuickActionBar`, and `BidDocumentUpload` all accept `multiple` now. `BidMediaBulkUpload` was already bulk on desktop. Sequential upload loop per file (not parallel — hook state races), aggregated toast for batches > 1. **Toast ownership lives with the caller, not the hook** — see Gotcha #42. Camera buttons stay single-shot by design (device camera, "take one photo now" mental model).

**Mounting pattern for `BidQuickActionBar`** (PR #37, May 2026). The bar MUST render as a SIBLING of `MobilePageWrapper`, not a child. Wrap the page return in `<>...</>` and put `<BidQuickActionBar>` after `</MobilePageWrapper>`. Mounting it inside the wrapper breaks `position: fixed bottom-0` anchoring on iOS Safari — the bar floats mid-screen on tall pages instead of pinning to the viewport bottom. See Gotcha #41 for the diagnosis.

**Mobile Media tab is single-affordance** (PR #38, May 2026). On mobile the only way to add files is the bottom bar's Attach button (multi-file via `<input multiple>`). Two visible affordances were trimmed:
- `BidMediaBulkUpload` ("Upload Files" card next to the tab row) is gated behind `!isMobile` in [BranchBidDetail.tsx](src/pages/BranchBidDetail.tsx). Bulk capability stays via the bar's Attach; the rich per-file progress card stays as the desktop affordance (where there's no bottom bar).
- The grid/list view toggle in [BidMediaGallery](src/components/BidMediaGallery.tsx) is gated behind `!isMobile`. Mobile locks to grid (Google Photos / Apple Photos pattern). The toggle's two icon buttons used to fight the filter pills for ~80px of width on a 393px viewport — clipping "Videos (N)" once counts grew to 2+ digits. Hiding it lets the filter pills own the row regardless of count length.

**Camera divergence is intentional.** `FieldQuickActionBar` Camera = native picker → upload (~2 toasts, no dedicated page). `BidQuickActionBar` Camera = `navigate('/leads/:id/capture')` → dedicated GPS-aware preview/caption page. The dedicated page is heavier but fits the lead-documentation workflow where explicit GPS capture has business value (you're photographing a physical site for a quote). Field captures already happen on a known project site, so the lighter pattern wins there. Don't try to collapse them — the divergence is by design.

---

## TypeScript Configuration

```json
// tsconfig.json key settings (not strict)
{
  "noImplicitAny": false,   // any types are tolerated
  "skipLibCheck": true,     // ignore node_modules type errors
  "strictNullChecks": false // null/undefined not strictly checked
}
```

Path alias `@/*` → `src/*` — use it for all internal imports.

---

## Code Conventions

- **Components**: PascalCase files, functional + hooks only (no class components)
- **Utilities**: camelCase files
- **Types**: PascalCase interfaces in `src/types/`
- **Hooks**: `use` prefix, live in `src/hooks/` or co-located in component directories
- **No premature abstraction**: Keep code simple; don't over-engineer for hypothetical future needs
- **ESLint**: React Hooks rules enforced; no unused variables
- **PWA service worker**: Disabled in dev mode — no stale cache issues during development

---

## Git & Deployment

- **Default branch**: `main`
- **Deployment**: Lovable auto-deploys on push to GitHub
- **Pre-deploy check**: `npm run pre-deploy` (lint + type-check)
- **Never force-push** to `main`
- **Commit format**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

### Edge Function Change Workflow

```
Normal:  local edit → commit → push → Lovable deploys → verify
Emergency: edit locally → MCP direct deploy → verify → push to sync
Major:  feature branch → test in Lovable preview → merge to main
```

---

## Environment Variables (`.env`)

`.env` is **git-ignored** (untracked as of Apr 2026). Each developer must create their own locally. Required variables:

```env
VITE_SUPABASE_URL=https://clsjdxwbsjbhjibvlqbz.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_FEATURE_SCHEDULE=true
VITE_FEATURE_AIA_BILLING=true
```

### Supabase Edge Function Secrets

Set in Supabase Dashboard → Settings → Edge Functions → Secrets:
- `OPENAI_API_KEY` — OpenAI API key (required for AI report assistant, caption enhancement, estimate enrichment, audio transcription)
- `ResendAPI` — Resend email service API key (required)
- `TEXTBELT_API_KEY` — Textbelt SMS key (required for SMS features)

---

## Documentation Map

| File/Location | Purpose |
|--------------|---------|
| `README.md` | Setup, architecture, deployment, troubleshooting |
| `PRODUCT_OVERVIEW.md` | Comprehensive feature documentation (all 8 modules) |
| `.cursorrules` | Cursor IDE pointer to `CLAUDE.md` + Cursor-specific MCP tool names |
| `supabase/FEATURE_FLAGS_STATUS.md` | Current feature flag states |
| `DEV_CLEAN_RELOAD.md` | Clearing stale dev cache (service worker) |
| `docs/` | 200+ documentation files organized by feature area |
| `docs/_archived/` | Historical plans and outdated docs |
| `docs/audits/` | Completed audit reports |
| `docs/CONTRACT_MIGRATIONS_APPLIED.md` | Contract feature migration log |

---

## Ongoing Maintenance Checklist

Use this list when doing periodic documentation reviews:

### After Each Major Feature
- [ ] Update `PRODUCT_OVERVIEW.md` module section
- [ ] Update `README.md` if new edge functions, scripts, or env vars added
- [ ] Update `.cursorrules` if new edge function pinned versions change
- [ ] Update `supabase/FEATURE_FLAGS_STATUS.md` if feature flags change
- [ ] Move implementation plan docs to `docs/` or `docs/_archived/` once shipped

### After Each Database Migration
- [ ] Verify local migration file count matches DB: `SELECT COUNT(*) FROM supabase_migrations.schema_migrations`
- [ ] Verify the local file is a **placeholder only** (no real SQL) — see "Critical Migration Rules" above
- [ ] Verify no BOM characters: `grep -rl $'\xEF\xBB\xBF' supabase/migrations/ | wc -l` should be 0
- [ ] Update `docs/DATABASE_TABLES_REFERENCE.md` if new tables/columns added

### After Edge Function Deploys
- [ ] Update `.cursorrules` pinned version numbers for the 4 branded-email functions
- [ ] Verify function status ACTIVE in Supabase dashboard

### Quarterly
- [ ] Review `docs/_archived/` — delete truly obsolete docs
- [ ] Check dependency versions in `package.json` for security updates
- [ ] Verify feature flags table reflects current production state
- [ ] Update this `CLAUDE.md` with anything that has changed

---

## Known Quirks & Gotchas

1. **"Failed to bundle function" error** — Usually a migration count mismatch, not a syntax error. Check migration alignment first.

2. **"relation does not exist" in migrations** — A migration file contains real SQL instead of a placeholder comment. Since earlier migrations are placeholders that don't create tables, any later file with real SQL will fail. Fix: convert the file to a placeholder (`-- Applied via Supabase dashboard...`). Run the health check in "Critical Migration Rules" to find offenders.

3. **BOM characters in migration files** — UTF-8 BOM bytes (`\xEF\xBB\xBF`) at the start of `.sql` files cause Supabase syntax errors. Some editors (notably Windows editors) add BOMs silently. Always check after bulk edits.

4. **Lovable vs. Supabase MCP deployment** — Floating version imports (`@2`) may resolve differently. Always pin exact versions.

5. **PWA cache in dev** — Service worker is disabled in dev. If you see stale UI, see `DEV_CLEAN_RELOAD.md`.

6. **Drag-and-drop uses `@hello-pangea/dnd`** — The maintained fork of `react-beautiful-dnd`. Legacy `react-beautiful-dnd` was removed (Apr 2026).

7. **QuickBooks is UI-hidden** — The `quickbooks_auto_sync` feature flag is disabled. The edge functions and DB schema exist but the UI is hidden.

8. **`projectFinancials.ts` was removed** — The deprecated utility file (`src/utils/projectFinancials.ts`) containing `calculateProjectFinancials()` and `calculateMultipleProjectFinancials()` was deleted in Apr 2026. The `ProjectWithFinancials` interface was relocated to `src/types/projectFinancials.ts`. Read financial data from the DB directly.

9. **Time entries store as `timestamptz`** — Always in UTC. Display in local browser timezone. The existing pattern is correct; do not add explicit timezone conversion unless improving the time entry form.

10. **Schedule uses `gantt-task-react`** — The Gantt chart is rendered by `gantt-task-react` in `ProjectScheduleView.tsx`. A legacy `frappe-gantt` implementation was cleaned up (Apr 2026).

11. **ESLint `no-unused-imports` rule does not exist in `typescript-eslint`** — The rule `@typescript-eslint/no-unused-imports` was removed from `eslint.config.js` because it doesn't exist in the `typescript-eslint` plugin (even v8+). The existing `@typescript-eslint/no-unused-vars` rule already catches unused imports. If you need a dedicated unused-imports rule, install `eslint-plugin-unused-imports` separately.

12. **AIA billing cumulative chain** — Payment applications are cumulative. Each new application's `previous_work` (G703 Col D) is auto-populated from the prior certified application's `total_completed`. Deleting or modifying a certified application will break the chain for subsequent apps. Only draft applications should be editable.

13. **`_shared/transactionProcessor.ts` was deleted** — Was a 36KB unused file with zero imports. Removed in Apr 2026 audit cleanup.

14. **`get-textbelt-key` is intentional admin functionality** — Despite the "delete me" comment in the function, `SMSSettings.tsx` actively uses it for admin key retrieval. Do not delete without removing the SMSSettings consumer first.

15. **HTML sanitization uses DOMPurify** — `TrainingViewer.tsx` sanitizes `embed_code` via DOMPurify with `ADD_TAGS: ['iframe']` to allow video embeds while blocking XSS. Any new `dangerouslySetInnerHTML` usage must also sanitize.

16. **Supabase queries must destructure `error`** — Always use `const { data, error } = await supabase...`. In TanStack Query `queryFn`, throw the error. In `useEffect` fetches, `console.error` + return. Never silently discard the error.

17. **Hours terminology is standardized** — Two canonical terms: **"Paid Hours"** (`expenses.hours`, after lunch deduction) and **"Gross Hours"** (`expenses.gross_hours`, total shift duration). Never use "net hours", "total hours", or "worked hours" for paid hours. The `weekly_labor_hours` view column is `paid_hours` (renamed from `total_hours` in Apr 2026). The KPI ID `expense_net_hours` is kept for backwards compatibility but the display name is "Paid Hours".

18. **App version uses `__APP_VERSION__` not `VITE_APP_VERSION`** — Lovable's build environment overrides `VITE_*` env vars. The version is defined as `__APP_VERSION__` in `vite.config.ts` (via `define`) to prevent Lovable from injecting `0.0.0`. Declared in `src/vite-env.d.ts`. Auto-generated from git as `YYYY.MM.DD (build {sha})`.

19. **Bids → Leads is UI-only (Apr 2026)** — User-facing strings, route paths (`/leads/*`), nav, and page titles all say "Lead". The DB layer is **intentionally unchanged**: tables (`branch_bids`, `bid_media`, `bid_notes`), columns (`bid_id` FKs), storage buckets (`bid-media`, `bid-documents`), TanStack Query keys (`['bid-media', bidId]`), and TS types in `src/types/bid.ts` (`BranchBid`, `BidMedia`, `BidNote`) all keep their legacy names. Renaming buckets in Supabase is non-trivial (object copy + RLS rewrite + URL rebuild) — skipped because the labels are the only thing users see. Old `/branch-bids/*` URLs redirect to `/leads/*` via the `LegacyBidRedirect` wrapper in `App.tsx`, which uses `useParams()` because `<Navigate>` doesn't interpolate route params. **Do NOT "finish the rename" by touching DB names** — it's a coordination cost with zero functional gain.

20. **Project → Category lock for overhead projects (Apr 2026)** — See "Key Architectural Rules → 6a." Three layers (DB trigger + importer + form) enforce that an expense's `category` matches `projects.default_expense_category` whenever the project has one set. The trigger silently overrides; never raises. Common pitfall: writing test SQL like `INSERT INTO expenses (project_id='001-GAS', category='materials')` will succeed but the row's category will be `gas` after the trigger runs. Verify with the SQL in section 6a.

21. **Supabase preview branches are usable for risky work — but local migration files are placeholder-only, so a fresh branch comes up `MIGRATIONS_FAILED`** (Apr 2026). The branch DB still gets ~290 of the 343 migrations replayed (anything that landed via Lovable's dashboard before this codebase moved to the placeholder convention). For most schema work — including all of Architectural Rule 11's new RPCs/index — that's enough. Workflow: `mcp create_branch` → seed test data with `execute_sql` → `apply_migration` to branch + production with the same SQL → develop UI on a git feature branch → `npx supabase functions deploy` for any edge function changes → push → PR → `delete_branch` to stop the $0.01344/hr meter. Do **not** call `merge_branch` — the MIGRATIONS_FAILED state blocks it, and we manage schema changes the existing way (via `apply_migration` on production).

22. **Internal employees are accounting plumbing, not a user-facing concept (Apr 2026)** — See Architectural Rule 11. The bridge from auth user → internal payee is a single nullable column (`payees.user_id`) with no auto-sync. Cleanup added a unique partial index, two SECURITY DEFINER RPCs (`get_mentionable_employees`, `get_employees_audit`), an Accounting Linkage section in `/role-management`, locked editing of internal payees in `PayeeForm`, default-hidden internal payees in `/payees`, auto-create payee on user creation in `CreateUserModal`, and cascade-deactivate in `admin-disable-user` (v102). Common pitfall: querying `payees` directly to determine "who can be @mentioned" — use `get_mentionable_employees()` instead, since it returns role-holders even when their payee row is missing or unlinked.

23. **PostgREST hard 1,000-row cap on every query (corrected Apr 18, 2026)** — See Architectural Rule 12. The original Apr 16 writeup claimed `.range(0, 9999)` "raises the cap to 10,000" as a tactical band-aid. **That is wrong in this project.** This Supabase project has `db-max-rows = 1000` set at the PostgREST server layer, which OVERRIDES any client-side `.range()` greater than 1,000. Verified live Apr 18: `supabase.from('expenses').select('id', { count: 'exact' }).range(0, 9999)` returns `count: 1289, data.length: 1000`. Same for `expenses_search`. The failure mode is invisible — no error, PostgREST just returns the first 1,000 rows. Correct fix patterns (pick one): (1) route through `public.expenses_search` + `useExpensesQuery` (paginated via `useInfiniteQuery` in 50-row pages — the canonical All Expenses path), (2) push the aggregation server-side into an RPC (what `get_expense_category_rollup` + `get_expense_dashboard_stats` do for ExpenseDashboard), or (3) loop `.range(from, from + 999)` until a short page in the client (what `ExpenseExportModal` does for its one-shot CSV snapshot). Do NOT pass `.limit()` as a fix — it makes the cap WORSE, not better. The old band-aid `.range(0, 9999)` call sites are a silent-failure class of bug — grep for them and verify each is either correct (paginated loop) or flagged as a known truncation point.

25. **Row-click + Radix trigger in cells — must `stopPropagation` (Apr 16, 2026)** — When a `<TableRow>` has a navigation `onClick` handler (e.g. `handleViewDetails`), ANY cell containing an interactive Radix child (DropdownMenu, Popover, Select, Dialog trigger) must stop propagation at the `<TableCell>` level: `onClick={(e) => e.stopPropagation()}`. Radix's open/close is driven by PointerEvents and does NOT block React's DOM click bubbling — so without the guard, the row's `onClick` fires on the next microtask, navigates the page, and tears down the just-opened Radix portal before the user sees it. Symptom is "I click the dropdown and nothing happens" (really: "the dropdown opened for 10ms then the page navigated away"). Existing pattern in [src/components/ProjectsTableView.tsx:1414](src/components/ProjectsTableView.tsx:1414) covers `actions` and `status`; if you add a new row-level navigation pattern or a new interactive cell, extend the guard. This bit us on Apr 16 when the `status` cell was missing from the list.

26. **Contingency sync chain (Apr 16, 2026)** — `projects.contingency_amount` and `projects.contingency_remaining` are NOT columns you should ever write to directly. They are maintained by the `update_contingency_remaining()` trigger function, which is polymorphic across `estimates` and `change_orders` via `TG_TABLE_NAME`:
    - On `estimates` INSERT/UPDATE: syncs `contingency_amount` ONLY when `NEW.status = 'approved' AND NEW.is_current_version = true` (guard prevents draft/superseded edits from corrupting approved state). Always refreshes `contingency_remaining` via `calculate_contingency_remaining()`.
    - On `change_orders` INSERT/UPDATE/DELETE: refreshes `contingency_remaining` only (amount is owned by the estimate).
    - The frontend reads `projects.contingency_amount` and `projects.contingency_remaining` directly — no view indirection needed for this field. This is deliberate per Architectural Rule 1.
    - **Common pitfall**: when debugging contingency display issues, don't assume the frontend is stale — check if `projects.contingency_amount` is NULL first. Backfill with: `UPDATE projects p SET contingency_amount = e.contingency_amount, contingency_remaining = calculate_contingency_remaining(p.id) FROM estimates e WHERE e.project_id = p.id AND e.status = 'approved' AND e.is_current_version = true;` (safe to re-run).
    - **When adding sync for other estimate-derived columns** (e.g. if another `projects` field ends up NULL despite the estimate having data), follow this same polymorphic trigger pattern rather than creating a new one. Future-proofing: the `guard` condition (`status = 'approved' AND is_current_version = true`) is the important invariant to preserve.

27. **Direct Supabase writes bypass TanStack Query invalidation (Apr 18, 2026)** — Any `supabase.from(X).update/delete/insert(...)` fired from a component that does NOT go through TanStack Query's mutation layer (`useMutation`) leaves every active `useQuery` / `useInfiniteQuery` against table X serving stale cached data until the next natural refetch (focus, remount, or staleTime expiry). Symptom: write succeeds (toast confirms, DB is correct) but the UI still shows the pre-write state. Users reach for F5. Two canonical fixes shipped today:
    - **`ExpensesList.refreshAll()`** — helper inside `src/components/ExpensesList.tsx` that calls both `onRefresh()` (parent state for Dashboard/Export) and `expensesQuery.refetch()` (the `['expenses-search', filters]` key in global mode). Wired into all 6 mutation sites: bulk actions, row delete, approve/reject, allocation, reassign, split. Fixed the "bulk update category doesn't refresh until F5" complaint.
    - **`useProjectData` migrated to `useQuery`** — `src/hooks/useProjectData.tsx` now owns a single `useQuery` keyed on `['project-data', projectId]`. `loadProjectData` is a thin wrapper around `queryClient.invalidateQueries({ queryKey: ['project-data', projectId] })`. Every existing caller (13 consumers of the outlet context) continues to work unchanged; the return shape is preserved byte-for-byte. `handleSaveQuote` awaits `loadProjectData()` before navigating so the destination page sees fresh data. `staleTime: 30 * 1000` matches `useExpensesQuery`.
    - **Rule for future work**: when adding a direct Supabase write (no `useMutation`), grep the target table for `useQuery`/`useInfiniteQuery`/`queryKey` usage. If any query key references that table, your `onSuccess` handler MUST invalidate it. If no query key exists yet, ask whether the read side should be owned by TanStack before adding more direct-write code. Reference patterns that do this correctly: `useScheduleOfValues`, `usePaymentApplications`, `useProjectMedia`, `ProjectDocumentsTable`, `useExpensesQuery`, now `useProjectData`.

28. **`npm run type-check` was silently checking nothing — fixed Apr 19, 2026** — The root `tsconfig.json` has `"files": []` and project references to `tsconfig.app.json` + `tsconfig.node.json`. When you run `tsc --noEmit` against the root config, the empty `files` array means TypeScript checks zero files and exits 0. The script in `package.json` was `tsc --noEmit` — vacuously passing on every invocation. Lovable's CI / `vite build` was the only thing actually catching errors, so type-check failures only surfaced after push. **Fixed**: script now `tsc --noEmit -p tsconfig.app.json` (commit `0555871`). When checking a similar project's type-check, ALWAYS verify the script targets the actual app tsconfig. Symptom that should trigger suspicion: `npm run type-check` returns in <1 second on a 200K-line codebase.

29. **Generic arrow function in `.tsx` requires trailing comma — `<T,>` not `<T>`** — Both esbuild (vite) and tsc parse `<T>` in TSX context as JSX element opening tag. The trailing comma `<T,>` disambiguates. Pattern: `const fn = async <T,>(arg: ...) => {...}`. Alternative: `<T extends unknown>` works too. The `paginatedAll` helper added to all importer paths uses `<T,>`. Don't trust `tsconfig.json` `tsc --noEmit` to catch this — the broken type-check script (Gotcha #28) hid it for an entire session before Lovable's CI build surfaced it.

30. **Regenerate Supabase types after applying RPCs / views via MCP** — The generated `src/integrations/supabase/types.ts` doesn't auto-update when you `apply_migration` or create new views/RPCs. Call `mcp generate_typescript_types` after any DB schema change that exposes new tables/views/RPCs to PostgREST. Without this, consumer code gets `error TS2769: No overload matches this call. Argument of type '"new_view_name"' is not assignable to parameter of type '"old_view_only_list"'`. The Apr 19 session shipped 4 RPCs (`get_employees_audit`, `set_user_can_be_mentioned`, `get_expense_dashboard_stats`, `get_expense_category_rollup`) and 1 view (`expenses_search`) before regenerating; ~10 consumer-side type errors accumulated. The generated file is large (~140KB) — write it to `src/integrations/supabase/types.ts` and commit. **MCP tool returns it as `{"types": "..."}` JSON** — extract the `.types` field, don't write the JSON wrapper.

31. **Lovable's "Update site info for publish" dialog force-pushes to main and strips unrelated tags** — discovered Apr 19, 2026 after PR #25 (iOS icon fix) was reverted by commit `368c37b "Update site info for publish"`. The Publish dialog in the Lovable editor is NOT a passive reflection of `index.html` — it's an authoritative writer that commits directly to the repo on save. It manages a specific subset of `<head>` tags and **deletes everything it doesn't recognize** when rewriting the file. Mid-session conflict mode: PR #26 was open when the user clicked Done in the dialog, Lovable force-pushed to main, PR #26 became unmergeable, and PR #25's iOS fixes were silently reverted on main.

    **Tags Lovable's Publish dialog MANAGES (do not edit via code — next dialog save will rewrite):**
    - `<title>`
    - `<meta name="description">`
    - `<meta property="og:title">`, `og:description`, `og:image`, `og:type`, `og:url` (if dialog has the field)
    - `<meta name="twitter:card">`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site`
    - `<meta name="author">`
    - `<link rel="icon">` (browser favicon) — dialog strips these and relies on `/favicon.ico` fallback

    **Tags Lovable's Publish dialog IGNORES (safe to edit via code — survive dialog saves):**
    - `<link rel="apple-touch-icon">` (all 5 variants including `apple-touch-icon-precomposed`)
    - `<meta name="apple-mobile-web-app-title">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
    - `<meta name="mobile-web-app-capable">`
    - `<meta name="theme-color">`
    - `<link rel="manifest">`
    - Everything outside the `<head>` block (scripts, styles, body content)

    **Rule for future sessions:** when asked to change anything in `<head>` that the Publish dialog manages (title, OG, Twitter, description, favicon links, author), redirect the user to edit it in Lovable's Publish dialog rather than touching `index.html`. Code changes to those tags are ephemeral. When the fix IS in an IGNORED tag (iOS home-screen icon, apple-mobile-web-app-title, manifest), PRs are durable. PR #27 (`fix/ios-icon-restore`) re-applied only the iOS-specific tags from PR #25 for this exact reason — OG/Twitter/favicon link changes from PR #26 were abandoned because Lovable would overwrite them.

    **Diagnostic:** if `index.html` in main contains a Lovable R2 URL for og:image (`pub-*.r2.dev/...lovable.app-<timestamp>.png`) or `@lovable_dev` in twitter:site, the user has run the Publish dialog recently.

32. **Zero variance ≠ no baseline in quote helpers (Apr 21, 2026)** — `getSignedCostVariance` in [src/utils/quoteFinancials.ts](src/utils/quoteFinancials.ts) returns four statuses: `'under' | 'over' | 'on' | 'none'`. Don't collapse `'on'` (baseline exists, signed delta is exactly zero) into `'none'` (baseline missing, nothing to compute). Earlier shape of this helper did exactly that — any quote that matched its estimate to the penny rendered as "No baseline" in the hero, which is informationally wrong (the quote is literally on-estimate, that's a clean result). The fix distinguishes the two cases: `baseline === null` → `'none'`, `signedAmount === 0` with a real baseline → `'on'`. The hero renders `'on'` as `$0.00 / On estimate`. The `CostVarianceResult` type in the same file had to widen its union — if you add new consumers, handle all four statuses, not three.

33. **`QuoteForm mode="view"` is dead on the primary detail routes (Apr 21, 2026)** — `/projects/:id/estimates/quotes/:quoteId` ([QuoteViewRoute](src/components/project-routes/QuoteViewRoute.tsx)) and `/quotes` → View ([Quotes.tsx](src/pages/Quotes.tsx) view branch) both bypass `QuoteForm` entirely and compose the four cards in [src/components/quotes/](src/components/quotes/). If you're tempted to swing `QuoteForm mode="view"` back in for "a quick fix," stop — it brings back (a) a duplicate contracts list, because the form internally renders contracts AND the route used to wrap a second contracts `<Card>` around it, (b) the competing-vendor "Quote Coverage" column which is decision-support UI that loses meaning post-approval, and (c) checkboxes on line items the user can't change. `QuoteForm` is still correct for `new` / `edit` — the selection UI earns its keep there. Related: the old [QuoteComparison.tsx](src/components/QuoteComparison.tsx) was deleted (it was single-quote-vs-estimate margin math now rendered inline in the hero). [QuoteComparisonPeer.tsx](src/components/quotes/QuoteComparisonPeer.tsx) replaces it with something genuinely different — per-line-item peer leaderboards. Types `ComparisonData` + `MarginComparisonData` were deleted from [src/types/quote.ts](src/types/quote.ts) at the same time (only `QuoteComparison.tsx` consumed them).

34. **Field-worker `/projects/*` gate has ONE exemption — keep it narrow (Apr 21, 2026)** — [AppLayout.tsx](src/components/AppLayout.tsx) redirects field workers off `/projects/*` to `/time-tracker`. After the schedule URL merge (Rule 18), `/projects/:id/schedule` is exempt via `/^\/projects\/[^/]+\/schedule(\/|$|\?)/`. When you add a new project sub-route field workers should reach (say `/projects/:id/daily-log`), TWO changes are required: (1) extend the exemption regex in AppLayout, AND (2) mark the corresponding `NavItem` in [projectNavigation.ts](src/components/project-detail/projectNavigation.ts) as `fieldWorkerSafe: true`. Doing only one creates a broken UX — either a sheet nav item that bounces the user back to `/time-tracker` mid-tap, or a reachable URL that doesn't appear in the nav. The mobile section-selector sheet filters by role via `getNavigationGroups({ isFieldWorker })`.

35. **Mobile bar Camera/Attach route by MIME — never through useProjectNotes (Apr 21, 2026)** — See Architectural Rule 19. The [FieldQuickActionBar](src/components/schedule/FieldQuickActionBar.tsx) bar buttons (Camera, Attach) go through `uploadProjectMedia()` (images/videos → `project_media` → Media tab) or `uploadProjectDocument()` (other files → `project_documents` with `document_type: 'other'` → Docs tab). They do NOT call `useProjectNotes.uploadAttachment` — that path creates an empty-text note row in `project_notes`, which is wrong for the "snap and forget" flow and hides the capture from Media/Docs. The composer's internal attach menu (inside NoteComposer sheet) is the ONLY surface that should write to `note-attachments`, because those attachments travel with a user's note text. If you add a new mobile capture affordance, decide up-front: is this "capture and forget" (→ Media/Docs pipelines) or "compose and send" (→ note-attachments)? Both are valid; wiring one through the wrong pipeline silently disappears the file from where users expect to find it.

36. **Note-attached media is a read-side UNION, not a data migration (Apr 21, 2026)** — See Architectural Rule 20. [`getProjectMediaList`](src/utils/projectMedia.ts) loads `project_media` + queries `project_notes` for `attachment_url IS NOT NULL AND attachment_type IN ('image','video')` and merges both lists with `source: 'media' | 'note'` on each row. **Do not** try to migrate note-attachments into `project_media` — the buckets have different access modes (`note-attachments` public, `project-media` signed URLs) and the metadata shapes don't align. Do not try to dual-write either — that duplicates storage and creates deletion coordination problems. The read-side merge is the correct design. [PhotoLightbox](src/components/PhotoLightbox.tsx) branches on `source === 'note'` to hide Delete / Caption / Comments (the note is the parent + conversation thread). `MediaCommentsList mediaId={\`note:${id}\`}` returns zero rows — the id prefix guarantees lookup failure, which is correct behavior.

37. **Device UA string: store raw, display parsed (Apr 21, 2026)** — `project_media.device_model` stores the full `navigator.userAgent` string. Every upload pipeline (dedicated capture pages AND `FieldQuickActionBar`) populates it. The lightbox + timeline render it through [`formatDeviceLabel`](src/utils/formatDeviceLabel.ts) which parses to `"iPhone · Safari"` / `"Android · Chrome"` / fallback. **Never render `device_model` directly in the UI** — the raw UA is a 4-line blob on desktop phones. Keep storing the raw value for forensics (`which device took this photo?`) but always format at display time. Same principle applies to any future UA-based metadata: store raw, parse at the edge.

38. **`PageHeader` hides `actions` entirely on mobile (Apr 23, 2026)** — [`PageHeader`](src/components/ui/page-header.tsx) renders different layouts based on `useIsMobile()`. On mobile with no `children` it renders ONLY the accent line — both `title` and `actions` are dropped (the title is assumed to come from AppLayout's mobile header). With `children` it renders those in a wrapped card but STILL drops `actions`. **Passing primary actions via the `actions` prop silently orphans them on mobile.** Canonical workarounds, in order of preference: (1) floating `+` FAB on list pages — the Expenses/Projects/Leads pattern, `{isMobile && <Button className="fixed bottom-6 right-6 ..." />}`; (2) mobile-only action strip below the header on detail pages — `{isMobile && <div className="mb-4 flex flex-wrap gap-2">{headerActions}</div>}`. Gate with `useIsMobile()` (768px), NOT Tailwind's `sm:` prefix (640px) — otherwise there's a dead zone at 641–767px where neither the mobile strip nor PageHeader's desktop branch shows actions. This bit the [BranchBidDetail.tsx](src/pages/BranchBidDetail.tsx) refactor mid-session: converting the detail page to use `PageHeader` silently hid the Convert to Project / Edit Details / Save buttons on mobile until a separate mobile strip was added. Repro: put a primary action in `PageHeader.actions`, shrink browser to mobile, confirm it's gone.

39. **Eager RPC on menu click = orphan drafts when user cancels (Apr 23, 2026)** — Any row-action or menu-item `onClick` that calls a `.rpc(...)` or `.insert(...)` synchronously persists a DB row before the user sees the form the action was supposed to open. When the user then clicks Cancel in that form, the form closes but the row stays — a ghost draft. [EstimateActionsMenu.tsx](src/components/EstimateActionsMenu.tsx) had this for "Duplicate Estimate" and "Create New Version" (both called `create_estimate_version` RPC immediately on menu click, then opened the editor). Fixed by switching to a route-based pattern: `navigate('/projects/:id/estimates/new?sourceEstimateId=...')` — `EstimateForm`'s auto-copy effect at [line 104](src/components/EstimateForm.tsx#L104) populates line items **in local React state** via `handleCopyFromChange`, and the DB write only happens when `handleSave(status)` fires from an explicit Save button. Cancel = navigate back, no persistence. **Rule for future work**: if a row action opens a form, it should never write to the DB itself — navigate with query params instead. Grep for `.rpc(` or `.insert(` inside click handlers in action menus as the smell signal. Audit hit: same anti-pattern existed for quote duplication — flagged for review in a separate session.

40. **Nested scroll containers in dialogs orphan content on mobile (Apr 23, 2026)** — `DialogContent` with `flex flex-col overflow-hidden max-h-[90vh]` + a `flex-1 overflow-auto` body already defines ONE scroll zone. Adding a second `max-h-[Xvh] overflow-auto` on an inner element (e.g., a long table) creates a competing scroll container. Symptoms: on mobile or with trackpads, users get stuck scrolling the inner zone and can't reach content below the inner zone (totals blocks, warnings, summary strips). The dialog footer stays pinned because it's outside the `flex-1`, but anything AFTER the capped inner element within the `flex-1` becomes reachable only by scrolling the outer AFTER the inner has bottomed out — which mobile users often don't discover. [ImportEstimateModal.tsx](src/components/estimates/ImportEstimateModal.tsx) had this: table wrapped in `max-h-[50vh] overflow-auto`, totals + labor-cushion alert rendered below, users with 40+ line items couldn't find the totals. Fix: delete the inner cap. Keep `overflow-hidden` only for rounded-corner clipping; keep `sticky top-0 z-10` on `<TableHeader>` so it sticks to the outer scroll parent. Rule: in a `DialogContent` that already has `flex-col + flex-1 overflow-auto`, do NOT add a second scroll container unless you have a specific reason AND the content below the inner element is trivial (< 100px tall).

41. **Mobile fixed-position bars must mount as siblings of `MobilePageWrapper`, not children (PR #37, May 2026)** — [`MobilePageWrapper`](src/components/ui/mobile-page-wrapper.tsx) is `min-h-screen w-full max-w-full overflow-x-hidden mx-auto px-0 sm:px-4 ... py-4 sm:py-6`. On iOS Safari, a `position: fixed bottom-0` element rendered as a CHILD of this wrapper anchors to the wrapper's bottom edge instead of the viewport bottom on tall pages — the bar appears mid-screen with content visible both ABOVE and BELOW it (smoking gun: media-grid items render in a 2-col grid that the bar interrupts horizontally). Caught live on `BranchBidDetail.tsx`; fixed by wrapping the return in `<>...</>` and moving `<BidQuickActionBar>` outside `<MobilePageWrapper>` as a sibling. Mirrors the [`ProjectDetailView`](src/components/ProjectDetailView.tsx) mobile pattern where `FieldQuickActionBar` is a direct child of the page-level `<div className="flex flex-col h-full bg-background">`, sitting alongside (not inside) the inner `overflow-auto` scroll container. Rule for future work: any new mobile bottom bar (Note/Camera/Attach style) on a page that uses `MobilePageWrapper` MUST be a sibling. Don't try to chase the precise CSS culprit — the structural fix is reliable, the CSS-level diagnostic ("which ancestor has transform/contain/will-change?") is not. Pair this with content padding (`pb-20`) on the wrapper so the last card isn't hidden behind the bar.

42. **`useBidMediaUpload` is silent — callers own success/error toasts (PR #37, May 2026)** — When the hook still owned its own `toast.success('Media uploaded successfully')` and `toast.error('Upload failed', ...)` at [`useBidMediaUpload.ts`](src/hooks/useBidMediaUpload.ts), every consumer that ALSO toasted on the same flow produced double toasts on a single upload. The hook fed `BidPhotoCapture`'s GPS+caption chain, `BidVideoCapture`, `BidQuickActionBar`'s Attach button, `BidMediaBulkUpload`, and `BidDocumentUpload` — all five had their own toasts too, so users routinely saw two stacked success notifications per upload (and the photo capture flow saw three plus a blocking sheet — see PR #37 description). The hook is now silent on success and error. The single info toast it still fires is `toast.info('Queued for upload')` when offline — that one is unique to the hook (no caller has visibility into the offline-queue path). Contract for future work: do NOT add `toast.success`/`toast.error` inside `useBidMediaUpload.upload`. The hook returns the created `BidMedia` row on success and `null` on failure, with the underlying `Error` exposed via the returned `error` state — that's the API. Same principle when extracting future upload hooks: pick one layer to own user-facing toasts (typically the page or the bar), and keep the hook silent.

---

## Outstanding Audit Items (Apr 2026)

Issues identified during codebase audit, validated, and prioritized for future work.

### Resolved (Apr 2026 Cleanup)

| Issue | Resolution |
|-------|-----------|
| **Mobile Media tab had three competing affordances + the filter row clipped "Videos (N)" past 1-digit counts (PR #38, May 2026)** | Fixed — gated `<BidMediaBulkUpload>` behind `!isMobile` in [BranchBidDetail.tsx](src/pages/BranchBidDetail.tsx) so the visible "Upload Files" card stays as the desktop affordance only (mobile users get bulk via the bottom bar's Attach, which already accepts `multiple`). Gated the grid/list view toggle in [BidMediaGallery](src/components/BidMediaGallery.tsx) behind `!isMobile` and locked mobile to grid view (Google Photos / Apple Photos pattern). Removing the toggle frees ~80px of horizontal space on the filter row so the pills no longer clip. Net effect: mobile Media tab = single section header + filter pills + grid; one visible action surface (the bottom bar). See Rule 22 "Mobile Media tab is single-affordance." |
| **Lead Details mobile bottom bar floated mid-screen instead of pinning to viewport (PR #37, May 2026)** | Fixed — `BidQuickActionBar` was rendered inside `MobilePageWrapper`; iOS Safari then anchored its `position: fixed bottom-0` to the wrapper, not the viewport. Wrapped the page return in `<>...</>` and moved the bar outside the wrapper as a sibling, mirroring `ProjectDetailView`'s mounting pattern. See Gotcha #41. |
| **Lead Details media filter pills + file metadata overflowed on narrow viewports (PR #37)** | Fixed in `BidMediaGallery.tsx` + `BidDocumentUpload.tsx` + `BranchBidDetail.tsx` — All/Photos/Videos pills now stack above the grid/list toggle on mobile (`flex-col gap-2 sm:flex-row sm:justify-between`); list-row metadata uses `flex-wrap + gap-x-3 + gap-y-1 + whitespace-nowrap + shrink-0` so dates no longer split into 3 lines; mobile tab strip hardened with `whitespace-nowrap + min-w-0 + shrink-0` so larger badge counts don't clip the labels. |
| **Excessive notifications during photo/video capture on `/leads/:id/capture` (PR #37)** | Fixed across `BidPhotoCapture.tsx`, `BidVideoCapture.tsx`, `useCaptionFlow.ts`, `useBidMediaUpload.ts`, `BidQuickActionBar.tsx` — removed: GPS-success toast (info already on screen as a green pin), the 3-second auto-prompt sheet (redundant with preview-screen Caption buttons + blocked the next action for 5s), and duplicate hook-level success/error toasts. A single Camera capture now fires a single info→success pair with no blocking modal — same shape as `FieldQuickActionBar`. See Gotcha #42 for the new toast-ownership contract. |
| 21 dead components (zero imports) | Deleted — 5,044 lines removed. KPI `whereUsed` strings cleaned up. |
| 76 console errors on page load | Fixed — auth guards added to branding/QB flag fetches; RoleContext double-log removed. Now 0 errors. |
| 13 stale docs (Nov 2024 – Jan 2026) | Archived to `docs/_archived/` |
| Stale CURSOR_TASK_email_tracking.md | Deleted (feature was already implemented) |
| Doc count discrepancies across CLAUDE.md, README.md | All counts corrected to match actual codebase |
| Broken PRODUCT_OVERVIEW.md link in README | Fixed path (was `docs/PRODUCT_OVERVIEW.md`, now `PRODUCT_OVERVIEW.md`) |
| DEV_CLEAN_RELOAD.md wrong port | Fixed (5173 → 8080) |
| Phantom feature flags in FEATURE_FLAGS_STATUS.md | Removed `scheduleWarnings`/`scheduleDependencies`; added `aiaBilling` |
| `.serena/` not gitignored | Added to `.gitignore` |
| Untracked migration placeholder | Committed to keep file count in sync with DB |
| Deprecated margin field fallbacks | Backfilled 2 rows, removed all `?? current_margin` (7 locations) and `?? projected_margin` (20 locations) fallbacks. Deleted `margin.ts` (zero imports). Code now uses only `actual_margin` and `adjusted_est_margin`. |
| Non-null assertion in `useScheduleOfValues.ts` | Replaced `sovQuery.data!.id` with `sovQuery.data?.id ?? ""` |
| `.cursorrules` consolidation | Replaced 274-line duplicate with slim pointer to `CLAUDE.md` + Cursor-specific MCP tool names |
| 23 `as any` type casts removed | Extended `EnrichedLineItem`/`QuoteLineItem` interfaces, added return types, narrowed props. Count: 109 → 86. |
| App version showing `v0.0.0` | Fixed — Changed from `VITE_APP_VERSION` to `__APP_VERSION__` define in `vite.config.ts`. Lovable's build env was overriding `VITE_*` vars. |
| Hours terminology inconsistent ("Net Hours", "Total Hours", "Worked Hours") | Standardized to "Paid Hours" and "Gross Hours" everywhere — 24 files across UI, KPI definitions, AI context, few-shot examples, report builder, and DB view. Renamed `weekly_labor_hours.total_hours` → `paid_hours` via migration. Few-shot SQL examples updated to use pre-computed columns. |
| `ProjectNotesTimeline` monolith (1,169 lines, 4 duplicated rendering modes) | Decomposed into `useProjectNotes` hook + `NoteCard` + `NoteInput` + `NoteLightbox` + `VoiceNoteButton`. Shell reduced to ~250 lines. |
| Field workers had no access to project media or documents | Added `FieldMediaGallery` and `FieldDocumentsList` in tab-based field schedule layout. |
| No voice note input for project notes | Ported `useAudioRecording` + `useAudioTranscription` from bid notes into `VoiceNoteButton` component. Available in both NoteInput and FieldQuickActionBar. |
| Time entry form had no notes field | Added `NotesField` to `ManualTimeEntryForm`, stored in `expenses.description`. Notes column added to admin table + mobile card view. |
| Task cards had accidental-completion risk (small checkbox) | Replaced checkbox with expandable card interaction: tap to expand → "Mark Complete" button + "What happened?" note input + photo capture. |
| No way to tag/mention team members in project notes | Built `MentionTextarea` with @autocomplete, `note_mentions` + `user_notifications` tables, `NotificationBell` in header, `Mentions` page, sidebar badge. |
| No in-app notification system | Created generic `user_notifications` table with realtime, `useUnreadMentions` hook with TanStack Query shared key + optimistic updates. |
| KPI guide drift: `budget_utilization_percent` formula wrong | Corrected in `project-kpis.ts` — view uses `/adjusted_est_costs`, not `/contracted_amount`. Regen via `sync:edge-kpis`. |
| KPI guide drift: `actual_margin_percent` marked `source: 'frontend'` | Fixed — it's a view column. Updated to `source: 'view'` + correct field path. |
| KPI guide drift: quick-reference filter included deprecated `current_margin` | Swapped for `adjusted_est_margin` in `ai-context-generator.ts:286`. |
| `marginValidation.ts` type/logic mismatch (param said `projected_margin`, code read `adjusted_est_margin`) | Renamed param type field + updated warning message. |
| All Expenses search dropped rows past 1,000 | Fixed (Apr 16, 2026) — new `public.expenses_search` view + `useExpensesQuery` hook with `useInfiniteQuery` + `count: 'exact'` pagination. Primary bug: project 225-078 search `078` was showing 5 rows/$870 instead of 8 rows/$3,604. |
| Cost Tracking tab per-project (via `useLineItemControl`) would hit the same 1,000-row cap | Fixed (Apr 16, 2026) — added `.eq('project_id', projectId)` server-side filter. Previously fetched all and filtered client-side. |
| Dead code: `Projects.tsx` fetched all expenses into state but never read it | Deleted (Apr 16, 2026) — 18 lines removed, unused `Expense` + `parseDateOnly` imports cleaned up. |
| No indicator on `/expenses` for expenses awaiting approval | Added (Apr 16, 2026) — orange count badge on "All Expenses" tab (`useUnapprovedExpensesCount` hook, same `bg-orange-500` pattern as "Time Approvals 20" sidebar badge). |
| Dense 12-column Cost Tracking table was the default front door; PMs had to mentally aggregate categories | Added (Apr 16, 2026) — Buckets tab as new default view with category rollups, collapsible line items, cushion-aware labor header. See Architectural Rule 13. |
| Mobile capture affordances fragmented across per-page Camera/Video FABs + per-card inline inputs | Replaced (Apr 16, 2026) — single global `FieldQuickActionBar` (Note / Camera / Attach) rendered once in `ProjectDetailView` on mobile. Voice-in-composer pattern. See Architectural Rule 14. |
| `FieldQuickActionBar` had 3 buttons (Note/Photo/Voice) diverging from industry convention | Refactored (Apr 16, 2026) — now Note/Camera/Attach matching Slack/WhatsApp/Linear. Voice transcription folded into the Note composer (mic inside textarea). |
| AI Report Assistant redeploy pending (KPI-guide corrections in source but Lovable doesn't auto-deploy) | Deployed (Apr 16, 2026) — `ai-report-assistant` v70 → v71 via `npx supabase functions deploy`. Live KPI guide now resolves `budget_utilization_percent` + `actual_margin_percent` correctly. |
| Overview "Budget Status" card duplicated Buckets TOTAL row | Fixed (Apr 16, 2026) — stripped metric block from `ProjectOperationalDashboard.tsx`, renamed card to "Contingency" (now gated on `contingency_amount > 0`), added "View Cost Tracking" CTA to `/control`. Deleted dead `calculateBudgetStatus` function + `BudgetStatus` type from `projectDashboard.ts`. |
| `reporting.internal_labor_hours_by_project` view excluded split labor | Fixed (Apr 16, 2026) — added `split_labor_totals` CTE that prorates parent-expense hours by `split_percentage` (with `split_amount / parent.amount` fallback for NULL percentage), updated `has_labor` CTE to surface split-only projects, final SELECT sums direct + split. Validated: 225-022 now 14.21 hrs / $480 (was 8.5 / $280), 225-021 now surfaces at 2.79 hrs / $97.50 (was invisible), 225-078 unchanged (29 hrs / $940). Global labor reconciliation diff = $0.00. |
| `projects.contingency_amount` never synced from estimates (all 103 construction projects NULL despite 7 approved estimates having contingency) | Fixed (Apr 16, 2026) — extended `update_contingency_remaining()` to sync `contingency_amount` when the triggering row is `approved + is_current_version` (guard prevents draft/superseded edits from overwriting), added parallel trigger on `change_orders` so CO approval refreshes `contingency_remaining`, backfilled 7 existing projects. Architecturally aligned with Rule 1 (DB-first financials). Validated: Contingency card now renders on real projects — 225-005 shows $89,161.95 of $89,161.95 (intact), 225-007 shows $0.00 of $3,250.00 (fully consumed by CO billing). |
| `BulkExpenseAllocationSheet` unbounded `from('expenses')` fetch (Gotcha #23: silently dropped candidates past row 1,000) | Fixed (Apr 16, 2026) — added server-side filters to the admin bulk-allocation modal's candidate query: `.eq('is_split', false)` (split parents are never correlatable per `canCorrelateExpense`), `.order('expense_date', { ascending: false })` (predictable ordering if the cap is ever hit), and `.range(0, 9999)` (raises PostgREST's default 1,000 cap to 10,000, matching the `ExpenseDashboard` reference pattern). Correlations dedup kept client-side — pushing `.not('id', 'in', ...)` server-side risks URL-length limits at 500+ correlated UUIDs. Type-check clean; HMR hot-reload clean with zero console errors. [src/components/BulkExpenseAllocationSheet.tsx:60](src/components/BulkExpenseAllocationSheet.tsx:60). |
| Projects table status dropdown didn't open — user clicks navigated to project detail page instead | Fixed (Apr 16, 2026) — the `TableRow` has `onClick={() => handleViewDetails(project)}` ([src/components/ProjectsTableView.tsx:1387](src/components/ProjectsTableView.tsx:1387)). Cells for `checkbox` and `actions` already used `stopPropagation`, but the `status` cell didn't — so clicks on the Radix dropdown trigger bubbled to the row and navigated away before the menu could open. Extended the cell-level guard at [line 1414](src/components/ProjectsTableView.tsx:1414) to include `'status'`. Radix's open/close uses pointer events that don't block DOM bubbling — any cell containing an interactive child MUST stop propagation if the row has a click handler. User-reported symptom: "status isn't changing from the table." Live-verified: dropdown now opens cleanly, all 7 menu items render (including the disabled "Approved" + "Approve estimate first" link). |
| `MobileTimeTracker` project dropdown silently dropped projects past position 20 (active project count reached 24 on Apr 16 when 225-110 was created) | Fixed (Apr 16, 2026) — [src/components/time-tracker/MobileTimeTracker.tsx:362](src/components/time-tracker/MobileTimeTracker.tsx:362) had a hard-coded `.limit(20)` on the `status IN ('approved','in_progress') AND category = 'construction'` query. Bumped to `.range(0, 499)`. Four projects (225-096, 225-099, 225-100, 225-110 — all at positions 21-24 alphabetically) were invisible to field workers at time tracker. Same silent-data-loss class as Gotcha #23 but hard-coded rather than PostgREST-default. Live-verified: all 24 matching projects now render. |
| All Expenses bulk/row mutations didn't refresh the visible table until F5 | Fixed (Apr 18, 2026) — `ExpensesList` has a `refreshAll()` helper wired into all 6 mutation sites (bulk category/type/project, row delete, approve/reject, allocation, reassign, split). Helper calls both `onRefresh()` (parent state) and `expensesQuery.refetch()` (the `['expenses-search', filters]` TanStack cache used in global mode). Root cause documented as Gotcha #27. [src/components/ExpensesList.tsx:193](src/components/ExpensesList.tsx:193). |
| `useProjectData` not reactive to child-component mutations — users had to F5 after estimate approval, expense save, CO edit | Fixed (Apr 18, 2026) — migrated from raw `useState`/`useEffect` to `useQuery` keyed on `['project-data', projectId]` with `staleTime: 30s` and `refetchOnWindowFocus: true`. `loadProjectData()` is now a thin wrapper around `queryClient.invalidateQueries`. Return shape preserved byte-for-byte so all 13 consumers continue working unchanged. `handleSaveQuote` awaits invalidation before `navigate()`. TanStack's native query cancellation on queryKey change replaces the previous `currentProjectIdRef` race guard. Error/retry toast UX preserved via `useEffect`-gated firing. Root cause documented as Gotcha #27. [src/hooks/useProjectData.tsx](src/hooks/useProjectData.tsx). |
| Project-route audit: 7 route files checked for direct Supabase writes that skip `loadProjectData()` | Completed (Apr 18, 2026) — audit companion to the `useProjectData` TanStack migration. **6 of 7 clean**: `EstimateEditRoute`, `EstimateNewRoute`, `ProjectEditRoute`, `ProjectEstimatesRoute`, `ProjectExpensesRoute`, `QuoteEditRoute` all correctly wire their save/refresh callbacks through `loadProjectData()`. **1 gap fixed**: `QuoteViewRoute.handleDeleteContract` was refreshing only its local contract list after calling `contracts.delete()`. The DB trigger `contracts_delete_cascade` → `delete_related_project_documents()` removes a `project_documents` row, so `documentCount` in the hook was silently going stale. Added `loadProjectData?.()` after the local refresh. The other two mutation sites in that file (`QuoteStatusSelector.onStatusChange`, `ContractGenerationModal.onSuccess`) were already correct. [src/components/project-routes/QuoteViewRoute.tsx](src/components/project-routes/QuoteViewRoute.tsx). |
| `refreshAll()` was invalidating the expenses table cache but not the tab-badge count cache — row approve wrote to DB correctly but "All Expenses 330" badge stayed stale | Fixed (Apr 18, 2026 PM) — commit `87573a1`. Caught live during post-deploy UI verification. `refreshAll()` in `ExpensesList` was covering `onRefresh()` (parent) + `expensesQuery.refetch()` (`['expenses-search']` table) but missed `['expenses-unapproved-count']` — the key behind `useUnapprovedExpensesCount` that feeds the All Expenses tab badge with its own 30s staleTime. Added `queryClient.invalidateQueries({ queryKey: ['expenses-unapproved-count'] })` to `refreshAll` via new `useQueryClient` import. Verified end-to-end via UI (badge 330→329 without F5) and MCP (DB unapproved count matched UI). This is a recursive instance of Gotcha #27: the fix for Gotcha #27 had a Gotcha #27 inside it. Rule reinforced: grep ALL queryKey matches against a table before shipping direct-write code, not just the obvious one. [src/components/ExpensesList.tsx:193](src/components/ExpensesList.tsx:193). |
| No safe shadow project for verifying reactive UI flows without mutating real construction project data | Resolved (Apr 18, 2026 PM) — commit `da5a029`. Created `SYS-TEST` / "Sandbox (Test Project)" / category=`system` / ID `c63b4dea-4a69-448b-b27b-da7b41179a05`. Hidden from `/projects` list by default (category=system already excluded); Settings > Developer card has a Switch ("Show sandbox test project") that widens the list query to include it. Toggle backed by `src/utils/sandboxPreferences.ts` (localStorage, per-device). Preferred over Supabase preview branches for routine UI verification — avoids the `MIGRATIONS_FAILED` setup cost and auth-user seeding required by Gotcha #21. Project uses `sequence_number = 0` to bypass the `set_project_sequence_number` trigger's `split_part(..., '-', 2)::integer` cast that rejects non-numeric suffixes. Future sessions can seed it with estimates/quotes/contracts via MCP `execute_sql` if needed, or leave it empty. |
| Estimate/Quote edit form at `/projects/:id/estimates/:id/edit` was ~156 px narrower than at the top-level `/estimates/:id/edit` counterpart — nested route rendered inside `ProjectDetailView`'s 208 px secondary sidebar | Fixed (Apr 18, 2026 PM) — commit `61b1757`. Derived `effectiveCollapsed = forceCollapsed \|\| panelCollapsed` in `ProjectDetailView.tsx`, with `forceCollapsed` set by `useMatch` against the 4 edit/new routes (estimates edit + new, quotes edit + new). Sidebar auto-collapses to 56 px while on these routes, restores to user preference on exit — user's `localStorage.projectSidebarCollapsed` stays untouched so "restoration" is automatic, no save/restore plumbing. Cmd/Ctrl+B shortcut no-ops during force-collapse; hover/bottom toggle buttons hide. Verified live across all 4 routes + sandbox. |
| Redundant "Update Status" control on estimate edit view; view surface had static Badge (forcing users into edit mode just to flip status) | Fixed (Apr 18, 2026 PM) — commit `8f2ea0e`. Removed `EstimateStatusActions` secondary dropdown from `EstimateForm.tsx` (both mobile + desktop action bar sites) and deleted the now-orphan component file. Cleaned up the no-longer-referenced `status`/`setStatus` state in `EstimateForm`. Swapped the static `<Badge>` in `ProjectEstimatesView.tsx` for the existing `EstimateStatusSelector` pill-dropdown, mirroring `QuoteViewRoute`'s pattern with `QuoteStatusSelector`. Approval side-effects (`projects.contracted_amount` sync, project status revert on un-approve) inherited from the selector — no reimplementation. Status control now lives where status matters. Verified live on project 225-081 (read-only) — pill renders as clickable dropdown with chevron; edit page confirms no "Update Status" / Mark Rejected / Reopen copy remains. |
| Three parallel note-composer implementations drifting independently (`NoteInput` on Notes tab + `FieldQuickActionBar` inline sheet + `FieldTaskCard.TaskActions` per-task) — cramped layout, missing voice support on tasks, Photo/Video/File as 3 buttons, duplicate markup everywhere | Fixed (Apr 18, 2026 PM) — commits `0f3b865`, `8afef6e`, `396375a`, `ed0a836`. Built shared [`NoteComposer`](src/components/notes/NoteComposer.tsx) encapsulating textarea + mentions + voice + attach + submit with `'inline' \| 'sheet'` presentation and optional `taskName` context. Migrated `FieldQuickActionBar` Note button + `FieldTaskCard.TaskActions` (which auto-propagates to `PhaseTaskCard` via shared subcomponent). Added `hideComposer` prop to `ProjectNotesTimeline` so `FieldSchedule` Notes tab renders timeline-only — bottom bar is the sole note-entry affordance on mobile. Attach collapsed to single paperclip → labeled menu (Take Photo / Record Video / Upload File) with each option using its dedicated hook (combined `accept` filters were flaky on iOS Safari video capture). Net +417/−185 across 6 files. See CLAUDE.md Rule 15. Verified live: sheet opens from bar on 4 routes (overview/control/expenses/field-schedule), task-prefix format `**{taskName}:** {text}` preserved exactly in `project_notes` DB row. |
| Dead code: `unapproveEstimateSideEffects` in `src/utils/estimateApproval.ts` | Deleted (Apr 18, 2026 PM). Had zero callers after `EstimateStatusActions` deletion; its comment explicitly stated "kept here so EstimateStatusActions can share the logic." The same revert-approval logic lives inside `EstimateStatusSelector` (used by `QuoteViewRoute` pattern now extended to `ProjectEstimatesView`). If a shared util is wanted later, extract from the Selector — don't resurrect this. |
| `docs/API_REFERENCE.md` stale after EstimateStatusActions delete + NoteComposer add | Regenerated (Apr 18, 2026 PM) via `npx tsx scripts/generate-api-docs.ts`. The 227-component index now reflects current state. |
| Dead code: `NotesSheetTrigger.tsx` (zero callers after NoteComposer unification) | Deleted (Apr 18, 2026 late PM) — commit `05cd8ea`. 66 lines removed. Type-check clean. |
| Legacy `NoteInput` still live on desktop `ProjectNotesTimeline` (Rule 15 unification was mobile-only) | Fixed (Apr 18, 2026 late PM) — commit `ddde07a`. Migrated both render sites (inSheet branch + desktop `ResizablePanel`) to `<NoteComposer projectId={projectId} placeholder="Type note... @ to tag" />`. Deleted `NoteInput.tsx` entirely (218 lines). Stripped 12 state variables + 4 handler functions from `ProjectNotesTimeline` — parent went from 316→180 lines. Browser-verified at 1280×800: textarea + mic + paperclip menu + Send button render in the right-hand ResizablePanel, "Recent Notes" heading preserved. |
| **ExpenseDashboard + ExpenseExportModal eager fetch of up-to-10K rows (#3)** | Fixed (Apr 18, 2026 PM) — commits `60a7946`, `22f633c`, `8a419ef`. Two new `SECURITY INVOKER` RPCs applied via MCP: `get_expense_category_rollup(date, date, project_category)` returns 13 aggregate rows (category, total, count, project_count, allocated_count); `get_expense_dashboard_stats(project_category)` returns one row with total/this-month/unassigned/unallocated/split totals. New hook `useExpenseDashboardData` fires both RPCs + a `LIMIT 5` query against `expenses_search` for Recent Expenses. `ExpenseDashboard` drops the `expenses: Expense[]` prop and consumes the hook. `Expenses.tsx` drops the eager 1,288-row fetch; `fetchData` now only loads estimates. `ExpenseExportModal` self-fetches paginated chunks of 1,000 on open — fixes silent truncation (previously 1000/1288, now 1288/1288 verified live). `ExpensesList.refreshAll` extended to invalidate the 3 new dashboard query keys (Gotcha #27 fanout). Validated against raw aggregates: 0-diff rows, totals match exactly ($1,012,681.75 / 1,288 / $86,704.80 this month / $475,958.98 unallocated). Also corrected Gotcha #23's claim about `.range(0, 9999)` — see corrected entry. |
| **"Recategorize from Other bucket" quick action (#9)** | Fixed (Apr 18, 2026 PM) — commit `b91e30e`. New [RecategorizeOtherBucketSheet](src/components/cost-tracking/RecategorizeOtherBucketSheet.tsx): right-side sheet listing the N expenses sitting in a given bucket (scoped to `project_id` + source category + non-split), per-row checkboxes (all selected by default), target-category dropdown (13 options minus source), single `.update().in('id', selected)` on submit with invalidation fanout to `['other-bucket-expenses']` + all 3 `expense-dashboard-*` keys + `['expenses-search']`. `BucketEmptyState` gains optional `onRecategorize` prop; when `unmatchedSpend > 0` AND callback provided, renders "Recategorize these expenses" CTA below the amber warning. `CostBucketView` gates the callback to `project.category === 'construction'` — overhead projects stay copy-only because Rule 6a's trigger would silently rewrite their changes. Browser-verified on project 225-078 (real construction project): amber bucket shows "$2,664.00 sits here uncategorized...", CTA opens sheet with 2 rows ($798 + $1,866), "Move 2" button. Close/cancel works cleanly. |
| **`BulkExpenseAllocationSheet` silent truncation past 1,000 rows (proper paginated fix)** | Fixed (Apr 19, 2026) — commit `f2442c3`. The Apr 16 entry above (line 748) attempted `.range(0, 9999)` based on the false belief that client-side range overrides PostgREST's row cap; this project enforces `db-max-rows = 1000` server-side, so the modal was still silently capped. MCP-confirmed scale: 1,288 non-split expenses live, 796 un-correlated → ~178 allocatable candidates were invisible to admins. Replaced the single `.range()` with a paginated for-loop (`PAGE_SIZE = 1000`, breaks on short page), mirroring the canonical pattern in `ExpenseExportModal.tsx` (commit `8a419ef`). To preserve concurrency, the 4 bounded supporting queries (estimates / quotes / change_orders / correlations) fire as `Promise.all` *before* the pagination loop and are awaited after — supporting round-trips overlap with the candidates fetch, total wall-clock stays close to the original. Correlations dedup stays client-side per Rule 12. Type-check clean. **Long-term follow-up flagged**: replace eager-fetch-all-then-dedup-client with a `get_allocatable_expense_candidates(...)` RPC that does the un-correlated filter server-side, eliminating the truncation class entirely (out of scope for this PR's "no RPC / no schema changes" guardrail). [src/components/BulkExpenseAllocationSheet.tsx:60](src/components/BulkExpenseAllocationSheet.tsx:60). |
| **Gotcha #23 fanout sweep — 5 more unbounded fetches paginated** | Fixed (Apr 19, 2026) — commit `47267da`. Audit found 5 remaining sites that would silently truncate at PostgREST's `db-max-rows = 1000` cap, with concrete data-corruption modes (NOT just "missing rows in a list"): (1) `BulkExpenseAllocationSheet` correlations dedup at 49% of cap (492/1000) — silent leak past the cap would re-surface already-correlated expenses; with NO unique constraint on `(expense_id, line_item_id)`, clicking "Allocate" creates a duplicate correlation and double-counts the expense in cost-bucket actuals. (2-5) Four CSV importer paths (`enhancedTransactionImporter`, `csvParser`, `enhancedCsvParser`, `ExpenseImportModal`) eagerly fetch the full `payees` / `projects` / `clients` universe for fuzzy-matching against incoming CSV rows. When `payees` (335 today) crosses 1000, an existing vendor past the cap surfaces in "Resolve Entities" with the default action set to `create_new` ([ExpenseImportModal.tsx:1175](src/components/ExpenseImportModal.tsx:1175)) — admin clicks through, **duplicate payee row inserted (no UNIQUE constraint on `payees.payee_name`)**. Same shape for `clients`. For `projects`, the truncation could route an unmatched expense to whatever happens to be `projects[0]` in the truncated set ([csvParser.ts:599](src/utils/csvParser.ts:599)). All 5 sites switched to `paginatedAll<T>(builder)` local-helper-or-inline-loop pattern, `PAGE_SIZE = 1000`, `.order('id')` for stable boundaries, break on short page. Loops fire concurrently in `Promise.all` of async IIFEs. Helper THROWS on error rather than silent `[] || .data` — strict improvement; will surface latent RLS issues that were previously hidden. Type-check clean, HMR clean. **Long-term follow-ups remaining (separate sessions)**: (a) `get_allocatable_expense_candidates(...)` RPC to eliminate scan-all-then-dedup architecturally; (b) UNIQUE indexes on `payees.payee_name` (case-insensitive) and `expense_line_item_correlations(expense_id, line_item_id)` — both require dedup pass on existing data first. |
| **CSV import duplicate detection silently re-imported rows past 1,000 — `fetchExistingExpenses` not paginated** | Fixed (Apr 19, 2026) — commit `bf08cbe`. **User-caught live in browser the same session as `47267da`**, immediately after that fix landed: "5 of 301 CSV rows keep showing as 'New' even though those expenses already exist in the database." MCP-confirmed all 5 existed in the DB on 2026-01-01 / 2026-01-11 with payee "TCB Home Services" — each one already had a paired duplicate row from a PRIOR import that also hit this bug. With 1,289 expenses in the DB and a typical CSV import date range covering most history, the unfiltered `.gte().lte()` query on `expenses` silently truncated the duplicate-detection Map to 1,000 rows; CSV rows whose existing matches sat past row 1,000 got flagged "New" → admin clicked through with default selections → duplicate `expenses` rows inserted (no UNIQUE constraint on the row content). **The bug had been quietly producing DB-side duplicate expenses for months** before being caught — visible in the data as paired rows with identical date+amount+payee but different descriptions ("manual" vs "bill - <vendor>"). Three sites fixed with the canonical paginated-loop pattern: `enhancedTransactionImporter.ts:1230` (the one ExpenseImportModal calls — direct cause), `csvParser.ts:349` (sibling in older importer path, same bug), `ImportBatchDetail.tsx:75` (post-import drill-in — would have shown < 1000 rows for a >1000-row batch and left orphan rows on rollback). This is the third Gotcha #23 victim caught after `f2442c3` + `47267da`; class is now exhausted on the importer side AFAICT. Reinforces the value of the queued long-term backstop in Deferred (UNIQUE indexes would prevent this entire class regardless of app-layer regressions). [src/utils/enhancedTransactionImporter.ts:1230](src/utils/enhancedTransactionImporter.ts:1230). |
| **CSV import Review-step dup-detection still missing rows past 1,000 — `ExpenseImportModal.tsx` had its OWN unbounded fetch** | Fixed (Apr 19, 2026) — commit `780dc74`. **User-caught LIVE in browser immediately after `bf08cbe`** ("why are these 6 still importing?"). Symptom: even after fixing `fetchExistingExpenses` in the importer module, the CSV Import modal's Review step (step 2 of 4) STILL showed 6 of 301 rows as "New". Root cause: `ExpenseImportModal.tsx:728` has its OWN duplicate-detection fetch — completely independent from the importer module's `fetchExistingExpenses`. Same `.gte().lte()`-with-no-pagination bug. The Review step runs this BEFORE handing off to the importer module, so the user sees the truncation here even after the importer-module fix landed. **My audit-discipline failure**: the original grep for unbounded `.from('expenses').select(...)` calls DID surface this site, but I miscategorized its functional role (assumed display query, not dup-check). Live-verified via `preview_eval`: 1287 total expenses in CSV's date range, unfixed fetch returned 1000 — same silent truncation, same place. Fixed with the canonical paginated for-loop pattern. This is the **fourth** Gotcha #23 victim after `f2442c3` + `47267da` + `bf08cbe`. The class is now hopefully *actually* exhausted on the importer side. Reinforces the discipline: when grepping for an anti-pattern, READ EVERY HIT'S CONTEXT — don't trust filename + line number to imply functional role. [src/components/ExpenseImportModal.tsx:728](src/components/ExpenseImportModal.tsx:728). |
| **Data cleanup + UNIQUE-index dedup backstops (closes the duplicate-data class permanently)** | Fixed (Apr 19, 2026) — commits `196c195` (placeholder migration) + DB migration `20260419140208_add_unique_indexes_dedup_backstops` applied via MCP. Comprehensive audit and cleanup pass after the importer-fix commits. **Audit corrections worth noting**: an initial pass with key `(date, amount, payee_id)` flagged 34 "duplicate groups" and $21K of "overcounted" spend — but most were legitimate split labor days (worker logs morning shift on Job A + afternoon shift on Job B at same hours, which is correct). Re-audit with the correct key `(payee_id, date, project_id, start_time, end_time)` for time entries showed the actual scope: **0 time-entry duplicates** (the time tracker is working correctly), and only **2 non-labor expense duplicates**: CSC Service Works $3 (manual save-twice) + Archibald Electric $6,820 (CSV importer typo, fixed by `bf08cbe`'s pagination but the typo'd row needed manual cleanup). Also cleaned 6 payee duplicate groups (7 rows deleted, 13 FK refs reassigned across `expenses`/`quotes`/`receipts` for Sparks Hardware) and 1 orphan client. Final state: `expenses 1289→1287, payees 335→328, clients 58→57, correlations 492→491`. Then applied **7 UNIQUE indexes** as DB-layer backstops: `idx_payees_name_unique` (case-insensitive, excl. internal per Rule 11), `idx_clients_name_unique`, three partial uniques on `expense_line_item_correlations(expense_id, line_item_id)`, and two partial uniques on `expenses` (one for time entries keyed on `start_time/end_time` to allow back-to-back shifts; one for non-labor keyed on `amount/description`). Pre-flight verified zero duplicates remain across all 7 keys. The expenses indexes specifically allow legitimate split-labor days (different `project_id`) and back-to-back shifts (different `start_time/end_time`) while blocking save-twice. Local migration count synced to 350. **The duplicate-data class is now closed at the DB layer** — even if app-layer dedup regresses, the DB will throw `23505` instead of silently corrupting financial reports. |
| **CSV import Review still flagged 6 duplicates as "New" — `findIndex` collision in `allCategorized` useMemo** | Fixed (Apr 19, 2026) — commit `4654c7d`. **Browser-verified live in dev preview: 6 New → 1 New** (the Archibald typo is a separate fuzzy-match gap, not this bug). User-caught live AFTER `780dc74` shipped. Diagnosis: pagination was actually working (verified via `preview_eval` — only 543 rows in CSV's date range, well under cap). The actual bug was downstream in the React `useMemo` that builds `allCategorized` from `validationResults.databaseDuplicates`. It used `csvData.findIndex(row => row.Date === d.transaction.Date && row.Amount === d.transaction.Amount && row.Name === d.transaction.Name)` to map duplicates back to CSV row indices — but when multiple CSV rows share `(Date, Amount, Name)` (common in vendor billing — same vendor bills same amount on same day for different projects), `findIndex` always returns the FIRST match. The 2nd+ row never gets `status='duplicate'`. User's CSV had 5 such `(Date, Amount, Name)` collisions: TCB Home Services on 1/1/2026 had multiple rows at $50/$200/$300/$400 across different projects, plus 2 rows at $200 on 1/11/2026. Fix: track `originalIndex` in `databaseDuplicates`/`revenueDatabaseDuplicates` at find-time (where the index is known via `forEach`), then consume it directly in `allCategorized` instead of the lossy findIndex. Also paginated `project_revenues` fetch in `validateMatches` (5th Gotcha #23 victim — same shape). Backwards compatible: falls back to findIndex when `originalIndex` is missing. **Process lesson**: when a fix doesn't move the user-visible number as much as expected, don't assume the fix didn't work — trace the data flow downstream from the fix to find OTHER places that consume the same data and may have their own bugs. The pagination fix was correct; it just exposed a second-layer bug. [src/components/ExpenseImportModal.tsx:309](src/components/ExpenseImportModal.tsx:309). |
| **No breadcrumbs on project drill-in routes** | Fixed (Apr 21, 2026) — Rule 17. [AppBreadcrumbs](src/components/layout/AppBreadcrumbs.tsx) + [useProjectBreadcrumbs](src/components/layout/useProjectBreadcrumbs.ts) mounted in ProjectDetailView both viewports. Mobile gated to depth ≥4 to avoid duplicating the section selector pill. Four pre-existing ad-hoc breadcrumb renders migrated to the unified component. |
| **In-page `useState` view machines on `/quotes`, `/expenses`, `/projects`** | Fixed (Apr 21, 2026) — Rule 17. `/quotes/*` split into 5 URL routes (list / new / :id / :id/edit / :id/compare). `/projects/new` as standalone route. `/expenses?tab=` + `/projects/:id/control?view=` query params. F5, deep-links, shareable URLs all work. |
| **Mobile section selector reading `segments[-1]`** | Fixed (Apr 21, 2026) — Rule 17. Now reads `segments[2]` so deep routes like `/estimates/new` show the correct section label ("Estimates & Quotes" not "Overview"). |
| **Two URLs for the same project schedule concept** | Fixed (Apr 21, 2026) — Rule 18. `/projects/:id/schedule` is canonical. Mobile renders Tasks/Notes/Media/Docs tabs (lifted from old FieldSchedule.tsx); desktop renders Gantt. `/field-schedule/:projectId` redirects preserving `?tab=`. Field-worker role block widened to exempt this one path. [FieldSchedule.tsx](src/pages/FieldSchedule.tsx) deleted. |
| **Field-worker sideways-navigation gap on schedule** | Fixed (Apr 21, 2026) — Rule 18. After merge, field workers land inside ProjectDetailView's Outlet and get the mobile section-selector sheet automatically. Sheet items filtered by role via `fieldWorkerSafe` flag so they never tap into a path that bounces them. |
| **Mobile Camera/Attach buttons silently wrote to Notes instead of Media/Docs** | Fixed (Apr 21, 2026) — Rule 19. [FieldQuickActionBar](src/components/schedule/FieldQuickActionBar.tsx) now routes by button and MIME: Camera → `project_media` with GPS; Attach image/video → `project_media`; Attach PDF/doc → new `project_documents` path via [uploadProjectDocument](src/utils/projectDocumentUpload.ts). FieldDocumentsList widened to include `'other'` as "Field Attachments" so field-attached PDFs are visible. |
| **Note-attached images invisible on Media tab** | Fixed (Apr 21, 2026) — Rule 20. [getProjectMediaList](src/utils/projectMedia.ts) UNIONs image/video rows from `project_notes` at read time with `source: 'note'` marker. PhotoLightbox guards hide Delete / Caption / Comments for note-sourced items (the note is the owner + thread). `MobileScheduleView` media count updated to match. |
| **Raw User-Agent blob in PhotoLightbox** | Fixed (Apr 21, 2026) — Rule 21 + Gotcha #37. New [formatDeviceLabel](src/utils/formatDeviceLabel.ts) parses to "iPhone · Safari" / "Android · Chrome". Raw UA still stored in `device_model` for forensics. FieldQuickActionBar uploads also capture UA now. |
| **TimelineStoryView broken aspect ratios + raw GPS coords** | Fixed (Apr 21, 2026) — Rule 21. Rebuilt with `max-h-[360px] object-contain` (preserves aspect for portrait/landscape), sticky date headers with semantic labels (Today/Yesterday/etc.), vertical spine + dot markers, device+source chips, human-readable location, video play overlay. |
| **CSV import: fuzzy dedup match + variance row-level breakdown** | Fixed (Apr 19, 2026) — commit `ff64e7d`. **Browser-verified live: 1 New → 0 New (all 301 detected as duplicate); variance now shows the 5 specific bills causing it.** Two improvements after `4654c7d`: (1) **Fuzzy dedup**: added Strategy 3 to ExpenseImportModal dedup lookup — when exact-name key misses, fuzzy-match CSV name against known payees (`fuzzyMatchPayee`), then try the canonical name's key. Threshold 65 (not 75 like the payee-resolution AUTO_MATCH_THRESHOLD) — deliberate asymmetry: wrong dedup match shows in UI for user override, missed dedup silently creates duplicate row. Uses `matches[0]` since `bestMatch` only populates at ≥75. Live-tested catches "Archiable Electric" → "Archibald Electric" (Jaro-Winkler 72.7%). (2) **Variance breakdown**: replaced the cryptic "Reconciliation variance: $2,300.00" with a row-by-row explanation. For each `(Date, Amount, Name)` collision group of size N in `databaseDuplicates`, computes `2*(N-1)*amount` contribution and lists payee/date/amount/CSV-row-count/projects-involved. Plain copy explains it's a CSV-side math artifact (vendor bills split across projects in QuickBooks), NOT data corruption. The math itself is unchanged — just made the alarm actionable. **Lesson**: when the matcher's `bestMatch` is null, don't assume "no candidate exists" — `matches[]` still has scored candidates ≥40% (the REVIEW_THRESHOLD); pick top + apply task-appropriate threshold. [src/components/ExpenseImportModal.tsx:884](src/components/ExpenseImportModal.tsx:884). |

### Medium Priority

| Issue | File(s) | Notes |
|-------|---------|-------|
| Storage bucket names untyped | `bid-media`, `bid-documents`, `project-media`, `project-documents` | Supabase `gen types` does not generate Storage bucket types — only DB schema. No user impact; bucket names are string literals in code. A manual `StorageBucket` type could be added for autocomplete but is not worth the maintenance. |
| `as any` type casts | 74 across 40 files | Remaining are Supabase type mismatches, dynamic access patterns, third-party library gaps, and form/export handlers. Lower ROI to fix. |

### Deferred (Requires Broader Planning)

| Issue | Scope | Notes |
|-------|-------|-------|
| 26 edge functions with wildcard CORS (`*`) — **DO NOT pick up without explicit user go-ahead** | All functions except `quickbooks-callback` | ⚠️ User has flagged this as high-risk: a CORS misconfig on `send-auth-email` / `forgot-password` takes the login flow down in production. Before attempting: (1) agree on a staging test plan, (2) change one function at a time, (3) verify the real email actually sends from `rcgwork.com` before moving to the next, (4) have the revert command ready. Priority targets when we do this: the 4 no-JWT functions `send-auth-email`, `forgot-password`, `send-receipt-notification`, `send-training-notification`. Wildcard CORS alone isn't exploitable but it widens the blast radius of other vulnerabilities. |
| `console.log` cleanup | 132 across 38 files | Mix of intentional logging and debug leftovers. Needs triage to distinguish. |
| **Mobile drill-in pattern for bucket line items** | `src/components/cost-tracking/CostBucketView.tsx` | Line items currently expand inline inside the bucket card. On narrow screens a bottom sheet could give more vertical real estate per line item (more context visible, tap-friendly). Deferred until a real UX pain point surfaces — the inline expansion is acceptable at current scale. |
| **`get_allocatable_expense_candidates(...)` RPC** | `src/components/BulkExpenseAllocationSheet.tsx` | Architectural successor to commits `f2442c3` + `47267da`. Today the bulk-allocate sheet eagerly fetches 1,288 expenses + 492 correlations + 82 estimates + nested line items + 31 quotes + nested line items + 2 change orders + nested line items, then dedups + matches client-side. Even with pagination it's a ~2-3 sec load on fast network, ~5-8 sec on mobile, pegging the main thread for ~800ms during Jaro-Winkler matching. The actual answer the modal needs is < 800 candidate rows. Plan: RPC returns only un-correlated allocatable rows + payee/project joins; matching algorithm stays client-side (where the cost smell isn't). Eliminates the truncation class entirely. ~80-150 lines PL/pgSQL + ~50 lines refactor. |

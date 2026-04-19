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

**30 Edge Functions** deployed (verify with `mcp list_edge_functions` or `npx supabase functions list --project-ref clsjdxwbsjbhjibvlqbz`). Source lives in `supabase/functions/`.

| Group | Functions |
|-------|-----------|
| Auth | `send-auth-email`, `forgot-password`, `admin-create-user`, `admin-reset-password`, `admin-delete-user`, `admin-disable-user` |
| Notifications | `send-receipt-notification`, `send-training-notification` |
| SMS | `send-sms`, `check-sms-status`, `check-sms-quota`, `process-scheduled-sms`, `get-textbelt-key` |
| Media/AI | `enhance-caption`, `transcribe-audio`, `generate-media-report`, `generate-video-thumbnail` |
| AI (live) | `ai-report-assistant` (heavily used — Reports AI), `enrich-estimate-items` (live estimate import) |
| Contracts | `generate-contract`, `generate-subcontractor-contract` ⚠️ **status uncertain — do not touch without verifying live usage** |
| QuickBooks (CSV flow, live) | `quickbooks-connect`, `quickbooks-callback`, `quickbooks-sync-customer`, `quickbooks-sync-project`, `quickbooks-bulk-sync-customers`, `quickbooks-bulk-sync-projects`, `quickbooks-backfill-ids` |
| QuickBooks API (**in-dev — not production**) | `quickbooks-sync-receipt`, `quickbooks-sync-transactions` |
| Shared | `_shared/brandedTemplate.ts`, `_shared/quickbooks.ts` |

**Removed (Apr 15, 2026):** `ai-project-assistant` (unused, replaced by `ai-report-assistant`), `parse-estimate-import` (dead — live path is `enrich-estimate-items`). Both deleted via `npx supabase functions delete <name> --project-ref clsjdxwbsjbhjibvlqbz`.

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

---

## Outstanding Audit Items (Apr 2026)

Issues identified during codebase audit, validated, and prioritized for future work.

### Resolved (Apr 2026 Cleanup)

| Issue | Resolution |
|-------|-----------|
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
| **UNIQUE constraints to harden the duplicate-data corruption modes** | `payees`, `clients`, `expense_line_item_correlations` | Defensive backstops to the Apr 19 fanout sweep (`47267da`). Three indexes proposed: (1) `payees.payee_name` case-insensitive partial unique (excluding `is_internal=true` to avoid colliding with the shadow-record convention from Architectural Rule 11); (2) `clients.client_name` case-insensitive unique; (3) `expense_line_item_correlations` partial uniques on `(expense_id, estimate_line_item_id) WHERE estimate_line_item_id IS NOT NULL` plus parallel ones for `quote_id` and `change_order_line_item_id`. Each requires a "no existing duplicates" pre-check via MCP before applying — if duplicates exist (whitespace variants, "Inc" vs "Inc.", etc.), need a coordination conversation about the dedup rule before the index lands. |

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
│   ├── notes/           # Shared note components (NoteCard, NoteInput, NoteLightbox, VoiceNoteButton, MentionTextarea)
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

**343 sequential migrations** in `supabase/migrations/` (as of Apr 15, 2026). File naming: `{UTC_timestamp}_{name}.sql`.

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
- `FieldScheduleTable` → `FieldTaskSection` (collapsible groups: Today/Active, This Week, Upcoming, Completed) → `FieldTaskCard` (expandable with note input + photo capture + mark complete)
- `FieldQuickActionBar` — sticky bottom bar with Note, Photo, Voice buttons (bottom sheets)
- `FieldMediaGallery` — read-only photo/video grid using `useProjectMedia` → `PhotoLightbox`/`VideoLightbox`
- `FieldDocumentsList` — filtered to field-relevant types only: `drawing`, `permit`, `license`, `specification`. Does **NOT** show contracts, reports, or receipts.

**Notes architecture (decomposed):**
- `useProjectNotes` hook — query, mutations, upload (shared by all note views)
- `NoteCard` — variant-based renderer (`'default'` | `'compact'`)
- `NoteInput` — textarea + capture buttons + `voiceNoteSlot` for voice transcription
- `VoiceNoteButton` — self-contained audio recording + Whisper transcription (reuses `useAudioRecording` + `useAudioTranscription` from bid notes)
- `ProjectNotesTimeline` — thin composition shell (~250 lines, down from 1,169)

**Task card interaction model:** Tap to expand → see admin notes, type "What happened?", snap a photo, or mark complete. Notes are created as project notes with task name prefix (e.g., `**Framing:** North wall done`). No accidental completion — checkbox was replaced with a deliberate "Mark Complete" button inside the expanded view.

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

**Admin-only exception**: `BulkExpenseAllocationSheet` still does an unbounded fetch to build match candidates; fix tracked in Outstanding Audit Items.

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

### 14. Global Mobile Action Bar (Apr 16, 2026)

**[FieldQuickActionBar](src/components/schedule/FieldQuickActionBar.tsx)** is the single project-scoped capture/note affordance on mobile. Rendered ONCE in [ProjectDetailView](src/components/ProjectDetailView.tsx) — persistent bottom bar visible across every project detail route (`/projects/:id`, `/control`, `/documents`, etc.). Replaced the fragmented mix of per-page FABs and per-card inline inputs.

**Three-button standard** (Slack / WhatsApp / Linear convergent pattern):

| Button | Action | Flow |
|---|---|---|
| **Note** | Opens bottom sheet with textarea + `VoiceNoteButton` mic INSIDE the composer | Slack-style voice-in-composer; transcribed text appends to whatever is typed |
| **Camera** | Capacitor camera via `useCameraCapture` | Fast in-the-moment capture (no native picker chrome) |
| **Attach** | Hidden `<input type="file" accept="image/*,video/*,.pdf,...">` → native sheet | User routes to Take Photo / Take Video / Photo Library / Choose File |

**Why voice is inside the Note composer, not a peer button**: the output of voice transcription IS a note, so it belongs with the textarea. Slack, iMessage, WhatsApp all use this pattern.

**Sticky override for inline use**: `FieldQuickActionBar`'s outer div is `position: fixed bottom-0`. When a caller wants it inline (currently none after consolidation, but historically `ProjectNotesTimeline` briefly did), override with `[&>div:first-child]:!static [&>div:first-child]:!shadow-none` utilities. Bottom sheets render in Radix Portal at document root regardless of trigger position.

**Content padding**: the project detail main wrapper gets `pb-20` on mobile so scrollable content never ends up hidden behind the bar.

**Not rendered on `/field-schedule/:id`** — that route is outside `ProjectDetailView` and renders its own bar. If you add a new project-scoped mobile route, prefer putting it inside `ProjectDetailView`'s Outlet so it inherits the bar automatically.

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
| `docs/MANUAL_TIME_ENTRY_REBUILD_PLAN.md` | Time entry form rebuild plan (pending implementation) |

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

23. **PostgREST default 1,000-row cap on `expenses` (Apr 16, 2026)** — See Architectural Rule 12. At 1,278 rows, any unbounded `.from('expenses').select(...)` silently loses ~279 rows. The failure mode is invisible — no error, no warning, just missing data. Repro with `SELECT COUNT(*) FROM expenses WHERE is_split = false` — if it exceeds 1,000, grep the codebase for unfiltered `.from('expenses')` usages. Current offenders flagged in Outstanding Audit Items. Do NOT pass `.limit()` as a fix — bump to `.range(0, 9999)` as a tactical band-aid OR (better) route through `public.expenses_search` + `useExpensesQuery`.

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

### Medium Priority

| Issue | File(s) | Notes |
|-------|---------|-------|
| Storage bucket names untyped | `bid-media`, `bid-documents`, `project-media`, `project-documents` | Supabase `gen types` does not generate Storage bucket types — only DB schema. No user impact; bucket names are string literals in code. A manual `StorageBucket` type could be added for autocomplete but is not worth the maintenance. |
| `as any` type casts | 86 across 40 files | Remaining are Supabase type mismatches, dynamic access patterns, third-party library gaps, and form/export handlers. Lower ROI to fix. |
| **`BulkExpenseAllocationSheet` unbounded `from('expenses')`** | `src/components/BulkExpenseAllocationSheet.tsx:71` | Admin-only bulk-allocation tool. Currently fetches ALL expenses without `.limit()`/`.range()` — hits the 1,000-row cap described in Gotcha #23 and silently drops candidates from the match suggester. Not critical because (a) it's admin-only, (b) the filter "unallocated only" would dramatically reduce candidate count if pushed server-side. **Proper fix:** query `expense_line_item_correlations` first, then fetch only `expenses WHERE id NOT IN (correlated)` with `.range()`. Alternative quick patch: add `.range(0, 9999)` to match the pattern used in `ExpenseDashboard`/`ExpenseExportModal`. |
| **`ExpenseDashboard` + `ExpenseExportModal` on `.range(0, 9999)` band-aid** | `src/pages/Expenses.tsx:247` | Tactical patch raises the cap from 1,000 → 10,000. Adequate at 1,278 rows but ceiling-bound. **Proper fix:** replace the fetch-and-aggregate-in-JS pattern in `ExpenseDashboard` with a category-rollup RPC (analogous to `reporting.project_financials`), and move `ExpenseExportModal` to a paginated CSV streaming export. |

### Deferred (Requires Broader Planning)

| Issue | Scope | Notes |
|-------|-------|-------|
| 26 edge functions with wildcard CORS (`*`) | All functions except `quickbooks-callback` | Replace with `rcgwork.com` origin allowlist. Especially important for no-JWT functions: `send-auth-email`, `forgot-password`, `send-receipt-notification`, `send-training-notification` |
| `console.log` cleanup | 132 across 38 files | Mix of intentional logging and debug leftovers. Needs triage to distinguish. |
| `useProjectData` not reactive — Project Detail View doesn't auto-update | `src/hooks/useProjectData.tsx`, `src/components/ProjectDetailView.tsx` | The hook uses raw `useState`/`useEffect` instead of TanStack Query, so mutations in child components (estimate approval, expense creation, change order save) don't trigger re-renders. Only `handleSaveQuote` calls `loadProjectData()`. **Fix:** Migrate to `useQuery` with proper query keys so mutations can call `queryClient.invalidateQueries()`. Alternatively, add Supabase Realtime subscriptions on `estimates`, `expenses`, `change_orders` tables to trigger `loadProjectData()` as a lighter-weight interim fix. Views that DO auto-update correctly (and can serve as reference patterns): `useScheduleOfValues`, `usePaymentApplications`, `useProjectMedia`, `ProjectDocumentsTable`. |
| **Mobile drill-in pattern for bucket line items** | `src/components/cost-tracking/CostBucketView.tsx` | Line items currently expand inline inside the bucket card. On narrow screens a bottom sheet could give more vertical real estate per line item (more context visible, tap-friendly). Deferred until a real UX pain point surfaces — the inline expansion is acceptable at current scale. |
| **"Recategorize from Other bucket" quick action** | `src/components/cost-tracking/BucketEmptyState.tsx` | The `no_target` (Other) bucket surfaces uncategorized spend loud-and-clear, but doesn't offer a fix. Could add "Move N expenses to Materials / Subcontractors / ..." inline buttons with a category-picker. Nice-to-have once the pattern proves useful at scale. |

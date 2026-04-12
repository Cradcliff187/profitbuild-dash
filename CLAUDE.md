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
| AI features | Supabase edge functions calling AI APIs |
| File handling | PapaParse (CSV), XLSX, JSZip, react-dropzone |
| Sanitization | DOMPurify (HTML sanitization for user-provided embeds) |

---

## Source Structure

```
src/
├── components/          # UI components (22 subdirectories)
│   ├── ui/              # 66 shadcn/ui base components — do NOT edit these directly
│   ├── dashboard/       # Dashboard widgets
│   ├── schedule/        # Gantt chart & scheduling
│   ├── time-tracker/    # Field worker time tracking
│   ├── time-entries/    # Admin time entry management
│   ├── time-entry-form/ # Shared time entry form (rebuilt unified version)
│   ├── reports/         # Report builder & templates
│   ├── contracts/       # Contract generation & management
│   ├── payment-applications/ # AIA G702/G703 billing (SOV, payment apps, PDF export)
│   └── ...              # (13 more feature directories)
├── pages/               # 36 route pages (one per major view)
├── hooks/               # 50+ custom React hooks
├── utils/               # 50+ utility/calculation modules
├── types/               # 25 TypeScript type definition files
├── lib/
│   ├── kpi-definitions/ # KPI schema, business rules, benchmarks
│   └── featureFlags.ts  # Env-based feature flags
└── integrations/
    └── supabase/        # Supabase client + generated types
```

---

## Backend: Supabase

**27 Edge Functions** in `supabase/functions/`:

| Group | Functions |
|-------|-----------|
| Auth | `send-auth-email`, `forgot-password`, `admin-create-user`, `admin-reset-password`, `admin-delete-user`, `admin-disable-user` |
| Notifications | `send-receipt-notification`, `send-training-notification` |
| SMS | `send-sms`, `check-sms-status`, `check-sms-quota`, `process-scheduled-sms`, `get-textbelt-key` |
| Media/AI | `enhance-caption`, `transcribe-audio`, `generate-media-report`, `generate-video-thumbnail` |
| Business | `generate-contract`, `enrich-estimate-items`, `ai-report-assistant` |
| QuickBooks | `quickbooks-connect`, `quickbooks-callback`, `quickbooks-sync-customer`, `quickbooks-sync-project`, `quickbooks-bulk-sync-customers`, `quickbooks-bulk-sync-projects`, `quickbooks-backfill-ids` |
| Shared | `_shared/brandedTemplate.ts`, `_shared/quickbooks.ts` |

### Critical: Functions That Use `_shared/brandedTemplate.ts`

These four functions MUST be deployed together with the shared file via Supabase MCP:

| Function | verify_jwt | Pinned version |
|----------|------------|----------------|
| `send-auth-email` | false | 111 |
| `send-receipt-notification` | false | 95 |
| `send-training-notification` | false | 44 |
| `generate-media-report` | true | 113 |

Always read full file contents (no truncation) before deploying via MCP. See `.cursorrules` for the complete deployment checklist.

### Deploying Edge Functions

**Normal flow** (push to GitHub → Lovable auto-deploys):
```bash
git push origin <branch>
# Lovable picks it up automatically
```

**Emergency / direct MCP deploy** (bypasses Lovable):
- Use `mcp_supabase_deploy_edge_function` in Cursor with full file content
- Then push to GitHub to keep code in sync

**ALWAYS pin dependency versions in edge functions:**
```typescript
// Good
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Bad — floating versions break across environments
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

---

## Database Migrations

**336 sequential migrations** in `supabase/migrations/`. File naming: `{UTC_timestamp}_{name}.sql`.

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
- `overhead` — Expense/receipt allocation only (001-GAS, 002-GA)
Field workers only see construction projects in the mobile time tracker.

### 7. Receipts vs. Expenses
Receipts are **documentation only** — they do NOT feed financial calculations. Financial data comes from direct expense entry or QuickBooks CSV import.

### 8. AIA G702/G703 Payment Applications
AIA billing uses a three-layer data model: **Schedule of Values (SOV)** → **Payment Applications** → **Payment Application Lines**. The SOV is generated once from an approved estimate via the `generate_sov_from_estimate()` RPC. Each payment application creates G703 lines with cumulative progress via the `create_payment_application()` RPC. All financial calculations (line totals, retainage, G702 summary roll-ups) are handled by PostgreSQL triggers — **never** in frontend code. Approved change orders auto-append to the SOV via a trigger on `change_orders`. The feature is gated behind `VITE_FEATURE_AIA_BILLING`.

**Key tables**: `schedule_of_values`, `sov_line_items`, `payment_applications`, `payment_application_lines`
**Key RPC functions**: `generate_sov_from_estimate()`, `create_payment_application()`
**Key triggers**: `calculate_payment_line_totals` (line-level), `calculate_payment_application_totals` (roll-up to G702), `add_change_order_to_sov` (auto-append CO lines)
**PDF storage**: Generated G702/G703 PDFs are saved to Supabase Storage (`project-documents` bucket, path `{projectId}/aia-billing/`) and cross-referenced in both `payment_applications` (via `g702_pdf_url`/`g703_pdf_url`) and `project_documents` (for the Documents tab). Follows the same pattern as `reportStorageUtils.ts`.

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
- `ResendAPI` — Resend email service API key (required)
- `TEXTBELT_API_KEY` — Textbelt SMS key (required for SMS features)

---

## Documentation Map

| File/Location | Purpose |
|--------------|---------|
| `README.md` | Setup, architecture, deployment, troubleshooting |
| `PRODUCT_OVERVIEW.md` | Comprehensive feature documentation (all 8 modules) |
| `.cursorrules` | AI agent rules for Cursor IDE — migration workflow, edge function deployment, code style |
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

### Medium Priority

| Issue | File(s) | Notes |
|-------|---------|-------|
| Non-null assertion | `useScheduleOfValues.ts:29` | `sovQuery.data!.id` — safe in practice due to `enabled` guard but should use optional chain |
| Storage buckets not in types | `bid-media`, `bid-documents`, `project-media`, `project-documents` | Used in code but not reflected in Supabase generated types |
| `as any` type casts | 117 across 60 files | Top offenders: `EstimateForm.tsx`, `ChangeOrdersList.tsx`, `csvParser.ts`. Reduce incrementally. |

### Deferred (Requires Broader Planning)

| Issue | Scope | Notes |
|-------|-------|-------|
| 26 edge functions with wildcard CORS (`*`) | All functions except `quickbooks-callback` | Replace with `rcgwork.com` origin allowlist. Especially important for no-JWT functions: `send-auth-email`, `forgot-password`, `send-receipt-notification`, `send-training-notification` |
| `console.log` cleanup | 132 across 38 files | Mix of intentional logging and debug leftovers. Needs triage to distinguish. |
| `.cursorrules` consolidation | `.cursorrules` + `CLAUDE.md` | Significant overlap — consider making `.cursorrules` a minimal pointer to `CLAUDE.md` |

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

---

## Source Structure

```
src/
├── components/          # UI components (21 subdirectories)
│   ├── ui/              # 66 shadcn/ui base components — do NOT edit these directly
│   ├── dashboard/       # Dashboard widgets
│   ├── schedule/        # Gantt chart & scheduling
│   ├── time-tracker/    # Field worker time tracking
│   ├── time-entries/    # Admin time entry management
│   ├── time-entry-form/ # Shared time entry form (rebuilt unified version)
│   ├── reports/         # Report builder & templates
│   ├── contracts/       # Contract generation & management
│   └── ...              # (13 more feature directories)
├── pages/               # 38 route pages (one per major view)
├── hooks/               # 30+ custom React hooks
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

**329 sequential migrations** in `supabase/migrations/`. File naming: `{UTC_timestamp}_{name}.sql`.

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
| `VITE_FEATURE_SCHEDULE_WARNINGS` | ✅ Enabled | Schedule sequence warnings |
| `VITE_FEATURE_SCHEDULE_DEPS` | ✅ Enabled | Task dependencies |

---

## Key Architectural Rules

### 1. Database-First Financials
All financial calculations (margins, totals, projections) live in PostgreSQL triggers and functions — **not** in frontend code. `projectFinancials.ts` is **deprecated**. Read financial data directly from the `projects` table and `reporting.project_financials` view.

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

```env
VITE_SUPABASE_URL=https://clsjdxwbsjbhjibvlqbz.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_FEATURE_SCHEDULE=true
VITE_FEATURE_SCHEDULE_WARNINGS=true
VITE_FEATURE_SCHEDULE_DEPS=true
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

6. **Two drag-and-drop libraries** — Both `react-beautiful-dnd` and `@hello-pangea/dnd` are present. `@hello-pangea/dnd` is the maintained fork; prefer it for new code.

7. **QuickBooks is UI-hidden** — The `quickbooks_auto_sync` feature flag is disabled. The edge functions and DB schema exist but the UI is hidden.

8. **`projectFinancials.ts` is deprecated** — Do not add new logic here. Read financial data from the DB directly.

9. **Time entries store as `timestamptz`** — Always in UTC. Display in local browser timezone. The existing pattern is correct; do not add explicit timezone conversion unless improving the time entry form.

10. **`frappe-gantt` in optimizeDeps** — `vite.config.ts` includes `frappe-gantt` in `optimizeDeps.include` but the actual Gantt library used is `gantt-task-react`. This is a benign legacy entry.

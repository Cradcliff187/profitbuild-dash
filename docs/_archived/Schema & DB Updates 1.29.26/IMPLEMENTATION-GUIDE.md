# RCG Work Cleanup - Master Implementation Guide

## Quick Reference

| Document | Purpose |
|----------|---------|
| `phase-1-database-migrations.sql` | SQL migrations for database changes |
| `phase-2-kpi-files/` | New and updated KPI definition files |
| `phase-3-frontend-updates.md` | Frontend component update guide |
| `phase-4-validation-checklist.md` | Testing and validation checklist |

---

## Implementation Order

Execute in this exact order to minimize breaking changes:

```
Phase 1: Database (Foundation)
    ↓
Phase 2: KPI System (Definitions)
    ↓
Phase 3: Frontend (Components)
    ↓
Phase 4: Validation (Testing)
```

---

## Phase 1: Database Migrations

### Step 1.1: Create Migration Files

Create these files in `supabase/migrations/`:

```
20260130000001_add_adjusted_est_margin_column.sql
20260130000002_update_calculate_project_margins.sql
20260130000003_update_project_financials_view.sql
20260130000004_update_get_profit_analysis_data.sql
20260130000005_fix_weekly_labor_hours_gross_hours.sql
20260130000006_fix_execute_simple_report_enum_casting.sql
```

Copy content from `phase-1-database-migrations.sql`, splitting into separate files.

### Step 1.2: Apply Migrations

```bash
# Option A: Supabase CLI
supabase db push

# Option B: Manual (Supabase Dashboard → SQL Editor)
# Run each migration file in order
```

### Step 1.3: Verify

Run validation queries from `phase-4-validation-checklist.md` Section 1.

---

## Phase 2: KPI System Updates

### Step 2.1: Create New KPI Files

Copy these files to `src/lib/kpi-definitions/`:

| Source File | Destination |
|-------------|-------------|
| `phase-2-kpi-files/time-entry-kpis.ts` | `src/lib/kpi-definitions/time-entry-kpis.ts` |
| `phase-2-kpi-files/payee-kpis.ts` | `src/lib/kpi-definitions/payee-kpis.ts` |
| `phase-2-kpi-files/index.ts` | `src/lib/kpi-definitions/index.ts` |

### Step 2.2: Update Existing KPI Files

Replace content of:
| Source File | Destination |
|-------------|-------------|
| `phase-2-kpi-files/project-kpis-updated.ts` | `src/lib/kpi-definitions/project-kpis.ts` |
| `phase-2-kpi-files/semantic-mappings-updated.ts` | `src/lib/kpi-definitions/semantic-mappings.ts` |
| `phase-2-kpi-files/deprecated-kpis-updated.ts` | `src/lib/kpi-definitions/deprecated-kpis.ts` |

### Step 2.3: Regenerate Edge Function Context

```bash
npm run regenerate-kpi-context
# Or: npx tsx scripts/sync-edge-kpi-context.ts
```

### Step 2.4: Verify

```bash
npm run build  # Should compile without errors
```

---

## Phase 3: Frontend Updates

### Cursor Prompts

Use these prompts with Cursor to make the updates:

---

#### Prompt 1: Update Projects.tsx

```
@file src/pages/Projects.tsx

Remove the dependency on calculateMultipleProjectFinancials from projectFinancials.ts.

Changes needed:
1. Remove the import: import { ProjectWithFinancials, calculateMultipleProjectFinancials } from "@/utils/projectFinancials";
2. Replace the calculateMultipleProjectFinancials call (around line 180-200) with direct project mapping
3. Keep only display-only enrichment like totalLineItemCount
4. All financial fields (contracted_amount, adjusted_est_margin, actual_margin, etc.) should come directly from the project record - the database triggers maintain these values

The project records already have all financial fields populated by database triggers, so we don't need frontend calculations anymore.
```

---

#### Prompt 2: Update ProjectsTableView.tsx Columns

```
@file src/components/ProjectsTableView.tsx

Update the margin column definitions to use new terminology and database fields directly:

1. Find the column with key 'projected_margin':
   - Change key to 'adjusted_est_margin'
   - Change label to 'Adj. Est. Margin ($)'
   - In getSortValue, use: project.adjusted_est_margin || project.projected_margin || 0
   - In render, remove the inline calculation (const derivedMargin = contract - adjustedCosts)
   - Use the database value directly: const margin = project.adjusted_est_margin || project.projected_margin || 0
   - Update tooltip text to say "Adjusted Est. Margin" instead of "Projected Margin"

2. Find the column with key 'margin_percentage':
   - Keep the key but update label to 'Adj. Est. Margin %'
   - Update tooltip text accordingly

3. Remove any "sync issue" detection that compares derived values to database values - we trust the database now
```

---

#### Prompt 3: Update WorkOrders Files

```
@file src/pages/WorkOrders.tsx
@file src/components/WorkOrdersTableView.tsx

Update column definitions to use new margin terminology:

1. In ALL_COLUMNS array:
   - Change { key: "projected_margin", label: "Projected Margin ($)", ... } 
     to { key: "adjusted_est_margin", label: "Adj. Est. Margin ($)", ... }
   - Change { key: "current_margin", label: "Current Margin ($)", ... }
     to { key: "actual_margin", label: "Actual Margin ($)", ... }
   - Update margin_percentage label if needed

2. In labels object:
   - Update all references to match new column keys

3. In any render functions or data access:
   - Replace project.projected_margin with project.adjusted_est_margin || project.projected_margin
   - Replace project.current_margin with project.actual_margin
```

---

#### Prompt 4: Update ProjectOperationalDashboard

```
@file src/components/ProjectOperationalDashboard.tsx

Update the financialMetrics useMemo to use database fields directly:

1. For completed projects (status in ['complete', 'cancelled']):
   - Use project.actual_margin directly (not calculated from contract - expenses)
   - Use project.total_invoiced and project.total_expenses from the view/project
   - Label should be "Actual Margin"

2. For in-progress projects:
   - Use project.adjusted_est_margin || project.projected_margin
   - Label should be "Adj. Est. Margin"

3. Remove any inline calculations that duplicate database logic
```

---

#### Prompt 5: Deprecate margin.ts

```
@file src/types/margin.ts

Move this file to src/types/deprecated/margin.ts and:

1. Add a deprecation notice at the top of the file:
   /**
    * @deprecated This file is deprecated. Use database fields directly.
    * Margin calculations are now handled by PostgreSQL triggers.
    * Access margins directly from project records:
    * - project.actual_margin
    * - project.adjusted_est_margin  
    * - project.original_margin
    * - project.margin_percentage
    */

2. Add console.warn to calculateProjectMargin function:
   console.warn('calculateProjectMargin is deprecated. Use database fields directly.');

3. Keep the interface and function for backward compatibility during transition
```

---

#### Prompt 6: Update profitCalculations.ts

```
@file src/utils/profitCalculations.ts

Update to use new margin field names:

1. In the storedProjectData parameter type:
   - Replace current_margin with actual_margin
   - Add adjusted_est_margin

2. In the function body:
   - Replace storedProjectData?.current_margin with storedProjectData?.actual_margin
   - Update any comments to reference new field names
```

---

#### Prompt 7: Fix Type Mismatches in SimpleReportBuilder

```
@file src/components/reports/SimpleReportBuilder.tsx

Update AVAILABLE_FIELDS type definitions to match actual data types:

1. For time_entries data source:
   - Change { key: 'start_time', label: 'Start Time', type: 'text', ... }
     to { key: 'start_time', label: 'Start Time', type: 'date', ... }
   - Change { key: 'end_time', label: 'End Time', type: 'text', ... }
     to { key: 'end_time', label: 'End Time', type: 'date', ... }

2. For fields with enumValues:
   - Ensure type is 'text' with enumValues specified (this is correct for enum display)

3. Verify approval_status fields have enumValues: ['pending', 'approved', 'rejected']
```

---

## Phase 4: Validation

Follow `phase-4-validation-checklist.md` completely.

---

## Quick Verification Commands

```bash
# TypeScript build check
npm run build

# Run app locally
npm run dev

# Check for remaining deprecated references
grep -r "current_margin" src/ --include="*.tsx" --include="*.ts" | grep -v "actual_margin"
grep -r "calculateMultipleProjectFinancials" src/ --include="*.tsx" --include="*.ts"
grep -r "calculateProjectFinancials" src/ --include="*.tsx" --include="*.ts"
```

---

## Troubleshooting

### Issue: TypeScript errors after KPI changes

```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id clsjdxwbsjbhjibvlqbz > src/integrations/supabase/types.ts
```

### Issue: Margins showing as 0 or null

```sql
-- Check if triggers ran
SELECT project_number, adjusted_est_margin, contracted_amount, adjusted_est_costs
FROM projects
WHERE contracted_amount > 0 AND adjusted_est_margin IS NULL;

-- Manually recalculate for a project
SELECT calculate_project_margins('project-uuid-here');
```

### Issue: View not returning new columns

```sql
-- Verify view definition
SELECT pg_get_viewdef('reporting.project_financials', true);
```

---

## Estimated Time

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Database | 30-45 min |
| Phase 2: KPIs | 20-30 min |
| Phase 3: Frontend | 1-2 hours |
| Phase 4: Validation | 30-45 min |
| **Total** | **2.5-4 hours** |

---

## Post-Cleanup Memory Update

After completing all phases, update Claude's memory with:

```
RCG Work cleanup completed:
- Margin terminology standardized: projected_margin → adjusted_est_margin
- current_margin deprecated, use actual_margin instead
- projectFinancials.ts deprecated, use database fields directly
- New KPI files created: time-entry-kpis.ts, payee-kpis.ts
- Database views updated with additional calculated fields
- gross_hours now calculated in weekly_labor_hours view
```

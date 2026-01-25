# AI Reports System Upgrade - KPI-Driven Architecture

## Overview

This document describes the upgraded AI Reports system that uses your existing KPI definitions as a "semantic layer" to make the AI assistant understand RCG Work's domain.

**Key Principle:** Your KPIGuide.tsx already contains 70+ carefully documented metrics. This upgrade connects that knowledge to the AI, ensuring it stays current automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                        │
│                                                                  │
│    src/lib/kpi-definitions/                                     │
│    ├── types.ts              # TypeScript interfaces            │
│    ├── project-kpis.ts       # Project financial metrics        │
│    ├── semantic-mappings.ts  # "profit" → actual_margin         │
│    ├── business-rules.ts     # Critical rules for AI            │
│    ├── few-shot-examples.ts  # Query examples                   │
│    ├── ai-context-generator.ts # Builds AI prompt               │
│    ├── validation.ts         # Catches issues                   │
│    └── index.ts              # Barrel export                    │
│                                                                  │
└──────────────────┬──────────────────┬───────────────────────────┘
                   │                  │
                   ▼                  ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │   KPIGuide.tsx (UI)  │  │   Edge Function (AI) │
    │   Imports from       │  │   Imports from       │
    │   kpi-definitions    │  │   kpi-definitions    │
    └──────────────────────┘  └──────────────────────┘
```

### Why This Works

1. **One Definition, Two Uses**: Edit KPIs once, both UI and AI update
2. **Auto-Current**: When you add new metrics to KPI definitions, the AI learns them
3. **Validated**: CI/CD catches duplicates, inconsistencies before deployment
4. **Semantic Layer**: Translates business language to database fields

---

## Files Created

### Core Definition Files

| File | Purpose | Lines |
|------|---------|-------|
| `types.ts` | TypeScript interfaces for all types | ~150 |
| `project-kpis.ts` | 35 project financial KPIs with rich metadata | ~350 |
| `estimate-kpis.ts` | Estimate and line item metrics | ~150 |
| `expense-kpis.ts` | Expense tracking and time entry metrics | ~120 |
| `quote-kpis.ts` | Vendor quote and bidding metrics | ~80 |
| `revenue-kpis.ts` | Invoice and revenue tracking metrics | ~100 |
| `change-order-kpis.ts` | Change order impact metrics | ~80 |
| `work-order-kpis.ts` | Work order specific metrics | ~120 |
| `deprecated-kpis.ts` | Legacy fields no longer used | ~50 |
| `semantic-mappings.ts` | Maps "profit" → actual_margin, etc. | ~200 |
| `business-rules.ts` | 15 critical rules the AI must follow | ~150 |
| `few-shot-examples.ts` | 12 real query examples | ~200 |
| `ai-context-generator.ts` | Builds system prompt from definitions | ~200 |
| `validation.ts` | Catches issues before deployment | ~250 |
| `index.ts` | Barrel export + utility functions | ~80 |

### Updated Files

| File | Changes |
|------|---------|
| `src/pages/KPIGuide.tsx` | Refactored to import from kpi-definitions library |
| `supabase/functions/ai-report-assistant/index.ts` | Complete rewrite using KPI context |
| `package.json` | Added `validate:kpis` script |
| `.github/workflows/build-and-test.yml` | New workflow with KPI validation |

---

## Key Improvements

### 1. Semantic Understanding

**Before:** AI sees `actual_margin`, `current_margin`, `projected_margin` with no context

**After:** AI knows:
```
actual_margin = total_invoiced - total_expenses (REAL profit)
current_margin = contracted_amount - total_expenses (EXPECTED profit)

When user says "profit" → use actual_margin
When user says "margin" → use current_margin
```

### 2. Business Rules Enforcement

**Before:** AI might use receipts table for financial calculations

**After:** Critical rules embedded in prompt:
- "NEVER use receipts table for financial calculations"
- "Always filter category = 'construction'"
- "Use ILIKE for name searches"
- "Time entries are in expenses table with expense_category = 'labor_internal'"

### 3. Few-Shot Examples

**Before:** AI guesses query patterns

**After:** AI has 12 real examples with corrected SQL:
```sql
-- "How many hours did John work last week?"
SELECT p.payee_name, SUM(
  CASE
    WHEN e.lunch_taken = true THEN
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
    ELSE
      (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
  END
) as total_hours
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE p.is_internal = true
  AND p.payee_name ILIKE '%john%'
  AND e.expense_category = 'labor_internal'
  AND e.expense_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.payee_name
```

### 4. Validation / Audit

Catches issues automatically:
- Duplicate KPI IDs → Error
- Inconsistent view references → Warning
- Orphaned semantic mappings → Error
- Missing required fields → Error
- Deprecated references → Warning

---

## Validation Results

See `AI_REPORTS_VALIDATION_NOTES.md` for complete validation findings.

### Key Corrections Made

1. **SQL Examples**: Updated `hours_worked` references to use proper time calculations from `start_time`/`end_time` minus lunch
2. **Semantic Mappings**: Removed references to non-existent KPIs, keeping only valid mappings
3. **Field References**: All field references validated against actual database schema

### Validation Stats
- **Total KPIs**: 139 across 8 domains
- **By Source**: Database=94, View=15, Frontend=23, Deprecated=7
- **Validation Status**: ✅ PASSED (no critical errors)

---

## Implementation Steps Completed

### Phase 1: Validation & Schema Verification ✅
- [x] Verified `reporting.project_financials` view exists with all expected columns
- [x] Confirmed `get_database_schema()` and `execute_ai_query()` functions exist
- [x] Cross-referenced all field names against actual database
- [x] Tested SQL examples and corrected time calculation formulas
- [x] Verified business rules match actual database structure

### Phase 2: Create KPI Definitions Library ✅
- [x] Created `src/lib/kpi-definitions/` directory
- [x] Copied and adapted all core files from enhancement docs
- [x] Fixed import paths for new location
- [x] Created domain-specific KPI files (estimate, expense, quote, etc.)

### Phase 3: Extract Domain KPIs ✅
- [x] Extracted `estimateKPIs` from KPIGuide.tsx (25 metrics)
- [x] Extracted `expenseKPIs` from KPIGuide.tsx (10 metrics)
- [x] Extracted `quoteKPIs` from KPIGuide.tsx (7 metrics)
- [x] Extracted `revenueKPIs` from KPIGuide.tsx (10 metrics)
- [x] Extracted `changeOrderKPIs` from KPIGuide.tsx (7 metrics)
- [x] Extracted `workOrderKPIs` from KPIGuide.tsx (13 metrics)
- [x] Created `deprecatedKPIs` from legacy references (7 metrics)

### Phase 4: Update KPIGuide.tsx ✅
- [x] Replaced inline KPI arrays with imports from kpi-definitions
- [x] Updated metadata to use version info from library
- [x] Added support for 'view' source type in UI
- [x] Maintained backward compatibility

### Phase 5: Update Edge Function ✅
- [x] Replaced edge function with KPI-aware version
- [x] Embedded KPI context for Deno compatibility
- [x] Updated examples with corrected SQL
- [x] Added version tracking

### Phase 6: Add Validation Script ✅
- [x] Added `validate:kpis` script to package.json
- [x] Created `run-validation.ts` entry point
- [x] Validation passes with no critical errors

### Phase 7: Update CI/CD ✅
- [x] Created `.github/workflows/build-and-test.yml`
- [x] Added KPI validation step to workflow
- [x] Workflow triggers on PRs and main branch pushes

### Phase 8: Documentation ✅
- [x] Moved README to `docs/AI_REPORTS_KPI_ARCHITECTURE.md`
- [x] Created `docs/AI_REPORTS_VALIDATION_NOTES.md` with validation results
- [x] Created `docs/AI_REPORTS_USAGE.md` (see below)

---

## Keeping It Current

### When Adding New KPIs

1. Add to appropriate `*-kpis.ts` file following the existing pattern
2. Include all required fields: `id`, `name`, `source`, `field`, `formula`, `dataType`, `domain`, `whereUsed`
3. Add semantic mapping if there's a business term for it
4. Run `npm run validate:kpis` to catch issues
5. Both KPIGuide and AI automatically pick it up

### When Business Rules Change

1. Update `business-rules.ts` with new/updated rules
2. Add/update few-shot examples if query patterns change
3. Redeploy edge function: `supabase functions deploy ai-report-assistant`

### Validation Catches

- Duplicate IDs → Error (blocks deployment)
- Field conflicts → Warning (review for consolidation)
- Missing semantic mappings → Info (consider adding)
- Deprecated references → Warning (update to use replacements)

---

## Testing Checklist

After implementation:

- [ ] `npm run validate:kpis` passes
- [ ] `npm run build` succeeds
- [ ] KPIGuide page loads with all 139 metrics
- [ ] Edge function deploys successfully
- [ ] AI assistant responds correctly to test queries:
  - "What's our profit this month?" → Uses `actual_margin`
  - "How many hours did John work last week?" → Uses corrected time calculation
  - "Show me projects over budget" → Uses `cost_variance > 0`
  - "What's our total revenue?" → Uses `total_invoiced`

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| AI Context | Raw schema dump | KPI-aware prompt with examples |
| Business Rules | None | 15 critical rules enforced |
| Semantic Understanding | None | 20+ concept mappings |
| Examples | None | 12 few-shot examples with correct SQL |
| Validation | None | Automated duplicate/issue detection |
| Maintenance | Manual sync | Single source of truth |
| Domains Covered | 1 (projects) | 8 (project, estimate, expense, quote, revenue, change_order, work_order, deprecated) |

**Result:** The AI now understands RCG Work's domain through a validated, single source of truth that automatically keeps both the UI and AI assistant current.
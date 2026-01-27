# Edge Function KPI Sync Guide

## Overview

This document explains how to sync KPI definitions from the frontend codebase to the AI Report Assistant edge function. The edge function cannot import TypeScript files from `src/` at runtime (Deno limitation), so we generate a static context file at build time.

## Architecture

```
┌─────────────────────────────────────────┐
│  src/lib/kpi-definitions/*.ts           │  ← Source of truth (100+ KPIs)
│  (project-kpis, expense-kpis, etc.)     │
└──────────────┬──────────────────────────┘
               │
               │  npm run sync:edge-kpis
               │  (scripts/sync-edge-kpi-context.ts)
               ▼
┌─────────────────────────────────────────┐
│  supabase/functions/ai-report-assistant/│
│  kpi-context.generated.ts               │  ← Static generated file
└──────────────┬──────────────────────────┘
               │
               │  Imported by index.ts
               ▼
┌─────────────────────────────────────────┐
│  ai-report-assistant/index.ts           │  ← Uses generated context
└─────────────────────────────────────────┘
```

## Files Involved

| File | Purpose |
|------|---------|
| `scripts/sync-edge-kpi-context.ts` | Generates the context file |
| `supabase/functions/ai-report-assistant/kpi-context.generated.ts` | Generated output (DO NOT EDIT) |
| `supabase/functions/ai-report-assistant/index.ts` | Edge function that uses the context |

## What Gets Generated

The `kpi-context.generated.ts` file contains:

1. **semanticLookup** - Maps business terms to database fields
   - Example: `"profit" → "projects.actual_margin"`

2. **kpiDefinitions** - All KPI metadata
   - Field paths, aliases, formulas, notes

3. **disambiguationGuide** - Clarifies similar terms
   - Margin types (actual vs current vs projected)
   - Date fields (expense_date vs created_at)
   - Hours (gross vs net)

4. **criticalRules** - Business rules the AI must follow
   - "Never use receipts for financial calculations"
   - "Time entries are in expenses with category='labor_internal'"

5. **fewShotExamples** - SQL query examples
   - Correct patterns for common questions

6. **benchmarks** - Healthy/warning/critical thresholds
   - Margin targets, cost variance limits

## Step-by-Step: Updating the Edge Function

### Step 1: Add npm script (one-time)

Add to `package.json` scripts:

```json
{
  "scripts": {
    "sync:edge-kpis": "tsx scripts/sync-edge-kpi-context.ts"
  }
}
```

### Step 2: Run the sync script

```bash
npm run sync:edge-kpis
```

This generates `supabase/functions/ai-report-assistant/kpi-context.generated.ts`

### Step 3: Update index.ts to use generated context

Replace the hardcoded `KPI_CONTEXT` in `index.ts` with an import:

```typescript
// At top of file
import { KPI_CONTEXT } from './kpi-context.generated.ts';

// Remove the old hardcoded KPI_CONTEXT constant
// The imported one has all the same properties plus more
```

### Step 4: Update the system prompt generation

The edge function should use the new context structure. Key changes:

```typescript
// Old way (hardcoded)
const kpiMappings = {
  'actual_margin': ['actual_margin', 'profit', 'real_profit'],
  // only 8 mappings...
};

// New way (from generated context)
const { semanticLookup, kpiDefinitions, criticalRules, disambiguationGuide } = KPI_CONTEXT;

// Build system prompt using the rich context
function buildSystemPrompt(): string {
  return `You are a financial analyst for RCG Work construction management.

## CRITICAL RULES
${criticalRules.map(r => `- ${r}`).join('\n')}

## TERM DISAMBIGUATION
${disambiguationGuide.join('\n')}

## SEMANTIC MAPPINGS
When users say these terms, use these fields:
${Object.entries(semanticLookup).slice(0, 30).map(([term, field]) => `- "${term}" → ${field}`).join('\n')}

... rest of prompt
`;
}
```

### Step 5: Deploy

```bash
supabase functions deploy ai-report-assistant
```

## When to Re-sync

Run `npm run sync:edge-kpis` whenever you:

- Add new KPIs to any `*-kpis.ts` file
- Update semantic mappings
- Change business rules
- Add/modify few-shot examples
- Update benchmarks

## CI/CD Integration (Optional)

Add to your deployment workflow:

```yaml
- name: Sync KPI Context
  run: npm run sync:edge-kpis

- name: Validate no changes (optional)
  run: git diff --exit-code supabase/functions/ai-report-assistant/kpi-context.generated.ts
```

## Troubleshooting

### "Cannot find module" errors

Make sure all imports in the sync script match your actual file structure.

### Generated file too large

The script limits few-shot examples to 15. Adjust in `buildFewShotExamples()` if needed.

### Edge function deployment fails

Check that `kpi-context.generated.ts` uses valid Deno-compatible syntax (no Node.js-specific code).

## Version Tracking

The generated file includes:
- `version` - From `KPI_DEFINITIONS_VERSION` in ai-context-generator.ts
- `generatedAt` - Timestamp of generation
- `sourceLastUpdated` - From `LAST_UPDATED` in ai-context-generator.ts

Update these in the source when making significant changes.

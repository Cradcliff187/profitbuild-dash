# AI Reporting Enhancement Implementation Guide

## Objective

Transform the AI Report Assistant from a "SQL query generator" into an **adaptive financial analyst** that:
- Provides simple, direct answers for field workers and basic lookups
- Delivers deep analytical insights for managers and strategic questions
- Automatically detects which mode is appropriate based on the question

---

## Architecture Overview

```
User Question
     │
     ▼
┌─────────────────┐
│ Intent Detection │ ← Determines SIMPLE vs ANALYTICAL mode
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
SIMPLE     ANALYTICAL
MODE       MODE
    │         │
    ▼         ▼
1 Query    1-3 Queries
Brief      CTEs, comparisons
Answer     Trends, benchmarks
    │         │
    └────┬────┘
         ▼
   Plain Language
   Response
```

---

## Implementation Steps

### Step 1: Create Business Benchmarks File

**File:** `src/lib/kpi-definitions/business-benchmarks.ts`

**Action:** Create this new file with RCG's business targets.

```typescript
/**
 * Business Benchmarks
 *
 * Centralized thresholds the AI references for contextual insights.
 * Update these as RCG's targets evolve.
 */

export interface Benchmark {
  id: string;
  metric: string;
  healthyRange: { min?: number; max?: number };
  warningThreshold?: number;
  criticalThreshold?: number;
  unit: 'percent' | 'currency' | 'days' | 'hours' | 'number';
  context: string;
  plainLanguage: {
    healthy: string;
    warning: string;
    critical: string;
  };
}

export const businessBenchmarks: Benchmark[] = [
  {
    id: 'project_margin',
    metric: 'margin_percentage',
    healthyRange: { min: 15, max: 30 },
    warningThreshold: 10,
    criticalThreshold: 5,
    unit: 'percent',
    context: 'Project margins below 15% may indicate pricing issues or scope creep',
    plainLanguage: {
      healthy: 'Margin is healthy',
      warning: 'Margin is below target - worth reviewing',
      critical: 'Margin is critically low - needs immediate attention'
    }
  },
  {
    id: 'cost_variance',
    metric: 'cost_variance_percent',
    healthyRange: { min: -5, max: 5 },
    warningThreshold: 10,
    criticalThreshold: 20,
    unit: 'percent',
    context: 'Cost variance above 10% requires investigation',
    plainLanguage: {
      healthy: 'On budget',
      warning: 'Over budget - monitor closely',
      critical: 'Significantly over budget - action required'
    }
  },
  {
    id: 'billing_progress',
    metric: 'billing_progress_percent',
    healthyRange: { min: 70, max: 100 },
    warningThreshold: 50,
    unit: 'percent',
    context: 'Projects should be >70% billed by completion',
    plainLanguage: {
      healthy: 'Billing on track',
      warning: 'Behind on billing',
      critical: 'Significantly underbilled'
    }
  },
  {
    id: 'labor_cushion_rate',
    metric: 'labor_cushion_per_hour',
    healthyRange: { min: 35, max: 50 },
    unit: 'currency',
    context: 'Target $40/hr cushion (billing $75 vs $35 actual cost)',
    plainLanguage: {
      healthy: 'Labor rates optimal',
      warning: 'Labor cushion below target',
      critical: 'Labor cushion too low'
    }
  },
  {
    id: 'contingency_usage',
    metric: 'contingency_used_percent',
    healthyRange: { min: 0, max: 50 },
    warningThreshold: 75,
    criticalThreshold: 100,
    unit: 'percent',
    context: 'Using >75% contingency early is a risk indicator',
    plainLanguage: {
      healthy: 'Contingency reserve adequate',
      warning: 'Contingency running low',
      critical: 'Contingency exhausted'
    }
  },
  {
    id: 'weekly_hours',
    metric: 'hours_per_week',
    healthyRange: { min: 35, max: 45 },
    warningThreshold: 50,
    unit: 'hours',
    context: 'Standard work week with reasonable overtime',
    plainLanguage: {
      healthy: 'Normal work hours',
      warning: 'High overtime',
      critical: 'Excessive hours - burnout risk'
    }
  }
];

export function getBenchmarkForMetric(metricId: string): Benchmark | undefined {
  return businessBenchmarks.find(b => b.id === metricId || b.metric === metricId);
}

export function evaluateMetric(
  metricId: string,
  value: number
): { status: 'healthy' | 'warning' | 'critical' | 'unknown'; message: string } {
  const benchmark = getBenchmarkForMetric(metricId);
  if (!benchmark) return { status: 'unknown', message: '' };

  if (benchmark.criticalThreshold !== undefined && Math.abs(value) >= benchmark.criticalThreshold) {
    return { status: 'critical', message: benchmark.plainLanguage.critical };
  }
  if (benchmark.warningThreshold !== undefined && Math.abs(value) >= benchmark.warningThreshold) {
    return { status: 'warning', message: benchmark.plainLanguage.warning };
  }
  if (benchmark.healthyRange.min !== undefined && value < benchmark.healthyRange.min) {
    return { status: 'warning', message: benchmark.plainLanguage.warning };
  }
  return { status: 'healthy', message: benchmark.plainLanguage.healthy };
}

export function getBenchmarksForPrompt(): string {
  return businessBenchmarks
    .map(b => `- ${b.id}: ${b.healthyRange.min ?? 'n/a'}-${b.healthyRange.max ?? 'n/a'}${b.unit === 'percent' ? '%' : ''} (${b.context})`)
    .join('\n');
}

export default businessBenchmarks;
```

---

### Step 2: Update Index Exports

**File:** `src/lib/kpi-definitions/index.ts`

**Action:** Add exports for the new benchmarks file.

Add these lines:

```typescript
// Business Benchmarks
export {
  businessBenchmarks,
  getBenchmarkForMetric,
  evaluateMetric,
  getBenchmarksForPrompt,
} from './business-benchmarks';
export type { Benchmark } from './business-benchmarks';
```

---

### Step 3: Update AI Context Generator

**File:** `src/lib/kpi-definitions/ai-context-generator.ts`

**Action:** Replace the `generateSystemPrompt` function with the adaptive version below.

```typescript
import { getBenchmarksForPrompt } from './business-benchmarks';

// Update version
export const KPI_DEFINITIONS_VERSION = '3.0.0';
export const LAST_UPDATED = '2026-01-25';

/**
 * Generate the system prompt for AI Report Assistant
 * This version includes adaptive intelligence for different user types
 */
export function generateSystemPrompt(dbSchema?: string): string {
  const criticalRules = businessRules
    .filter(r => r.severity === 'critical')
    .map(r => `- ${r.rule}`)
    .join('\n');

  const benchmarksSection = getBenchmarksForPrompt();
  const marginSection = generateMarginSection();
  const examplesSection = generateExamplesSection();

  return `You are a financial analyst for RCG Work, a construction project management system.
Your job is to help users understand their business - from field workers checking hours to owners reviewing portfolio health.

## ADAPTIVE RESPONSE MODE

**Detect the question type and respond appropriately:**

### SIMPLE MODE
**Triggers:** "my hours", "my time", "show me", "list", single project lookup, single person lookup, "what is", "how many"
**Behavior:**
- Answer directly in 1-2 sentences
- One query only
- No unsolicited comparisons or analysis
- Plain, conversational language

**Example:**
Q: "How many hours did I work this week?"
A: "You worked 42.5 hours this week across 3 projects."

Q: "What's the margin on Smith Kitchen?"
A: "Smith Kitchen is at 18% margin with $12,400 profit so far. That's healthy."

### ANALYTICAL MODE
**Triggers:** "how are we doing", "analyze", "compare", "trends", "health check", "worried about", "portfolio", "performance", "any problems", "overview"
**Behavior:**
- Think like a CFO's analyst
- Use CTEs for multi-step analysis when valuable
- Compare to previous periods when relevant
- Reference benchmarks
- Proactively flag anomalies and concerns
- Still use plain language - no jargon

**Example:**
Q: "How are we doing this month?"
A: "Strong month - profit is $45,230, up 12% from last month. Average margin across 8 projects is 22%. One concern: the Oak Street project dropped to 8% margin, below our 15% target."

## LANGUAGE RULES (ALWAYS APPLY)

**Say this → Not this:**
- "over budget" → "positive cost variance"
- "under budget" → "negative cost variance"  
- "profit" or "margin" → "actual margin"
- "left to bill" → "revenue variance"
- "expected profit" → "current margin"
- "$45,230" → "$45,230.47" (round to whole dollars unless asked)

**Response structure:**
1. Lead with the answer
2. Add context if it helps (mode-dependent)
3. Flag concerns if relevant (analytical mode)
4. Keep it conversational

## CRITICAL DATA RULES

${criticalRules}

## MARGIN TYPES (Know the difference)

| Field | Formula | Use When |
|-------|---------|----------|
| actual_margin | total_invoiced - total_expenses | User asks about REAL/ACTUAL/TRUE profit |
| current_margin | contracted_amount - total_expenses | User asks about EXPECTED profit |
| projected_margin | contracted_amount - adjusted_est_costs | User asks about FORECAST |
| margin_percentage | (contracted - expenses) / contracted × 100 | User asks for percentage |

## BUSINESS BENCHMARKS (RCG Targets)

${benchmarksSection}

Use these to provide context like "that's healthy" or "below target" - but only in analytical mode or when the value is concerning.

## ENTITY LOOKUPS

- **Employees:** \`payees WHERE is_internal = true\`
- **Vendors:** \`payees WHERE payee_type = 'vendor' AND is_internal = false\`
- **Subcontractors:** \`payees WHERE payee_type = 'subcontractor' AND is_internal = false\`
- **Time entries:** \`expenses WHERE expense_category = 'labor_internal'\`

## NAME MATCHING

ALWAYS use \`ILIKE '%name%'\` for name searches. Handle nicknames:
- Johnny, John, Jonathan → \`ILIKE '%john%'\`
- Mike, Michael → \`ILIKE '%mik%'\` or \`ILIKE '%michael%'\`
- Bob, Robert → \`ILIKE '%bob%'\` OR \`ILIKE '%robert%'\`

## TIME CALCULATIONS

Hours are calculated from start_time/end_time, accounting for lunch:
\`\`\`sql
CASE 
  WHEN lunch_taken = true THEN
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) - (lunch_duration_minutes / 60.0)
  ELSE
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)
END as net_hours
\`\`\`

${examplesSection}

${dbSchema ? `## DATABASE SCHEMA\n\n${dbSchema}` : ''}

## FINAL REMINDER

Read the question carefully. A field worker asking "my hours?" wants a quick number. An owner asking "how's the portfolio?" wants analysis. Match your response depth to their need.

Today's date: ${new Date().toISOString().split('T')[0]}`;
}
```

---

### Step 4: Update Few-Shot Examples

**File:** `src/lib/kpi-definitions/few-shot-examples.ts`

**Action:** Add new examples that demonstrate both simple and analytical response patterns. Add these to the existing array:

```typescript
// Add responseMode field to FewShotExample type in types.ts first:
// responseMode?: 'simple' | 'analytical';

// ============================================================================
// SIMPLE MODE EXAMPLES - Teach AI when to be brief
// ============================================================================
{
  question: "How many hours did I work this week?",
  reasoning: "Personal time lookup. Simple mode - just give them their hours.",
  sql: `SELECT 
  SUM(
    CASE 
      WHEN e.lunch_taken = true THEN
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
      ELSE
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
    END
  ) as total_hours,
  COUNT(DISTINCT e.project_id) as projects_worked
FROM expenses e
WHERE e.expense_category = 'labor_internal'
  AND e.expense_date >= DATE_TRUNC('week', CURRENT_DATE)`,
  kpisUsed: [],
  category: 'lookup',
  responseMode: 'simple'
},
{
  question: "What's the margin on the Smith project?",
  reasoning: "Single project metric. Simple mode with brief context.",
  sql: `SELECT 
  project_name,
  margin_percentage,
  actual_margin,
  CASE 
    WHEN margin_percentage >= 15 THEN 'healthy'
    WHEN margin_percentage >= 10 THEN 'watch'
    ELSE 'concern'
  END as status
FROM reporting.project_financials
WHERE project_name ILIKE '%smith%'
  AND category = 'construction'`,
  kpisUsed: ['margin_percentage', 'actual_margin'],
  category: 'lookup',
  responseMode: 'simple'
},
{
  question: "Show me today's time entries",
  reasoning: "List request. Simple mode - return the data, minimal commentary.",
  sql: `SELECT 
  p.payee_name as employee,
  pr.project_name,
  e.start_time,
  e.end_time,
  CASE 
    WHEN e.lunch_taken = true THEN
      ROUND((EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0), 1)
    ELSE
      ROUND((EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600), 1)
  END as hours
FROM expenses e
JOIN payees p ON e.payee_id = p.id
JOIN projects pr ON e.project_id = pr.id
WHERE e.expense_category = 'labor_internal'
  AND e.expense_date = CURRENT_DATE
ORDER BY e.start_time`,
  kpisUsed: [],
  category: 'lookup',
  responseMode: 'simple'
},

// ============================================================================
// ANALYTICAL MODE EXAMPLES - Teach AI when to go deep
// ============================================================================
{
  question: "How are we doing this month?",
  reasoning: "Portfolio health question. Analytical mode - compare to last month, identify concerns, provide context.",
  sql: `WITH current_month AS (
  SELECT 
    SUM(actual_margin) as total_profit,
    COUNT(*) as project_count,
    AVG(margin_percentage) as avg_margin,
    COUNT(*) FILTER (WHERE margin_percentage < 15) as low_margin_count,
    COUNT(*) FILTER (WHERE cost_variance_percent > 10) as over_budget_count
  FROM reporting.project_financials
  WHERE category = 'construction'
    AND status IN ('in_progress', 'approved', 'complete')
    AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)
),
last_month AS (
  SELECT SUM(actual_margin) as total_profit
  FROM reporting.project_financials
  WHERE category = 'construction'
    AND updated_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND updated_at < DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
  cm.*,
  lm.total_profit as last_month_profit,
  ROUND(((cm.total_profit - lm.total_profit) / NULLIF(lm.total_profit, 0) * 100)::numeric, 1) as month_over_month_pct
FROM current_month cm, last_month lm`,
  kpisUsed: ['actual_margin', 'margin_percentage', 'cost_variance_percent'],
  category: 'aggregation',
  responseMode: 'analytical'
},
{
  question: "Any projects I should be worried about?",
  reasoning: "Risk identification. Analytical mode - find problems proactively.",
  sql: `SELECT 
  project_number,
  project_name,
  margin_percentage,
  cost_variance_percent,
  contingency_remaining,
  CASE 
    WHEN margin_percentage < 10 THEN 'Low margin'
    WHEN cost_variance_percent > 15 THEN 'Over budget'
    WHEN contingency_remaining <= 0 THEN 'Contingency exhausted'
    WHEN contingency_used > contingency_amount * 0.75 THEN 'Contingency running low'
  END as concern
FROM reporting.project_financials
WHERE category = 'construction'
  AND status IN ('in_progress', 'approved')
  AND (
    margin_percentage < 10 
    OR cost_variance_percent > 15 
    OR contingency_remaining <= 0
    OR contingency_used > contingency_amount * 0.75
  )
ORDER BY 
  CASE 
    WHEN margin_percentage < 5 THEN 1
    WHEN cost_variance_percent > 20 THEN 2
    ELSE 3
  END`,
  kpisUsed: ['margin_percentage', 'cost_variance_percent', 'contingency_remaining'],
  category: 'filtering',
  responseMode: 'analytical'
},
{
  question: "Compare this month's revenue to last month",
  reasoning: "Explicit comparison request. Analytical mode with period-over-period analysis.",
  sql: `WITH monthly_revenue AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(amount) as total_revenue,
    COUNT(*) as invoice_count
  FROM project_revenues
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  GROUP BY DATE_TRUNC('month', created_at)
)
SELECT 
  TO_CHAR(month, 'Month YYYY') as period,
  total_revenue,
  invoice_count,
  total_revenue - LAG(total_revenue) OVER (ORDER BY month) as change_amount,
  ROUND(((total_revenue - LAG(total_revenue) OVER (ORDER BY month)) / 
    NULLIF(LAG(total_revenue) OVER (ORDER BY month), 0) * 100)::numeric, 1) as change_pct
FROM monthly_revenue
ORDER BY month DESC`,
  kpisUsed: ['total_invoiced'],
  category: 'comparison',
  responseMode: 'analytical'
},
{
  question: "Who are our top performers this quarter?",
  reasoning: "Performance ranking. Analytical mode with context on what makes them top.",
  sql: `SELECT 
  p.payee_name as employee,
  COUNT(DISTINCT e.project_id) as projects_worked,
  ROUND(SUM(
    CASE 
      WHEN e.lunch_taken = true THEN
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
      ELSE
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
    END
  )::numeric, 1) as total_hours,
  ROUND(SUM(e.amount)::numeric, 2) as total_billed
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE p.is_internal = true
  AND e.expense_category = 'labor_internal'
  AND e.expense_date >= DATE_TRUNC('quarter', CURRENT_DATE)
GROUP BY p.id, p.payee_name
ORDER BY total_hours DESC
LIMIT 10`,
  kpisUsed: [],
  category: 'aggregation',
  responseMode: 'analytical'
}
```

---

### Step 5: Update Types (if needed)

**File:** `src/lib/kpi-definitions/types.ts`

**Action:** Add `responseMode` to the `FewShotExample` interface if not already present:

```typescript
export interface FewShotExample {
  question: string;
  reasoning: string;
  sql: string;
  kpisUsed: string[];
  category: 'aggregation' | 'filtering' | 'comparison' | 'time_based' | 'lookup';
  responseMode?: 'simple' | 'analytical';
}
```

---

### Step 6: Update Edge Function

**File:** `supabase/functions/ai-report-assistant/index.ts`

**Action:** Update the embedded KPI_CONTEXT with the new system prompt. Find the `KPI_CONTEXT` constant and replace the `criticalRules` and system prompt generation section.

Key changes:

1. **Update the version:**
```typescript
const KPI_CONTEXT = {
  version: '3.0.0',
  // ... rest
};
```

2. **Add benchmarks to the context:**
```typescript
benchmarks: {
  project_margin: { healthy: '15-25%', warning: '<10%', critical: '<5%' },
  cost_variance: { healthy: '±5%', warning: '>10%', critical: '>20%' },
  contingency_usage: { healthy: '<50%', warning: '>75%', critical: '100%' },
},
```

3. **Update the system prompt generation** to include the adaptive mode instructions from Step 3.

4. **Add intent detection helper:**
```typescript
function detectQueryIntent(query: string): 'simple' | 'analytical' {
  const analyticalTriggers = [
    'how are we', 'analyze', 'analysis', 'compare', 'comparison',
    'trend', 'health', 'portfolio', 'overview', 'performance',
    'worried', 'concern', 'problem', 'issue', 'risk',
    'this month vs', 'last month', 'this week vs', 'quarter'
  ];
  
  const simpleTriggers = [
    'my hours', 'my time', 'show me', 'list', 'what is the',
    'how many', 'how much did', 'when did'
  ];
  
  const lowerQuery = query.toLowerCase();
  
  // Check for explicit analytical triggers
  if (analyticalTriggers.some(t => lowerQuery.includes(t))) {
    return 'analytical';
  }
  
  // Check for simple triggers
  if (simpleTriggers.some(t => lowerQuery.includes(t))) {
    return 'simple';
  }
  
  // Default based on query length/complexity
  return query.split(' ').length > 8 ? 'analytical' : 'simple';
}
```

5. **Use intent in response generation:**
```typescript
const queryIntent = detectQueryIntent(query);
const showDetailsByDefault = queryIntent === 'analytical' || wantsDetailedData(query);
```

---

### Step 7: Run Validation

**Command:** `npm run validate:kpis`

Ensure no errors before deployment.

---

### Step 8: Deploy Edge Function

**Command:** `supabase functions deploy ai-report-assistant`

---

### Step 9: Test Both Modes

**Simple Mode Tests:**
- "How many hours did John work this week?"
- "What's the margin on the Smith project?"
- "Show me today's expenses"
- "List all active projects"

**Expected:** Brief, direct answers without unsolicited analysis.

**Analytical Mode Tests:**
- "How are we doing this month?"
- "Any projects I should be worried about?"
- "Compare revenue this month vs last month"
- "Give me a portfolio health check"

**Expected:** Comparisons, trends, benchmark references, proactive insights.

---

## Validation Checklist

- [ ] `business-benchmarks.ts` created and exports work
- [ ] `index.ts` exports updated
- [ ] `ai-context-generator.ts` updated with adaptive prompt
- [ ] `few-shot-examples.ts` has both simple and analytical examples
- [ ] `types.ts` has responseMode field (if not already)
- [ ] `npm run validate:kpis` passes
- [ ] `npm run build` succeeds
- [ ] Edge function deployed
- [ ] Simple queries return brief responses
- [ ] Analytical queries return insightful responses

---

## Rollback Plan

If issues occur:

1. Revert `ai-context-generator.ts` to version 2.0.0
2. Remove `business-benchmarks.ts` import from `index.ts`
3. Redeploy edge function: `supabase functions deploy ai-report-assistant`

The changes are additive - existing functionality should not break.

---

## Success Criteria

✅ Field worker asks "my hours" → Gets "You worked 42.5 hours this week."

✅ PM asks "how's Smith Kitchen?" → Gets margin + brief context

✅ Owner asks "how are we doing?" → Gets profit trend, benchmark comparison, flagged concerns

✅ Anyone asks "any problems?" → Gets prioritized list of at-risk projects

✅ All existing queries continue to work

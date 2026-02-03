/**
 * AI Context Generator
 *
 * Generates the system prompt for the AI Report Assistant by combining:
 * - KPI definitions organized by domain
 * - Semantic mappings (business terms → fields)
 * - Business rules
 * - Few-shot examples
 *
 * This is the core "translator" that makes the AI understand RCG's domain.
 */

import { KPIMeasure, SemanticMapping, BusinessRule, FewShotExample, AIKPIContext } from './types';
import { projectFinancialKPIs } from './project-kpis';
import { estimateKPIs } from './estimate-kpis';
import { expenseKPIs } from './expense-kpis';
import { quoteKPIs } from './quote-kpis';
import { revenueKPIs } from './revenue-kpis';
import { changeOrderKPIs } from './change-order-kpis';
import { workOrderKPIs } from './work-order-kpis';
import { deprecatedKPIs } from './deprecated-kpis';
import { semanticMappings } from './semantic-mappings';
import { businessRules } from './business-rules';
import { fewShotExamples } from './few-shot-examples';
import { getBenchmarksForPrompt } from './business-benchmarks';

// Version tracking for cache invalidation
export const KPI_DEFINITIONS_VERSION = '3.1.0';
export const LAST_UPDATED = '2026-02-03';

/**
 * Generate the complete AI context object
 */
export function generateAIContext(): AIKPIContext {
  return {
    kpisByDomain: {
      project: projectFinancialKPIs,
      estimate: estimateKPIs,
      quote: quoteKPIs,
      expense: expenseKPIs,
      revenue: revenueKPIs,
      change_order: changeOrderKPIs,
      work_order: workOrderKPIs,
      time_entry: [], // TODO: Add time entry KPIs if needed
      payee: [], // TODO: Add payee KPIs if needed
      training: [], // TODO: Add training KPIs if needed
      deprecated: deprecatedKPIs,
    },
    semanticMappings,
    businessRules,
    preferredSources: {
      'project financials': 'reporting.project_financials',
      'time entries': "expenses WHERE category = 'labor_internal'",
      'employees': 'payees WHERE is_internal = true',
      'vendors': "payees WHERE payee_type = 'vendor' AND is_internal = false",
      'subcontractors': "payees WHERE payee_type = 'subcontractor' AND is_internal = false",
    },
    generatedAt: new Date().toISOString(),
    version: KPI_DEFINITIONS_VERSION,
  };
}

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
  const semanticSection = generateSemanticSection();
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

${marginSection}

${semanticSection}

## BUSINESS BENCHMARKS (RCG Targets)

${benchmarksSection}

Use these to provide context like "that's healthy" or "below target" - but only in analytical mode or when the value is concerning.

## ENTITY LOOKUPS

- **Employees:** \`payees WHERE is_internal = true\`
- **Vendors:** \`payees WHERE payee_type = 'vendor' AND is_internal = false\`
- **Subcontractors:** \`payees WHERE payee_type = 'subcontractor' AND is_internal = false\`
- **Time entries:** \`expenses WHERE category = 'labor_internal'\`

## NAME MATCHING

ALWAYS use \`ILIKE '%name%'\` for name searches. Handle nicknames:
- Johnny, John, Jonathan → \`ILIKE '%john%'\`
- Mike, Michael → \`ILIKE '%mik%'\` or \`ILIKE '%michael%'\`
- Bob, Robert → \`ILIKE '%bob%'\` OR \`ILIKE '%robert%'\`

## TIME CALCULATIONS

Time entries track both gross and net hours:

**Gross Hours (Total Shift Duration):**
\`\`\`sql
EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 as gross_hours
\`\`\`

**Net Hours (Billable Hours after Lunch):**
\`\`\`sql
CASE 
  WHEN lunch_taken = true THEN
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) - (lunch_duration_minutes / 60.0)
  ELSE
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)
END as net_hours
\`\`\`

**Database Fields:**
- \`expenses.hours\` = net/billable hours (use for payroll, billing)
- \`expenses.gross_hours\` = total shift duration (use for compliance, shift tracking)
- \`expenses.lunch_taken\` = boolean
- \`expenses.lunch_duration_minutes\` = integer (15-120)

**When to use which:**
- "How many hours did X work?" → Use net hours (billable)
- "What was X's shift length?" → Use gross hours (total duration)
- "Show me overtime" → Use gross hours (>8 hours gross may indicate OT eligibility)

${examplesSection}

${dbSchema ? `## DATABASE SCHEMA\n\n${dbSchema}` : ''}

## FINAL REMINDER

Read the question carefully. A field worker asking "my hours?" wants a quick number. An owner asking "how's the portfolio?" wants analysis. Match your response depth to their need.

Today's date: ${new Date().toISOString().split('T')[0]}`;
}

/**
 * Generate the margin explanation section
 */
function generateMarginSection(): string {
  return `## MARGIN TERMINOLOGY (CRITICAL)
Understanding RCG's different margin metrics:

| Metric | Formula | When to Use |
|--------|---------|-------------|
| **actual_margin** | total_invoiced - total_expenses | User asks about REAL/ACTUAL/TRUE profit |
| **current_margin** | contracted_amount - total_expenses | User asks about EXPECTED profit (default) |
| **projected_margin** | contracted_amount - adjusted_est_costs | User asks about FORECAST profit |
| **original_margin** | contracted_amount - original_est_costs | User asks about BASELINE comparison |

**Key insight:** "profit" usually means actual_margin (real money made), while "margin" usually means current_margin (expected based on contract).`;
}

/**
 * Generate semantic mappings section
 */
function generateSemanticSection(): string {
  const keyMappings = semanticMappings
    .filter(m => ['profit', 'margin', 'revenue', 'costs', 'employee', 'vendor'].includes(m.concept))
    .map(m => {
      const aliases = m.aliases.slice(0, 3).join(', ');
      return `- **${m.concept}** (${aliases}): Use \`${m.defaultKpiId ?? 'see disambiguation'}\``;
    })
    .join('\n');

  return `## BUSINESS TERM MAPPINGS
When users say these terms, use these fields:

${keyMappings}

**Entity lookups:**
- "employee/worker/staff" → payees WHERE is_internal = true
- "vendor/supplier" → payees WHERE payee_type = 'vendor' AND is_internal = false
- "subcontractor/sub" → payees WHERE payee_type = 'subcontractor'`;
}

/**
 * Generate few-shot examples section
 */
function generateExamplesSection(): string {
  // Pick diverse examples
  const selectedExamples = fewShotExamples.slice(0, 6);

  const formatted = selectedExamples
    .map(ex => `**Q:** "${ex.question}"
**Reasoning:** ${ex.reasoning}
**SQL:**
\`\`\`sql
${ex.sql}
\`\`\``)
    .join('\n\n');

  return `## EXAMPLES

${formatted}`;
}

/**
 * Generate KPI quick reference
 */
function generateKPIReference(): string {
  const financialKPIs = projectFinancialKPIs
    .filter(k => k.source === 'database' || k.source === 'view')
    .filter(k => ['contracted_amount', 'total_invoiced', 'actual_margin', 'current_margin',
                  'total_expenses', 'cost_variance', 'contingency_remaining'].includes(k.id))
    .map(k => `- **${k.name}** (\`${k.field}\`): ${k.notes || k.formula}`)
    .join('\n');

  return `## KEY METRICS QUICK REFERENCE
${financialKPIs}`;
}

/**
 * Generate a compact version for token-limited contexts
 */
export function generateCompactPrompt(): string {
  return `You are a SQL expert for RCG Work construction management.

CRITICAL RULES:
- Use reporting.project_financials view (not raw projects table)
- Filter: WHERE category = 'construction' (excludes internal projects)
- NEVER use receipts table (documentation only, not financial data)
- Time entries: expenses WHERE category = 'labor_internal'
- Employees: payees WHERE is_internal = true
- Use ILIKE '%name%' for fuzzy name matching

MARGIN TYPES:
- actual_margin = invoiced - expenses (REAL profit)
- current_margin = contracted - expenses (EXPECTED profit)

KEY FIELDS:
- contracted_amount: Contract value with client
- total_invoiced: Actual revenue received
- total_expenses: Actual costs incurred
- cost_variance: expenses - estimated (positive = over budget)

Today is ${new Date().toISOString().split('T')[0]}`;
}

export default {
  generateAIContext,
  generateSystemPrompt,
  generateCompactPrompt,
  KPI_DEFINITIONS_VERSION,
  LAST_UPDATED,
};
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

// Version tracking for cache invalidation
export const KPI_DEFINITIONS_VERSION = '2.0.0';
export const LAST_UPDATED = '2026-01-23';

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
      'time entries': "expenses WHERE expense_category = 'labor_internal'",
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
 * This is what gets sent to the LLM along with the database schema
 */
export function generateSystemPrompt(dbSchema?: string): string {
  const criticalRules = businessRules
    .filter(r => r.severity === 'critical')
    .map(r => `- ${r.rule}`)
    .join('\n');

  const importantRules = businessRules
    .filter(r => r.severity === 'important')
    .map(r => `- ${r.rule}`)
    .join('\n');

  const marginSection = generateMarginSection();
  const semanticSection = generateSemanticSection();
  const examplesSection = generateExamplesSection();
  const kpiReference = generateKPIReference();

  return `You are a SQL expert for RCG Work, a construction project management system.

## YOUR ROLE
Generate precise PostgreSQL SELECT queries to answer questions about projects, expenses, time tracking, and financials.

## ⚠️ CRITICAL RULES (NEVER VIOLATE)
${criticalRules}

## IMPORTANT RULES
${importantRules}

${marginSection}

${semanticSection}

${kpiReference}

${examplesSection}

${dbSchema ? `## DATABASE SCHEMA\n${dbSchema}` : ''}

## QUERY GUIDELINES
1. Always use ILIKE with wildcards for name searches (names may vary)
2. Always filter by category = 'construction' unless specifically asked otherwise
3. Use the reporting.project_financials view for project queries (handles splits correctly)
4. Time entries are in expenses table with expense_category = 'labor_internal'
5. Include helpful column aliases in SELECT for clarity
6. If a query returns 0 rows, suggest alternative searches

Today is ${new Date().toISOString().split('T')[0]}
`;
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
      return `- **${m.concept}** (${aliases}): Use \`${m.defaultKpiId || m.disambiguation?.[''] || 'see disambiguation'}\``;
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
- Time entries: expenses WHERE expense_category = 'labor_internal'
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
/**
 * Sync Edge Function KPI Context
 *
 * This script reads all KPI definitions from src/lib/kpi-definitions/ and generates
 * a static TypeScript file that can be imported by the edge function.
 *
 * Usage: npx tsx scripts/sync-edge-kpi-context.ts
 *
 * This solves the problem of Deno edge functions not being able to import from
 * the frontend codebase at runtime. Instead, we generate the context at build time.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import all KPI definitions
import { projectFinancialKPIs } from '../src/lib/kpi-definitions/project-kpis';
import { estimateKPIs } from '../src/lib/kpi-definitions/estimate-kpis';
import { expenseKPIs } from '../src/lib/kpi-definitions/expense-kpis';
import { quoteKPIs } from '../src/lib/kpi-definitions/quote-kpis';
import { revenueKPIs } from '../src/lib/kpi-definitions/revenue-kpis';
import { changeOrderKPIs } from '../src/lib/kpi-definitions/change-order-kpis';
import { workOrderKPIs } from '../src/lib/kpi-definitions/work-order-kpis';
import { viewKPIs } from '../src/lib/kpi-definitions/view-kpis';
import { timeEntryKPIs } from '../src/lib/kpi-definitions/time-entry-kpis';
import { payeeKPIs } from '../src/lib/kpi-definitions/payee-kpis';
import { deprecatedKPIs } from '../src/lib/kpi-definitions/deprecated-kpis';
import { semanticMappings } from '../src/lib/kpi-definitions/semantic-mappings';
import { businessRules } from '../src/lib/kpi-definitions/business-rules';
import { fewShotExamples } from '../src/lib/kpi-definitions/few-shot-examples';
import { businessBenchmarks } from '../src/lib/kpi-definitions/business-benchmarks';
import { KPI_DEFINITIONS_VERSION, LAST_UPDATED } from '../src/lib/kpi-definitions/ai-context-generator';

// Collect all KPIs
const allKPIs = [
  ...projectFinancialKPIs,
  ...estimateKPIs,
  ...expenseKPIs,
  ...quoteKPIs,
  ...revenueKPIs,
  ...changeOrderKPIs,
  ...workOrderKPIs,
  ...viewKPIs,
  ...timeEntryKPIs,
  ...payeeKPIs,
  ...deprecatedKPIs,
];

// Build semantic lookup map (concept/alias -> default KPI field)
function buildSemanticLookup(): Record<string, string> {
  const lookup: Record<string, string> = {};

  for (const mapping of semanticMappings) {
    const defaultKpi = allKPIs.find(k => k.id === mapping.defaultKpiId);
    const targetField = defaultKpi?.field || mapping.defaultKpiId;

    // Add concept
    lookup[mapping.concept.toLowerCase()] = targetField;

    // Add aliases
    for (const alias of mapping.aliases) {
      lookup[alias.toLowerCase()] = targetField;
    }
  }

  return lookup;
}

// Build KPI field lookup (id/alias -> field)
function buildKPIFieldLookup(): Record<string, { field: string; aliases: string[]; formula: string; notes?: string }> {
  const lookup: Record<string, { field: string; aliases: string[]; formula: string; notes?: string }> = {};

  for (const kpi of allKPIs) {
    lookup[kpi.id] = {
      field: kpi.field,
      aliases: kpi.aliases || [],
      formula: kpi.formula,
      notes: kpi.notes,
    };
  }

  return lookup;
}

// Build disambiguation guide
function buildDisambiguationGuide(): string[] {
  const guides: string[] = [];

  // Margin disambiguation
  guides.push('MARGIN DISAMBIGUATION:');
  guides.push('- "profit", "real profit", "actual profit" → actual_margin (total_invoiced - total_expenses)');
  guides.push('- "margin", "expected margin", "projected margin", "forecast" → adjusted_est_margin (contracted_amount - adjusted_est_costs)');
  guides.push('- "original margin", "baseline" → original_margin (contracted_amount - original_est_costs)');
  guides.push('');

  // Date field disambiguation
  guides.push('DATE FIELD DISAMBIGUATION:');
  guides.push('- "when did they work", "work date", "last week hours" → expense_date (business date)');
  guides.push('- "when was this entered", "record created" → created_at (audit timestamp)');
  guides.push('- "when submitted", "pending duration" → submitted_for_approval_at');
  guides.push('- "when approved", "approval date" → approved_at');
  guides.push('');

  // Hours disambiguation
  guides.push('HOURS DISAMBIGUATION:');
  guides.push('- "hours worked", "billable hours" → net hours (gross - lunch)');
  guides.push('- "shift length", "total time", "overtime check" → gross hours (end_time - start_time)');
  guides.push('');

  // Revenue disambiguation
  guides.push('REVENUE DISAMBIGUATION:');
  guides.push('- "revenue", "billed", "collected" → total_invoiced (actual received)');
  guides.push('- "contract value", "deal size" → contracted_amount (expected)');
  guides.push('- "remaining to bill", "unbilled" → revenue_variance (contracted - invoiced)');

  return guides;
}

// Build critical rules list
function buildCriticalRules(): string[] {
  return businessRules
    .filter(r => r.severity === 'critical' || r.severity === 'important')
    .map(r => r.rule);
}

// Build few-shot examples (simplified for context size)
function buildFewShotExamples(): Array<{ question: string; reasoning: string; sql: string }> {
  return fewShotExamples.slice(0, 15).map(ex => ({
    question: ex.question,
    reasoning: ex.reasoning,
    sql: ex.sql,
  }));
}

// Build benchmarks
function buildBenchmarks(): Record<string, { healthy: string; warning: string; critical?: string }> {
  const benchmarks: Record<string, { healthy: string; warning: string; critical?: string }> = {};

  for (const b of businessBenchmarks) {
    const unit = b.unit === 'percent' ? '%' : '';
    benchmarks[b.id] = {
      healthy: `${b.healthyRange.min ?? 'n/a'}-${b.healthyRange.max ?? 'n/a'}${unit}`,
      warning: b.warningThreshold ? `>${b.warningThreshold}${unit}` : 'n/a',
      critical: b.criticalThreshold ? `>${b.criticalThreshold}${unit}` : undefined,
    };
  }

  return benchmarks;
}

// Generate the output file content
function generateOutputFile(): string {
  const generatedAt = new Date().toISOString();
  const semanticLookup = buildSemanticLookup();
  const kpiFieldLookup = buildKPIFieldLookup();
  const disambiguationGuide = buildDisambiguationGuide();
  const criticalRules = buildCriticalRules();
  const examples = buildFewShotExamples();
  const benchmarks = buildBenchmarks();

  // Count KPIs by domain
  const kpiCounts = {
    project: projectFinancialKPIs.length,
    estimate: estimateKPIs.length,
    expense: expenseKPIs.length,
    quote: quoteKPIs.length,
    revenue: revenueKPIs.length,
    change_order: changeOrderKPIs.length,
    work_order: workOrderKPIs.length,
    view: viewKPIs.length,
    time_entry: timeEntryKPIs.length,
    payee: payeeKPIs.length,
    deprecated: deprecatedKPIs.length,
    total: allKPIs.length,
  };

  return `/**
 * AUTO-GENERATED KPI CONTEXT FOR EDGE FUNCTION
 *
 * DO NOT EDIT THIS FILE MANUALLY!
 *
 * Generated by: scripts/sync-edge-kpi-context.ts
 * Generated at: ${generatedAt}
 * Source version: ${KPI_DEFINITIONS_VERSION}
 * Source last updated: ${LAST_UPDATED}
 *
 * To regenerate, run: npx tsx scripts/sync-edge-kpi-context.ts
 *
 * KPI Counts:
 * - Project: ${kpiCounts.project}
 * - Estimate: ${kpiCounts.estimate}
 * - Expense: ${kpiCounts.expense}
 * - Quote: ${kpiCounts.quote}
 * - Revenue: ${kpiCounts.revenue}
 * - Change Order: ${kpiCounts.change_order}
 * - Work Order: ${kpiCounts.work_order}
 * - View: ${kpiCounts.view}
 * - Time Entry: ${kpiCounts.time_entry}
 * - Payee: ${kpiCounts.payee}
 * - Deprecated: ${kpiCounts.deprecated}
 * - TOTAL: ${kpiCounts.total}
 */

export const KPI_CONTEXT = {
  version: '${KPI_DEFINITIONS_VERSION}',
  generatedAt: '${generatedAt}',
  sourceLastUpdated: '${LAST_UPDATED}',

  // Semantic lookup: business term -> database field
  semanticLookup: ${JSON.stringify(semanticLookup, null, 2)},

  // KPI definitions with aliases and formulas
  kpiDefinitions: ${JSON.stringify(kpiFieldLookup, null, 2)},

  // Disambiguation guide for commonly confused terms
  disambiguationGuide: ${JSON.stringify(disambiguationGuide, null, 2)},

  // Critical business rules the AI must follow
  criticalRules: ${JSON.stringify(criticalRules, null, 2)},

  // Few-shot examples for query generation
  fewShotExamples: ${JSON.stringify(examples, null, 2)},

  // Business benchmarks for contextual insights
  benchmarks: ${JSON.stringify(benchmarks, null, 2)},

  // Preferred data sources
  preferredSources: {
    'project financials': 'reporting.project_financials',
    'time entries': "expenses WHERE category = 'labor_internal'",
    'employees': 'payees WHERE is_internal = true',
    'vendors': "payees WHERE payee_type = 'vendor' AND is_internal = false",
    'subcontractors': "payees WHERE payee_type = 'subcontractor' AND is_internal = false",
  },
} as const;

export type KPIContext = typeof KPI_CONTEXT;
`;
}

// Main execution
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  KPI Context Sync Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Generate content
  console.log('📊 Reading KPI definitions...');
  console.log(`   - Project KPIs: ${projectFinancialKPIs.length}`);
  console.log(`   - Estimate KPIs: ${estimateKPIs.length}`);
  console.log(`   - Expense KPIs: ${expenseKPIs.length}`);
  console.log(`   - Quote KPIs: ${quoteKPIs.length}`);
  console.log(`   - Revenue KPIs: ${revenueKPIs.length}`);
  console.log(`   - Change Order KPIs: ${changeOrderKPIs.length}`);
  console.log(`   - Work Order KPIs: ${workOrderKPIs.length}`);
  console.log(`   - View KPIs: ${viewKPIs.length}`);
  console.log(`   - Time Entry KPIs: ${timeEntryKPIs.length}`);
  console.log(`   - Payee KPIs: ${payeeKPIs.length}`);
  console.log(`   - Deprecated KPIs: ${deprecatedKPIs.length}`);
  console.log(`   - Semantic Mappings: ${semanticMappings.length}`);
  console.log(`   - Business Rules: ${businessRules.length}`);
  console.log(`   - Few-Shot Examples: ${fewShotExamples.length}`);
  console.log(`   - Benchmarks: ${businessBenchmarks.length}`);
  console.log('');

  console.log('🔨 Generating context file...');
  const content = generateOutputFile();

  // Output path
  const outputPath = path.join(
    __dirname,
    '..',
    'supabase',
    'functions',
    'ai-report-assistant',
    'kpi-context.generated.ts'
  );

  // Write file
  console.log(`📝 Writing to: ${outputPath}`);
  fs.writeFileSync(outputPath, content, 'utf-8');

  // Verify
  const stats = fs.statSync(outputPath);
  console.log(`   File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ KPI context sync complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update ai-report-assistant/index.ts to import from kpi-context.generated.ts');
  console.log('2. Deploy: supabase functions deploy ai-report-assistant');
  console.log('═══════════════════════════════════════════════════════════════');
}

main();

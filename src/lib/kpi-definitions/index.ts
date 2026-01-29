/**
 * KPI Definitions
 *
 * Single source of truth for all KPI measure definitions.
 * Used by:
 * - src/pages/KPIGuide.tsx (UI display)
 * - supabase/functions/ai-report-assistant (AI context)
 * - Validation scripts (CI/CD)
 *
 * @version 3.0.0
 * @lastUpdated 2026-01-28
 */

// Types
export * from './types';

// KPI Definitions by Domain - import for local use
import { projectFinancialKPIs } from './project-kpis';
import { estimateKPIs } from './estimate-kpis';
import { expenseKPIs } from './expense-kpis';
import { quoteKPIs } from './quote-kpis';
import { revenueKPIs } from './revenue-kpis';
import { changeOrderKPIs } from './change-order-kpis';
import { workOrderKPIs } from './work-order-kpis';
import { deprecatedKPIs } from './deprecated-kpis';
import { viewKPIs } from './view-kpis';

// Re-export for external consumers
export {
  projectFinancialKPIs,
  estimateKPIs,
  expenseKPIs,
  quoteKPIs,
  revenueKPIs,
  changeOrderKPIs,
  workOrderKPIs,
  viewKPIs,
  deprecatedKPIs,
};

// Semantic Mappings
import { semanticMappings } from './semantic-mappings';
export { semanticMappings };

// Business Rules
export { businessRules } from './business-rules';

// Business Benchmarks
export {
  businessBenchmarks,
  getBenchmarkForMetric,
  evaluateMetric,
  getBenchmarksForPrompt,
} from './business-benchmarks';
export type { Benchmark } from './business-benchmarks';

// Few-Shot Examples
export { fewShotExamples } from './few-shot-examples';

// AI Context Generator
export {
  generateAIContext,
  generateSystemPrompt,
  generateCompactPrompt,
  KPI_DEFINITIONS_VERSION,
  LAST_UPDATED,
} from './ai-context-generator';

// Validation
export {
  validateKPIDefinitions,
  formatValidationReport,
  runValidation,
} from './validation';

/**
 * Get all KPIs as a flat array (for legacy compatibility)
 */
export function getAllKPIs() {
  return [
    ...projectFinancialKPIs,
    ...estimateKPIs,
    ...expenseKPIs,
    ...quoteKPIs,
    ...revenueKPIs,
    ...changeOrderKPIs,
    ...workOrderKPIs,
    ...viewKPIs,
    ...deprecatedKPIs,
  ];
}

/**
 * Get KPIs by domain
 */
export function getKPIsByDomain(domain: string) {
  const domainMap: Record<string, any[]> = {
    project: projectFinancialKPIs,
    estimate: estimateKPIs,
    expense: expenseKPIs,
    quote: quoteKPIs,
    revenue: revenueKPIs,
    change_order: changeOrderKPIs,
    work_order: workOrderKPIs,
    deprecated: deprecatedKPIs,
    time_entry: viewKPIs.filter(k => k.domain === 'time_entry'),
    training: viewKPIs.filter(k => k.domain === 'training'),
  };
  return domainMap[domain] || [];
}

/**
 * Find a KPI by ID
 */
export function findKPIById(id: string) {
  const allKPIs = getAllKPIs();
  return allKPIs.find(k => k.id === id);
}

/**
 * Find KPIs by semantic concept
 */
export function findKPIsByConcept(concept: string) {
  const mapping = semanticMappings.find(
    (m) => m.concept === concept || m.aliases.includes(concept)
  );
  if (!mapping) return [];

  return mapping.kpiIds.map((id: string) => findKPIById(id)).filter(Boolean);
}
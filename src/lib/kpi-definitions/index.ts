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
 * @lastUpdated 2026-01-30
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
import { timeEntryKPIs } from './time-entry-kpis';
import { payeeKPIs } from './payee-kpis';

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
  timeEntryKPIs,
  payeeKPIs,
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
import { validateKPIDefinitions, formatValidationReport } from './validation';
export {
  validateKPIDefinitions,
  formatValidationReport,
  runValidation,
} from './validation';

// ==========================================================================
// COMBINED KPI ARRAY & LOOKUP FUNCTIONS
// ==========================================================================

import type { KPIMeasure, KPIDomain, KPISource, SemanticMapping } from './types';

/**
 * All KPI definitions combined
 */
export const allKPIs: KPIMeasure[] = [
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

/**
 * Get all KPIs as a flat array (for legacy compatibility)
 */
export function getAllKPIs(): KPIMeasure[] {
  return allKPIs;
}

/**
 * Get a KPI by its ID
 */
export function getKPIById(id: string): KPIMeasure | undefined {
  return allKPIs.find(kpi => kpi.id === id);
}

/**
 * Find a KPI by ID (legacy alias)
 */
export function findKPIById(id: string): KPIMeasure | undefined {
  return getKPIById(id);
}

/**
 * Get all KPIs for a specific domain
 */
export function getKPIsByDomain(domain: KPIDomain | string): KPIMeasure[] {
  return allKPIs.filter(kpi => kpi.domain === domain);
}

/**
 * Get all KPIs from a specific source
 */
export function getKPIsBySource(source: KPISource): KPIMeasure[] {
  return allKPIs.filter(kpi => kpi.source === source);
}

/**
 * Find KPI by alias (fuzzy match)
 */
export function findKPIByAlias(alias: string): KPIMeasure | undefined {
  const normalizedAlias = alias.toLowerCase().trim();
  return allKPIs.find(kpi => {
    if (kpi.id.toLowerCase() === normalizedAlias) return true;
    if (kpi.name.toLowerCase() === normalizedAlias) return true;
    if (kpi.aliases?.some(a => a.toLowerCase() === normalizedAlias)) return true;
    return false;
  });
}

/**
 * Find all KPIs matching a search term
 */
export function searchKPIs(term: string): KPIMeasure[] {
  const normalizedTerm = term.toLowerCase().trim();
  return allKPIs.filter(kpi => {
    if (kpi.id.toLowerCase().includes(normalizedTerm)) return true;
    if (kpi.name.toLowerCase().includes(normalizedTerm)) return true;
    if (kpi.aliases?.some(a => a.toLowerCase().includes(normalizedTerm))) return true;
    if (kpi.notes?.toLowerCase().includes(normalizedTerm)) return true;
    return false;
  });
}

/**
 * Get the default KPI for a business concept
 */
export function getDefaultKPIForConcept(concept: string): KPIMeasure | undefined {
  const normalizedTerm = concept.toLowerCase().trim();
  const mapping = semanticMappings.find(
    m => m.concept.toLowerCase() === normalizedTerm || m.aliases.some(a => a.toLowerCase() === normalizedTerm)
  );
  if (!mapping?.defaultKpiId) return undefined;
  return getKPIById(mapping.defaultKpiId);
}

/**
 * Find KPIs by semantic concept (legacy)
 */
export function findKPIsByConcept(concept: string): KPIMeasure[] {
  const normalizedTerm = concept.toLowerCase().trim();
  const mapping = semanticMappings.find(
    m => m.concept.toLowerCase() === normalizedTerm || m.aliases.some(a => a.toLowerCase() === normalizedTerm)
  );
  if (!mapping) return [];
  return mapping.kpiIds.map((id: string) => getKPIById(id)).filter((k): k is KPIMeasure => k !== undefined);
}

/**
 * Get statistics about KPI definitions
 */
export function getKPIStats(): {
  total: number;
  byDomain: Record<string, number>;
  bySource: Record<string, number>;
  deprecated: number;
  withAliases: number;
} {
  const byDomain: Record<string, number> = {};
  const bySource: Record<string, number> = { database: 0, view: 0, frontend: 0, deprecated: 0 };
  let deprecated = 0;
  let withAliases = 0;
  for (const kpi of allKPIs) {
    byDomain[kpi.domain] = (byDomain[kpi.domain] ?? 0) + 1;
    bySource[kpi.source] = (bySource[kpi.source] ?? 0) + 1;
    if (kpi.source === 'deprecated' || kpi.domain === 'deprecated') deprecated++;
    if (kpi.aliases?.length) withAliases++;
  }
  return { total: allKPIs.length, byDomain, bySource, deprecated, withAliases };
}

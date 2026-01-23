/**
 * KPI Definitions
 *
 * Single source of truth for all KPI measure definitions.
 * Used by:
 * - src/pages/KPIGuide.tsx (UI display)
 * - supabase/functions/ai-report-assistant (AI context)
 * - Validation scripts (CI/CD)
 *
 * @version 2.0.0
 * @lastUpdated 2026-01-23
 */

// Types
export * from './types';

// KPI Definitions by Domain
export { projectFinancialKPIs } from './project-kpis';
export { estimateKPIs } from './estimate-kpis';
export { expenseKPIs } from './expense-kpis';
export { quoteKPIs } from './quote-kpis';
export { revenueKPIs } from './revenue-kpis';
export { changeOrderKPIs } from './change-order-kpis';
export { workOrderKPIs } from './work-order-kpis';
export { deprecatedKPIs } from './deprecated-kpis';

// Semantic Mappings
export { semanticMappings } from './semantic-mappings';

// Business Rules
export { businessRules } from './business-rules';

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
  const { semanticMappings } = require('./semantic-mappings');
  const mapping = semanticMappings.find(
    (m: any) => m.concept === concept || m.aliases.includes(concept)
  );
  if (!mapping) return [];

  return mapping.kpiIds.map((id: string) => findKPIById(id)).filter(Boolean);
}
/**
 * KPI Definitions Central Registry
 *
 * This file exports all KPI definitions and provides utilities for
 * looking up KPIs by ID, alias, or domain.
 *
 * @version 1.0.0
 * @created 2026-01-30
 *
 * USAGE:
 * ```typescript
 * import { allKPIs, getKPIById, getKPIsByDomain, findKPIByAlias } from '@/lib/kpi-definitions';
 * 
 * // Get specific KPI
 * const margin = getKPIById('adjusted_est_margin');
 * 
 * // Get all project KPIs
 * const projectKPIs = getKPIsByDomain('project');
 * 
 * // Find KPI by user term
 * const match = findKPIByAlias('profit');
 * ```
 */

// Import all KPI definition files
import { projectFinancialKPIs } from './project-kpis';
import { estimateKPIs } from './estimate-kpis';
import { expenseKPIs } from './expense-kpis';
import { quoteKPIs } from './quote-kpis';
import { revenueKPIs } from './revenue-kpis';
import { changeOrderKPIs } from './change-order-kpis';
import { workOrderKPIs } from './work-order-kpis';
import { viewKPIs } from './view-kpis';
import { timeEntryKPIs } from './time-entry-kpis';
import { payeeKPIs } from './payee-kpis';
import { deprecatedKPIs } from './deprecated-kpis';

// Import semantic mappings
import { semanticMappings } from './semantic-mappings';

// Import types
import { KPIMeasure, KPIDomain, KPISource, SemanticMapping } from './types';

// Import validation
import { validateAllKPIs, formatValidationReport } from './validation';

// ==========================================================================
// COMBINED KPI ARRAY
// ==========================================================================

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

// ==========================================================================
// LOOKUP FUNCTIONS
// ==========================================================================

/**
 * Get a KPI by its ID
 */
export function getKPIById(id: string): KPIMeasure | undefined {
  return allKPIs.find(kpi => kpi.id === id);
}

/**
 * Get all KPIs for a specific domain
 */
export function getKPIsByDomain(domain: KPIDomain): KPIMeasure[] {
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
    // Check exact ID match
    if (kpi.id.toLowerCase() === normalizedAlias) return true;
    
    // Check name match
    if (kpi.name.toLowerCase() === normalizedAlias) return true;
    
    // Check aliases
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
    // Check ID
    if (kpi.id.toLowerCase().includes(normalizedTerm)) return true;
    
    // Check name
    if (kpi.name.toLowerCase().includes(normalizedTerm)) return true;
    
    // Check aliases
    if (kpi.aliases?.some(a => a.toLowerCase().includes(normalizedTerm))) return true;
    
    // Check notes
    if (kpi.notes?.toLowerCase().includes(normalizedTerm)) return true;
    
    return false;
  });
}

/**
 * Get the database field path for a KPI
 */
export function getKPIField(id: string): string | undefined {
  const kpi = getKPIById(id);
  return kpi?.field;
}

/**
 * Get related KPIs for a given KPI
 */
export function getRelatedKPIs(id: string): KPIMeasure[] {
  const kpi = getKPIById(id);
  if (!kpi?.relatedTo) return [];
  
  return kpi.relatedTo
    .map(relatedId => getKPIById(relatedId))
    .filter((k): k is KPIMeasure => k !== undefined);
}

/**
 * Get the replacement KPI for a deprecated one
 */
export function getReplacementKPI(deprecatedId: string): KPIMeasure | undefined {
  const kpi = getKPIById(deprecatedId);
  if (!kpi?.replacedBy) return undefined;
  
  return getKPIById(kpi.replacedBy);
}

// ==========================================================================
// SEMANTIC MAPPING FUNCTIONS
// ==========================================================================

/**
 * Find semantic mapping by concept or alias
 */
export function findSemanticMapping(term: string): SemanticMapping | undefined {
  const normalizedTerm = term.toLowerCase().trim();
  
  return semanticMappings.find(mapping => {
    if (mapping.concept.toLowerCase() === normalizedTerm) return true;
    if (mapping.aliases.some(a => a.toLowerCase() === normalizedTerm)) return true;
    return false;
  });
}

/**
 * Get the default KPI for a business concept
 */
export function getDefaultKPIForConcept(concept: string): KPIMeasure | undefined {
  const mapping = findSemanticMapping(concept);
  if (!mapping?.defaultKpiId) return undefined;
  
  return getKPIById(mapping.defaultKpiId);
}

/**
 * Get all KPIs for a business concept
 */
export function getKPIsForConcept(concept: string): KPIMeasure[] {
  const mapping = findSemanticMapping(concept);
  if (!mapping?.kpiIds) return [];
  
  return mapping.kpiIds
    .map(id => getKPIById(id))
    .filter((k): k is KPIMeasure => k !== undefined);
}

// ==========================================================================
// VALIDATION
// ==========================================================================

/**
 * Run validation on all KPIs
 * Call this during development to check for issues
 */
export function runValidation(): void {
  const result = validateAllKPIs();
  console.log(formatValidationReport(result));
  
  if (result.issues.length > 0) {
    console.warn(`Found ${result.issues.length} KPI validation issues`);
  }
}

// ==========================================================================
// STATISTICS
// ==========================================================================

/**
 * Get statistics about KPI definitions
 */
export function getKPIStats(): {
  total: number;
  byDomain: Record<KPIDomain, number>;
  bySource: Record<KPISource, number>;
  deprecated: number;
  withAliases: number;
} {
  const byDomain: Record<KPIDomain, number> = {
    project: 0,
    estimate: 0,
    quote: 0,
    expense: 0,
    revenue: 0,
    change_order: 0,
    work_order: 0,
    time_entry: 0,
    payee: 0,
    training: 0,
    deprecated: 0,
  };
  
  const bySource: Record<KPISource, number> = {
    database: 0,
    view: 0,
    frontend: 0,
    deprecated: 0,
  };
  
  let deprecated = 0;
  let withAliases = 0;
  
  for (const kpi of allKPIs) {
    byDomain[kpi.domain]++;
    bySource[kpi.source]++;
    
    if (kpi.source === 'deprecated' || kpi.domain === 'deprecated') {
      deprecated++;
    }
    
    if (kpi.aliases && kpi.aliases.length > 0) {
      withAliases++;
    }
  }
  
  return {
    total: allKPIs.length,
    byDomain,
    bySource,
    deprecated,
    withAliases,
  };
}

// ==========================================================================
// EXPORTS
// ==========================================================================

// Re-export individual KPI arrays for direct access
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
  semanticMappings,
};

// Re-export types
export type { KPIMeasure, KPIDomain, KPISource, SemanticMapping };

// Re-export validation
export { validateAllKPIs, formatValidationReport };

// Default export
export default allKPIs;

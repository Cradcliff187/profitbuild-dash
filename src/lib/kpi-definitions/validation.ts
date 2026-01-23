/**
 * KPI Validation
 *
 * Validates KPI definitions for:
 * - Duplicate IDs or field references
 * - Inconsistent view references
 * - Deprecated items still being used
 * - Missing required fields
 * - Orphaned semantic mappings
 *
 * Run this as part of CI/CD to catch issues early.
 */

import { KPIMeasure, ValidationIssue, ValidationResult, KPISource, KPIDomain } from './types';
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

// Collect all KPIs from all domain files
function getAllKPIs(): KPIMeasure[] {
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
 * Run all validations and return results
 */
export function validateKPIDefinitions(): ValidationResult {
  const allKPIs = getAllKPIs();
  const issues: ValidationIssue[] = [];

  // Run each validation
  issues.push(...checkDuplicateIds(allKPIs));
  issues.push(...checkDuplicateFields(allKPIs));
  issues.push(...checkViewConsistency(allKPIs));
  issues.push(...checkDeprecatedReferences(allKPIs));
  issues.push(...checkSemanticMappings(allKPIs));
  issues.push(...checkRequiredFields(allKPIs));
  issues.push(...checkBusinessRuleReferences(allKPIs));

  // Calculate stats
  const stats = calculateStats(allKPIs);

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: {
      ...stats,
      duplicatesFound: issues.filter(i => i.type === 'duplicate').length,
      deprecatedCount: allKPIs.filter(k => k.source === 'deprecated').length,
    }
  };
}

/**
 * Check for duplicate KPI IDs
 */
function checkDuplicateIds(kpis: KPIMeasure[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, KPIMeasure>();

  for (const kpi of kpis) {
    if (seen.has(kpi.id)) {
      issues.push({
        type: 'duplicate',
        severity: 'error',
        kpiId: kpi.id,
        message: `Duplicate KPI ID: "${kpi.id}" - already defined as "${seen.get(kpi.id)?.name}"`,
        suggestion: `Rename one of the KPIs or merge them if they're the same metric.`
      });
    }
    seen.set(kpi.id, kpi);
  }

  return issues;
}

/**
 * Check for duplicate field references (potential consolidation opportunities)
 */
function checkDuplicateFields(kpis: KPIMeasure[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fieldToKPIs = new Map<string, KPIMeasure[]>();

  for (const kpi of kpis) {
    const existing = fieldToKPIs.get(kpi.field) || [];
    existing.push(kpi);
    fieldToKPIs.set(kpi.field, existing);
  }

  for (const [field, fieldKPIs] of fieldToKPIs) {
    if (fieldKPIs.length > 1) {
      const names = fieldKPIs.map(k => k.name).join(', ');
      issues.push({
        type: 'duplicate',
        severity: 'warning',
        message: `Multiple KPIs reference same field "${field}": ${names}`,
        suggestion: `Consider consolidating these KPIs if they represent the same concept.`
      });
    }
  }

  return issues;
}

/**
 * Check for inconsistent view references
 */
function checkViewConsistency(kpis: KPIMeasure[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Old view names that should be updated
  const deprecatedViews = [
    'project_financial_summary',
    'project_financials', // without reporting. prefix
  ];

  const preferredView = 'reporting.project_financials';

  for (const kpi of kpis) {
    for (const oldView of deprecatedViews) {
      if (kpi.field.includes(oldView) && !kpi.field.includes('reporting.')) {
        issues.push({
          type: 'inconsistent',
          severity: 'warning',
          kpiId: kpi.id,
          message: `KPI "${kpi.name}" references deprecated view "${oldView}"`,
          suggestion: `Update to use "${preferredView}" instead.`
        });
      }
    }
  }

  return issues;
}

/**
 * Check for deprecated KPIs still referenced elsewhere
 */
function checkDeprecatedReferences(kpis: KPIMeasure[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const deprecatedIds = kpis
    .filter(k => k.source === 'deprecated')
    .map(k => k.id);

  for (const kpi of kpis) {
    if (kpi.relatedTo) {
      for (const relatedId of kpi.relatedTo) {
        if (deprecatedIds.includes(relatedId)) {
          issues.push({
            type: 'deprecated',
            severity: 'warning',
            kpiId: kpi.id,
            message: `KPI "${kpi.name}" references deprecated KPI "${relatedId}"`,
            suggestion: `Update relatedTo to reference the replacement KPI.`
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Check that semantic mappings reference valid KPIs
 */
function checkSemanticMappings(kpis: KPIMeasure[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validIds = new Set(kpis.map(k => k.id));

  for (const mapping of semanticMappings) {
    // Check default KPI exists
    if (mapping.defaultKpiId && !validIds.has(mapping.defaultKpiId)) {
      issues.push({
        type: 'orphaned',
        severity: 'error',
        message: `Semantic mapping "${mapping.concept}" references non-existent default KPI "${mapping.defaultKpiId}"`,
        suggestion: `Either create the KPI or update the mapping to use an existing KPI.`
      });
    }

    // Check all referenced KPIs exist
    for (const kpiId of mapping.kpiIds) {
      if (!validIds.has(kpiId)) {
        issues.push({
          type: 'orphaned',
          severity: 'warning',
          message: `Semantic mapping "${mapping.concept}" references non-existent KPI "${kpiId}"`,
          suggestion: `Remove from kpiIds or create the KPI.`
        });
      }
    }
  }

  return issues;
}

/**
 * Check that all KPIs have required fields
 */
function checkRequiredFields(kpis: KPIMeasure[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFields: (keyof KPIMeasure)[] = ['id', 'name', 'source', 'field', 'formula', 'dataType', 'domain', 'whereUsed'];

  for (const kpi of kpis) {
    for (const field of requiredFields) {
      if (!kpi[field]) {
        issues.push({
          type: 'missing',
          severity: 'error',
          kpiId: kpi.id || 'UNKNOWN',
          message: `KPI "${kpi.name || 'UNNAMED'}" is missing required field "${field}"`,
          suggestion: `Add the ${field} property to the KPI definition.`
        });
      }
    }
  }

  return issues;
}

/**
 * Check business rules reference valid concepts
 */
function checkBusinessRuleReferences(kpis: KPIMeasure[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for business rules that mention non-existent fields
  const allFields = new Set(kpis.map(k => k.field));

  for (const rule of businessRules) {
    // Simple check - could be made more sophisticated
    if (rule.correctExample) {
      // Check if example references a known view/table pattern
      const viewPattern = /reporting\.project_financials|projects\.|expenses\.|payees\./;
      if (!viewPattern.test(rule.correctExample)) {
        issues.push({
          type: 'inconsistent',
          severity: 'info',
          message: `Business rule "${rule.id}" correctExample may reference non-standard table`,
          suggestion: `Verify the example uses the correct table/view names.`
        });
      }
    }
  }

  return issues;
}

/**
 * Calculate statistics about KPI definitions
 */
function calculateStats(kpis: KPIMeasure[]): {
  totalKpis: number;
  bySource: Record<KPISource, number>;
  byDomain: Record<KPIDomain, number>;
} {
  const bySource: Record<KPISource, number> = {
    database: 0,
    frontend: 0,
    view: 0,
    deprecated: 0,
  };

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
  };

  for (const kpi of kpis) {
    bySource[kpi.source]++;
    byDomain[kpi.domain]++;
  }

  return {
    totalKpis: kpis.length,
    bySource,
    byDomain,
  };
}

/**
 * Format validation results for console output
 */
export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  KPI DEFINITIONS VALIDATION REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Stats
  lines.push('📊 STATISTICS');
  lines.push(`   Total KPIs: ${result.stats.totalKpis}`);
  lines.push(`   By Source: Database=${result.stats.bySource.database}, View=${result.stats.bySource.view}, Frontend=${result.stats.bySource.frontend}`);
  lines.push(`   Deprecated: ${result.stats.deprecatedCount}`);
  lines.push('');

  // Issues by severity
  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const infos = result.issues.filter(i => i.severity === 'info');

  if (errors.length > 0) {
    lines.push('❌ ERRORS (must fix)');
    for (const issue of errors) {
      lines.push(`   • ${issue.message}`);
      if (issue.suggestion) lines.push(`     → ${issue.suggestion}`);
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('⚠️  WARNINGS (should fix)');
    for (const issue of warnings) {
      lines.push(`   • ${issue.message}`);
      if (issue.suggestion) lines.push(`     → ${issue.suggestion}`);
    }
    lines.push('');
  }

  if (infos.length > 0) {
    lines.push('ℹ️  INFO');
    for (const issue of infos) {
      lines.push(`   • ${issue.message}`);
    }
    lines.push('');
  }

  // Result
  lines.push('═══════════════════════════════════════════════════════════════');
  if (result.valid) {
    lines.push('✅ VALIDATION PASSED');
  } else {
    lines.push('❌ VALIDATION FAILED - Fix errors before deploying');
  }
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Run validation and print report (for CLI usage)
 */
export function runValidation(): void {
  const result = validateKPIDefinitions();
  console.log(formatValidationReport(result));

  if (!result.valid) {
    process.exit(1);
  }
}

// Export for testing
export default {
  validateKPIDefinitions,
  formatValidationReport,
  runValidation,
};
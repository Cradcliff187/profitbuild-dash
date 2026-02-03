/**
 * Unified financial status color system.
 * 
 * Replaces ad-hoc color usage across MarginDashboard, ProjectProfitMargin, etc.
 * Compatible with the existing thresholdUtils.ts pattern (which remains unchanged).
 * Aligned with business-benchmarks.ts thresholds.
 * 
 * Usage:
 *   import { getMarginColor, getBudgetUtilizationColor } from '@/utils/financialColors';
 *   <span className={getMarginColor(marginPercent)}>18.6%</span>
 */

export type FinancialHealthStatus = 'healthy' | 'warning' | 'critical' | 'neutral';

/**
 * Determine financial health based on a value and thresholds.
 * Works for margins, budget utilization, contingency, etc.
 * 
 * @param value - The metric value to evaluate
 * @param warningThreshold - Threshold where warning begins
 * @param criticalThreshold - Threshold where critical begins
 * @param invertDirection - true = higher is worse (budget utilization). false = lower is worse (margin %)
 */
export function getFinancialHealth(
  value: number | null | undefined,
  warningThreshold: number,
  criticalThreshold: number,
  invertDirection: boolean = false
): FinancialHealthStatus {
  if (value === null || value === undefined || value === 0) return 'neutral';

  if (invertDirection) {
    // Higher = worse (budget utilization, contingency usage)
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'healthy';
  } else {
    // Lower = worse (margin %, contingency remaining)
    if (value <= criticalThreshold) return 'critical';
    if (value <= warningThreshold) return 'warning';
    return 'healthy';
  }
}

/**
 * Get Tailwind text color class for financial health.
 */
export function getFinancialHealthColor(status: FinancialHealthStatus): string {
  switch (status) {
    case 'healthy': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'critical': return 'text-red-600';
    case 'neutral':
    default: return 'text-muted-foreground';
  }
}

/**
 * Get HSL color for charts/progress bars.
 * Compatible with existing thresholdUtils pattern used by MarginDashboard.
 */
export function getFinancialHealthHSL(status: FinancialHealthStatus): string {
  switch (status) {
    case 'healthy': return 'hsl(var(--success))';
    case 'warning': return 'hsl(var(--warning))';
    case 'critical': return 'hsl(var(--destructive))';
    case 'neutral':
    default: return 'hsl(var(--muted))';
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS — Common financial metric patterns
// Thresholds aligned with src/lib/kpi-definitions/business-benchmarks.ts
// =============================================================================

/**
 * Color for margin percentage.
 * Benchmarks: healthy >= 15%, warning >= 10%, critical < 10%
 * Uses project's own thresholds when provided, else sensible defaults.
 */
export function getMarginColor(
  marginPercent: number | null | undefined,
  minimumThreshold: number = 10,
  targetMargin: number = 15
): string {
  const status = getFinancialHealth(marginPercent, targetMargin, minimumThreshold, false);
  return getFinancialHealthColor(status);
}

/**
 * Color for budget utilization percentage.
 * Benchmarks: healthy < 80%, warning >= 80%, critical >= 95%
 */
export function getBudgetUtilizationColor(utilizationPercent: number | null | undefined): string {
  const status = getFinancialHealth(utilizationPercent, 80, 95, true);
  return getFinancialHealthColor(status);
}

/**
 * Color for contingency remaining percentage.
 * Benchmarks: healthy > 50%, warning <= 40%, critical <= 20%
 * Aligned with business-benchmarks.ts contingency_usage (inverted: remaining vs used)
 */
export function getContingencyColor(remainingPercent: number | null | undefined): string {
  const status = getFinancialHealth(remainingPercent, 40, 20, false);
  return getFinancialHealthColor(status);
}

/**
 * Color for cost variance percentage.
 * Benchmarks: healthy -5% to 5%, warning > 10%, critical > 20%
 */
export function getCostVarianceColor(variancePercent: number | null | undefined): string {
  // Cost variance is inverted: higher = worse (over budget)
  const status = getFinancialHealth(variancePercent, 10, 20, true);
  return getFinancialHealthColor(status);
}

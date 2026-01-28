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
    metric: 'budget_utilization_percent',
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
    metric: 'estimated_labor_cushion',
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
    metric: 'contingency_percent',
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
    metric: 'expense_net_hours',
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

  // Check if value is within healthy range first
  const inHealthyRange = (
    (benchmark.healthyRange.min === undefined || value >= benchmark.healthyRange.min) &&
    (benchmark.healthyRange.max === undefined || value <= benchmark.healthyRange.max)
  );

  if (inHealthyRange) {
    return { status: 'healthy', message: benchmark.plainLanguage.healthy };
  }

  // For metrics where LOW values are bad (margin, billing progress):
  // criticalThreshold < warningThreshold < healthyRange.min
  // For metrics where HIGH values are bad (cost variance, contingency usage, hours):
  // healthyRange.max < warningThreshold < criticalThreshold
  const isLowerBad = benchmark.criticalThreshold !== undefined &&
    benchmark.warningThreshold !== undefined &&
    benchmark.criticalThreshold < benchmark.warningThreshold;

  if (isLowerBad) {
    // Low values are bad (e.g., margin: critical=5, warning=10, healthy=15-30)
    if (value <= benchmark.criticalThreshold!) {
      return { status: 'critical', message: benchmark.plainLanguage.critical };
    }
    if (value <= benchmark.warningThreshold!) {
      return { status: 'warning', message: benchmark.plainLanguage.warning };
    }
  } else {
    // High values are bad (e.g., cost variance: healthy=-5 to 5, warning=10, critical=20)
    if (benchmark.criticalThreshold !== undefined && Math.abs(value) >= benchmark.criticalThreshold) {
      return { status: 'critical', message: benchmark.plainLanguage.critical };
    }
    if (benchmark.warningThreshold !== undefined && Math.abs(value) >= benchmark.warningThreshold) {
      return { status: 'warning', message: benchmark.plainLanguage.warning };
    }
  }

  // Below healthy range but not at warning/critical levels
  if (benchmark.healthyRange.min !== undefined && value < benchmark.healthyRange.min) {
    return { status: 'warning', message: benchmark.plainLanguage.warning };
  }
  // Above healthy range but not at warning/critical levels
  if (benchmark.healthyRange.max !== undefined && value > benchmark.healthyRange.max) {
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

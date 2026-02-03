# Phase 1: Quick Wins — Safe Visual Fixes
**Date:** February 3, 2026
**Risk Level:** Very Low — CSS props and a new utility file only
**Estimated Effort:** 1 session
**Guiding Principle:** QuickBooks handles all bookkeeping. RCG Work = project operations only.

---

## Pre-Implementation Checklist: What We Are NOT Touching

Before any work begins, confirm these systems remain untouched:

### Email System (Resend Edge Functions) — DO NOT MODIFY
| Function | Purpose |
|----------|---------|
| `send-auth-email` | Password reset, account creation |
| `send-receipt-notification` | Receipt submission alerts |
| `send-training-notification` | Training assignment/reminder/overdue |
| `admin-reset-password` | Invokes send-auth-email |

### Database Layer — NO SCHEMA CHANGES
All existing PostgreSQL triggers, functions, and the `reporting.project_financials` view remain unchanged.

### Existing Pages & Components — NO FUNCTIONAL CHANGES
All CRUD operations, routing, data fetching, and calculation logic remain exactly as-is.

---

## 1.1 Mobile Project Cards: Show All 3 Metrics

**File:** `src/components/ProjectsList.tsx`

**Problem:** `getStatusKPIs()` returns 3 metrics for every status (Contract/Costs/Margin, etc.), but the MobileListCard renders in a default 2-column grid. The third metric is computed but visually cramped into a 2-column layout.

**Current code** (MobileListCard render, approximately line where projects are mapped):
```tsx
<MobileListCard
  key={project.id}
  title={project.project_name}
  subtitle={`${project.project_number} • ${project.client_name || "No Client"}`}
  badge={{ ... }}
  secondaryBadge={ ... }
  metrics={(() => {
    const kpis = getStatusKPIs(project, currentEstimate);
    const primary = kpis.primary;
    return [
      { label: primary.label1, value: formatCurrency(primary.value1) },
      { label: primary.label2, value: formatCurrency(primary.value2) },
      { label: primary.label3, value: primary.isPercent3 ? ... : formatCurrency(primary.value3) },
    ];
  })()}
  // ... onTap, etc.
/>
```

**Change:** Add `metricsColumns={3}` prop:
```tsx
<MobileListCard
  key={project.id}
  // ... all existing props unchanged ...
  metricsColumns={3}  // ← ADD THIS LINE
  metrics={(() => {
    // ... existing logic unchanged ...
  })()}
/>
```

**Why it's safe:**
- `MobileListCard` already supports `metricsColumns={3}` (confirmed in `mobile-list-card.tsx` — the component accepts it as a prop, default is 2).
- The CSS class `grid-cols-3` is already defined in `src/index.css` under `.mobile-list-card-metrics.grid-cols-3`.
- `getStatusKPIs()` already returns 3 metrics for all status cases (`estimating`, `approved`, `in_progress`, `complete`, `on_hold`, `cancelled`).
- The `DevMobileCards.tsx` demo page already shows a working 3-column example.

**Validation:**
- [ ] Mobile: all 3 metrics visible for every status
- [ ] No layout overflow on small screens (test at 320px width)
- [ ] Desktop table view is a different component (`ProjectsTableView`) — confirm it's unchanged
- [ ] Work order cards in `WorkOrdersTableView.tsx` are NOT affected (they use their own MobileListCard instances with different metrics)

---

## 1.2 Unified Financial Color Utility

**New file:** `src/utils/financialColors.ts`

**Problem:** Financial health colors are scattered across multiple files with inconsistent logic:
- `src/utils/thresholdUtils.ts` — 4-level system: `critical` / `at_risk` / `on_target` / `excellent`
- `src/components/MarginDashboard.tsx` — inline `getMarginColorClass()` with hardcoded thresholds
- `src/components/MarginDashboard.tsx` — inline `getContingencyUsageColorClass()` with different thresholds
- `src/components/ProjectProfitMargin.tsx` — inline color logic duplicating MarginDashboard patterns
- `src/lib/kpi-definitions/business-benchmarks.ts` — defines thresholds but isn't consumed by UI

**Solution:** Create a universal color utility that wraps the existing threshold pattern. The existing `thresholdUtils.ts` stays as-is — this new utility provides convenience functions for common financial metrics.

```typescript
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
```

**Integration approach:** This file is additive — no existing imports change. In Phase 2 and Phase 3, individual components will be migrated to use these functions, replacing their inline color logic. For now, this is just creating the utility.

**Validation:**
- [ ] New file has zero imports from components (only standard types)
- [ ] Existing components compile and run unchanged
- [ ] `npm run build` succeeds with no errors
- [ ] Thresholds align with `business-benchmarks.ts` values

---

## 1.3 QA Pass: Verify Status-Aware Rendering

**This is a manual verification task, not a code change.**

Now that `getStatusKPIs()` has explicit handling for all statuses, verify correct rendering:

| Status | Mobile Card Shows | Dashboard Shows | ✓ |
|--------|-------------------|-----------------|---|
| `estimating` (no contract) | Estimate / Est. Costs / Margin % | Estimate Value / Estimated Costs / Estimated Margin | [ ] |
| `estimating` (has contract) | Contract / Adj. Est. Costs / Adj. Est. Margin % | Contract Value / Adj. Est. Costs / Adj. Est. Margin | [ ] |
| `approved` | Contract / Est. Costs / Margin % | Contract Value / Adj. Est. Costs / Adj. Est. Margin | [ ] |
| `in_progress` | Contract / Est. Costs / Margin % + budget util. | Contract Value / Adj. Est. Costs / Adj. Est. Margin + budget bar | [ ] |
| `complete` | Contract (or Total Invoiced) / Actual Costs / Margin % | Total Invoiced / Total Expenses / Actual Margin + variance | [ ] |
| `on_hold` | Contract / Spent / Margin % | (falls through to default: Contract Value / Adj. Est. Costs / Adj. Est. Margin) | [ ] |
| `cancelled` | Contract / Spent / Loss $ | Total Invoiced / Total Expenses / Actual Margin | [ ] |

**Noted inconsistency (document, don't fix yet):**
- `ProjectsList.getStatusKPIs()` for `cancelled` shows label3 = "Loss" with `value3: actualExpenses` (raw amount, not a loss calculation). The `ProjectOperationalDashboard` for `cancelled` groups it with `complete` and shows Actual Margin. These are inconsistent — the cancelled card shows a misleading "Loss" value. This will be addressed in Phase 2 if desired.
- `ProjectOperationalDashboard` for `on_hold` falls through to the default case (Contract/Adj. Est. Costs/Margin), while `ProjectsList` has an explicit `on_hold` case showing Contract/Spent/Margin. The card-level view is more useful for on-hold projects. Consider aligning the dashboard in Phase 2.

---

## Files Changed — Phase 1 Summary

| Action | File | Change |
|--------|------|--------|
| Edit (1 line) | `src/components/ProjectsList.tsx` | Add `metricsColumns={3}` to MobileListCard |
| Create | `src/utils/financialColors.ts` | New unified color utility |
| QA only | `ProjectsList`, `ProjectOperationalDashboard` | Verify status rendering (no code changes) |

## Files NEVER Modified
| File | Reason |
|------|--------|
| `supabase/functions/*` | Email system — never touch |
| `supabase/migrations/*` | No schema changes |
| `src/utils/thresholdUtils.ts` | Kept as-is, new utility wraps the pattern |
| `src/components/ui/mobile-list-card.tsx` | Already supports all needed props |
| `src/utils/projectDashboard.ts` | Calculation logic unchanged |
| `src/components/WorkOrdersTableView.tsx` | Separate card implementation |

---

## Regression Testing — Phase 1

### Must Not Break
- [ ] Projects list loads on mobile and desktop
- [ ] Tapping a project card navigates to project detail
- [ ] Work order cards are unaffected
- [ ] Desktop table view renders correctly
- [ ] Project detail overview loads without errors
- [ ] `npm run build` succeeds
- [ ] No console errors on Projects page

### Mobile Specific
- [ ] 3-column metrics don't overflow on 320px screen
- [ ] Touch targets remain ≥ 44px (MobileListCard enforces this)
- [ ] Card badges and secondary badges render correctly

import { useMemo } from 'react';
import { Project } from '@/types/project';
import { ExpenseCategory } from '@/types/expense';
import {
  useProjectCostBuckets,
  CostBucket,
  CostBucketLineItem,
  CostBucketCorrelatedExpense,
  CostBucketAcceptedQuote,
  LaborCushionState,
} from '@/hooks/useProjectCostBuckets';

/**
 * Expected Final Cost (EFC) model for the Forecast view.
 *
 * Reframes Cost Tracking from "what have we spent?" to "where will this job
 * land?". Pure derivation over useProjectCostBuckets — no new queries.
 *
 * Per line:   EFC = max(actual, committed, plan)
 *   - plan       = estimate cost for the line (li.target)
 *   - committed  = summed cost of accepted quotes on the line (li.committed)
 *   - actual     = allocated expense cost (li.spent, via correlations)
 *   Never under-projects: actuals over the baseline become the projection;
 *   otherwise we assume the plan/commitment is what will happen.
 *
 * Per category: expectedCost = max(categorySpend, Σ lineEFC)
 *   When unallocated spend pushes the category's actual above the sum of line
 *   projections, the actual wins (so unallocated spend is counted, not lost);
 *   otherwise the line projections win. This avoids double-counting unallocated
 *   spend on top of the plan.
 */

export type EFCLineStatus = 'plan' | 'committed' | 'in_progress' | 'overrun';

export interface EFCLine {
  id: string;
  description: string;
  category: string;
  source: 'estimate' | 'change_order';
  plan: number;
  committed: number;
  actual: number;
  efc: number;
  variance: number; // efc - plan (positive = over the original estimate)
  status: EFCLineStatus;
  isLabor: boolean;
  acceptedQuote?: CostBucketLineItem['acceptedQuote'];
  acceptedQuoteCount?: number;
  hours?: number;
  billingRate?: number;
  cushionAmount?: number;
  // Drill-in detail for the expandable Cost Analysis row
  correlatedExpenses: CostBucketCorrelatedExpense[];
  acceptedQuotes: CostBucketAcceptedQuote[];
}

export interface EFCCategory {
  category: ExpenseCategory;
  displayName: string;
  isInternal: boolean;
  lines: EFCLine[];
  laborCushion?: LaborCushionState;
  subtotal: { plan: number; committed: number; actual: number; efc: number };
  categorySpend: number;   // total actual spend in the category (allocated + unallocated)
  allocatedSpend: number;  // sum of line actuals
  unallocated: number;     // categorySpend - allocatedSpend (informational; prompts allocation)
  expectedCost: number;    // max(categorySpend, Σ lineEFC)
  status: CostBucket['status'];
}

export interface EFCLaborOpportunity {
  bakedIn: number;
  remaining: number;
  zone: LaborCushionState['zone'];
  estHours: number;
  actualHours: number;
  capacityHours: number;
  hoursRemaining: number;
  dollarsBudgeted: number;
  dollarsSpent: number;
  dollarsRemaining: number;
}

export interface ProjectEFCResult {
  pl: {
    contract: number;
    plannedCost: number;
    expectedCost: number;
    plannedMargin: number;
    plannedMarginPct: number;
    projectedMargin: number;
    projectedMarginPct: number;
    marginDelta: number; // projectedMargin - plannedMargin (negative = compression)
    // Labor cushion credited into the margin (eroding). marginWithOpp slides down
    // toward projectedMargin as the cushion is consumed; equal when no/zero cushion.
    marginWithOpp: number;
    marginWithOppPct: number;
    cushionRemaining: number;
    cushionZone: EFCLaborOpportunity['zone'] | null;
    hasCushion: boolean;
  };
  laborOpportunity: EFCLaborOpportunity | null;
  categories: EFCCategory[];
  totalUnallocated: number;
  hasEstimate: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function deriveStatus(plan: number, committed: number, actual: number): EFCLineStatus {
  const baseline = Math.max(committed, plan);
  if (actual > 0 && actual > baseline) return 'overrun';
  if (actual > 0) return 'in_progress';
  if (committed > 0) return 'committed';
  return 'plan';
}

export function useProjectEFC(projectId: string, project: Project): ProjectEFCResult {
  const { buckets, isLoading, error, refetch } = useProjectCostBuckets(projectId, project);

  return useMemo(() => {
    const contract = Number((project as { contracted_amount?: number | string })?.contracted_amount ?? 0);

    const categories: EFCCategory[] = buckets.map((bucket) => {
      const isLaborCat = bucket.category === ExpenseCategory.LABOR;

      const lines: EFCLine[] = bucket.lineItems.map((li) => {
        const plan = li.target ?? 0;
        const committed = li.committed ?? 0;
        const actual = li.spent ?? 0;
        const efc = Math.max(actual, committed, plan);
        return {
          id: li.id,
          description: li.description,
          category: li.category,
          source: li.source,
          plan,
          committed,
          actual,
          efc,
          variance: efc - plan,
          status: deriveStatus(plan, committed, actual),
          isLabor: isLaborCat,
          acceptedQuote: li.acceptedQuote,
          acceptedQuoteCount: li.acceptedQuoteCount,
          hours: li.hours,
          billingRate: li.billingRate,
          cushionAmount: li.cushionAmount,
          correlatedExpenses: li.correlatedExpenses ?? [],
          acceptedQuotes: li.acceptedQuotes ?? [],
        };
      });

      const subtotal = lines.reduce(
        (acc, l) => ({
          plan: acc.plan + l.plan,
          committed: acc.committed + l.committed,
          actual: acc.actual + l.actual,
          efc: acc.efc + l.efc,
        }),
        { plan: 0, committed: 0, actual: 0, efc: 0 }
      );

      const categorySpend = bucket.spent ?? 0;
      const allocatedSpend = subtotal.actual;
      const unallocated = Math.max(0, categorySpend - allocatedSpend);
      const expectedCost = Math.max(categorySpend, subtotal.efc);

      return {
        category: bucket.category,
        displayName: bucket.displayName,
        isInternal: bucket.isInternal,
        lines,
        laborCushion: bucket.laborCushion,
        subtotal,
        categorySpend,
        allocatedSpend,
        unallocated,
        expectedCost,
        status: bucket.status,
      };
    });

    const plannedCost = categories.reduce((s, c) => s + c.subtotal.plan, 0);
    const expectedCost = categories.reduce((s, c) => s + c.expectedCost, 0);
    const totalUnallocated = categories.reduce((s, c) => s + c.unallocated, 0);

    const plannedMargin = contract - plannedCost;
    const projectedMargin = contract - expectedCost;

    const laborBucket = categories.find((c) => c.category === ExpenseCategory.LABOR);
    const cushion = laborBucket?.laborCushion;
    const laborOpportunity: EFCLaborOpportunity | null = cushion
      ? {
          bakedIn: cushion.bakedIn,
          remaining: cushion.remaining,
          zone: cushion.zone,
          estHours: cushion.estHours,
          actualHours: cushion.actualHours,
          capacityHours: cushion.capacityHours,
          hoursRemaining: Math.max(0, cushion.estHours - cushion.actualHours),
          dollarsBudgeted: laborBucket.subtotal.plan,
          dollarsSpent: laborBucket.subtotal.actual,
          dollarsRemaining: Math.max(0, laborBucket.subtotal.plan - laborBucket.subtotal.actual),
        }
      : null;

    // Credit the eroding labor cushion into a second, optimistic margin. Uses the
    // already-computed laborOpportunity.remaining (intact = bakedIn, shrinks through
    // the in_cushion zone, 0 once over_capacity) — no double-counting, since the
    // labor line EFC only flips above plan once over_capacity, at which point
    // remaining is 0 and the two margins converge.
    const cushionRemaining = laborOpportunity?.remaining ?? 0;
    const hasCushion = !!laborOpportunity && laborOpportunity.bakedIn > 0;
    const marginWithOpp = projectedMargin + cushionRemaining;

    return {
      pl: {
        contract,
        plannedCost,
        expectedCost,
        plannedMargin,
        plannedMarginPct: contract > 0 ? (plannedMargin / contract) * 100 : 0,
        projectedMargin,
        projectedMarginPct: contract > 0 ? (projectedMargin / contract) * 100 : 0,
        marginDelta: projectedMargin - plannedMargin,
        marginWithOpp,
        marginWithOppPct: contract > 0 ? (marginWithOpp / contract) * 100 : 0,
        cushionRemaining,
        cushionZone: laborOpportunity?.zone ?? null,
        hasCushion,
      },
      laborOpportunity,
      categories,
      totalUnallocated,
      hasEstimate: categories.length > 0,
      isLoading,
      error,
      refetch,
    };
  }, [buckets, project, isLoading, error, refetch]);
}

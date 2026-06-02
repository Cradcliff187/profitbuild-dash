import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLineItemControl, LineItemControlData } from '@/hooks/useLineItemControl';
import { useInternalLaborRates } from '@/hooks/useCompanySettings';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { Project } from '@/types/project';

/**
 * Per-line item cost bucket detail (rows that appear inside an expanded bucket).
 *
 * On labor lines, hours/billingRate/cushionAmount are populated from
 * estimate_line_items columns (labor_hours, billing_rate_per_hour, labor_cushion_amount).
 * On non-labor lines, acceptedQuote is populated from useLineItemControl's quotes array
 * if any matching quote is in 'accepted' status.
 */
export interface CostBucketCorrelatedExpense {
  id: string;
  expense_date: string | null;
  payee_name: string | null;
  amount: number;
  hours: number | null;
}

export interface CostBucketAcceptedQuote {
  payeeName: string;
  total: number;
  quoteNumber: string;
}

export interface CostBucketLineItem {
  id: string;
  description: string;
  category: string;
  target: number;
  spent: number;
  /** Summed cost of all accepted quotes on this line (the committed amount). 0 when none. */
  committed: number;
  // Labor-specific
  hours?: number;
  billingRate?: number;
  cushionAmount?: number;
  // Non-labor specific
  acceptedQuote?: { payeeName: string; total: number; quoteNumber: string };
  acceptedQuoteCount?: number;
  // Drill-in detail (powers the Cost Analysis expandable row)
  correlatedExpenses: CostBucketCorrelatedExpense[];
  acceptedQuotes: CostBucketAcceptedQuote[];
  source: 'estimate' | 'change_order';
  /** Manual EFC override ("mark final"). When set, the line's EFC is pinned here
   *  instead of max(actual, committed, plan). NULL/undefined = not finalized. */
  finalCostAmount?: number | null;
}

/**
 * Dynamic labor cushion state, computed per render from actual hours vs. estimate.
 *
 * `bakedIn` is the static cushion from estimate_financial_summary.total_labor_cushion
 * (computed at estimate finalization). `remaining` shrinks as actual hours exceed the
 * estimated hours, since each overage hour costs actual_cost_rate without earning any
 * billing/actual rate spread:
 *
 *   if actual <= estHours        → remaining = bakedIn (cushion intact)
 *   if estHours < actual <= cap  → remaining = bakedIn − (actual − estHours) × actualCostRate
 *   if actual > cap              → remaining = 0 (the excess past capacity becomes a real loss)
 */
export interface LaborCushionState {
  bakedIn: number;
  remaining: number;
  estHours: number;
  actualHours: number;
  capacityHours: number;
  zone: 'under_est' | 'in_cushion' | 'over_capacity';
  /** Hours past estimate (capped at hours-cushion). 0 when under estimate. */
  hoursIntoCushion: number;
  /** Hours past total capacity. 0 when within capacity. */
  hoursOverCapacity: number;
}

export interface CostBucket {
  category: ExpenseCategory;
  displayName: string;
  target: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'not_started' | 'on_track' | 'over' | 'no_target';
  isInternal: boolean;
  laborCushion?: LaborCushionState;
  lineItems: CostBucketLineItem[];
}

export interface UseProjectCostBucketsResult {
  buckets: CostBucket[];
  totals: { target: number; spent: number; remaining: number; percentUsed: number };
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const INTERNAL_CATEGORIES: ReadonlySet<string> = new Set([
  ExpenseCategory.LABOR,
  ExpenseCategory.MANAGEMENT,
]);

/**
 * Resolve a display name for any expense_category. Falls back to a humanized
 * version of the raw value if the enum doesn't list it (defensive — keeps
 * "future" categories from rendering as raw snake_case).
 */
function resolveDisplayName(category: string): string {
  const fromMap = (EXPENSE_CATEGORY_DISPLAY as Record<string, string>)[category];
  if (fromMap) return fromMap;
  return category
    .split('_')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

interface CategorySpendRow {
  category: string;
  amount: number;
}

interface LaborCushionRaw {
  totalLaborHours: number;
  totalLaborCushion: number;
  totalLaborCapacity: number;
  actualHours: number;
  actualCost: number;
}

/**
 * Compute per-category spend from expenses + expense_splits.
 *
 * Mirrors the math in reporting.project_financials.total_expenses, but split
 * out by category so each bucket can show its own spend total. Both queries
 * are explicitly project-scoped (Architectural Rule 12 — no unbounded reads).
 */
async function fetchCategorySpend(projectId: string): Promise<CategorySpendRow[]> {
  const [directRes, splitRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('category, amount')
      .eq('project_id', projectId)
      .eq('is_split', false),
    supabase
      .from('expense_splits')
      .select('split_amount, expenses!inner(category)')
      .eq('project_id', projectId),
  ]);

  if (directRes.error) throw directRes.error;
  if (splitRes.error) throw splitRes.error;

  const totals = new Map<string, number>();

  for (const row of directRes.data ?? []) {
    if (!row.category) continue;
    totals.set(row.category, (totals.get(row.category) ?? 0) + Number(row.amount ?? 0));
  }

  for (const row of (splitRes.data ?? []) as Array<{
    split_amount: number | null;
    expenses: { category: string | null } | null;
  }>) {
    const cat = row.expenses?.category;
    if (!cat) continue;
    totals.set(cat, (totals.get(cat) ?? 0) + Number(row.split_amount ?? 0));
  }

  return Array.from(totals.entries()).map(([category, amount]) => ({ category, amount }));
}

/**
 * Resolve the current estimate id for a project, then fetch cushion + actual labor.
 * Returns null if no estimate exists yet (brand-new projects).
 */
async function fetchLaborCushionRaw(projectId: string): Promise<LaborCushionRaw | null> {
  // Resolve current estimate (prefer is_current_version, fall back to most-recent approved).
  // Same lookup pattern as ProjectOperationalDashboard L141-169.
  const { data: currentEstimate } = await supabase
    .from('estimates')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_current_version', true)
    .limit(1)
    .maybeSingle();

  let estimateId = currentEstimate?.id ?? null;

  if (!estimateId) {
    const { data: approvedEstimate } = await supabase
      .from('estimates')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    estimateId = approvedEstimate?.id ?? null;
  }

  const [summaryRes, coLaborRes, laborViewRes] = await Promise.all([
    estimateId
      ? supabase
          .from('estimate_financial_summary')
          .select('total_labor_hours, total_labor_cushion, total_labor_actual_cost')
          .eq('estimate_id', estimateId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
    // Approved change orders are incremental estimates: their internal-labor lines
    // carry the same baked-in cushion and add to the project's labor scope. Fold
    // them into the cushion denominators so labor added via CO doesn't read as
    // estimate overrun (actual hours below are project-wide and already include
    // CO work). Draft/pending/rejected COs are not yet real scope, so approved-only.
    supabase
      .from('change_order_line_items')
      .select('labor_hours, labor_cushion_amount, actual_cost_rate_per_hour, change_orders!inner(project_id, status)')
      .eq('category', 'labor_internal')
      .eq('change_orders.project_id', projectId)
      .eq('change_orders.status', 'approved'),
    // Note: internal_labor_hours_by_project lives in `reporting` schema; PostgREST
    // exposes only the `public` schema by default. The project has historically
    // not exposed reporting via PostgREST, so we query `expenses` directly for
    // labor actuals to stay independent of that exposure choice.
    supabase
      .from('expenses')
      .select('amount, hours')
      .eq('project_id', projectId)
      .eq('category', 'labor_internal')
      .eq('is_split', false),
  ]);

  if (summaryRes.error || laborViewRes.error) return null;

  // Aggregate actual hours/cost client-side. Includes splits-attributable to this
  // project on the cost side via fetchCategorySpend (counted toward bucket spend).
  // Hours-based cushion erosion uses non-split labor expenses' hours column.
  const actualCost = (laborViewRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );
  const actualHours = (laborViewRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.hours ?? 0),
    0
  );

  // Estimate-side labor totals (zeros when the project has no estimate yet).
  const estHours = Number(summaryRes.data?.total_labor_hours ?? 0);
  const estCushion = Number(summaryRes.data?.total_labor_cushion ?? 0);
  const estActualCost = Number(summaryRes.data?.total_labor_actual_cost ?? 0);

  // Approved-CO labor contributions.
  const coRows = (coLaborRes.data ?? []) as Array<{
    labor_hours: number | null;
    labor_cushion_amount: number | null;
    actual_cost_rate_per_hour: number | null;
  }>;
  const coHours = coRows.reduce((s, r) => s + Number(r.labor_hours ?? 0), 0);
  const coCushion = coRows.reduce((s, r) => s + Number(r.labor_cushion_amount ?? 0), 0);
  const coActualCost = coRows.reduce(
    (s, r) => s + Number(r.labor_hours ?? 0) * Number(r.actual_cost_rate_per_hour ?? 0),
    0
  );

  const combinedHours = estHours + coHours;
  if (combinedHours <= 0) return null;

  const combinedCushion = estCushion + coCushion;
  const combinedActualCost = estActualCost + coActualCost;
  // Capacity = estimated hours + however many overage hours the cushion can absorb
  // at the effective actual rate. Recomputed from combined components (matches the
  // estimate_financial_summary view's own formula, extended to include CO labor).
  const effectiveActualRate = combinedActualCost > 0 ? combinedActualCost / combinedHours : 0;
  const combinedCapacity =
    effectiveActualRate > 0 ? combinedHours + combinedCushion / effectiveActualRate : combinedHours;

  return {
    totalLaborHours: combinedHours,
    totalLaborCushion: combinedCushion,
    totalLaborCapacity: combinedCapacity,
    actualHours,
    actualCost,
  };
}

/**
 * Derive the dynamic LaborCushionState from raw inputs.
 *
 * Effective actual_cost_rate is derived from this project's actual labor burn
 * (actualCost / actualHours) when both are positive — that way mixed-rate or
 * historical-rate-shifted projects use the rate the project is actually paying,
 * not whatever the company default happens to be today. Falls back to the
 * company default when no labor has been logged yet.
 */
function computeLaborCushionState(
  raw: LaborCushionRaw,
  fallbackActualCostRate: number
): LaborCushionState {
  const { totalLaborHours: estHours, totalLaborCushion: bakedIn, totalLaborCapacity: capacityHours, actualHours, actualCost } = raw;

  const effectiveActualRate =
    actualHours > 0 && actualCost > 0 ? actualCost / actualHours : fallbackActualCostRate;

  let zone: LaborCushionState['zone'];
  let remaining: number;
  let hoursIntoCushion = 0;
  let hoursOverCapacity = 0;

  if (actualHours <= estHours) {
    zone = 'under_est';
    remaining = bakedIn;
  } else if (actualHours <= capacityHours) {
    zone = 'in_cushion';
    hoursIntoCushion = actualHours - estHours;
    remaining = Math.max(0, bakedIn - hoursIntoCushion * effectiveActualRate);
  } else {
    zone = 'over_capacity';
    hoursIntoCushion = capacityHours - estHours;
    hoursOverCapacity = actualHours - capacityHours;
    remaining = 0;
  }

  return {
    bakedIn,
    remaining,
    estHours,
    actualHours,
    capacityHours,
    zone,
    hoursIntoCushion,
    hoursOverCapacity,
  };
}

/**
 * Resolve the highest-cost accepted quote for a non-labor line item.
 * Returns undefined when no quote has been accepted (the UI shows a
 * "not yet accepted" placeholder in that case).
 */
function resolveAcceptedQuote(
  lineItem: LineItemControlData
): { quote: CostBucketLineItem['acceptedQuote']; count: number } {
  const accepted = lineItem.quotes
    .filter(q => q.status === 'accepted')
    .sort((a, b) => b.total - a.total);
  if (accepted.length === 0) return { quote: undefined, count: 0 };
  const top = accepted[0];
  return {
    quote: { payeeName: top.quotedBy, total: top.total, quoteNumber: top.quoteNumber },
    count: accepted.length,
  };
}

/**
 * Aggregate per-line-item data from useLineItemControl into per-category buckets,
 * then merge with project-level category spend to produce the final bucket list.
 *
 * Bucket sort order:
 *   1. Internal categories first (Labor → Management) for emphasis.
 *   2. Then external categories with a target, by target descending.
 *   3. Then "no target" buckets (spend with no estimate line) at the bottom.
 *
 * This puts the most-actionable rows at the top and the data-hygiene rows last.
 */
function buildBuckets(
  lineItems: LineItemControlData[],
  categorySpend: CategorySpendRow[],
  laborCushion: LaborCushionState | undefined,
  estimateLineItemMeta: Map<string, LineItemMeta>
): CostBucket[] {
  // Group line items by category
  const byCategory = new Map<string, LineItemControlData[]>();
  for (const li of lineItems) {
    const cat = (li.category ?? 'other').toString();
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(li);
  }

  // Build a map of category -> spend
  const spendByCategory = new Map<string, number>();
  for (const { category, amount } of categorySpend) {
    spendByCategory.set(category, amount);
  }

  // Union of all category keys we know about
  const allCategoryKeys = new Set<string>([
    ...byCategory.keys(),
    ...spendByCategory.keys(),
  ]);

  const buckets: CostBucket[] = [];

  for (const cat of allCategoryKeys) {
    const lineItemsForCat = byCategory.get(cat) ?? [];
    const target = lineItemsForCat.reduce((sum, li) => sum + (li.estimatedCost ?? 0), 0);
    const spent = spendByCategory.get(cat) ?? 0;
    const remaining = target - spent;
    const percentUsed = target > 0 ? Math.min((spent / target) * 100, 999) : spent > 0 ? 999 : 0;

    let status: CostBucket['status'];
    if (target <= 0 && spent <= 0) status = 'not_started';
    else if (target <= 0 && spent > 0) status = 'no_target';
    else if (spent <= 0) status = 'not_started';
    else if (spent > target) status = 'over';
    else status = 'on_track';

    const isInternal = INTERNAL_CATEGORIES.has(cat);

    const bucket: CostBucket = {
      category: cat as ExpenseCategory,
      displayName: resolveDisplayName(cat),
      target,
      spent,
      remaining,
      percentUsed,
      status,
      isInternal,
      lineItems: lineItemsForCat.map(li => {
        const meta = estimateLineItemMeta.get(li.id);
        const isLabor = cat === ExpenseCategory.LABOR;
        const baseLine: CostBucketLineItem = {
          id: li.id,
          description: li.description,
          category: cat,
          target: li.estimatedCost ?? 0,
          spent: li.allocatedAmount ?? 0,
          committed: li.quotedCost ?? 0,
          correlatedExpenses: ((li.correlatedExpenses ?? []) as Array<Record<string, unknown>>).map((e) => ({
            id: String(e.id ?? ''),
            expense_date: (e.expense_date as string | null) ?? null,
            payee_name:
              ((e.payees as { payee_name?: string } | null)?.payee_name as string | undefined) ??
              (e.payee_name as string | undefined) ?? null,
            amount: Number((e.amount as number | undefined) ?? (e.split_amount as number | undefined) ?? 0),
            hours: e.hours == null ? null : Number(e.hours),
          })),
          acceptedQuotes: (li.quotes ?? [])
            .filter((q) => q.status === 'accepted')
            .map((q) => ({
              payeeName: String(q.quotedBy ?? ''),
              total: Number(q.total ?? 0),
              quoteNumber: String(q.quoteNumber ?? ''),
            })),
          source: li.source ?? 'estimate',
          finalCostAmount: meta?.finalCostAmount ?? null,
        };
        if (isLabor) {
          baseLine.hours = meta?.laborHours ?? undefined;
          baseLine.billingRate = meta?.billingRatePerHour ?? undefined;
          baseLine.cushionAmount = meta?.laborCushionAmount ?? undefined;
        } else {
          const { quote, count } = resolveAcceptedQuote(li);
          baseLine.acceptedQuote = quote;
          baseLine.acceptedQuoteCount = count;
        }
        return baseLine;
      }),
    };

    if (isInternal && cat === ExpenseCategory.LABOR && laborCushion) {
      bucket.laborCushion = laborCushion;
    }

    buckets.push(bucket);
  }

  // Sort: internal first, then by target desc, no_target last
  buckets.sort((a, b) => {
    const aNoTarget = a.status === 'no_target';
    const bNoTarget = b.status === 'no_target';
    if (aNoTarget !== bNoTarget) return aNoTarget ? 1 : -1;
    if (a.isInternal !== b.isInternal) return a.isInternal ? -1 : 1;
    if (b.target !== a.target) return b.target - a.target;
    return a.displayName.localeCompare(b.displayName);
  });

  return buckets;
}

interface LineItemMeta {
  laborHours: number | null;
  billingRatePerHour: number | null;
  laborCushionAmount: number | null;
  finalCostAmount: number | null;
}

/**
 * Fetch the labor-specific columns for the current estimate's line items.
 * useLineItemControl's existing fetch doesn't pull these (they're labor-only and
 * weren't needed for the dense table). Returned as a id → meta lookup.
 */
async function fetchEstimateLineItemMeta(projectId: string): Promise<Map<string, LineItemMeta>> {
  // Resolve the SAME estimate useLineItemControl uses for the displayed bucket lines:
  // approved (latest) → current version → latest by date. These MUST stay in lockstep,
  // or meta (labor cushion + the final-cost override) would key to a different
  // estimate version than the lines on screen and silently not apply.
  let estimateId: string | null = null;

  const { data: approvedEstimate } = await supabase
    .from('estimates')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'approved')
    .order('date_created', { ascending: false })
    .limit(1)
    .maybeSingle();
  estimateId = approvedEstimate?.id ?? null;

  if (!estimateId) {
    const { data: currentEstimate } = await supabase
      .from('estimates')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_current_version', true)
      .order('date_created', { ascending: false })
      .limit(1)
      .maybeSingle();
    estimateId = currentEstimate?.id ?? null;
  }

  if (!estimateId) {
    const { data: latestEstimate } = await supabase
      .from('estimates')
      .select('id')
      .eq('project_id', projectId)
      .order('date_created', { ascending: false })
      .limit(1)
      .maybeSingle();
    estimateId = latestEstimate?.id ?? null;
  }

  const map = new Map<string, LineItemMeta>();

  if (estimateId) {
    const { data, error } = await supabase
      .from('estimate_line_items')
      .select('id, labor_hours, billing_rate_per_hour, labor_cushion_amount, final_cost_amount')
      .eq('estimate_id', estimateId);

    if (!error && data) {
      for (const row of data) {
        map.set(row.id, {
          laborHours: row.labor_hours != null ? Number(row.labor_hours) : null,
          billingRatePerHour: row.billing_rate_per_hour != null ? Number(row.billing_rate_per_hour) : null,
          laborCushionAmount: row.labor_cushion_amount != null ? Number(row.labor_cushion_amount) : null,
          finalCostAmount: row.final_cost_amount != null ? Number(row.final_cost_amount) : null,
        });
      }
    }
  }

  // Approved-CO lines: labor lines surface their own cushion, and ANY CO line can
  // carry a final-cost override — so pull every approved-CO line (not just labor).
  // Their bucket line id is the change_order_line_items id. Labor fields are null
  // for non-labor rows (only read in the labor branch), which is fine.
  const { data: coData } = await supabase
    .from('change_order_line_items')
    .select('id, labor_hours, billing_rate_per_hour, labor_cushion_amount, final_cost_amount, change_orders!inner(project_id, status)')
    .eq('change_orders.project_id', projectId)
    .eq('change_orders.status', 'approved');

  for (const row of (coData ?? []) as Array<{
    id: string;
    labor_hours: number | null;
    billing_rate_per_hour: number | null;
    labor_cushion_amount: number | null;
    final_cost_amount: number | null;
  }>) {
    map.set(row.id, {
      laborHours: row.labor_hours != null ? Number(row.labor_hours) : null,
      billingRatePerHour: row.billing_rate_per_hour != null ? Number(row.billing_rate_per_hour) : null,
      laborCushionAmount: row.labor_cushion_amount != null ? Number(row.labor_cushion_amount) : null,
      finalCostAmount: row.final_cost_amount != null ? Number(row.final_cost_amount) : null,
    });
  }

  return map;
}

/**
 * Composite hook producing per-category cost buckets for the project.
 *
 * Composes: useLineItemControl (line items + correlations + quotes)
 *         + categorySpend query (project-scoped expenses + splits, grouped by category)
 *         + laborCushionRaw query (estimate_financial_summary + actual labor hours)
 *         + estimateLineItemMeta query (labor_hours, billing_rate_per_hour, labor_cushion_amount)
 *         + useInternalLaborRates (fallback actual_cost_rate for cushion math)
 *
 * The non-useLineItemControl reads use TanStack Query so they invalidate cleanly
 * across mutations (CLAUDE.md gotcha 23 + the "useProjectData not reactive" follow-up).
 */
export function useProjectCostBuckets(
  projectId: string,
  project: Project
): UseProjectCostBucketsResult {
  const lineItemControl = useLineItemControl(projectId, project);
  const laborRatesQuery = useInternalLaborRates();

  const categorySpendQuery = useQuery({
    queryKey: ['project-cost-buckets', 'category-spend', projectId],
    queryFn: () => fetchCategorySpend(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const laborCushionRawQuery = useQuery({
    queryKey: ['project-cost-buckets', 'labor-cushion', projectId],
    queryFn: () => fetchLaborCushionRaw(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const estimateMetaQuery = useQuery({
    queryKey: ['project-cost-buckets', 'estimate-meta', projectId],
    queryFn: () => fetchEstimateLineItemMeta(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const result = useMemo<UseProjectCostBucketsResult>(() => {
    const isLoading =
      lineItemControl.isLoading ||
      categorySpendQuery.isLoading ||
      laborCushionRawQuery.isLoading ||
      estimateMetaQuery.isLoading;

    const error =
      lineItemControl.error ||
      (categorySpendQuery.error instanceof Error ? categorySpendQuery.error.message : null) ||
      (laborCushionRawQuery.error instanceof Error ? laborCushionRawQuery.error.message : null) ||
      (estimateMetaQuery.error instanceof Error ? estimateMetaQuery.error.message : null) ||
      null;

    const fallbackRate = laborRatesQuery.data?.actual_cost_per_hour ?? 0;
    const cushionState =
      laborCushionRawQuery.data != null
        ? computeLaborCushionState(laborCushionRawQuery.data, fallbackRate)
        : undefined;

    const buckets = buildBuckets(
      lineItemControl.lineItems,
      categorySpendQuery.data ?? [],
      cushionState,
      estimateMetaQuery.data ?? new Map()
    );

    const totals = buckets.reduce(
      (acc, b) => {
        acc.target += b.target;
        acc.spent += b.spent;
        return acc;
      },
      { target: 0, spent: 0, remaining: 0, percentUsed: 0 }
    );
    totals.remaining = totals.target - totals.spent;
    totals.percentUsed =
      totals.target > 0 ? Math.min((totals.spent / totals.target) * 100, 999) : 0;

    return {
      buckets,
      totals,
      isLoading,
      error,
      refetch: () => {
        lineItemControl.refetch();
        categorySpendQuery.refetch();
        laborCushionRawQuery.refetch();
        estimateMetaQuery.refetch();
      },
    };
    // We intentionally depend on individual primitive/data fields rather than the query
    // objects themselves — query objects are recreated each render, which would defeat
    // memoization. eslint can't see through this and warns; the deps below are complete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lineItemControl.lineItems,
    lineItemControl.isLoading,
    lineItemControl.error,
    lineItemControl.refetch,
    categorySpendQuery.data,
    categorySpendQuery.isLoading,
    categorySpendQuery.error,
    categorySpendQuery.refetch,
    laborCushionRawQuery.data,
    laborCushionRawQuery.isLoading,
    laborCushionRawQuery.error,
    laborCushionRawQuery.refetch,
    estimateMetaQuery.data,
    estimateMetaQuery.isLoading,
    estimateMetaQuery.error,
    estimateMetaQuery.refetch,
    laborRatesQuery.data,
  ]);

  return result;
}

import { supabase } from "@/integrations/supabase/client";

/**
 * Read-side helpers for the "connected records" awareness surfaces:
 * the estimate status-change dialog (EstimateStatusSelector) and the
 * dropped-line carry-forward review on estimate save (EstimateForm).
 *
 * Everything here is read-only. The automatic carry-forward itself lives in
 * the create_estimate_version RPC (Rule 27) — these helpers only surface what
 * is attached so the user can make an informed call before the write happens.
 */

export interface AttachedQuote {
  id: string;
  quoteNumber: string;
  payeeName: string;
  status: string;
  totalAmount: number;
}

export interface LineItemConnections {
  lineItemId: string;
  acceptedQuotes: AttachedQuote[];
  /** Attached quotes in any non-accepted status (draft/sent/rejected/expired). */
  otherQuoteCount: number;
  allocationCount: number;
  allocationTotal: number;
  assignmentCount: number;
}

export const lineHasConnections = (c: LineItemConnections): boolean =>
  c.acceptedQuotes.length > 0 ||
  c.otherQuoteCount > 0 ||
  c.allocationCount > 0 ||
  c.assignmentCount > 0;

export interface EstimateConnectionsSummary {
  acceptedQuoteCount: number;
  acceptedQuoteTotal: number;
  otherQuoteCount: number;
  allocationCount: number;
  allocationTotal: number;
  assignmentCount: number;
  contractCount: number;
  hasSov: boolean;
  hasAny: boolean;
}

const EMPTY_SUMMARY: EstimateConnectionsSummary = {
  acceptedQuoteCount: 0,
  acceptedQuoteTotal: 0,
  otherQuoteCount: 0,
  allocationCount: 0,
  allocationTotal: 0,
  assignmentCount: 0,
  contractCount: 0,
  hasSov: false,
  hasAny: false,
};

interface QuoteLinkRow {
  estimate_line_item_id: string | null;
  quotes: {
    id: string;
    quote_number: string;
    status: string;
    total_amount: number | null;
    payees: { payee_name: string } | null;
  } | null;
}

interface CorrelationRow {
  estimate_line_item_id: string | null;
  expenses: { amount: number | null } | null;
  expense_splits: { split_amount: number | null } | null;
}

interface RawConnections {
  quoteLinks: QuoteLinkRow[];
  correlations: CorrelationRow[];
  assignments: { estimate_line_item_id: string | null }[];
}

async function fetchRawConnections(lineItemIds: string[]): Promise<RawConnections> {
  if (lineItemIds.length === 0) {
    return { quoteLinks: [], correlations: [], assignments: [] };
  }

  const [qliRes, corrRes, assignRes] = await Promise.all([
    supabase
      .from("quote_line_items")
      .select(
        "estimate_line_item_id, quotes(id, quote_number, status, total_amount, payees(payee_name))"
      )
      .in("estimate_line_item_id", lineItemIds),
    supabase
      .from("expense_line_item_correlations")
      .select("estimate_line_item_id, expenses(amount), expense_splits(split_amount)")
      .in("estimate_line_item_id", lineItemIds),
    supabase
      .from("crew_day_assignments")
      .select("estimate_line_item_id")
      .in("estimate_line_item_id", lineItemIds),
  ]);

  if (qliRes.error) throw qliRes.error;
  if (corrRes.error) throw corrRes.error;
  if (assignRes.error) throw assignRes.error;

  return {
    quoteLinks: (qliRes.data ?? []) as unknown as QuoteLinkRow[],
    correlations: (corrRes.data ?? []) as unknown as CorrelationRow[],
    assignments: assignRes.data ?? [],
  };
}

/** Split correlations carry their own amount; whole-expense correlations use expenses.amount. */
const correlationAmount = (row: CorrelationRow): number =>
  Number(row.expense_splits?.split_amount ?? row.expenses?.amount ?? 0);

/**
 * Per-line attachment lookup for a set of estimate_line_items. Lines with
 * nothing attached are absent from the returned map.
 */
export async function fetchLineItemConnections(
  lineItemIds: string[]
): Promise<Map<string, LineItemConnections>> {
  const raw = await fetchRawConnections(lineItemIds);
  const map = new Map<string, LineItemConnections>();

  const ensure = (lineItemId: string): LineItemConnections => {
    let entry = map.get(lineItemId);
    if (!entry) {
      entry = {
        lineItemId,
        acceptedQuotes: [],
        otherQuoteCount: 0,
        allocationCount: 0,
        allocationTotal: 0,
        assignmentCount: 0,
      };
      map.set(lineItemId, entry);
    }
    return entry;
  };

  // A quote can attach to a line via multiple quote_line_items rows — count each quote once per line.
  const seenQuotePerLine = new Set<string>();
  for (const link of raw.quoteLinks) {
    if (!link.estimate_line_item_id || !link.quotes) continue;
    const key = `${link.estimate_line_item_id}:${link.quotes.id}`;
    if (seenQuotePerLine.has(key)) continue;
    seenQuotePerLine.add(key);

    const entry = ensure(link.estimate_line_item_id);
    if (link.quotes.status === "accepted") {
      entry.acceptedQuotes.push({
        id: link.quotes.id,
        quoteNumber: link.quotes.quote_number,
        payeeName: link.quotes.payees?.payee_name ?? "Unknown vendor",
        status: link.quotes.status,
        totalAmount: Number(link.quotes.total_amount ?? 0),
      });
    } else {
      entry.otherQuoteCount += 1;
    }
  }

  for (const corr of raw.correlations) {
    if (!corr.estimate_line_item_id) continue;
    const entry = ensure(corr.estimate_line_item_id);
    entry.allocationCount += 1;
    entry.allocationTotal += correlationAmount(corr);
  }

  for (const assign of raw.assignments) {
    if (!assign.estimate_line_item_id) continue;
    ensure(assign.estimate_line_item_id).assignmentCount += 1;
  }

  return map;
}

/**
 * Aggregate connection summary across one or more estimates — powers the
 * status-change dialog. Quotes are deduped across lines; contracts are
 * counted off the attached quotes; SOV presence is checked per estimate.
 */
export async function fetchEstimateConnectionsSummary(
  estimateIds: string[]
): Promise<EstimateConnectionsSummary> {
  if (estimateIds.length === 0) return { ...EMPTY_SUMMARY };

  const { data: lines, error: linesError } = await supabase
    .from("estimate_line_items")
    .select("id")
    .in("estimate_id", estimateIds);
  if (linesError) throw linesError;

  const lineIds = (lines ?? []).map((l) => l.id);

  const [raw, sovRes] = await Promise.all([
    fetchRawConnections(lineIds),
    supabase
      .from("schedule_of_values")
      .select("id", { count: "exact", head: true })
      .in("estimate_id", estimateIds),
  ]);
  if (sovRes.error) throw sovRes.error;

  const acceptedQuoteTotals = new Map<string, number>();
  const otherQuoteIds = new Set<string>();
  for (const link of raw.quoteLinks) {
    if (!link.quotes) continue;
    if (link.quotes.status === "accepted") {
      acceptedQuoteTotals.set(link.quotes.id, Number(link.quotes.total_amount ?? 0));
    } else {
      otherQuoteIds.add(link.quotes.id);
    }
  }

  let contractCount = 0;
  const attachedQuoteIds = [
    ...new Set(raw.quoteLinks.map((l) => l.quotes?.id).filter(Boolean) as string[]),
  ];
  if (attachedQuoteIds.length > 0) {
    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select("id, status")
      .in("quote_id", attachedQuoteIds);
    if (contractsError) throw contractsError;
    contractCount = (contracts ?? []).filter((c) => c.status !== "superseded").length;
  }

  const allocationCount = raw.correlations.length;
  const allocationTotal = raw.correlations.reduce(
    (sum, corr) => sum + correlationAmount(corr),
    0
  );

  const summary: EstimateConnectionsSummary = {
    acceptedQuoteCount: acceptedQuoteTotals.size,
    acceptedQuoteTotal: [...acceptedQuoteTotals.values()].reduce((a, b) => a + b, 0),
    otherQuoteCount: otherQuoteIds.size,
    allocationCount,
    allocationTotal,
    assignmentCount: raw.assignments.length,
    contractCount,
    hasSov: (sovRes.count ?? 0) > 0,
    hasAny: false,
  };
  summary.hasAny =
    summary.acceptedQuoteCount > 0 ||
    summary.otherQuoteCount > 0 ||
    summary.allocationCount > 0 ||
    summary.assignmentCount > 0 ||
    summary.contractCount > 0 ||
    summary.hasSov;

  return summary;
}

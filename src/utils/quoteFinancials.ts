import { Quote, QuoteLineItem } from "@/types/quote";
import { Estimate, LineItem } from "@/types/estimate";

// Financial metrics interface for quotes
export interface QuoteFinancialMetrics {
  totalAmount: number;
  totalCost: number;
  totalMarkup: number;
  grossProfit: number;
  grossMargin: number;
  averageMarkup: number;
}

// Calculate total amount from quote line items
export function calculateQuoteTotalAmount(lineItems: QuoteLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.total, 0);
}

// Calculate total cost from quote line items
export function calculateQuoteTotalCost(lineItems: QuoteLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
}

// Calculate total markup from quote line items
export function calculateQuoteTotalMarkup(lineItems: QuoteLineItem[]): number {
  return lineItems.reduce((sum, item) => {
    if (item.markupPercent !== null && item.markupPercent !== undefined) {
      return sum + (item.quantity * item.costPerUnit * (item.markupPercent / 100));
    }
    if (item.markupAmount !== null && item.markupAmount !== undefined) {
      return sum + (item.quantity * item.markupAmount);
    }
    return sum;
  }, 0);
}

// Calculate gross profit (total amount - total cost)
export function calculateQuoteGrossProfit(lineItems: QuoteLineItem[]): number {
  const totalAmount = calculateQuoteTotalAmount(lineItems);
  const totalCost = calculateQuoteTotalCost(lineItems);
  return totalAmount - totalCost;
}

// Calculate gross margin percentage
export function calculateQuoteGrossMargin(lineItems: QuoteLineItem[]): number {
  const totalAmount = calculateQuoteTotalAmount(lineItems);
  const grossProfit = calculateQuoteGrossProfit(lineItems);
  
  if (totalAmount === 0) return 0;
  return (grossProfit / totalAmount) * 100;
}

// Calculate average markup percentage
export function calculateQuoteAverageMarkup(lineItems: QuoteLineItem[]): number {
  const totalCost = calculateQuoteTotalCost(lineItems);
  const totalMarkup = calculateQuoteTotalMarkup(lineItems);
  
  if (totalCost === 0) return 0;
  return (totalMarkup / totalCost) * 100;
}

// Calculate all financial metrics at once
export function calculateQuoteFinancials(lineItems: QuoteLineItem[]): QuoteFinancialMetrics {
  const totalAmount = calculateQuoteTotalAmount(lineItems);
  const totalCost = calculateQuoteTotalCost(lineItems);
  const totalMarkup = calculateQuoteTotalMarkup(lineItems);
  const grossProfit = totalAmount - totalCost;
  const grossMargin = totalAmount > 0 ? (grossProfit / totalAmount) * 100 : 0;
  const averageMarkup = totalCost > 0 ? (totalMarkup / totalCost) * 100 : 0;

  return {
    totalAmount,
    totalCost,
    totalMarkup,
    grossProfit,
    grossMargin,
    averageMarkup
  };
}

// Compare quote vs estimate costs by category
export interface CategoryCostComparison {
  estimatedCost: number;
  quotedCost: number;
  estimatedPrice: number;
  quotedPrice: number;
  costVariance: number;
  priceVariance: number;
  costVariancePercent: number;
  priceVariancePercent: number;
}

export function compareQuoteToEstimate(
  quoteLineItems: QuoteLineItem[],
  estimateLineItems: LineItem[]
): { [category: string]: CategoryCostComparison } {
  const comparison: { [category: string]: CategoryCostComparison } = {};

  // Get unique categories from both quote and estimate
  const categories = new Set([
    ...quoteLineItems.map(item => item.category),
    ...estimateLineItems.map(item => item.category)
  ]);

  categories.forEach(category => {
    const quoteItems = quoteLineItems.filter(item => item.category === category);
    const estimateItems = estimateLineItems.filter(item => item.category === category);

    const estimatedCost = estimateItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
    const quotedCost = quoteItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
    const estimatedPrice = estimateItems.reduce((sum, item) => sum + item.total, 0);
    const quotedPrice = quoteItems.reduce((sum, item) => sum + item.total, 0);

    const costVariance = quotedCost - estimatedCost;
    const priceVariance = quotedPrice - estimatedPrice;
    const costVariancePercent = estimatedCost > 0 ? (costVariance / estimatedCost) * 100 : 0;
    const priceVariancePercent = estimatedPrice > 0 ? (priceVariance / estimatedPrice) * 100 : 0;

    comparison[category] = {
      estimatedCost,
      quotedCost,
      estimatedPrice,
      quotedPrice,
      costVariance,
      priceVariance,
      costVariancePercent,
      priceVariancePercent
    };
  });

  return comparison;
}

// Profit calculation functions for quote analysis
export function calculateQuoteProfitPerUnit(estimatePrice: number, vendorCost: number): number {
  return estimatePrice - vendorCost;
}

export function calculateQuoteTotalProfit(quoteLineItems: QuoteLineItem[], estimateLineItems: LineItem[]): number {
  return quoteLineItems.reduce((totalProfit, quoteItem) => {
    const estimateItem = estimateLineItems.find(e => e.id === quoteItem.estimateLineItemId);
    if (!estimateItem) return totalProfit;
    
    const profitPerUnit = calculateQuoteProfitPerUnit(estimateItem.pricePerUnit, quoteItem.costPerUnit);
    return totalProfit + (profitPerUnit * quoteItem.quantity);
  }, 0);
}

export function calculateQuoteProfitMargin(totalProfit: number, totalRevenue: number): number {
  if (totalRevenue === 0) return 0;
  return (totalProfit / totalRevenue) * 100;
}

export function calculateMinimumAcceptableCost(estimatePrice: number, targetMarginPercent: number): number {
  return estimatePrice * (1 - (targetMarginPercent / 100));
}

export function getProfitStatus(profitMargin: number): 'excellent' | 'good' | 'acceptable' | 'loss' {
  if (profitMargin >= 25) return 'excellent';
  if (profitMargin >= 15) return 'good';
  if (profitMargin >= 5) return 'acceptable';
  return 'loss';
}

// Performance status functions
export function getCostVarianceStatus(variancePercent: number): 'excellent' | 'good' | 'poor' | 'critical' {
  const absVariance = Math.abs(variancePercent);
  if (absVariance <= 5) return 'excellent';
  if (absVariance <= 15) return 'good';
  if (absVariance <= 30) return 'poor';
  return 'critical';
}

export function getMarginPerformanceStatus(marginPercent: number): 'excellent' | 'good' | 'poor' | 'critical' {
  if (marginPercent >= 25) return 'excellent';
  if (marginPercent >= 15) return 'good';
  if (marginPercent >= 5) return 'poor';
  return 'critical';
}

// ─── Quote-to-Estimate lookup helpers ──────────────────────────────────

/**
 * Find the matching estimate for a given quote.
 * Prioritizes exact estimate_id match, falls back to project_id match.
 */
export function getEstimateForQuote(
  quote: Quote,
  estimates: Estimate[]
): Estimate | undefined {
  if (quote.estimate_id) {
    const byId = estimates.find(est => est.id === quote.estimate_id);
    if (byId) return byId;
  }
  return estimates.find(est => est.project_id === quote.project_id);
}

/**
 * Get the vendor's quoted cost from quote line items.
 * This is the COST (what we pay the vendor), derived from line items.
 * Always use this instead of quote.total for display to ensure
 * correctness even for quotes saved before the totalCost fix.
 */
export function getQuotedCost(quote: Quote): number {
  return quote.lineItems.reduce(
    (sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit),
    0
  );
}

/**
 * Get the corresponding estimate line item COST for a quote.
 * Returns the sum of estimate totalCost for each matched line item.
 * This is COST (what we estimated we'd pay), NOT price (what we charge client).
 */
export function getEstimateLineItemCost(
  quote: Quote,
  estimates: Estimate[]
): number | null {
  const estimate = getEstimateForQuote(quote, estimates);
  if (!estimate?.lineItems?.length) return null;

  const estimateLineItems = estimate.lineItems;
  const quoteLineItems = quote.lineItems || [];

  let totalEstimatedCost = 0;
  let hasMatch = false;

  // Match via quote line items' estimateLineItemId links
  if (quoteLineItems.length > 0) {
    quoteLineItems.forEach(qli => {
      const linkId = qli.estimateLineItemId || qli.estimate_line_item_id;
      if (linkId) {
        const eli = estimateLineItems.find(item => item.id === linkId);
        if (eli) {
          totalEstimatedCost += Number(eli.totalCost || 0);
          hasMatch = true;
        } else {
          console.warn(
            `Quote line item references estimate line item ${linkId} but it was not found in estimate ${estimate.id}`
          );
        }
      }
    });
    if (hasMatch) return totalEstimatedCost;
  }

  // Fallback: quote-level estimate_line_item_id
  if (quote.estimate_line_item_id) {
    const eli = estimateLineItems.find(item => item.id === quote.estimate_line_item_id);
    if (eli) return Number(eli.totalCost || 0);
  }

  return null;
}

/**
 * Get the corresponding estimate line item PRICE for a quote.
 * Returns client-facing price. Use only for margin/profit analysis,
 * NOT for cost variance comparisons.
 */
export function getEstimateLineItemPrice(
  quote: Quote,
  estimates: Estimate[]
): number | null {
  const estimate = getEstimateForQuote(quote, estimates);
  if (!estimate?.lineItems?.length) return null;

  const estimateLineItems = estimate.lineItems;
  const quoteLineItems = quote.lineItems || [];

  let totalEstimatedPrice = 0;
  let hasMatch = false;

  if (quoteLineItems.length > 0) {
    quoteLineItems.forEach(qli => {
      const linkId = qli.estimateLineItemId || qli.estimate_line_item_id;
      if (linkId) {
        const eli = estimateLineItems.find(item => item.id === linkId);
        if (eli) {
          totalEstimatedPrice += Number(eli.total || 0);
          hasMatch = true;
        }
      }
    });
    if (hasMatch) return totalEstimatedPrice;
  }

  if (quote.estimate_line_item_id) {
    const eli = estimateLineItems.find(item => item.id === quote.estimate_line_item_id);
    if (eli) return Number(eli.total || 0);
  }

  return null;
}

export interface CostVarianceResult {
  amount: number;
  percentage: number;
  status: 'under' | 'over' | 'on' | 'none';
}

export interface SignedCostVariance extends CostVarianceResult {
  /** Signed delta: negative = under estimate (good), positive = over (bad), null = no baseline */
  signedAmount: number | null;
  /** The estimate-side baseline used (sum of covered line-item costs), null if no match */
  baseline: number | null;
  /** Quoted cost that was compared */
  quotedCost: number;
}

// ─── Peer comparison helpers ───────────────────────────────────────────

export interface PeerBid {
  quoteId: string;
  quoteNumber: string;
  vendor: string;
  status: string;
  costOnThisLine: number;
  isCurrent: boolean;
}

export interface LineItemPeers {
  estimateLineItemId: string;
  description: string;
  category: string;
  estimatedCost: number | null;
  bids: PeerBid[]; // sorted ascending by costOnThisLine
  myBid: PeerBid | undefined;
}

/**
 * For a given quote, build per-line-item peer leaderboards.
 * Peers = any other quote whose quote_line_items reference the SAME estimate_line_item_id.
 * Same-version-only by design — schema has no cross-version line-item family.
 */
export function getQuotePeersByLineItem(
  quote: Quote,
  allQuotes: Quote[],
  estimates: Estimate[]
): LineItemPeers[] {
  const estimate = getEstimateForQuote(quote, estimates);
  const estimateLines = estimate?.lineItems ?? [];

  const myLineIds = new Set(
    quote.lineItems
      .map((qli) => qli.estimateLineItemId || qli.estimate_line_item_id)
      .filter((id): id is string => !!id)
  );

  const result: LineItemPeers[] = [];

  for (const lineId of myLineIds) {
    const estLine = estimateLines.find((l) => l.id === lineId);
    const bids: PeerBid[] = [];

    for (const q of allQuotes) {
      const hit = q.lineItems.find(
        (qli) => (qli.estimateLineItemId || qli.estimate_line_item_id) === lineId
      );
      if (!hit) continue;
      bids.push({
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        vendor: q.quotedBy,
        status: String(q.status),
        costOnThisLine: Number(hit.totalCost ?? hit.quantity * hit.costPerUnit ?? 0),
        isCurrent: q.id === quote.id,
      });
    }

    bids.sort((a, b) => a.costOnThisLine - b.costOnThisLine);
    const myBid = bids.find((b) => b.isCurrent);

    result.push({
      estimateLineItemId: lineId,
      description: estLine?.description || "Untitled line",
      category: String(estLine?.category || "other"),
      estimatedCost: estLine ? Number(estLine.totalCost ?? 0) : null,
      bids,
      myBid,
    });
  }

  // Sort line-items by estimated cost descending so the biggest decisions surface first
  result.sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0));
  return result;
}

/** Count distinct OTHER quotes that share at least one line item with this quote. */
export function countLineItemPeerQuotes(
  quote: Quote,
  allQuotes: Quote[]
): number {
  const myLineIds = new Set(
    quote.lineItems
      .map((qli) => qli.estimateLineItemId || qli.estimate_line_item_id)
      .filter((id): id is string => !!id)
  );
  if (myLineIds.size === 0) return 0;

  const peers = new Set<string>();
  for (const q of allQuotes) {
    if (q.id === quote.id) continue;
    const hasOverlap = q.lineItems.some((qli) => {
      const id = qli.estimateLineItemId || qli.estimate_line_item_id;
      return id ? myLineIds.has(id) : false;
    });
    if (hasOverlap) peers.add(q.id);
  }
  return peers.size;
}

// ─── Margin analysis ───────────────────────────────────────────────────

export interface MarginIfAccepted {
  /** Margin % if we accept this quote and bill the estimate's sell price */
  marginPercent: number;
  /** Estimate's configured target margin (defaults to 20%) */
  targetMarginPercent: number;
  /** Minimum vendor cost that would still hit target margin */
  maxVendorCostForTarget: number;
  /** Dollar-level gap vs target margin (positive = exceeds target) */
  marginDollarImpact: number;
  /** Status band for quick visual read */
  status: 'excellent' | 'on-target' | 'marginal' | 'loss';
  /** True when we have baseline data to compute against */
  available: boolean;
}

/**
 * Compute "what margin do I keep if I accept this vendor's quote?" for the line items this quote covers.
 * Uses estimate line-item sell totals (quote → estimate mapping already in getEstimateLineItemPrice).
 */
export function getMarginIfAccepted(
  quote: Quote,
  estimates: Estimate[]
): MarginIfAccepted {
  const sellBaseline = getEstimateLineItemPrice(quote, estimates);
  const vendorCost = getQuotedCost(quote);
  const estimate = getEstimateForQuote(quote, estimates);
  const targetMarginPercent = estimate?.targetMarginPercent ?? 20;

  if (sellBaseline === null || sellBaseline <= 0) {
    return {
      marginPercent: 0,
      targetMarginPercent,
      maxVendorCostForTarget: 0,
      marginDollarImpact: 0,
      status: 'marginal',
      available: false,
    };
  }

  const marginPercent = ((sellBaseline - vendorCost) / sellBaseline) * 100;
  const maxVendorCostForTarget = sellBaseline * (1 - targetMarginPercent / 100);
  const marginDollarImpact = maxVendorCostForTarget - vendorCost;

  const status: MarginIfAccepted['status'] =
    marginPercent < 0
      ? 'loss'
      : marginPercent < 10
      ? 'marginal'
      : marginPercent < targetMarginPercent
      ? 'on-target'
      : 'excellent';

  return {
    marginPercent,
    targetMarginPercent,
    maxVendorCostForTarget,
    marginDollarImpact,
    status,
    available: true,
  };
}

/**
 * Like getCostVariance but preserves sign + baseline for UI display.
 * Used by QuoteViewHero to render the "screaming number" variance.
 */
export function getSignedCostVariance(
  quote: Quote,
  estimates: Estimate[]
): SignedCostVariance {
  const baseline = getEstimateLineItemCost(quote, estimates);
  const quotedCost = getQuotedCost(quote);

  // Truly no baseline — can't compute at all.
  if (baseline === null) {
    return {
      amount: 0,
      percentage: 0,
      status: 'none',
      signedAmount: null,
      baseline: null,
      quotedCost,
    };
  }

  const signedAmount = quotedCost - baseline;
  const signedPercent = baseline === 0 ? 0 : (signedAmount / baseline) * 100;

  return {
    amount: Math.abs(signedAmount),
    percentage: Math.abs(signedPercent),
    status: signedAmount > 0 ? 'over' : signedAmount < 0 ? 'under' : 'on',
    signedAmount,
    baseline,
    quotedCost,
  };
}

/**
 * Calculate cost variance between quoted cost and estimated cost.
 * Positive = over estimate (bad), Negative = under estimate (good).
 */
export function getCostVariance(
  quote: Quote,
  estimates: Estimate[]
): CostVarianceResult {
  const estimateCost = getEstimateLineItemCost(quote, estimates);
  const quotedCost = getQuotedCost(quote);

  if (estimateCost === null || quotedCost === 0) {
    return { amount: 0, percentage: 0, status: 'none' };
  }

  const variance = quotedCost - estimateCost;
  const variancePercent = (variance / estimateCost) * 100;

  return {
    amount: Math.abs(variance),
    percentage: Math.abs(variancePercent),
    status: variance > 0 ? 'over' : variance < 0 ? 'under' : 'none',
  };
}
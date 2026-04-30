import type { LineItem } from '@/types/estimate';

/**
 * Single source of truth for estimate line item math, mirroring the DB schema:
 *   total      = round((quantity * price_per_unit), 2)   // generated column on estimate_line_items
 *   total_cost = quantity * cost_per_unit
 *   total_markup = total - total_cost
 *
 * Use these helpers from any component that displays line item sums
 * (LineItemTable totals row, EstimateForm summary card, Estimate exports, etc.).
 * Never recompute these inline; drift between two implementations is exactly
 * what created the rate-vs-price_per_unit bug fixed in Phase 1.
 */

/** Round to 2 decimals (currency). Matches DB's numeric(15,2) coercion on `total`. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const lineItemTotal = (item: LineItem): number =>
  round2(item.quantity * item.pricePerUnit);

export const lineItemCost = (item: LineItem): number =>
  round2(item.quantity * item.costPerUnit);

export const lineItemMarkup = (item: LineItem): number =>
  lineItemTotal(item) - lineItemCost(item);

/** Realized markup percent derived from price + cost. Independent of stored markup_percent. */
export const lineItemMarkupPercent = (item: LineItem): number => {
  if (item.costPerUnit <= 0) return 0;
  return ((item.pricePerUnit - item.costPerUnit) / item.costPerUnit) * 100;
};

export const calcSubtotal = (items: LineItem[]): number =>
  round2(items.reduce((sum, item) => sum + lineItemTotal(item), 0));

export const calcTotalCost = (items: LineItem[]): number =>
  round2(items.reduce((sum, item) => sum + lineItemCost(item), 0));

export const calcTotalMarkup = (items: LineItem[]): number =>
  calcSubtotal(items) - calcTotalCost(items);

export const calcAvgMarkupPercent = (items: LineItem[]): number => {
  const totalCost = calcTotalCost(items);
  if (totalCost <= 0) return 0;
  return (calcTotalMarkup(items) / totalCost) * 100;
};

/**
 * Format a unit price showing natural precision: at least 2 decimals,
 * trailing zeros beyond the 2nd decimal stripped, up to 5 decimals retained.
 *
 * Examples:
 *   0       -> "$0.00"
 *   0.10    -> "$0.10"
 *   0.13    -> "$0.13"
 *   0.125   -> "$0.125"
 *   250     -> "$250.00"
 *   0.12345 -> "$0.12345"
 */
export const formatUnitPrice = (value: number | null | undefined): string => {
  if (value == null || !isFinite(value)) return '$0.00';
  const fixed = value.toFixed(5);
  const m = fixed.match(/^(-?\d+\.\d{2})(\d*?)0*$/);
  return m ? `$${m[1]}${m[2]}` : `$${fixed}`;
};

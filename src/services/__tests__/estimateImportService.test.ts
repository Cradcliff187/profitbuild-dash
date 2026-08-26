import { describe, it, expect } from 'vitest';
import { deriveLaborHours, convertToEstimateLineItems } from '@/services/estimateImportService';
import { round2 } from '@/utils/lineItemTotals';
import type { EnrichedLineItem } from '@/types/importTypes';

/**
 * Dollar-sourced labor imports derive hours by division ($2,000 / $75 = 26.6667 hr).
 * quantity/labor_hours are numeric(15,5) in the DB; hours must round-trip back to the
 * source dollars to the cent once the DB recomputes total_cost/total from quantity.
 * (Regression: quantity was numeric(10,2), 26.6667 → 26.67 → $2,000.25 per line, and
 * estimate 225-136 landed at $32,501.24 instead of $32,500.00.)
 */

const enrichedLaborItem = (cost: number, hours: number): EnrichedLineItem => ({
  sourceRowIndex: 0,
  sourceItemNameRaw: 'Flooring',
  name: 'Flooring',
  component: 'labor',
  vendorName: null,
  cost,
  markupPct: 0.25,
  price: cost * 1.25,
  wasSplit: false,
  splitFromName: null,
  raw: {
    subcontractorCell: null,
    laborCell: String(cost),
    materialCell: null,
    subCell: null,
    markupCell: '25%',
    totalWithMarkupCell: null,
  },
  category: 'labor_internal',
  normalizedName: 'Flooring',
  categoryConfidence: 1.0,
  laborHours: hours,
  billingRatePerHour: 75,
  actualCostRatePerHour: 35,
  laborCushionAmount: hours * (75 - 35),
});

describe('deriveLaborHours', () => {
  it('rounds to the 5 decimals numeric(15,5) stores, so client value === persisted value', () => {
    const hours = deriveLaborHours(2000, 75);
    expect(hours).toBe(26.66667);
    // Survives DB coercion unchanged: already at 5dp.
    expect(Math.round(hours * 100000) / 100000).toBe(hours);
  });

  it('round-trips dollar-derived hours back to the source dollars at 2dp', () => {
    // The old numeric(10,2) storage made these land at 2000.25 / 500.25.
    expect(round2(deriveLaborHours(2000, 75) * 75)).toBe(2000);
    expect(round2(deriveLaborHours(500, 75) * 75)).toBe(500);
    // And the marked-up client price stays clean too.
    expect(round2(deriveLaborHours(2000, 75) * 75 * 1.25)).toBe(2500);
  });

  it('keeps exact hours exact', () => {
    expect(deriveLaborHours(1500, 75)).toBe(20);
  });

  it('returns 0 for a non-positive rate', () => {
    expect(deriveLaborHours(2000, 0)).toBe(0);
  });
});

describe('convertToEstimateLineItems', () => {
  it('uses full-precision hours as quantity for hourly labor', () => {
    const hours = deriveLaborHours(2000, 75);
    const [line] = convertToEstimateLineItems([enrichedLaborItem(2000, hours)]);

    expect(line.quantity).toBe(26.66667);
    expect(line.unit).toBe('HR');
    expect(line.costPerUnit).toBe(75);
    // Recomputing the way the DB does from quantity reproduces the source dollars.
    expect(round2(line.quantity * line.costPerUnit)).toBe(2000);
    expect(round2(line.quantity * line.pricePerUnit)).toBe(2500);
  });
});

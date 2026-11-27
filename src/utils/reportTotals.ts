import type { ReportField } from '@/utils/reportExporter';

/**
 * Totals logic for report tables, extracted from ReportViewer so it can be
 * unit-tested without a DOM harness.
 *
 * Background: ReportViewer previously rendered its footer as
 *   `{index === 0 ? 'Total' : (formattedTotals[field.key] || '')}`
 * which silently discarded the total whenever the first column was the numeric
 * one — the exact shape of an "expenses by payee" result. See CLAUDE.md Gotcha #71.
 */

export type ColumnTotals = Record<string, number>;

/** Columns we can meaningfully aggregate. */
export function isNumericField(field: ReportField): boolean {
  return field.type === 'currency' || field.type === 'number' || field.type === 'percent';
}

/**
 * Sum currency/number columns; average percent columns (summing percentages is
 * meaningless). Non-numeric columns get no entry at all — callers use the
 * absence of a key to decide a cell is free to hold the "Total" label.
 */
export function computeColumnTotals(data: any[], fields: ReportField[]): ColumnTotals {
  const totals: ColumnTotals = {};
  if (!data.length) return totals;

  for (const field of fields) {
    if (field.type === 'currency' || field.type === 'number') {
      totals[field.key] = data.reduce((sum, row) => sum + (Number(row[field.key]) || 0), 0);
    } else if (field.type === 'percent') {
      // Discard nulls BEFORE coercing. Number(null) === 0 and Number.isFinite(0)
      // is true, so filtering after the cast silently averages missing values in
      // as zeros and understates the mean. The pre-extraction code had this bug:
      // its `!isNaN(val) && val !== null` guard ran after Number(), by which
      // point null was already 0 and passed both checks.
      const values = data
        .map(row => row[field.key])
        .filter(val => val !== null && val !== undefined && val !== '')
        .map(val => Number(val))
        .filter(val => Number.isFinite(val));
      if (values.length > 0) {
        totals[field.key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }
  }

  return totals;
}

/**
 * Index of the footer cell that should carry the "Total" label: the first
 * column that has no total of its own. Returns -1 when every column is numeric,
 * in which case there is no free cell and the caller renders no label (the
 * footer is still visually distinct and carries aria-label="Totals").
 */
export function resolveTotalsLabelIndex(fields: ReportField[]): number {
  return fields.findIndex(field => !isNumericField(field));
}

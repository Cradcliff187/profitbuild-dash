import { describe, it, expect } from 'vitest';
import { computeColumnTotals, resolveTotalsLabelIndex, isNumericField } from '../reportTotals';
import type { ReportField } from '@/utils/reportExporter';

// Exact shape of the production regression (2026-07-16): the currency column is index 0.
const FIELDS: ReportField[] = [
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'payee_name', label: 'Payee Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'expense_date', label: 'Expense Date', type: 'date' },
];

const ROWS = [
  { amount: 100, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 1300, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 1062.5, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 175, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 400, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 475, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 125, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 550, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 325, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 650, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 1425, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-03' },
  { amount: 1494.37, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-05-20' },
  { amount: 450, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-05-20' },
];

describe('isNumericField', () => {
  it('treats currency, number and percent as numeric', () => {
    expect(isNumericField({ key: 'a', label: 'A', type: 'currency' })).toBe(true);
    expect(isNumericField({ key: 'a', label: 'A', type: 'number' })).toBe(true);
    expect(isNumericField({ key: 'a', label: 'A', type: 'percent' })).toBe(true);
  });

  it('treats text, date and boolean as non-numeric', () => {
    expect(isNumericField({ key: 'a', label: 'A', type: 'text' })).toBe(false);
    expect(isNumericField({ key: 'a', label: 'A', type: 'date' })).toBe(false);
    expect(isNumericField({ key: 'a', label: 'A', type: 'boolean' })).toBe(false);
    expect(isNumericField({ key: 'a', label: 'A' })).toBe(false);
  });
});

describe('computeColumnTotals', () => {
  it('sums the production regression to the value the AI failed to state', () => {
    const totals = computeColumnTotals(ROWS, FIELDS);
    expect(totals.amount).toBeCloseTo(8531.87, 2);
  });

  it('does not produce totals for non-numeric columns', () => {
    const totals = computeColumnTotals(ROWS, FIELDS);
    expect(totals.category).toBeUndefined();
    expect(totals.expense_date).toBeUndefined();
  });

  it('averages percent columns rather than summing them', () => {
    const fields: ReportField[] = [{ key: 'margin_percent', label: 'Margin', type: 'percent' }];
    const totals = computeColumnTotals(
      [{ margin_percent: 10 }, { margin_percent: 20 }, { margin_percent: 30 }],
      fields
    );
    expect(totals.margin_percent).toBeCloseTo(20, 5);
  });

  it('ignores nulls when averaging percent columns', () => {
    const fields: ReportField[] = [{ key: 'margin_percent', label: 'Margin', type: 'percent' }];
    const totals = computeColumnTotals(
      [{ margin_percent: 10 }, { margin_percent: null }, { margin_percent: 30 }],
      fields
    );
    expect(totals.margin_percent).toBeCloseTo(20, 5);
  });

  it('treats null and non-numeric values as zero when summing', () => {
    const fields: ReportField[] = [{ key: 'amount', label: 'Amount', type: 'currency' }];
    const totals = computeColumnTotals(
      [{ amount: 100 }, { amount: null }, { amount: 'oops' }, { amount: 50 }],
      fields
    );
    expect(totals.amount).toBeCloseTo(150, 2);
  });

  it('returns an empty map for an empty dataset', () => {
    expect(computeColumnTotals([], FIELDS)).toEqual({});
  });
});

describe('resolveTotalsLabelIndex', () => {
  it('REGRESSION: does not put the label on a numeric first column', () => {
    // Production bug: `index === 0 ? 'Total' : ...` blanked the $8,531.87 total
    // because the currency column was index 0.
    const idx = resolveTotalsLabelIndex(FIELDS);
    expect(idx).not.toBe(0);
    expect(idx).toBe(1); // 'category' is the first non-numeric column
  });

  it('uses index 0 when the first column is non-numeric', () => {
    const fields: ReportField[] = [
      { key: 'project', label: 'Project', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'currency' },
    ];
    expect(resolveTotalsLabelIndex(fields)).toBe(0);
  });

  it('returns -1 when every column is numeric (no cell is free for a label)', () => {
    const fields: ReportField[] = [
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'hours', label: 'Hours', type: 'number' },
    ];
    expect(resolveTotalsLabelIndex(fields)).toBe(-1);
  });

  it('returns -1 for an empty field list', () => {
    expect(resolveTotalsLabelIndex([])).toBe(-1);
  });
});

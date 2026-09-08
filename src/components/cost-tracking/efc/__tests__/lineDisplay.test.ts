import { describe, it, expect } from 'vitest';
import { deriveLineStatus, EFCLine } from '@/hooks/useProjectEFC';
import { lineDisplayStatus, lineSubtitle } from '../lineDisplay';

/** Build an EFCLine the way useProjectEFC does, from the raw inputs. */
function mk(over: Partial<EFCLine> & { plan: number; committed?: number; actual?: number }): EFCLine {
  const plan = over.plan;
  const committed = over.committed ?? 0;
  const actual = over.actual ?? 0;
  const isFinal = over.finalCostAmount != null;
  const isLabor = over.isLabor ?? false;
  const efc = isFinal ? Number(over.finalCostAmount) : Math.max(actual, committed, plan);
  return {
    id: 'x',
    description: 'Line',
    category: isLabor ? 'labor_internal' : 'subcontractors',
    source: 'estimate',
    plan,
    committed,
    actual,
    efc,
    variance: efc - plan,
    isOver: efc - plan > 0.005,
    status: deriveLineStatus({ plan, committed, actual, isFinal, isLabor }),
    finalCostAmount: isFinal ? Number(over.finalCostAmount) : null,
    isFinal,
    isLabor,
    correlatedExpenses: over.correlatedExpenses ?? [],
    acceptedQuotes: [],
    hours: over.hours,
  };
}

describe('deriveLineStatus — one axis: how far along is this line', () => {
  it('nothing has happened → plan', () => {
    expect(mk({ plan: 1500 }).status).toBe('plan');
  });
  it('accepted quote, no spend → committed', () => {
    expect(mk({ plan: 5500, committed: 5948 }).status).toBe('committed');
  });
  it('partial spend → in_progress', () => {
    expect(mk({ plan: 12500, committed: 9234, actual: 4000 }).status).toBe('in_progress');
  });
  it('non-labor spend reaches the commitment → billed, even when the commitment is over plan', () => {
    // 225-136 SUBCONTRACTOR › Flooring: quote $5,948 on a $5,500 plan, billed $5,948.
    // Used to read "On plan" next to a red +$448 — the pill and Δ graded against
    // different baselines. Stage is "billed"; the overage is the Δ column's job.
    const line = mk({ plan: 5500, committed: 5948, actual: 5948 });
    expect(line.status).toBe('billed');
    expect(line.isOver).toBe(true);
  });
  it('non-labor spend past plan with no quote → billed + over', () => {
    const line = mk({ plan: 1000, actual: 1200 });
    expect(line.status).toBe('billed');
    expect(line.isOver).toBe(true);
  });
  it('labor never reads billed — hours can keep coming until it is marked final', () => {
    expect(mk({ plan: 2000, actual: 2000, isLabor: true }).status).toBe('in_progress');
    expect(mk({ plan: 2000, actual: 2600, isLabor: true }).status).toBe('in_progress');
  });
  it('marked final wins over every other state', () => {
    // 225-136 LABOR › Flooring: descoped to a sub, final $0. Read "Plan" before.
    expect(mk({ plan: 2000, finalCostAmount: 0, isLabor: true }).status).toBe('final');
    expect(mk({ plan: 5500, committed: 5948, actual: 5948, finalCostAmount: 5948 }).status).toBe('final');
    expect(mk({ plan: 1000, actual: 400, finalCostAmount: 400 }).status).toBe('final');
  });
});

describe('lineDisplayStatus — pill is stage, border is budget', () => {
  it('labels every stage', () => {
    expect(lineDisplayStatus(mk({ plan: 1 })).label).toBe('Plan');
    expect(lineDisplayStatus(mk({ plan: 1, committed: 1 })).label).toBe('Committed');
    expect(lineDisplayStatus(mk({ plan: 10, actual: 4 })).label).toBe('In progress');
    expect(lineDisplayStatus(mk({ plan: 10, actual: 10 })).label).toBe('Billed');
    expect(lineDisplayStatus(mk({ plan: 10, finalCostAmount: 0 })).label).toBe('Final');
  });
  it('an over-budget line keeps its stage label and gets a red border', () => {
    const meta = lineDisplayStatus(mk({ plan: 5500, committed: 5948, actual: 5948 }));
    expect(meta.label).toBe('Billed');
    expect(meta.border).toContain('red');
  });
  it('a final line that is under plan is not red', () => {
    expect(lineDisplayStatus(mk({ plan: 2000, finalCostAmount: 0 })).border).not.toContain('red');
  });
});

describe('lineSubtitle — never invents hours', () => {
  const HRS = 26.66667;
  it('descoped final line says so', () => {
    expect(lineSubtitle(mk({ plan: 2000, finalCostAmount: 0, isLabor: true, hours: HRS }))).toBe('Closed out · no cost');
  });
  it('final line with a cost says it is locked', () => {
    expect(lineSubtitle(mk({ plan: 1000, actual: 400, finalCostAmount: 400 }))).toBe('Final cost locked');
  });
  it('labor with nothing logged shows the budget', () => {
    expect(lineSubtitle(mk({ plan: 1500, isLabor: true, hours: 20 }))).toBe('20 hrs budgeted');
  });
  it('labor with real logged hours reports them', () => {
    const line = mk({
      plan: 2000, actual: 750, isLabor: true, hours: HRS,
      correlatedExpenses: [{ id: 'a', expense_date: null, payee_name: 'Danny', amount: 750, hours: 10 }],
    });
    expect(lineSubtitle(line)).toBe('10 of 26.7 hrs · 16.7 to go');
  });
  it('labor with dollars but NO logged hours does not back-derive hours from dollars', () => {
    // 225-136 LABOR › Cleaning: $1,300.67 allocated (a sub bill + materials receipts),
    // zero time entries. Used to read "17.3 of 26.7 hrs · 9.3 to go" — fabricated.
    const line = mk({
      plan: 2000, actual: 1300.67, isLabor: true, hours: HRS,
      correlatedExpenses: [
        { id: 'a', expense_date: null, payee_name: 'Chris Radcliff', amount: 862.5, hours: null },
        { id: 'b', expense_date: null, payee_name: 'Home Depot', amount: 438.17, hours: null },
      ],
    });
    expect(lineSubtitle(line)).toBe('0 of 26.7 hrs logged · $1,300.67 allocated');
  });
  it('labor over its hours says over', () => {
    const line = mk({
      plan: 2000, actual: 2250, isLabor: true, hours: HRS,
      correlatedExpenses: [{ id: 'a', expense_date: null, payee_name: 'Danny', amount: 2250, hours: 30 }],
    });
    expect(lineSubtitle(line)).toBe('30 of 26.7 hrs · 3.3 over');
  });
  it('non-labor billed in full', () => {
    expect(lineSubtitle(mk({ plan: 5500, committed: 5948, actual: 5948 }))).toBe('Billed in full');
  });
  it('non-labor partially billed', () => {
    expect(lineSubtitle(mk({ plan: 12500, committed: 9234, actual: 4617 }))).toBe('37% billed · $7,883.00 to go');
  });
});

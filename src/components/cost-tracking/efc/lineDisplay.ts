import { formatCurrency } from '@/lib/utils';
import { EFCLine, EFCLineStatus } from '@/hooks/useProjectEFC';

/**
 * Presentational metadata for a cost line's status pill.
 *
 * ONE AXIS PER SIGNAL. The pill answers "how far along is this line?" and nothing
 * else — Plan → Committed → In progress → Billed → Final. The budget verdict
 * ("is it over?") lives in the Δ column and the row's left border, keyed off
 * `line.isOver` (efc > plan), the same definition the Issues KPI uses.
 *
 * Before Sep 2026 the pill mixed both axes (Plan/Committed/In prog were stages;
 * On plan/Over were verdicts) and graded against a different baseline than the
 * Δ column — a fully-billed quote that came in over plan read "On plan" (green)
 * beside a red +$448. See CLAUDE.md Rule 28.
 */
export interface LineDisplayMeta {
  status: EFCLineStatus;
  label: string;
  /** Tailwind classes for the status pill. */
  pill: string;
  /** Tailwind class for the row's colored left border — red when over budget. */
  border: string;
}

const STAGE: Record<EFCLineStatus, { label: string; pill: string; border: string }> = {
  plan:        { label: 'Plan',        pill: 'bg-slate-100 text-slate-700',   border: 'bg-slate-300' },
  committed:   { label: 'Committed',   pill: 'bg-blue-100 text-blue-800',     border: 'bg-blue-400' },
  in_progress: { label: 'In progress', pill: 'bg-amber-100 text-amber-800',   border: 'bg-amber-500' },
  billed:      { label: 'Billed',      pill: 'bg-green-100 text-green-800',   border: 'bg-green-500' },
  final:       { label: 'Final',       pill: 'bg-violet-100 text-violet-800', border: 'bg-violet-500' },
};

export function lineDisplayStatus(line: EFCLine): LineDisplayMeta {
  const stage = STAGE[line.status] ?? STAGE.plan;
  return {
    status: line.status,
    label: stage.label,
    pill: stage.pill,
    border: line.isOver ? 'bg-red-500' : stage.border,
  };
}

export const fmtHours = (h: number) => h.toLocaleString(undefined, { maximumFractionDigits: 1 });

/** Paid hours actually logged against the line (time entries only). */
function loggedHours(line: EFCLine): number {
  return line.correlatedExpenses.reduce((s, e) => s + (e.isTimeEntry ? (e.hours ?? 0) : 0), 0);
}

export interface EmployeeRollup {
  payeeName: string;
  hours: number;
  amount: number;
  /**
   * Time logged by a labor-providing SUBCONTRACTOR (Gotcha #68): the entry
   * carries hours but $0, because their cost arrives on their bill and is
   * allocated through the normal expense process — never through time tracking.
   * The trigger's category guard keeps these off labor lines today; this flag
   * exists so a manual allocation still renders honestly instead of as free labor.
   */
  viaSubcontractor: boolean;
}

/**
 * Everything allocated to a labor line, split by HOW the cost got here.
 *
 *   employees  — time entries (`is_time_entry`), rolled up per person: hours + cost.
 *   bills      — everything else: a sub's bill, a materials receipt, a tool rental.
 *                They count toward the line's spend (EFC is right) but contribute
 *                no hours, and they are NOT labor by anyone — a receipt from Home
 *                Depot must never render as an "employee · 0 hrs".
 *
 * This is the display-side half of Rule 28's decision: a labor-providing sub's
 * cost is captured by their bill via expense allocation, not by an hourly rate.
 * Before Sep 2026 the detail page grouped ALL correlated expenses by payee under
 * "Labor by employee" — 225-136's Cleaning line listed Amazon.com, Home Depot,
 * Harbor Freight and Menards as employees with 0 hrs each.
 */
export interface LaborSpendBreakdown {
  employees: EmployeeRollup[];
  bills: EFCLine['correlatedExpenses'];
  loggedHours: number;
  timeEntryCount: number;
}

export function splitLaborSpend(line: EFCLine): LaborSpendBreakdown {
  const byPayee = new Map<string, EmployeeRollup>();
  const bills: EFCLine['correlatedExpenses'] = [];
  let timeEntryCount = 0;
  for (const e of line.correlatedExpenses) {
    if (!e.isTimeEntry) {
      bills.push(e);
      continue;
    }
    timeEntryCount += 1;
    const payeeName = e.payee_name || 'Unknown';
    const row = byPayee.get(payeeName) ?? { payeeName, hours: 0, amount: 0, viaSubcontractor: false };
    row.hours += e.hours ?? 0;
    row.amount += e.amount ?? 0;
    if (e.category != null && e.category !== 'labor_internal') row.viaSubcontractor = true;
    byPayee.set(payeeName, row);
  }
  const employees = Array.from(byPayee.values()).sort((a, b) => b.hours - a.hours);
  bills.sort((a, b) => (b.expense_date ?? '').localeCompare(a.expense_date ?? ''));
  return {
    employees,
    bills,
    loggedHours: employees.reduce((s, r) => s + r.hours, 0),
    timeEntryCount,
  };
}

/** Collapse labor time entries into one row per employee, most hours first. */
export function rollupByEmployee(line: EFCLine): EmployeeRollup[] {
  return splitLaborSpend(line).employees;
}

/**
 * The dominant vendor for a line: the accepted-quote payee, else the payee on the most spend.
 * On a LABOR line the "vendor" is the crew — the people with logged time. A sub
 * bill or a receipt allocated to a labor line is listed under bills, not here.
 */
export function lineVendor(line: EFCLine): string | null {
  if (line.acceptedQuotes.length > 0 && line.acceptedQuotes[0].payeeName) {
    return line.acceptedQuotes[0].payeeName;
  }
  if (line.isLabor) {
    const crew = splitLaborSpend(line).employees;
    if (crew.length === 0) return null;
    const names = crew.slice(0, 2).map((r) => r.payeeName);
    return crew.length > 2 ? `${names.join(', ')} +${crew.length - 2}` : names.join(', ');
  }
  const byPayee = new Map<string, number>();
  for (const e of line.correlatedExpenses) {
    const name = e.payee_name || 'Unknown';
    byPayee.set(name, (byPayee.get(name) ?? 0) + (e.amount ?? 0));
  }
  let best: string | null = null;
  let bestAmt = -1;
  for (const [name, amt] of byPayee) {
    if (amt > bestAmt) { best = name; bestAmt = amt; }
  }
  return best;
}

/**
 * One-line subtitle under a line's name in the Overview table.
 *
 * Labor hours come ONLY from logged time entries. This used to back-derive
 * hours from allocated dollars when nothing was logged (`actual / costRate`),
 * which presented a sub bill + materials receipts allocated to a labor line as
 * "17.3 of 26.7 hrs" worked. Dollars with no hours are now stated as exactly that.
 */
export function lineSubtitle(line: EFCLine): string | null {
  if (line.isFinal) {
    return (line.finalCostAmount ?? 0) <= 0.005 ? 'Closed out · no cost' : 'Final cost locked';
  }

  if (line.isLabor && line.hours != null && line.hours > 0) {
    const logged = loggedHours(line);
    if (logged <= 0) {
      return line.actual > 0.005
        ? `0 of ${fmtHours(line.hours)} hrs logged · ${formatCurrency(line.actual)} in bills & receipts`
        : `${fmtHours(line.hours)} hrs budgeted`;
    }
    // Hours are worked by people; dollars can also arrive as bills (a sub doing
    // the work, supplies). Say so when the two diverge, so "$X" is never read as
    // the cost of the hours shown.
    const billed = line.correlatedExpenses.reduce((s, e) => s + (e.isTimeEntry ? 0 : (e.amount ?? 0)), 0);
    const billsNote = billed > 0.005 ? ` · ${formatCurrency(billed)} in bills` : '';
    const over = logged - line.hours;
    if (over > 0.05) return `${fmtHours(logged)} of ${fmtHours(line.hours)} hrs · ${fmtHours(over)} over${billsNote}`;
    return `${fmtHours(logged)} of ${fmtHours(line.hours)} hrs · ${fmtHours(Math.max(0, -over))} to go${billsNote}`;
  }

  switch (line.status) {
    case 'billed':
      return 'Billed in full';
    case 'in_progress': {
      const baseline = Math.max(line.committed, line.plan);
      const pct = baseline > 0 ? Math.round((line.actual / baseline) * 100) : 0;
      const toGo = Math.max(0, baseline - line.actual);
      return `${pct}% billed · ${formatCurrency(toGo)} to go`;
    }
    case 'committed':
      return `Committed ${formatCurrency(line.committed)}`;
    default:
      return null;
  }
}

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
  return line.correlatedExpenses.reduce((s, e) => s + (e.hours ?? 0), 0);
}

export interface EmployeeRollup {
  payeeName: string;
  hours: number;
  amount: number;
}

/** Collapse labor time entries into one row per employee, most hours first. */
export function rollupByEmployee(line: EFCLine): EmployeeRollup[] {
  const byPayee = new Map<string, EmployeeRollup>();
  for (const e of line.correlatedExpenses) {
    const payeeName = e.payee_name || 'Unknown';
    const row = byPayee.get(payeeName) ?? { payeeName, hours: 0, amount: 0 };
    row.hours += e.hours ?? 0;
    row.amount += e.amount ?? 0;
    byPayee.set(payeeName, row);
  }
  return Array.from(byPayee.values()).sort((a, b) => b.hours - a.hours);
}

/** The dominant vendor for a line: the accepted-quote payee, else the payee on the most spend. */
export function lineVendor(line: EFCLine): string | null {
  if (line.acceptedQuotes.length > 0 && line.acceptedQuotes[0].payeeName) {
    return line.acceptedQuotes[0].payeeName;
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
        ? `0 of ${fmtHours(line.hours)} hrs logged · ${formatCurrency(line.actual)} allocated`
        : `${fmtHours(line.hours)} hrs budgeted`;
    }
    const over = logged - line.hours;
    if (over > 0.05) return `${fmtHours(logged)} of ${fmtHours(line.hours)} hrs · ${fmtHours(over)} over`;
    return `${fmtHours(logged)} of ${fmtHours(line.hours)} hrs · ${fmtHours(Math.max(0, -over))} to go`;
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

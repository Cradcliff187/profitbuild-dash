import { formatCurrency } from '@/lib/utils';
import { EFCLine } from '@/hooks/useProjectEFC';

/**
 * Presentational status for a cost line. Refines the 4-state EFCLineStatus into
 * the 5 the Cost Tracking surfaces show: a fully-billed, on-or-under-budget line
 * reads as "On plan" (green) rather than the generic amber "In prog".
 */
export type LineDisplayStatus = 'over' | 'on_plan' | 'in_progress' | 'committed' | 'plan';

export interface LineDisplayMeta {
  status: LineDisplayStatus;
  label: string;
  /** Tailwind classes for the status pill. */
  pill: string;
  /** Tailwind class for the row's colored left border. */
  border: string;
}

export const fmtHours = (h: number) => h.toLocaleString(undefined, { maximumFractionDigits: 1 });

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

export function lineDisplayStatus(line: EFCLine): LineDisplayMeta {
  if (line.status === 'overrun') {
    return { status: 'over', label: 'Over', pill: 'bg-red-100 text-red-800', border: 'bg-red-500' };
  }
  if (line.status === 'in_progress') {
    const baseline = Math.max(line.committed, line.plan);
    // Fully billed at or under budget → "On plan" (green); otherwise still working.
    if (baseline > 0 && line.actual >= baseline - 0.005) {
      return { status: 'on_plan', label: 'On plan', pill: 'bg-green-100 text-green-800', border: 'bg-green-500' };
    }
    return { status: 'in_progress', label: 'In prog', pill: 'bg-amber-100 text-amber-800', border: 'bg-amber-500' };
  }
  if (line.status === 'committed') {
    return { status: 'committed', label: 'Committed', pill: 'bg-blue-100 text-blue-800', border: 'bg-blue-400' };
  }
  return { status: 'plan', label: 'Plan', pill: 'bg-slate-100 text-slate-700', border: 'bg-slate-300' };
}

/**
 * One-line subtitle under a line's name in the Overview table — the same
 * information the old per-line caption carried, tuned for a scannable row.
 */
export function lineSubtitle(line: EFCLine): string | null {
  // Labor: actual paid hours logged vs estimated hours.
  if (line.isLabor && line.hours != null && line.hours > 0) {
    const logged = loggedHours(line);
    const costRate = line.plan / line.hours;
    const used = logged > 0 ? logged : costRate > 0 ? line.actual / costRate : 0;
    if (line.actual <= 0 && used <= 0) return `${fmtHours(line.hours)} hrs budgeted`;
    const over = used - line.hours;
    if (over > 0.05) return `${fmtHours(used)} of ${fmtHours(line.hours)} hrs · ${fmtHours(over)} over`;
    return `${fmtHours(used)} of ${fmtHours(line.hours)} hrs · ${fmtHours(Math.max(0, -over))} to go`;
  }

  switch (line.status) {
    case 'overrun': {
      const pct = line.plan > 0 ? Math.round((line.actual / line.plan) * 100) : null;
      const noQuote = line.committed === 0 ? 'No quote · ' : '';
      return pct != null ? `${noQuote}${pct}% of plan` : noQuote || null;
    }
    case 'in_progress': {
      const baseline = Math.max(line.committed, line.plan);
      if (baseline > 0 && line.actual >= baseline - 0.005) return 'Billed in full';
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

import { useState } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { EFCLine } from '@/hooks/useProjectEFC';
import { parseDateOnly } from '@/utils/dateUtils';
import { StatusPill } from './StatusPill';

function lineCaption(line: EFCLine): string | null {
  if (line.isLabor && line.hours != null && line.hours > 0) {
    // actual is allocated COST; derive used hours with the cost rate (plan/hours),
    // not the billing rate — billing rate would understate hours used.
    const costRate = line.plan / line.hours;
    const usedHrs = costRate > 0 ? line.actual / costRate : 0;
    const remaining = Math.max(0, line.hours - usedHrs);
    if (line.actual <= 0) return `${line.hours.toFixed(0)} hrs budgeted, not started`;
    return `${usedHrs.toFixed(0)} of ${line.hours.toFixed(0)} hrs used · ${remaining.toFixed(0)} to go`;
  }
  switch (line.status) {
    case 'overrun':
      return `+${formatCurrency(line.variance)} over the ${line.committed > 0 ? 'committed amount' : 'estimate'}`;
    case 'in_progress': {
      const baseline = Math.max(line.committed, line.plan);
      return `${formatCurrency(line.actual)} billed of ${formatCurrency(baseline)} — ${formatCurrency(Math.max(0, baseline - line.actual))} to go`;
    }
    case 'committed':
      return `Committed ${formatCurrency(line.committed)}${line.acceptedQuote ? ` · ${line.acceptedQuote.payeeName}` : ''}`;
    default:
      return null;
  }
}

function MoneyCell({ label, value, muted, bold }: { label: string; value: number | null; muted?: boolean; bold?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('tabular-nums text-sm', bold && 'font-semibold', muted && 'text-muted-foreground')}>
        {value == null || value === 0 ? <span className="text-muted-foreground">—</span> : formatCurrency(value)}
      </div>
    </div>
  );
}

interface EmployeeRollup {
  payeeName: string;
  entries: number;
  amount: number;
}

/** Collapse labor time entries into one row per employee, highest spend first. */
function rollupByEmployee(expenses: EFCLine['correlatedExpenses']): EmployeeRollup[] {
  const byPayee = new Map<string, EmployeeRollup>();
  for (const e of expenses) {
    const payeeName = e.payee_name || 'Unknown';
    const row = byPayee.get(payeeName) ?? { payeeName, entries: 0, amount: 0 };
    row.entries += 1;
    row.amount += e.amount ?? 0;
    byPayee.set(payeeName, row);
  }
  return Array.from(byPayee.values()).sort((a, b) => b.amount - a.amount);
}

/** The drill-in that replaces the old Detail-tab drawer: quote, allocated expenses, variance. */
function LineDetail({ line }: { line: EFCLine }) {
  const remaining = Math.max(0, Math.max(line.committed, line.plan) - line.actual);
  // Labor lines aggregate many time entries per worker — show one row per
  // employee instead of every entry. Non-labor lines list each expense.
  const employeeRollup = line.isLabor ? rollupByEmployee(line.correlatedExpenses) : null;
  return (
    <div className="px-3 pb-3 pl-9 bg-muted/20 border-b text-xs space-y-3">
      {!line.isLabor && (
        <div className="pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Accepted quote</div>
          {line.acceptedQuotes.length > 0 ? (
            <div className="space-y-1">
              {line.acceptedQuotes.map((q, i) => (
                <div key={i} className="flex items-center justify-between bg-card border rounded p-2">
                  <span>{q.payeeName} <span className="text-muted-foreground">#{q.quoteNumber}</span></span>
                  <span className="font-medium tabular-nums">{formatCurrency(q.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground italic">No accepted quote on this line</div>
          )}
        </div>
      )}

      <div className={cn(line.isLabor && 'pt-3')}>
        {employeeRollup ? (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Labor by employee ({employeeRollup.length})
            </div>
            {employeeRollup.length > 0 ? (
              <div className="space-y-1">
                {employeeRollup.map((r) => (
                  <div key={r.payeeName} className="flex items-center justify-between bg-card border rounded p-2">
                    <span className="truncate">
                      <span className="text-foreground">{r.payeeName}</span>
                      <span className="text-muted-foreground">
                        {' · '}{r.entries} {r.entries === 1 ? 'entry' : 'entries'}
                      </span>
                    </span>
                    <span className="font-medium tabular-nums shrink-0 ml-2">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground italic">No labor logged yet</div>
            )}
          </>
        ) : (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Allocated expenses ({line.correlatedExpenses.length})
            </div>
            {line.correlatedExpenses.length > 0 ? (
              <div className="space-y-1">
                {line.correlatedExpenses.map((e, i) => (
                  <div key={e.id || i} className="flex items-center justify-between bg-card border rounded p-2">
                    <span className="text-muted-foreground truncate">
                      {e.expense_date ? format(parseDateOnly(e.expense_date), 'MMM d, yyyy') : '—'}
                      {' · '}
                      <span className="text-foreground">{e.payee_name || 'Unknown'}</span>
                    </span>
                    <span className="font-medium tabular-nums shrink-0 ml-2">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground italic">No expenses allocated yet</div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t">
        <span className="text-muted-foreground">Plan <span className="font-medium text-foreground tabular-nums">{formatCurrency(line.plan)}</span></span>
        <span className="text-muted-foreground">Committed <span className="font-medium text-foreground tabular-nums">{line.committed > 0 ? formatCurrency(line.committed) : '—'}</span></span>
        <span className="text-muted-foreground">Spent <span className="font-medium text-foreground tabular-nums">{formatCurrency(line.actual)}</span></span>
        <span className="text-muted-foreground">EFC <span className="font-medium text-foreground tabular-nums">{formatCurrency(line.efc)}</span></span>
        <span className="text-muted-foreground">Remaining <span className={cn('font-medium tabular-nums', remaining > 0 ? 'text-warning-foreground' : 'text-success')}>{formatCurrency(remaining)}</span></span>
      </div>
    </div>
  );
}

export function EFCLineRow({ line }: { line: EFCLine }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const caption = lineCaption(line);
  const isCO = line.source === 'change_order';
  const Chevron = open ? ChevronDown : ChevronRight;

  if (isMobile) {
    return (
      <div className="border-b last:border-b-0">
        <button onClick={() => setOpen((o) => !o)} className="w-full px-3 py-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Chevron className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm">{line.description}</span>
              {isCO && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 text-orange-600">CO</Badge>}
            </div>
            <StatusPill status={line.status} />
          </div>
          <div className="mt-1 pl-5 text-sm">
            <span className="text-muted-foreground text-xs">Heading for </span>
            <span className="font-semibold tabular-nums">{formatCurrency(line.efc)}</span>
          </div>
          <div className="mt-1 pl-5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
            <span>Plan {formatCurrency(line.plan)}</span>
            <span>Committed {line.committed > 0 ? formatCurrency(line.committed) : '—'}</span>
            <span>Spent {line.actual > 0 ? formatCurrency(line.actual) : '—'}</span>
          </div>
          {caption && <div className="mt-1 pl-5 text-xs text-muted-foreground">{caption}</div>}
        </button>
        {open && <LineDetail line={line} />}
      </div>
    );
  }

  return (
    <div className="border-b last:border-b-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-4 px-3 py-2.5 text-left hover:bg-muted/30">
        <Chevron className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{line.description}</span>
            {isCO && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 text-orange-600 shrink-0">CO</Badge>}
          </div>
          {caption && <div className="text-xs text-muted-foreground truncate">{caption}</div>}
        </div>
        <div className="w-20 shrink-0"><MoneyCell label="Plan" value={line.plan} muted /></div>
        <div className="w-24 shrink-0"><MoneyCell label="Committed" value={line.committed || null} muted /></div>
        <div className="w-24 shrink-0"><MoneyCell label="Spent" value={line.actual || null} muted /></div>
        <div className="w-24 shrink-0"><MoneyCell label="EFC" value={line.efc} bold /></div>
        <div className="w-24 shrink-0 flex justify-end"><StatusPill status={line.status} /></div>
      </button>
      {open && <LineDetail line={line} />}
    </div>
  );
}

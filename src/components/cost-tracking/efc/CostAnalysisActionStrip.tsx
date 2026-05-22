import { useMemo } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, CheckCircle2, Wand2 } from 'lucide-react';
import { EFCCategory } from '@/hooks/useProjectEFC';

interface Chip {
  label: string;
  tone: 'danger' | 'warn' | 'note' | 'good';
}

const TONE: Record<Chip['tone'], string> = {
  danger: 'bg-destructive/10 text-destructive',
  warn: 'bg-warning/15 text-warning-foreground',
  note: 'bg-amber-100 text-amber-800',
  good: 'bg-success/10 text-success',
};

/**
 * "Things to do" strip — derives action chips from the EFC data (the old Detail
 * tab's attention banner, reborn), plus CSV export and the Allocate action.
 * Keeps the page actionable without a separate tab.
 */
export function CostAnalysisActionStrip({
  categories,
  totalUnallocated,
  onExport,
  onAllocate,
}: {
  categories: EFCCategory[];
  totalUnallocated: number;
  onExport: () => void;
  /** When provided (and there's unassigned spend), shows the primary Allocate action. */
  onAllocate?: () => void;
}) {
  const chips = useMemo<Chip[]>(() => {
    const out: Chip[] = [];

    const overrunLines = categories.flatMap((c) => c.lines.filter((l) => l.status === 'overrun'));
    if (overrunLines.length > 0) {
      const over = overrunLines.reduce((s, l) => s + l.variance, 0);
      out.push({
        label: `${overrunLines.length} ${overrunLines.length === 1 ? 'line' : 'lines'} over budget · ${formatCurrency(over)} over`,
        tone: 'danger',
      });
    }

    const noQuote = categories
      .filter((c) => !c.isInternal)
      .flatMap((c) => c.lines.filter((l) => l.committed === 0));
    if (noQuote.length > 0) {
      out.push({
        label: `${noQuote.length} ${noQuote.length === 1 ? 'line has' : 'lines have'} no accepted quote`,
        tone: 'warn',
      });
    }

    if (totalUnallocated > 0) {
      out.push({ label: `${formatCurrency(totalUnallocated)} unassigned to a line`, tone: 'note' });
    }

    if (out.length === 0) {
      out.push({ label: 'On track — no flags', tone: 'good' });
    }
    return out;
  }, [categories, totalUnallocated]);

  return (
    <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-card px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {chips[0]?.tone === 'good' ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        Things to do
      </span>
      {chips.map((c, i) => (
        <span key={i} className={cn('text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap', TONE[c.tone])}>
          {c.label}
        </span>
      ))}
      <span className="flex-1" />
      {onAllocate && totalUnallocated > 0 && (
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onAllocate}>
          <Wand2 className="h-4 w-4" />
          Allocate
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
        <Download className="h-4 w-4" />
        Export
      </Button>
    </div>
  );
}

import { cn, formatCurrency } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { EFCCategory, EFCLine } from '@/hooks/useProjectEFC';
import { lineDisplayStatus, lineSubtitle } from './lineDisplay';

function LineRow({ line, onClick }: { line: EFCLine; onClick: () => void }) {
  const meta = lineDisplayStatus(line);
  const subtitle = lineSubtitle(line);
  const showDelta = line.variance > 0.005;

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-stretch text-left border-b last:border-b-0 hover:bg-muted/40 transition-colors"
    >
      <span className={cn('w-1 shrink-0 rounded-r', meta.border)} aria-hidden />
      <span className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium truncate">{line.description}</span>
          {subtitle && <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>}
        </span>
        <span className="hidden sm:block w-24 text-right text-sm tabular-nums text-muted-foreground shrink-0">
          {formatCurrency(line.plan)}
        </span>
        <span className="hidden sm:block w-24 text-right text-sm tabular-nums text-muted-foreground shrink-0">
          {line.actual > 0 ? formatCurrency(line.actual) : '—'}
        </span>
        <span className="w-28 text-right text-sm tabular-nums font-semibold shrink-0">
          {showDelta ? (
            <span className="text-destructive">+{formatCurrency(line.variance)}</span>
          ) : (
            formatCurrency(line.efc)
          )}
        </span>
        <span className="w-20 flex justify-end shrink-0">
          <span className={cn('rounded-full text-[10px] leading-none px-2 py-0.5 font-medium whitespace-nowrap', meta.pill)}>
            {meta.label}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
      </span>
    </button>
  );
}

/**
 * Flat, scannable table of every cost line grouped under category headers.
 * Clicking a line drills into its detail page. Unassigned category spend shows
 * as a muted footer row so it isn't lost.
 */
export function CostLineTable({
  categories,
  onLineClick,
}: {
  categories: EFCCategory[];
  onLineClick: (lineId: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Column header (desktop) */}
      <div className="hidden sm:flex items-center gap-3 px-3 py-2 border-b bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="w-1 shrink-0" aria-hidden />
        <span className="flex-1">Line</span>
        <span className="w-24 text-right shrink-0">Plan</span>
        <span className="w-24 text-right shrink-0">Spent</span>
        <span className="w-28 text-right shrink-0">EFC / Δ</span>
        <span className="w-20 text-right shrink-0">Status</span>
        <span className="w-4 shrink-0" aria-hidden />
      </div>

      {categories.map((cat) => {
        const catDelta = cat.expectedCost - cat.subtotal.plan;
        return (
        <div key={cat.category}>
          {/* Category subtotal — aligned to the money columns of the rows below */}
          <div className="flex items-stretch border-b bg-muted/20">
            <span className="w-1 shrink-0" aria-hidden />
            <span className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2">
              <span className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                {cat.displayName}
              </span>
              <span className="hidden sm:block w-24 text-right text-sm tabular-nums font-medium text-muted-foreground shrink-0">
                {formatCurrency(cat.subtotal.plan)}
              </span>
              <span className="hidden sm:block w-24 text-right text-sm tabular-nums font-medium text-muted-foreground shrink-0">
                {cat.categorySpend > 0.005 ? formatCurrency(cat.categorySpend) : '—'}
              </span>
              <span className="w-28 text-right text-sm tabular-nums font-semibold shrink-0">
                {formatCurrency(cat.expectedCost)}
                {catDelta > 0.005 && (
                  <span className="block text-[10px] font-medium text-destructive">+{formatCurrency(catDelta)}</span>
                )}
              </span>
              <span className="w-20 shrink-0" aria-hidden />
              <span className="w-4 shrink-0" aria-hidden />
            </span>
          </div>

          {cat.lines.map((line) => (
            <LineRow key={line.id} line={line} onClick={() => onLineClick(line.id)} />
          ))}

          {cat.unallocated > 0.005 && (
            <div className="flex items-stretch border-b last:border-b-0 bg-amber-50/40">
              <span className="w-1 shrink-0 bg-amber-400 rounded-r" aria-hidden />
              <span className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2">
                <span className="flex-1 min-w-0 text-xs text-muted-foreground">
                  {cat.lines.length > 0 ? 'Unassigned to a line' : 'Missing line items?'}
                </span>
                <span className="text-sm tabular-nums text-amber-700 font-medium shrink-0">
                  {formatCurrency(cat.unallocated)}
                </span>
                <span className="w-4 shrink-0" aria-hidden />
              </span>
            </div>
          )}
        </div>
        );
      })}

      {/* Project total — ties out to the EFC / "over" figures on the KPI strip */}
      {(() => {
        const t = categories.reduce(
          (a, c) => ({
            plan: a.plan + c.subtotal.plan,
            spent: a.spent + c.categorySpend,
            efc: a.efc + c.expectedCost,
          }),
          { plan: 0, spent: 0, efc: 0 },
        );
        const delta = t.efc - t.plan;
        return (
          <div className="flex items-stretch border-t-2 bg-muted/40">
            <span className="w-1 shrink-0" aria-hidden />
            <span className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wide">
                Project total
              </span>
              <span className="hidden sm:block w-24 text-right text-sm tabular-nums font-semibold shrink-0">
                {formatCurrency(t.plan)}
              </span>
              <span className="hidden sm:block w-24 text-right text-sm tabular-nums font-semibold shrink-0">
                {t.spent > 0.005 ? formatCurrency(t.spent) : '—'}
              </span>
              <span className="w-28 text-right text-sm tabular-nums font-bold shrink-0">
                {formatCurrency(t.efc)}
                {delta > 0.005 && (
                  <span className="block text-[10px] font-semibold text-destructive">+{formatCurrency(delta)} over</span>
                )}
                {delta < -0.005 && (
                  <span className="block text-[10px] font-semibold text-green-700">{formatCurrency(delta)} under</span>
                )}
              </span>
              <span className="w-20 shrink-0" aria-hidden />
              <span className="w-4 shrink-0" aria-hidden />
            </span>
          </div>
        );
      })()}
    </div>
  );
}

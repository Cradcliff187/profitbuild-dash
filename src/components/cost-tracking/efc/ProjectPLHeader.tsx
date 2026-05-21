import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { ProjectEFCResult } from '@/hooks/useProjectEFC';

const fmtPct = (n: number) => `${n >= 0 ? '' : ''}${n.toFixed(1)}%`;

/**
 * The headline answer: "where will this job land?" Contract (revenue) vs
 * Expected Cost vs Projected Margin, with the planned margin as the comparison.
 * Desktop: 3 columns. Mobile: margin leads, contract + expected below.
 */
export function ProjectPLHeader({ pl }: { pl: ProjectEFCResult['pl'] }) {
  const positive = pl.projectedMargin >= 0;
  const marginColor = positive ? 'text-success' : 'text-destructive';
  const overrun = pl.expectedCost - pl.plannedCost;
  const TrendIcon = pl.marginDelta < 0 ? TrendingDown : TrendingUp;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        {/* Desktop: 3-column */}
        <div className="hidden sm:grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contract</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(pl.contract)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">revenue (incl. approved COs)</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expected Cost</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(pl.expectedCost)}</div>
            <div className={cn('mt-0.5 text-xs', overrun > 0 ? 'text-destructive' : 'text-muted-foreground')}>
              {overrun > 0
                ? `+${formatCurrency(overrun)} over $${formatCurrency(pl.plannedCost).replace('$', '')} plan`
                : `plan ${formatCurrency(pl.plannedCost)}`}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projected Margin</div>
            <div className={cn('mt-1 text-2xl font-semibold tabular-nums', marginColor)}>
              {formatCurrency(pl.projectedMargin)} <span className="text-base">({fmtPct(pl.projectedMarginPct)})</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendIcon className={cn('h-3 w-3', pl.marginDelta < 0 ? 'text-destructive' : 'text-success')} />
              planned {formatCurrency(pl.plannedMargin)} ({fmtPct(pl.plannedMarginPct)})
            </div>
          </div>
        </div>

        {/* Mobile: margin leads */}
        <div className="sm:hidden space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projected Margin</div>
            <div className={cn('mt-1 text-2xl font-semibold tabular-nums', marginColor)}>
              {formatCurrency(pl.projectedMargin)} <span className="text-base">({fmtPct(pl.projectedMarginPct)})</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendIcon className={cn('h-3 w-3', pl.marginDelta < 0 ? 'text-destructive' : 'text-success')} />
              from planned {formatCurrency(pl.plannedMargin)} ({fmtPct(pl.plannedMarginPct)})
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contract</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(pl.contract)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expected Cost</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(pl.expectedCost)}</div>
              {overrun > 0 && (
                <div className="text-xs text-destructive">+{formatCurrency(overrun)} over plan</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

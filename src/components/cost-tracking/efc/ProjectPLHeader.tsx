import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp, Sparkles } from 'lucide-react';
import { ProjectEFCResult } from '@/hooks/useProjectEFC';
import { CUSHION_ZONE } from './cushionZone';

const fmtPct = (n: number) => `${n >= 0 ? '' : ''}${n.toFixed(1)}%`;

/**
 * The headline answer: "where will this job land?" Contract (revenue) vs
 * Expected Cost vs Projected Margin, with the planned margin as the comparison.
 *
 * When the project carries a labor cushion, a 4th metric — "Margin + Labor Opp"
 * — credits the eroding cushion into the margin (Option A). The cushion shown
 * on its sub-line is the bridge between the two margin numbers; it shrinks (and
 * recolors green→amber→red) as labor hours are consumed.
 *
 * Desktop: 3 columns (or 2x2→4 with cushion). Mobile: margin leads, the with-opp
 * margin sits right under it, then contract + expected below.
 */
export function ProjectPLHeader({ pl }: { pl: ProjectEFCResult['pl'] }) {
  const positive = pl.projectedMargin >= 0;
  const marginColor = positive ? 'text-success' : 'text-destructive';
  const overrun = pl.expectedCost - pl.plannedCost;
  const TrendIcon = pl.marginDelta < 0 ? TrendingDown : TrendingUp;

  const withOppColor = pl.marginWithOpp >= 0 ? 'text-success' : 'text-destructive';
  const zone = pl.cushionZone ? CUSHION_ZONE[pl.cushionZone] : null;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        {/* Desktop: 3-column, or 2x2 -> 4-up when a labor cushion exists */}
        <div className={cn('hidden sm:grid gap-4', pl.hasCushion ? 'sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-3')}>
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
          {pl.hasCushion && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Margin + Labor Opp</div>
              <div className={cn('mt-1 text-2xl font-semibold tabular-nums', withOppColor)}>
                {formatCurrency(pl.marginWithOpp)} <span className="text-base">({fmtPct(pl.marginWithOppPct)})</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs">
                <Sparkles className={cn('h-3 w-3', zone?.color)} />
                <span className="text-muted-foreground">+{formatCurrency(pl.cushionRemaining)} cushion ·</span>
                <span className={zone?.color}>{zone?.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile: margin leads, with-opp right below, then contract + expected */}
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
            {pl.hasCushion && (
              <div className="mt-1.5 space-y-0.5">
                <div className="flex items-center gap-1 text-xs">
                  <Sparkles className={cn('h-3 w-3', zone?.color)} />
                  <span className={cn('font-medium tabular-nums', withOppColor)}>
                    → {formatCurrency(pl.marginWithOpp)} ({fmtPct(pl.marginWithOppPct)})
                  </span>
                  <span className="text-muted-foreground">with labor opp</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  +{formatCurrency(pl.cushionRemaining)} cushion · <span className={zone?.color}>{zone?.label}</span>
                </div>
              </div>
            )}
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

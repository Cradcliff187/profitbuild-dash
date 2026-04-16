import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import { getBudgetUtilizationColor } from '@/utils/financialColors';

interface CostBucketTotalsRowProps {
  target: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  /** Used by both views; the strip variant is denser. */
  variant?: 'card' | 'strip';
}

/**
 * Totals row anchored at the bottom of either view. Shows the project's overall
 * Target / Spent / Remaining + a single progress bar colored by utilization
 * (matching the existing Budget Status color thresholds: 80% warning, 95% critical).
 */
export function CostBucketTotalsRow({
  target,
  spent,
  remaining,
  percentUsed,
  variant = 'card',
}: CostBucketTotalsRowProps) {
  const utilizationColor = getBudgetUtilizationColor(percentUsed);
  const isOver = remaining < 0;

  if (variant === 'strip') {
    return (
      <div className="flex items-center gap-3 px-3 py-2 border-t bg-muted/30 rounded-md">
        <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
        <Progress value={Math.min(percentUsed, 100)} className="h-1.5 flex-1 max-w-[200px]" />
        <span className={cn('text-xs font-semibold tabular-nums', utilizationColor)}>
          {percentUsed.toFixed(0)}%
        </span>
        <span className="text-xs tabular-nums">
          {formatCurrency(spent)} / {formatCurrency(target)}
        </span>
      </div>
    );
  }

  return (
    <div className="border-t pt-3 mt-3">
      {/* Desktop layout */}
      <div className="hidden md:flex items-center gap-4">
        <span className="text-sm font-semibold uppercase tracking-wider">Total</span>
        <Progress value={Math.min(percentUsed, 100)} className="h-2 flex-1 max-w-[260px]" />
        <span className={cn('text-sm font-semibold tabular-nums', utilizationColor)}>
          {percentUsed.toFixed(0)}%
        </span>
        <span className="text-sm tabular-nums">
          {formatCurrency(spent)} of {formatCurrency(target)}
        </span>
        <span className={cn('text-sm font-medium tabular-nums ml-auto', isOver && 'text-destructive')}>
          {isOver ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} remaining`}
        </span>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wider">Total</span>
          <span className={cn('text-sm font-semibold tabular-nums', utilizationColor)}>
            {percentUsed.toFixed(0)}%
          </span>
        </div>
        <Progress value={Math.min(percentUsed, 100)} className="h-2" />
        <div className="grid grid-cols-2 gap-x-3 text-xs">
          <div>
            <div className="text-muted-foreground">Spent / Target</div>
            <div className="font-semibold tabular-nums">
              {formatCurrency(spent)} / {formatCurrency(target)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">{isOver ? 'Over budget' : 'Remaining'}</div>
            <div className={cn('font-semibold tabular-nums', isOver && 'text-destructive')}>
              {isOver ? formatCurrency(Math.abs(remaining)) : formatCurrency(remaining)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

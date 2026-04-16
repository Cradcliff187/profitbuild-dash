import { ReactNode } from 'react';
import { ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CostBucket, LaborCushionState } from '@/hooks/useProjectCostBuckets';
import { formatCurrency, cn } from '@/lib/utils';
import { getBudgetUtilizationColor } from '@/utils/financialColors';

interface BucketHeaderRowProps {
  bucket: CostBucket;
  /** When true, the chevron rotates 90deg to indicate expanded state. */
  isOpen: boolean;
  /** Optional click target for the whole row (Collapsible.Trigger handles this when omitted). */
  onClick?: () => void;
}

/**
 * Bucket header row used by CostBucketView (the "replace the table" view).
 *
 * For non-labor buckets: chevron · name · progress bar · target / spent / remaining.
 *
 * For the Labor bucket: same top row PLUS a sub-line showing the dynamic cushion state.
 * The sub-line color and copy adapt to the three cushion zones (under_est / in_cushion /
 * over_capacity) — see plan, Step 2 mockups for the exact visual states.
 *
 * The "no_target" status (bucket has spend but no estimate line) shows an "Over" badge
 * regardless of percent — it's a data hygiene flag, not a normal overrun.
 */
export function BucketHeaderRow({ bucket, isOpen, onClick }: BucketHeaderRowProps) {
  const { displayName, target, spent, remaining, percentUsed, status, laborCushion } = bucket;

  const utilizationColor = getBudgetUtilizationColor(percentUsed);
  const isOver = status === 'over' || status === 'no_target';
  const isNoTarget = status === 'no_target';

  return (
    <CollapsibleTrigger asChild>
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left rounded-md p-3 transition-colors',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          // Active/expanded state — matches the design system "active item" treatment
          // (border-l-2 border-orange-500, see docs/design/VISUAL_HIERARCHY.md).
          // Negative left margin + matching padding keeps text alignment unchanged
          // when the border appears so rows don't visually shift on expand.
          isOpen && 'bg-muted/30 border-l-2 border-orange-500 -ml-[2px] pl-[calc(0.75rem+2px)]'
        )}
        aria-expanded={isOpen}
      >
        {/* Top row: chevron · category · status · spend/target · remaining */}
        {/* Desktop layout */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
              isOpen && 'rotate-90'
            )}
          />
          <span className="text-sm font-semibold uppercase tracking-wider min-w-[140px]">
            {displayName}
          </span>
          <BucketStatusBadge status={status} percentUsed={percentUsed} colorClass={utilizationColor} />
          <Progress value={Math.min(percentUsed, 100)} className="h-2 flex-1 max-w-[260px]" />
          <span className="text-sm tabular-nums whitespace-nowrap">
            {formatCurrency(spent)}{' '}
            <span className="text-muted-foreground">of {formatCurrency(target)}</span>
          </span>
          <span className={cn('text-sm font-medium tabular-nums whitespace-nowrap ml-auto', isOver && 'text-destructive')}>
            {isNoTarget ? `${formatCurrency(spent)} over` : isOver ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} remaining`}
          </span>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden">
          <div className="flex items-center gap-2 mb-2">
            <ChevronRight
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
                isOpen && 'rotate-90'
              )}
            />
            <span className="text-sm font-semibold uppercase tracking-wider flex-1">
              {displayName}
            </span>
            <BucketStatusBadge status={status} percentUsed={percentUsed} colorClass={utilizationColor} />
          </div>
          <Progress value={Math.min(percentUsed, 100)} className="h-2 mb-2" />
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
                {isNoTarget ? formatCurrency(spent) : isOver ? formatCurrency(Math.abs(remaining)) : formatCurrency(remaining)}
              </div>
            </div>
          </div>
        </div>

        {/* Cushion sub-line (labor only) */}
        {laborCushion && <LaborCushionLine cushion={laborCushion} />}
      </button>
    </CollapsibleTrigger>
  );
}

interface BucketStatusBadgeProps {
  status: CostBucket['status'];
  percentUsed: number;
  colorClass: string;
}

function BucketStatusBadge({ status, percentUsed, colorClass }: BucketStatusBadgeProps): ReactNode {
  if (status === 'no_target') {
    return (
      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
        <AlertTriangle className="h-3 w-3 mr-1" />
        No estimate
      </Badge>
    );
  }
  if (status === 'over') {
    return (
      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
        Over · {percentUsed.toFixed(0)}%
      </Badge>
    );
  }
  if (status === 'not_started') {
    return (
      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">
        Not started
      </Badge>
    );
  }
  return (
    <span className={cn('text-sm font-semibold tabular-nums whitespace-nowrap', colorClass)}>
      {percentUsed.toFixed(0)}%
    </span>
  );
}

interface LaborCushionLineProps {
  cushion: LaborCushionState;
}

/**
 * Sub-line under the Labor bucket header. Three zone-colored states matching
 * the Labor card's hours-zone logic ([ProjectOperationalDashboard.tsx:802]):
 *   under_est     → green dot, cushion intact
 *   in_cushion    → yellow dot, eating cushion, $X left
 *   over_capacity → red triangle, cushion gone, $Y real cost overrun
 */
function LaborCushionLine({ cushion }: LaborCushionLineProps) {
  const { zone, bakedIn, remaining, estHours, actualHours, capacityHours, hoursIntoCushion, hoursOverCapacity } = cushion;
  const fmtHours = (h: number) => h.toLocaleString(undefined, { maximumFractionDigits: 1 });

  if (zone === 'under_est') {
    return (
      <div className="mt-1.5 ml-7 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
        <Sparkles className="h-3 w-3" />
        <span>
          Cushion: <span className="font-semibold">{formatCurrency(bakedIn)}</span> intact
          <span className="text-muted-foreground"> ({fmtHours(actualHours)} of {fmtHours(estHours)} hrs used)</span>
        </span>
      </div>
    );
  }

  if (zone === 'in_cushion') {
    return (
      <div className="mt-1.5 ml-7 flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
        <Sparkles className="h-3 w-3" />
        <span>
          Cushion: <span className="font-semibold">{formatCurrency(remaining)}</span> left
          <span className="text-muted-foreground"> ({fmtHours(actualHours)} of {fmtHours(estHours)} est · {fmtHours(hoursIntoCushion)} hrs into cushion)</span>
        </span>
      </div>
    );
  }

  // over_capacity
  // The authoritative dollar overrun figure is `bucket.spent - bucket.target`, shown by the
  // parent BucketHeaderRow's "$X over" pill. Here we surface the hour overage explicitly so
  // the PM can act on hours, not just dollars.
  return (
    <div className="mt-1.5 ml-7 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
      <AlertTriangle className="h-3 w-3" />
      <span>
        Cushion gone
        <span className="text-muted-foreground"> ({fmtHours(actualHours)} of {fmtHours(capacityHours)} cap · {fmtHours(hoursOverCapacity)} hrs over)</span>
      </span>
    </div>
  );
}

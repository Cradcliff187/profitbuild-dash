import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Project } from '@/types/project';
import { useProjectCostBuckets, CostBucket } from '@/hooks/useProjectCostBuckets';
import { formatCurrency, cn } from '@/lib/utils';
import { getBudgetUtilizationColor } from '@/utils/financialColors';

interface CostBucketSummaryStripProps {
  projectId: string;
  project: Project;
}

/**
 * Compact "Detail" tab strip — sits above the existing dense table.
 *
 * Same data as CostBucketView but rendered as a non-collapsible scannable strip.
 * No expand/drill-down here — the dense table below owns that affordance.
 *
 * Desktop: horizontal pill row.
 * Mobile: 2-column grid of bucket pills + totals pill below.
 */
export function CostBucketSummaryStrip({ projectId, project }: CostBucketSummaryStripProps) {
  const { buckets, totals, isLoading, error } = useProjectCostBuckets(projectId, project);

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading…</span>
        </CardContent>
      </Card>
    );
  }

  if (error || buckets.length === 0) {
    // Silent fallback — the dense table below still renders. No need to noise the UI.
    return null;
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        {/* Desktop: horizontal pill row + total pill */}
        <div className="hidden md:flex md:items-center md:gap-3 md:flex-wrap">
          {buckets.map(bucket => (
            <BucketPill key={bucket.category} bucket={bucket} />
          ))}
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/40">
            <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
            <span className={cn('text-xs font-semibold tabular-nums', getBudgetUtilizationColor(totals.percentUsed))}>
              {totals.percentUsed.toFixed(0)}%
            </span>
            <Progress value={Math.min(totals.percentUsed, 100)} className="h-1.5 w-20" />
            <span className="text-xs tabular-nums">
              {formatCurrency(totals.spent)} / {formatCurrency(totals.target)}
            </span>
          </div>
        </div>

        {/* Mobile: stacked pills (1 per row, full width), total at the bottom */}
        <div className="md:hidden space-y-1.5">
          {buckets.map(bucket => (
            <BucketPill key={bucket.category} bucket={bucket} fullWidth />
          ))}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40">
            <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0">Total</span>
            <span className={cn('text-xs font-semibold tabular-nums flex-shrink-0', getBudgetUtilizationColor(totals.percentUsed))}>
              {totals.percentUsed.toFixed(0)}%
            </span>
            <Progress value={Math.min(totals.percentUsed, 100)} className="h-1.5 flex-1" />
            <span className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
              {formatCurrency(totals.spent)} / {formatCurrency(totals.target)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BucketPillProps {
  bucket: CostBucket;
  /** When true, takes the full width of the container (mobile stacked layout). */
  fullWidth?: boolean;
}

/**
 * Single bucket "pill" — abbreviated bucket info in a compact rounded box.
 * Designed to be scannable, not interactive.
 *
 * fullWidth mode (mobile): progress bar flexes to fill remaining space so each
 * pill reads as a single full-width row. Default mode (desktop): sized to content
 * and flex-laid-out horizontally with siblings.
 */
function BucketPill({ bucket, fullWidth = false }: BucketPillProps) {
  const { displayName, target, spent, percentUsed, status } = bucket;
  const isNoTarget = status === 'no_target';
  const isOver = status === 'over' || isNoTarget;
  const utilizationColor = getBudgetUtilizationColor(percentUsed);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md border min-w-0',
        fullWidth && 'w-full',
        isOver && 'border-destructive/50 bg-destructive/5'
      )}
    >
      <span className={cn(
        'text-xs font-semibold uppercase tracking-wider truncate',
        fullWidth ? 'min-w-[84px] max-w-[120px]' : 'flex-shrink-0'
      )}>
        {displayName}
      </span>
      {isNoTarget ? (
        <Badge variant="destructive" className="text-[10px] h-4 px-1 flex-shrink-0">
          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
          Over
        </Badge>
      ) : (
        <span className={cn('text-xs font-semibold tabular-nums flex-shrink-0', utilizationColor)}>
          {percentUsed.toFixed(0)}%
        </span>
      )}
      <Progress
        value={Math.min(percentUsed, 100)}
        className={cn('h-1.5 flex-shrink-0', fullWidth ? 'flex-1' : 'w-12')}
      />
      <span className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
        {formatCurrency(spent)} / {formatCurrency(target)}
      </span>
    </div>
  );
}

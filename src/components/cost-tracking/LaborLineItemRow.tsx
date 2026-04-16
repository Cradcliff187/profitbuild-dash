import { Sparkles } from 'lucide-react';
import { CostBucketLineItem } from '@/hooks/useProjectCostBuckets';
import { formatCurrency, cn } from '@/lib/utils';

interface LaborLineItemRowProps {
  lineItem: CostBucketLineItem;
}

/**
 * Single labor line item shown inside an expanded Labor bucket.
 *
 * Layout shows: description, hours × billing rate breakdown, target $, spent $,
 * and the static per-line cushion annotation pulled from estimate_line_items.
 * labor_cushion_amount. The cushion annotation is intentionally muted — it's
 * a context indicator, not a primary metric (the dynamic cushion lives at the
 * bucket header level).
 *
 * Line items from change orders (source === 'change_order') get a small marker.
 */
export function LaborLineItemRow({ lineItem }: LaborLineItemRowProps) {
  const { description, hours, billingRate, target, spent, cushionAmount, source } = lineItem;
  const isCO = source === 'change_order';
  const hasCushion = (cushionAmount ?? 0) > 0;

  return (
    <div className="border-b last:border-b-0 px-3 py-2 hover:bg-muted/40 transition-colors">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center md:gap-4 text-sm">
        <div className="min-w-0">
          <div className="font-medium truncate" title={description}>
            {description}
            {isCO && (
              <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider">CO</span>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {hours != null && billingRate != null
            ? `${hours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hr × ${formatCurrency(billingRate)}`
            : '—'}
        </div>
        <div className="text-right tabular-nums whitespace-nowrap min-w-[80px]">
          <span className="text-muted-foreground text-xs">target </span>
          <span className="font-medium">{formatCurrency(target)}</span>
        </div>
        <div className="text-right tabular-nums whitespace-nowrap min-w-[80px]">
          <span className="text-muted-foreground text-xs">spent </span>
          <span className="font-medium">{formatCurrency(spent)}</span>
        </div>
        <div className={cn('text-right text-xs tabular-nums whitespace-nowrap min-w-[110px]', hasCushion ? 'text-muted-foreground' : 'invisible')}>
          {hasCushion && (
            <>
              <Sparkles className="inline h-3 w-3 mr-0.5 -mt-0.5" />
              {formatCurrency(cushionAmount!)} cushion
            </>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate" title={description}>
            {description}
            {isCO && (
              <span className="ml-1 text-[10px] text-muted-foreground uppercase tracking-wider">CO</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {hours != null && billingRate != null
              ? `${hours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h × ${formatCurrency(billingRate)}`
              : ''}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 text-xs">
          <div>
            <span className="text-muted-foreground">Target </span>
            <span className="font-semibold tabular-nums">{formatCurrency(target)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Spent </span>
            <span className="font-semibold tabular-nums">{formatCurrency(spent)}</span>
          </div>
        </div>
        {hasCushion && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {formatCurrency(cushionAmount!)} cushion baked in
          </div>
        )}
      </div>
    </div>
  );
}

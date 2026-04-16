import { CheckCircle2, CircleDashed } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CostBucketLineItem } from '@/hooks/useProjectCostBuckets';
import { formatCurrency, cn } from '@/lib/utils';

interface NonLaborLineItemRowProps {
  lineItem: CostBucketLineItem;
}

/**
 * Single non-labor line item (Materials, Subs, Equipment, etc.) inside an
 * expanded bucket. The differentiator from LaborLineItemRow is the quote
 * affordance: when an accepted quote exists, show the payee name + check icon;
 * otherwise a muted "Quote: not yet accepted" placeholder.
 *
 * If multiple accepted quotes exist (rare), the highest-cost one shows here +
 * a "+N" badge with a tooltip listing the others.
 */
export function NonLaborLineItemRow({ lineItem }: NonLaborLineItemRowProps) {
  const { description, target, spent, acceptedQuote, acceptedQuoteCount, source } = lineItem;
  const isCO = source === 'change_order';
  const overflowCount = (acceptedQuoteCount ?? 0) - 1;

  const quoteSlot = acceptedQuote ? (
    <div className="flex items-center gap-1 text-xs">
      <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
      <span className="truncate" title={acceptedQuote.payeeName}>
        {acceptedQuote.payeeName}
      </span>
      {overflowCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-1 text-[10px] px-1 rounded bg-muted text-muted-foreground cursor-help">
                +{overflowCount}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{overflowCount} additional accepted {overflowCount === 1 ? 'quote' : 'quotes'} on this line</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  ) : (
    <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
      <CircleDashed className="h-3 w-3" />
      Not yet quoted
    </div>
  );

  return (
    <div className="border-b last:border-b-0 px-3 py-2 hover:bg-muted/40 transition-colors">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[1.4fr_auto_auto_minmax(140px,1fr)] md:items-center md:gap-4 text-sm">
        <div className="min-w-0">
          <div className="font-medium truncate" title={description}>
            {description}
            {isCO && (
              <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wider">CO</span>
            )}
          </div>
        </div>
        <div className="text-right tabular-nums whitespace-nowrap min-w-[80px]">
          <span className="text-muted-foreground text-xs">target </span>
          <span className="font-medium">{formatCurrency(target)}</span>
        </div>
        <div className="text-right tabular-nums whitespace-nowrap min-w-[80px]">
          <span className="text-muted-foreground text-xs">spent </span>
          <span className={cn('font-medium', spent > target && target > 0 && 'text-destructive')}>
            {formatCurrency(spent)}
          </span>
        </div>
        <div className="min-w-0">{quoteSlot}</div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-1">
        <div className="font-medium truncate" title={description}>
          {description}
          {isCO && (
            <span className="ml-1 text-[10px] text-muted-foreground uppercase tracking-wider">CO</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-3 text-xs">
          <div>
            <span className="text-muted-foreground">Target </span>
            <span className="font-semibold tabular-nums">{formatCurrency(target)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Spent </span>
            <span className={cn('font-semibold tabular-nums', spent > target && target > 0 && 'text-destructive')}>
              {formatCurrency(spent)}
            </span>
          </div>
        </div>
        {quoteSlot}
      </div>
    </div>
  );
}

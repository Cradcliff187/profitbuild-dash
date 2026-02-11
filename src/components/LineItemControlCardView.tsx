import { Eye, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LineItemControlData } from '@/hooks/useLineItemControl';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { cn, formatCurrency } from '@/lib/utils';
import { MobileListCard } from '@/components/ui/mobile-list-card';

interface LineItemControlCardViewProps {
  lineItems: LineItemControlData[];
  onViewDetails: (item: LineItemControlData) => void;
}

const getQuoteStatusBadgeConfig = (status: LineItemControlData['quoteStatus']) => {
  const configs = {
    none: { label: 'Not Quoted', className: 'bg-destructive/15 text-destructive border-destructive/30' },
    partial: { label: 'Awaiting', className: 'bg-secondary text-secondary-foreground border-secondary' },
    full: { label: 'Quoted', className: 'bg-primary/15 text-primary border-primary/30' },
    over: { label: 'Multiple', className: 'border-border text-muted-foreground' },
    internal: { label: 'Internal', className: 'bg-secondary text-secondary-foreground border-secondary' },
  };
  return configs[status];
};

const getAllocationAttention = (item: LineItemControlData) => {
  const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
  if (baseline > 0 && item.actualAmount > baseline * 1.10) {
    const overPct = Math.round(((item.actualAmount - baseline) / baseline) * 100);
    return { message: `${overPct}% over budget`, variant: 'error' as const };
  }
  if (item.allocationStatus === 'none' && item.quotedCost > 0) {
    return { message: 'No expenses allocated', variant: 'warning' as const };
  }
  return undefined;
};

export function LineItemControlCardView({ lineItems, onViewDetails }: LineItemControlCardViewProps) {
  if (lineItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No line items found for this project</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dense-spacing w-full max-w-full overflow-x-hidden min-w-0" data-line-item-cards>
      {lineItems.map((item) => {
        const badgeConfig = getQuoteStatusBadgeConfig(item.quoteStatus);
        const progress = (() => {
          const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
          return item.actualAmount > 0 && baseline > 0
            ? Math.min(Math.round((item.actualAmount / baseline) * 100), 100)
            : 0;
        })();

        return (
          <MobileListCard
            key={item.id}
            title={item.description}
            subtitle={CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}
            badge={badgeConfig}
            secondaryBadge={
              item.source === 'change_order'
                ? { label: 'CO', className: 'bg-secondary text-secondary-foreground border-secondary' }
                : undefined
            }
            metrics={[
              { label: 'Est. Cost', value: formatCurrency(item.estimatedCost) },
              { label: 'Quoted', value: formatCurrency(item.quotedCost) },
              { label: 'Actual', value: formatCurrency(item.actualAmount) },
              { label: 'Progress', value: `${progress}%` },
            ]}
            attention={getAllocationAttention(item)}
            expandable={true}
            expandedContent={
              <div className="space-y-3">
                {/* Variance & Allocation */}
                <div className="flex items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-[10px]">Est vs Quote:</span>
                    {item.quoteStatus === 'internal' || item.quoteStatus === 'none' ? (
                      <span className="text-muted-foreground">{'\u2014'}</span>
                    ) : (
                      <span className={cn(
                        "font-medium tabular-nums",
                        item.costVariance > 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {formatCurrency(item.costVariance)}
                        <span className="ml-0.5 text-[9px]">
                          ({item.costVariancePercent > 0 ? '+' : ''}{item.costVariancePercent.toFixed(1)}%)
                        </span>
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    item.allocationStatus === 'full' ? 'text-success' :
                    item.allocationStatus === 'partial' ? 'text-warning-foreground' :
                    item.allocationStatus === 'none' && item.quotedCost > 0 ? 'text-destructive' :
                    'text-muted-foreground'
                  )}>
                    {item.allocationStatus === 'full' ? 'Fully Allocated' :
                     item.allocationStatus === 'partial' ? `${formatCurrency(item.remainingToAllocate)} remaining` :
                     item.allocationStatus === 'none' ? 'No Expenses' :
                     item.allocationStatus === 'internal' ? 'Internal' : 'Not Quoted'}
                  </span>
                </div>

                {/* Expenses count */}
                {item.correlatedExpenses.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {item.correlatedExpenses.length} expense{item.correlatedExpenses.length !== 1 ? 's' : ''} allocated
                  </div>
                )}
              </div>
            }
            actions={[
              {
                icon: Eye,
                label: 'View Details',
                onClick: (e) => {
                  e.stopPropagation();
                  onViewDetails(item);
                },
              },
            ]}
          />
        );
      })}
    </div>
  );
}

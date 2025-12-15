import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  DollarSign, 
  Eye,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { LineItemControlData } from '@/hooks/useLineItemControl';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { cn, formatCurrency } from '@/lib/utils';

interface LineItemControlCardViewProps {
  lineItems: LineItemControlData[];
  onViewDetails: (item: LineItemControlData) => void;
}

export function LineItemControlCardView({ lineItems, onViewDetails }: LineItemControlCardViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getQuoteStatusBadge = (status: LineItemControlData['quoteStatus']) => {
    const variants = {
      none: { variant: 'destructive' as const, label: 'Not Quoted' },
      partial: { variant: 'secondary' as const, label: 'Awaiting' },
      full: { variant: 'default' as const, label: 'Quoted' },
      over: { variant: 'outline' as const, label: 'Multiple' },
      internal: { variant: 'secondary' as const, label: 'Internal' }
    };
    const config = variants[status];
    return <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 h-4 leading-none font-medium shrink-0 max-w-[80px] min-w-0 overflow-hidden"><span className="truncate block">{config.label}</span></Badge>;
  };

  const getAllocationBadge = (status: LineItemControlData['allocationStatus']) => {
    const configs = {
      full: { variant: 'default' as const, icon: <CheckCircle className="h-3 w-3" /> },
      partial: { variant: 'secondary' as const, icon: <AlertTriangle className="h-3 w-3" /> },
      none: { variant: 'destructive' as const, icon: <AlertTriangle className="h-3 w-3" /> },
      internal: { variant: 'outline' as const, icon: null },
      not_quoted: { variant: 'outline' as const, icon: null }
    };
    return configs[status];
  };

  const getProgressPercent = (item: LineItemControlData) => {
    const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
    return item.actualAmount > 0 && baseline > 0
      ? Math.min(Math.round((item.actualAmount / baseline) * 100), 100)
      : 0;
  };

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
    <div className="dense-spacing w-full max-w-full overflow-x-hidden min-w-0" data-line-item-cards style={{ width: '100%', maxWidth: '100%' }}>
      {lineItems.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        const progress = getProgressPercent(item);
        const allocationConfig = getAllocationBadge(item.allocationStatus);

        return (
          <Card key={item.id} className="compact-card border border-primary/10 hover:bg-muted/50 transition-colors overflow-hidden w-full max-w-full box-border min-w-0" data-line-item-card style={{ maxWidth: '100%', width: '100%', minWidth: 0 }}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)} className="w-full max-w-full min-w-0">
              <CollapsibleTrigger asChild className="w-full max-w-full min-w-0">
                <CardContent className="p-2.5 sm:p-3 cursor-pointer mobile-touch-target w-full max-w-full overflow-x-hidden min-w-0" style={{ width: '100%', maxWidth: '100%' }}>
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2 w-full min-w-0">
                    {/* Left: Description & Category */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm truncate min-w-0 flex-1">
                          {item.description}
                        </span>
                        {item.source === 'change_order' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                            CO
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 pl-5 min-w-0 overflow-hidden">
                        <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                          {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}
                        </span>
                        <div className="shrink-0">
                          {getQuoteStatusBadge(item.quoteStatus)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quoted Cost & Progress */}
                    <div className="text-right shrink-0 min-w-0 max-w-[100px] sm:max-w-none overflow-hidden">
                      <div className="font-semibold text-sm tabular-nums truncate min-w-0">
                        {formatCurrency(item.quotedCost || item.estimatedCost)}
                      </div>
                      <div className="flex items-center justify-end gap-0.5 sm:gap-1 mt-1">
                        <div className="w-10 sm:w-12 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              progress >= 100 ? "bg-green-500" : progress > 0 ? "bg-primary" : "bg-muted"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground tabular-nums w-6 sm:w-7 text-right shrink-0">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent className="w-full max-w-full overflow-x-hidden min-w-0" style={{ width: '100%', maxWidth: '100%' }}>
                <div className="border-t bg-muted/30 p-3 space-y-3 w-full max-w-full overflow-x-hidden min-w-0">
                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs w-full min-w-0">
                    <div className="compact-card-section bg-background rounded p-2.5 min-w-0 overflow-hidden">
                      <div className="text-muted-foreground mb-1 text-[10px] truncate">Est. Price</div>
                      <div className="font-medium tabular-nums text-sm truncate min-w-0">{formatCurrency(item.estimatedPrice)}</div>
                    </div>
                    <div className="compact-card-section bg-background rounded p-2.5 min-w-0 overflow-hidden">
                      <div className="text-muted-foreground mb-1 text-[10px] truncate">Est. Cost</div>
                      <div className="font-medium tabular-nums text-sm truncate min-w-0">{formatCurrency(item.estimatedCost)}</div>
                    </div>
                    <div className="compact-card-section bg-background rounded p-2.5 min-w-0 overflow-hidden">
                      <div className="text-muted-foreground mb-1 text-[10px] truncate">Quoted Cost</div>
                      <div className="font-medium tabular-nums text-sm truncate min-w-0">{formatCurrency(item.quotedCost)}</div>
                    </div>
                    <div className="compact-card-section bg-background rounded p-2.5 min-w-0 overflow-hidden">
                      <div className="text-muted-foreground mb-1 text-[10px] truncate">Actual</div>
                      <div className="font-medium tabular-nums text-sm truncate min-w-0">{formatCurrency(item.actualAmount)}</div>
                    </div>
                  </div>

                  {/* Variance & Allocation Row */}
                  <div className="flex items-center justify-between gap-1.5 text-xs pt-1 border-t border-border/50 w-full min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                      <span className="text-muted-foreground shrink-0 text-[10px] whitespace-nowrap">Est vs Quote:</span>
                      {item.quoteStatus === 'internal' || item.quoteStatus === 'none' ? (
                        <span className="text-muted-foreground shrink-0">—</span>
                      ) : (
                        <span className={cn(
                          "font-medium tabular-nums min-w-0 overflow-hidden flex items-center",
                          item.costVariance > 0 ? "text-destructive" : "text-muted-foreground"
                        )} title={`${formatCurrency(item.costVariance)} (${item.costVariancePercent > 0 ? '+' : ''}${item.costVariancePercent.toFixed(1)}%)`}>
                          <span className="truncate min-w-0">{formatCurrency(item.costVariance)}</span>
                          <span className="ml-0.5 text-[9px] shrink-0 whitespace-nowrap">
                            ({item.costVariancePercent > 0 ? '+' : ''}{item.costVariancePercent.toFixed(1)}%)
                          </span>
                        </span>
                      )}
                    </div>
                    <Badge variant={allocationConfig.variant} className="text-[10px] px-1 py-0 h-4 gap-0.5 shrink-0 flex items-center max-w-[90px] min-w-0">
                      {allocationConfig.icon}
                      <span className="truncate min-w-0 text-[9px]">
                        {item.allocationStatus === 'full' ? 'Allocated' : 
                         item.allocationStatus === 'partial' ? `${formatCurrency(item.remainingToAllocate)} left` :
                         item.allocationStatus === 'none' ? 'No Expenses' :
                         item.allocationStatus}
                      </span>
                    </Badge>
                  </div>

                  {/* Expenses Count */}
                  {item.correlatedExpenses.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <DollarSign className="h-3 w-3 shrink-0" />
                      <span>{item.correlatedExpenses.length} expense{item.correlatedExpenses.length !== 1 ? 's' : ''} allocated</span>
                    </div>
                  )}

                  {/* View Details Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-9 text-xs mobile-touch-target"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(item);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    View Details
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}

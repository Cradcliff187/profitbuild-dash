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
    return <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 h-4">{config.label}</Badge>;
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
    <div className="space-y-2">
      {lineItems.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        const progress = getProgressPercent(item);
        const allocationConfig = getAllocationBadge(item.allocationStatus);

        return (
          <Card key={item.id} className="overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
              <CollapsibleTrigger asChild>
                <CardContent className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    {/* Left: Description & Category */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm truncate">
                          {item.description}
                        </span>
                        {item.source === 'change_order' && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 shrink-0">
                            CO
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pl-5">
                        <span className="text-xs text-muted-foreground truncate">
                          {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}
                        </span>
                        {getQuoteStatusBadge(item.quoteStatus)}
                      </div>
                    </div>

                    {/* Right: Quoted Cost & Progress */}
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm tabular-nums">
                        {formatCurrency(item.quotedCost || item.estimatedCost)}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              progress >= 100 ? "bg-green-500" : progress > 0 ? "bg-primary" : "bg-muted"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-7">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t bg-muted/30 p-3 space-y-3">
                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background rounded p-2">
                      <div className="text-muted-foreground mb-0.5">Est. Price</div>
                      <div className="font-medium tabular-nums">{formatCurrency(item.estimatedPrice)}</div>
                    </div>
                    <div className="bg-background rounded p-2">
                      <div className="text-muted-foreground mb-0.5">Est. Cost</div>
                      <div className="font-medium tabular-nums">{formatCurrency(item.estimatedCost)}</div>
                    </div>
                    <div className="bg-background rounded p-2">
                      <div className="text-muted-foreground mb-0.5">Quoted Cost</div>
                      <div className="font-medium tabular-nums">{formatCurrency(item.quotedCost)}</div>
                    </div>
                    <div className="bg-background rounded p-2">
                      <div className="text-muted-foreground mb-0.5">Actual</div>
                      <div className="font-medium tabular-nums">{formatCurrency(item.actualAmount)}</div>
                    </div>
                  </div>

                  {/* Variance & Allocation Row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Est vs Quote:</span>
                      {item.quoteStatus === 'internal' || item.quoteStatus === 'none' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={cn(
                          "font-medium tabular-nums",
                          item.costVariance > 0 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {formatCurrency(item.costVariance)}
                          <span className="ml-1 text-[10px]">
                            ({item.costVariancePercent > 0 ? '+' : ''}{item.costVariancePercent.toFixed(1)}%)
                          </span>
                        </span>
                      )}
                    </div>
                    <Badge variant={allocationConfig.variant} className="text-[10px] px-1.5 py-0 h-4 gap-1">
                      {allocationConfig.icon}
                      {item.allocationStatus === 'full' ? 'Allocated' : 
                       item.allocationStatus === 'partial' ? `${formatCurrency(item.remainingToAllocate)} left` :
                       item.allocationStatus === 'none' ? 'No Expenses' :
                       item.allocationStatus}
                    </Badge>
                  </div>

                  {/* Expenses Count */}
                  {item.correlatedExpenses.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span>{item.correlatedExpenses.length} expense{item.correlatedExpenses.length !== 1 ? 's' : ''} allocated</span>
                    </div>
                  )}

                  {/* View Details Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(item);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
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

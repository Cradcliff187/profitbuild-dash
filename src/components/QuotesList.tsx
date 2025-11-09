import { useState, useEffect } from "react";
import { Eye, FileText, Trash2, ArrowUpDown, Edit, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Quote, QuoteStatus } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { calculateEstimateTotalCost } from "@/utils/estimateFinancials";
import { calculateQuoteTotalCost } from "@/utils/quoteFinancials";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { QuotesTableView } from "./QuotesTableView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/utils";

interface QuotesListProps {
  quotes: Quote[];
  estimates: Estimate[];
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  onCompare: (quote: Quote) => void;
  onExpire?: (expiredQuoteIds: string[]) => void;
  onCreateNew?: () => void;
}

export const QuotesList = ({ quotes, estimates, onEdit, onDelete, onCompare, onExpire, onCreateNew }: QuotesListProps) => {
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState<'date' | 'project' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (quoteId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      return next;
    });
  };

  const getEstimateForQuote = (quote: Quote): Estimate | undefined => {
    return estimates.find(est => est.project_id === quote.project_id);
  };

  const getEstimateLineItemCost = (quote: Quote): number | null => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate || !estimate.lineItems || !quote.lineItems) {
      return null;
    }
    
    // If quote is linked to a specific estimate line item, use that item's cost
    if (quote.estimate_line_item_id) {
      const targetLineItem = estimate.lineItems.find(item => item.id === quote.estimate_line_item_id);
      if (targetLineItem) {
        return targetLineItem.totalCost || (targetLineItem.quantity * targetLineItem.costPerUnit);
      }
    }
    
    // Fallback: If no specific line item link, match by categories present in quote
    const quoteCategorySet = new Set(quote.lineItems.map(item => item.category));
    const matchingItems = estimate.lineItems.filter(item => quoteCategorySet.has(item.category));
    
    if (matchingItems.length === 0) return null;
    
    return matchingItems.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit), 0);
  };

  const getQuotedAmountForEstimateMatch = (quote: Quote): number | null => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate || !estimate.lineItems || !quote.lineItems) {
      return null;
    }

    // If linked to specific estimate line item
    if (quote.estimate_line_item_id) {
      const targetLineItem = estimate.lineItems.find(item => item.id === quote.estimate_line_item_id);
      if (!targetLineItem) return null;
      
      // Find quote line items that match this category
      const matchingQuoteItems = quote.lineItems.filter(item => item.category === targetLineItem.category);
      return matchingQuoteItems.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit), 0);
    } else {
      // Category-based matching - sum all quote line item costs
      return quote.lineItems.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit), 0);
    }
  };

  const getCostVariance = (quote: Quote): { amount: number; percentage: number; status: 'over' | 'under' | 'exact' } => {
    const estimateCost = getEstimateLineItemCost(quote);
    const quotedAmount = getQuotedAmountForEstimateMatch(quote);
    
    if (estimateCost === null || quotedAmount === null) {
      return { amount: 0, percentage: 0, status: 'exact' };
    }

    const difference = quotedAmount - estimateCost;
    const percentage = estimateCost > 0 ? (difference / estimateCost) * 100 : 0;
    
    return {
      amount: Math.abs(difference),
      percentage: Math.abs(percentage),
      status: difference > 0 ? 'over' : difference < 0 ? 'under' : 'exact'
    };
  };

  const sortedQuotes = [...quotes].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime();
        break;
      case 'project':
        comparison = a.projectName.localeCompare(b.projectName);
        break;
      case 'total':
        comparison = a.total - b.total;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Auto-expire quotes function
  const checkAndExpireQuotes = async (quotesToCheck: Quote[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiredQuotes = quotesToCheck.filter(quote => 
      quote.status === QuoteStatus.PENDING &&
      quote.valid_until &&
      new Date(quote.valid_until) < today
    );
    
    if (expiredQuotes.length > 0) {
      try {
        // Update database
        const updatePromises = expiredQuotes.map(quote =>
          supabase.from('quotes')
            .update({ status: 'expired' })
            .eq('id', quote.id)
        );
        
        await Promise.all(updatePromises);
        
        const expiredQuoteIds = expiredQuotes.map(q => q.id);
        onExpire?.(expiredQuoteIds);
        
        toast({
          title: "Quotes Auto-Expired",
          description: `${expiredQuotes.length} quote(s) have been automatically expired due to past expiration dates.`,
        });
        
        return expiredQuoteIds;
      } catch (error) {
        console.error('Error expiring quotes:', error);
        toast({
          title: "Error",
          description: "Failed to expire quotes. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    return [];
  };

  // Run auto-expire check on component mount
  useEffect(() => {
    if (quotes.length > 0) {
      checkAndExpireQuotes(quotes);
    }
  }, [quotes.length]); // Only run when quotes array changes length

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // Use table view for desktop, card view for mobile
  if (!isMobile) {
    return (
      <QuotesTableView
        quotes={quotes}
        estimates={estimates}
        onEdit={onEdit}
        onDelete={onDelete}
        onCompare={onCompare}
        onCreateNew={onCreateNew || (() => {})}
      />
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="compact-card">
        <CardContent className="py-8 p-compact">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-interface font-semibold mb-1">No Quotes Yet</h3>
            <p className="text-label">Create your first quote to start comparing against estimates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dense-spacing">
      {/* Sort Controls */}
      <Card className="compact-card">
        <CardHeader className="p-compact pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-interface">Quotes ({quotes.length})</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('date')}
                className="h-btn-compact text-label"
              >
                Date {sortBy === 'date' && <ArrowUpDown className="ml-1 h-3 w-3" />}
              </Button>
              <Button
                variant={sortBy === 'project' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('project')}
                className="h-btn-compact text-label"
              >
                Project {sortBy === 'project' && <ArrowUpDown className="ml-1 h-3 w-3" />}
              </Button>
              <Button
                variant={sortBy === 'total' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('total')}
                className="h-btn-compact text-label"
              >
                Total {sortBy === 'total' && <ArrowUpDown className="ml-1 h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quotes Grid */}
      <div className="space-y-3">
        {sortedQuotes.map((quote) => {
          const estimate = getEstimateForQuote(quote);
          const variance = getCostVariance(quote);
          
          return (
            <Card key={quote.id} className="compact-card border border-primary/10">
              <CardHeader className="p-compact bg-gradient-to-r from-primary/5 to-transparent">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-interface">{quote.projectName}</CardTitle>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <div className="text-label text-muted-foreground">
                    {quote.client} • {quote.quoteNumber}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-compact space-y-2">
                <Collapsible open={expandedCards.has(quote.id)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCard(quote.id);
                    }}
                    className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50 border-t"
                  >
                    <span className="text-sm font-medium">
                      {formatCurrency(quote.total)} • {quote.quotedBy}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      expandedCards.has(quote.id) ? 'rotate-180' : ''
                    }`} />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-2 pt-2">
                    {/* Quote Details */}
                    <div className="grid grid-cols-2 gap-2 text-label">
                      <div>
                        <div className="text-muted-foreground text-label">Quoted By</div>
                        <div className="font-medium">{quote.quotedBy}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-label">Date Received</div>
                        <div className="font-medium">{format(quote.dateReceived, "MMM dd, yyyy")}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-label">Quote Total</div>
                        <div className="text-interface font-bold font-mono">{formatCurrency(quote.total)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-label">Estimate Cost</div>
                        <div className="font-medium font-mono">
                          {(() => {
                            const estimateCost = getEstimateLineItemCost(quote);
                            return estimateCost !== null ? formatCurrency(estimateCost) : 'N/A';
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Quoted Amount</div>
                        <div className="font-bold">
                          {(() => {
                            const quotedAmount = getQuotedAmountForEstimateMatch(quote);
                            return quotedAmount !== null ? formatCurrency(quotedAmount) : 'N/A';
                          })()}
                        </div>
                      </div>
                      {quote.valid_until && (
                        <>
                          <div>
                            <div className="text-muted-foreground">Valid Until</div>
                            <div className="font-medium">{format(quote.valid_until, "MMM dd, yyyy")}</div>
                          </div>
                          <div></div>
                        </>
                      )}
                      {quote.accepted_date && (
                        <>
                          <div>
                            <div className="text-muted-foreground">Accepted Date</div>
                            <div className="font-medium">{format(quote.accepted_date, "MMM dd, yyyy")}</div>
                          </div>
                          <div></div>
                        </>
                      )}
                    </div>


                    {/* Budget Variance */}
                    {estimate && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Cost Variance</span>
                          <Badge 
                            variant={
                              variance.status === 'over' ? 'destructive' : 
                              variance.status === 'under' ? 'default' : 
                              'secondary'
                            }
                          >
                            {variance.status === 'over' && '+'}
                            {variance.status === 'under' && '-'}
                            {formatCurrency(variance.amount)} ({variance.percentage.toFixed(1)}%)
                          </Badge>
                        </div>
                        {variance.status === 'over' && (
                          <div className="text-xs text-destructive mt-1">
                            Over budget
                          </div>
                        )}
                        {variance.status === 'under' && (
                          <div className="text-xs text-green-600">
                            Under budget
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {quote.status === QuoteStatus.REJECTED && quote.rejection_reason && (
                      <div className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <div className="text-red-600 dark:text-red-400 font-medium mb-1">Rejection Reason</div>
                        <div className="text-red-800 dark:text-red-200">{quote.rejection_reason}</div>
                      </div>
                    )}

                    {/* Notes */}
                    {quote.notes && (
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">Notes</div>
                        <div className="text-foreground">{quote.notes}</div>
                      </div>
                    )}

                    {/* Action Buttons - Inside Collapsed Area */}
                    <div className="flex gap-1 pt-2 border-t border-primary/20">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(quote)}
                        className="h-btn-compact text-label flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCompare(quote)}
                        disabled={!estimate}
                        className="h-btn-compact text-label flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Compare
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-btn-compact">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this quote from {quote.quotedBy}? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(quote.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
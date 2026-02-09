import { useState, useEffect } from "react";
import { Eye, FileText, Trash2, ArrowUpDown, Edit, ChevronDown, Plus, Files, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileListCard } from "@/components/ui/mobile-list-card";
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
import { Quote, QuoteStatus } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { calculateEstimateTotalCost } from "@/utils/estimateFinancials";
import { QuotesTableView } from "./QuotesTableView";
import { DuplicateQuoteModal } from "./DuplicateQuoteModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/utils";

interface QuotesListProps {
  quotes: Quote[];
  estimates: Estimate[];
  onEdit: (quote: Quote) => void;
  onView?: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  onCompare: (quote: Quote) => void;
  onExpire?: (expiredQuoteIds: string[]) => void;
  onCreateNew?: () => void;
  onRefresh?: () => void;
}

export const QuotesList = ({ quotes, estimates, onEdit, onView, onDelete, onCompare, onExpire, onCreateNew, onRefresh }: QuotesListProps) => {
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState<'date' | 'project' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [quoteToDuplicate, setQuoteToDuplicate] = useState<Quote | null>(null);

  const getEstimateForQuote = (quote: Quote): Estimate | undefined => {
    // Prioritize exact estimate_id match first
    if (quote.estimate_id) {
      const byId = estimates.find(est => est.id === quote.estimate_id);
      if (byId) return byId;
    }
    // Fallback to project match
    return estimates.find(est => est.project_id === quote.project_id);
  };

  const getEstimateLineItemCost = (quote: Quote): number | null => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate || !estimate.lineItems) {
      return null;
    }
    
    const estimateLineItems = estimate.lineItems || [];
    const quoteLineItems = quote.lineItems || [];
    
    if (estimateLineItems.length === 0) return null;
    
    let totalEstimatedCost = 0;
    let hasMatch = false;
    
    // Match via quote line items' estimate_line_item_id links
    if (quoteLineItems.length > 0) {
      quoteLineItems.forEach(qli => {
        const linkId = qli.estimateLineItemId || (qli as any).estimate_line_item_id;
        if (linkId) {
          const estimateLineItem = estimateLineItems.find(eli => eli.id === linkId);
          if (estimateLineItem) {
            totalEstimatedCost += Number(estimateLineItem.totalCost || 0);
            hasMatch = true;
          }
        }
      });
      
      if (hasMatch) {
        return totalEstimatedCost;
      }
    }
    
    // Fallback: quote-level estimate_line_item_id link
    if (quote.estimate_line_item_id) {
      const targetLineItem = estimateLineItems.find(
        item => item.id === quote.estimate_line_item_id
      );
      if (targetLineItem) {
        return Number(targetLineItem.totalCost || 0);
      }
    }
    
    return null;
  };

  const getEstimateLineItemPrice = (quote: Quote): number | null => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate || !estimate.lineItems) {
      return null;
    }
    
    const estimateLineItems = estimate.lineItems || [];
    const quoteLineItems = quote.lineItems || [];
    
    if (estimateLineItems.length === 0) return null;
    
    let totalEstimatedPrice = 0;
    let hasMatch = false;
    
    // Match via quote line items' estimate_line_item_id links
    if (quoteLineItems.length > 0) {
      quoteLineItems.forEach(qli => {
        const linkId = qli.estimateLineItemId || (qli as any).estimate_line_item_id;
        if (linkId) {
          const estimateLineItem = estimateLineItems.find(eli => eli.id === linkId);
          if (estimateLineItem) {
            totalEstimatedPrice += Number(estimateLineItem.total || 0);
            hasMatch = true;
          }
        }
      });
      
      if (hasMatch) {
        return totalEstimatedPrice;
      }
    }
    
    // Fallback: quote-level estimate_line_item_id link
    if (quote.estimate_line_item_id) {
      const targetLineItem = estimateLineItems.find(
        item => item.id === quote.estimate_line_item_id
      );
      if (targetLineItem) {
        return Number(targetLineItem.total || 0);
      }
    }
    
    return null;
  };

  const getQuotedCost = (quote: Quote): number => {
    return quote.lineItems.reduce((sum, item) => 
      sum + (item.totalCost || item.quantity * item.costPerUnit), 0
    );
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
        
        toast.info("Quotes Auto-Expired", {
          description: `${expiredQuotes.length} quote(s) have been automatically expired due to past expiration dates.`,
        });
        
        return expiredQuoteIds;
      } catch (error) {
        console.error('Error expiring quotes:', error);
        toast.error("Failed to expire quotes. Please try again.");
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
        onView={onView}
        onDelete={onDelete}
        onCompare={onCompare}
        onCreateNew={onCreateNew || (() => {})}
        onRefresh={onRefresh}
      />
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="compact-card">
        <CardContent className="py-8 p-3">
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
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Quotes ({quotes.length})</CardTitle>
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
      <div className="space-y-2">
        {sortedQuotes.map((quote) => (
          <MobileListCard
            key={quote.id}
            title={quote.quoteNumber || "No Quote #"}
            subtitle={`${quote.projectName || "No Project"}${quote.quotedBy ? ` • ${quote.quotedBy}` : ""}`}
            badge={{
              label: (quote.status ?? QuoteStatus.PENDING).toUpperCase(),
              className: (() => {
                switch (quote.status) {
                  case QuoteStatus.ACCEPTED:
                    return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
                  case QuoteStatus.REJECTED:
                    return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
                  case QuoteStatus.EXPIRED:
                    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                  default:
                    return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
                }
              })(),
            }}
            metrics={[
              {
                label: "Quoted Cost",
                value: formatCurrency(getQuotedCost(quote)),
              },
              {
                label: "Est. Cost",
                value: (() => {
                  const estCost = getEstimateLineItemCost(quote);
                  return estCost != null && estCost > 0 ? formatCurrency(estCost) : "—";
                })(),
              },
            ]}
            attention={(() => {
              const quotedCost = getQuotedCost(quote);
              const estCost = getEstimateLineItemCost(quote);
              if (estCost == null || estCost <= 0 || quotedCost <= 0) return undefined;
              const variance = ((quotedCost - estCost) / estCost) * 100;
              if (variance > 10) {
                return {
                  message: `${variance.toFixed(0)}% over estimate`,
                  variant: "error" as const,
                };
              }
              if (variance < -10) {
                return {
                  message: `${Math.abs(variance).toFixed(0)}% under estimate`,
                  variant: "info" as const,
                };
              }
              return undefined;
            })()}
            onTap={() => onView?.(quote)}
            actions={[
              {
                icon: Eye,
                label: "View",
                onClick: (e) => {
                  e.stopPropagation();
                  onView?.(quote);
                },
              },
              {
                icon: Edit,
                label: "Edit",
                onClick: (e) => {
                  e.stopPropagation();
                  onEdit(quote);
                },
              },
              {
                icon: BarChart3,
                label: "Compare",
                onClick: (e) => {
                  e.stopPropagation();
                  onCompare(quote);
                },
              },
              {
                icon: Trash2,
                label: "Delete",
                onClick: (e) => {
                  e.stopPropagation();
                  onDelete(quote.id);
                },
                variant: "destructive" as const,
              },
            ]}
          />
        ))}
      </div>

      {/* Duplicate Quote Modal */}
      {quoteToDuplicate && (
        <DuplicateQuoteModal
          open={duplicateModalOpen}
          onOpenChange={setDuplicateModalOpen}
          quote={quoteToDuplicate}
          estimates={estimates}
          onSuccess={(newQuoteId) => {
            setDuplicateModalOpen(false);
            onRefresh?.(); // Trigger parent refresh instead of page reload
          }}
        />
      )}
    </div>
  );
};
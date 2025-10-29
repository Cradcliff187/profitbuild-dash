import React, { useState } from "react";
import { Plus, FileText, CheckCircle, Eye, Edit, Trash2, Calendar, User, DollarSign, MoreHorizontal, Copy, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Quote, QuoteStatus } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { calculateEstimateTotalCost } from "@/utils/estimateFinancials";
import { calculateQuoteTotalCost } from "@/utils/quoteFinancials";
import { FinancialTableTemplate, FinancialTableColumn, FinancialTableGroup } from "./FinancialTableTemplate";
import { QuoteStatusSelector } from "./QuoteStatusSelector";
// Removed BudgetComparisonBadge import
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type QuoteWithEstimate = Quote & { estimate?: Estimate };

interface QuotesTableViewProps {
  quotes: Quote[];
  estimates: Estimate[];
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  onCompare: (quote: Quote) => void;
  onAccept?: (quote: Quote) => void;
  onCreateNew: () => void;
}

export const QuotesTableView = ({ 
  quotes, 
  estimates, 
  onEdit, 
  onDelete, 
  onCompare, 
  onAccept, 
  onCreateNew 
}: QuotesTableViewProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [localQuotes, setLocalQuotes] = useState(quotes);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Update local state when quotes prop changes
  React.useEffect(() => {
    setLocalQuotes(quotes);
  }, [quotes]);

  const handleStatusUpdate = (quoteId: string, newStatus: QuoteStatus) => {
    setLocalQuotes(prev => 
      prev.map(q => 
        q.id === quoteId 
          ? { ...q, status: newStatus }
          : q
      )
    );
  };

  // Initialize all groups as collapsed on first load
  React.useEffect(() => {
    if (localQuotes.length > 0 && collapsedGroups.size === 0) {
      const projectIds = new Set(localQuotes.map(q => q.project_id));
      setCollapsedGroups(projectIds);
    }
  }, [localQuotes.length]);

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
    
    // First, try to match via quote line items' estimate_line_item_id links
    if (quoteLineItems.length > 0) {
      quoteLineItems.forEach(qli => {
        // Handle both camelCase and snake_case
        const linkId = qli.estimateLineItemId || (qli as any).estimate_line_item_id;
        if (linkId) {
          const estimateLineItem = estimateLineItems.find(eli => eli.id === linkId);
          if (estimateLineItem) {
            totalEstimatedCost += Number(estimateLineItem.totalCost || 0);
            hasMatch = true;
          } else {
            console.warn(`Quote line item references estimate line item ${linkId} but it was not found in estimate ${estimate.id}`);
          }
        }
      });
      
      if (hasMatch) {
        return totalEstimatedCost;
      }
    }
    
    // Fallback: If quote has quote-level estimate_line_item_id link
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
    
    // First, try to match via quote line items' estimate_line_item_id links
    if (quoteLineItems.length > 0) {
      quoteLineItems.forEach(qli => {
        // Handle both camelCase and snake_case
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
    
    // Fallback: If quote has quote-level estimate_line_item_id link
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

  const getQuotedAmountForEstimateMatch = (quote: Quote): number | null => {
    const quoteLineItems = quote.lineItems || [];
    if (quoteLineItems.length === 0) return null;
    
    let totalQuoted = 0;
    let hasMatch = false;
    
    // Sum quote line items that have estimate_line_item_id links
    quoteLineItems.forEach(qli => {
      // Handle both camelCase and snake_case
      const linkId = qli.estimateLineItemId || (qli as any).estimate_line_item_id;
      if (linkId) {
        totalQuoted += Number(qli.total || 0);
        hasMatch = true;
      }
    });
    
    if (hasMatch) {
      return totalQuoted;
    }
    
    // Fallback: If quote has quote-level estimate_line_item_id link, use quote total
    if (quote.estimate_line_item_id) {
      return Number(quote.total || 0);
    }
    
    // Last fallback: sum all quote line item totals
    return quoteLineItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  };

  // Line-item-aware variance calculation for individual quotes
  const getCostVariance = (quote: Quote): { amount: number; percentage: number; status: 'under' | 'over' | 'none' } => {
    const estimateCost = getEstimateLineItemCost(quote);
    const quotedAmount = getQuotedAmountForEstimateMatch(quote);
    
    if (estimateCost === null || quotedAmount === null || estimateCost === 0) {
      return { amount: 0, percentage: 0, status: 'none' };
    }
    
    const variance = quotedAmount - estimateCost;
    const variancePercent = (variance / estimateCost) * 100;
    
    return {
      amount: Math.abs(variance),
      percentage: Math.abs(variancePercent),
      status: variance > 0 ? 'over' : variance < 0 ? 'under' : 'none'
    };
  };

  // Add estimate data to quotes
  const quotesWithEstimates: QuoteWithEstimate[] = localQuotes.map(quote => ({
    ...quote,
    estimate: getEstimateForQuote(quote)
  }));

  // Group quotes by project
  const quotesByProject = quotesWithEstimates.reduce((groups, quote) => {
    const projectKey = quote.project_id;
    if (!groups[projectKey]) {
      groups[projectKey] = [];
    }
    groups[projectKey].push(quote);
    return groups;
  }, {} as Record<string, QuoteWithEstimate[]>);

  // Sort quotes within each project by date received (newest first)
  Object.keys(quotesByProject).forEach(projectId => {
    quotesByProject[projectId].sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime());
  });

  // Convert to grouped format for the table
  const groupedData: FinancialTableGroup<QuoteWithEstimate>[] = Object.entries(quotesByProject).map(
    ([projectId, projectQuotes]) => ({
      groupKey: projectId,
      groupLabel: `[${projectQuotes[0].project_number}] ${projectQuotes[0].projectName} - ${projectQuotes[0].client}`,
      items: projectQuotes,
      isCollapsible: true,
      defaultExpanded: false,
    })
  );

  const handleDeleteClick = (quoteId: string) => {
    setQuoteToDelete(quoteId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (quoteToDelete) {
      onDelete(quoteToDelete);
      setQuoteToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicate = (quote: Quote) => {
    const duplicatedQuote: Quote = {
      ...quote,
      id: '',
      quoteNumber: `${quote.quoteNumber}-COPY`,
      status: QuoteStatus.PENDING,
      accepted_date: undefined,
      createdAt: new Date(),
    };
    onEdit(duplicatedQuote);
  };

  const columns: FinancialTableColumn<QuoteWithEstimate>[] = [
    {
      key: 'quote_number',
      label: 'Quote #',
      align: 'left',
      width: '120px',
      sortable: true,
      getSortValue: (quote) => quote.quoteNumber,
      render: (quote) => (
        <div className="font-mono text-xs text-foreground/80">
          {quote.quoteNumber}
        </div>
      ),
    },
    {
      key: 'line_items',
      label: 'Line Items',
      align: 'center',
      width: '90px',
      sortable: true,
      getSortValue: (quote) => quote.lineItems?.length || 0,
      render: (quote) => {
        const count = quote.lineItems?.length || 0;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-medium">
                  {count}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total line items in this quote</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'payee',
      label: 'Quoted By',
      align: 'left',
      width: '140px',
      sortable: true,
      getSortValue: (quote) => quote.quotedBy,
      render: (quote) => (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium truncate">{quote.quotedBy}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      width: '120px',
      render: (quote) => (
        <QuoteStatusSelector
          quoteId={quote.id}
          currentStatus={quote.status}
          quoteNumber={quote.quoteNumber}
          payeeName={quote.quotedBy}
          projectId={quote.project_id}
          totalAmount={quote.total}
          onStatusChange={(newStatus) => handleStatusUpdate(quote.id, newStatus)}
        />
      ),
    },
    {
      key: 'date_received',
      label: 'Received',
      align: 'right',
      width: '100px',
      sortable: true,
      getSortValue: (quote) => new Date(quote.dateReceived).getTime(),
      render: (quote) => (
        <div className="text-xs text-foreground/70">
          {format(quote.dateReceived, 'MMM dd')}
        </div>
      ),
    },
    {
      key: 'valid_until',
      label: 'Valid Until',
      align: 'right',
      width: '100px',
      sortable: true,
      getSortValue: (quote) => quote.valid_until ? new Date(quote.valid_until).getTime() : 0,
      render: (quote) => {
        if (!quote.valid_until) return <span className="text-xs text-muted-foreground">-</span>;
        
        const isExpiring = new Date(quote.valid_until) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const isExpired = new Date(quote.valid_until) < new Date();
        
        return (
          <div className={cn(
            "text-xs flex items-center gap-1",
            isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-foreground/70'
          )}>
            <Calendar className="h-3 w-3" />
            {format(quote.valid_until, 'MMM dd')}
          </div>
        );
      },
    },
    {
      key: 'quote_total',
      label: 'Quote Total',
      align: 'right',
      width: '120px',
      sortable: true,
      getSortValue: (quote) => quote.total,
      render: (quote) => (
        <div className="font-semibold text-xs font-mono tabular-nums">
          {formatCurrency(quote.total, { showCents: false })}
        </div>
      ),
    },
    {
      key: 'estimate_cost',
      label: 'Estimate Cost',
      align: 'right',
      width: '120px',
      sortable: true,
      getSortValue: (quote) => getEstimateLineItemCost(quote) || 0,
      render: (quote) => {
        const estimateCost = getEstimateLineItemCost(quote);
        const estimate = getEstimateForQuote(quote);
        
        if (estimateCost === null) {
          return <span className="text-xs text-muted-foreground">N/A</span>;
        }
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs font-mono tabular-nums text-foreground/80 cursor-help">
                  {formatCurrency(estimateCost, { showCents: false })}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Your estimated cost for matched line items</p>
                {estimate && <p className="text-xs text-muted-foreground">From estimate: {estimate.estimate_number}</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      key: 'estimate_price',
      label: 'Estimate Price',
      align: 'right',
      width: '120px',
      sortable: true,
      getSortValue: (quote) => getEstimateLineItemPrice(quote) || 0,
      render: (quote) => {
        const estimatePrice = getEstimateLineItemPrice(quote);
        
        if (estimatePrice === null) {
          return <span className="text-xs text-muted-foreground">N/A</span>;
        }
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs font-mono tabular-nums text-foreground/90 cursor-help font-medium">
                  {formatCurrency(estimatePrice, { showCents: false })}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Your estimated price (revenue) to customer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      key: 'quoted_cost',
      label: 'Quoted Cost',
      align: 'right',
      width: '120px',
      sortable: true,
      getSortValue: (quote) => getQuotedAmountForEstimateMatch(quote) || 0,
      render: (quote) => {
        const quotedAmount = getQuotedAmountForEstimateMatch(quote);
        
        if (quotedAmount === null) {
          return <span className="text-xs text-muted-foreground">N/A</span>;
        }
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs font-mono tabular-nums font-medium cursor-help">
                  {formatCurrency(quotedAmount, { showCents: false })}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Vendor's quoted cost for matched line items</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      key: 'cost_variance_amount',
      label: 'Variance ($)',
      align: 'right',
      width: '110px',
      sortable: true,
      getSortValue: (quote) => getCostVariance(quote).amount,
      render: (quote) => {
        const variance = getCostVariance(quote);
        if (!quote.estimate) return <span className="text-xs text-muted-foreground">-</span>;
        
        return (
          <div className={cn(
            "text-xs font-semibold font-mono tabular-nums",
            variance.status === 'under' ? 'text-green-700' : 
            variance.status === 'over' ? 'text-red-700' : 'text-foreground/70'
          )}>
            {formatCurrency(variance.status === 'under' ? -variance.amount : variance.amount, { showCents: false })}
          </div>
        );
      },
    },
    {
      key: 'cost_variance_percent',
      label: 'Variance (%)',
      align: 'right',
      width: '90px',
      sortable: true,
      getSortValue: (quote) => getCostVariance(quote).percentage,
      render: (quote) => {
        const variance = getCostVariance(quote);
        if (!quote.estimate) return <span className="text-xs text-muted-foreground">-</span>;
        
        return (
          <div className={cn(
            "text-xs font-semibold font-mono tabular-nums",
            variance.status === 'under' ? 'text-green-600' : 
            variance.status === 'over' ? 'text-red-600' : 'text-foreground/50'
          )}>
            {variance.status === 'over' ? '+' : variance.status === 'under' ? '-' : ''}
            {variance.percentage.toFixed(1)}%
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      width: '60px',
      render: (quote) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {quote.status === QuoteStatus.PENDING && onAccept && (
              <>
                <DropdownMenuItem onClick={() => onAccept(quote)} className="text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onEdit(quote)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onCompare(quote)}
              disabled={!quote.estimate}
            >
              <Eye className="h-4 w-4 mr-2" />
              View vs Estimate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteClick(quote.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const toggleAllGroups = () => {
    if (collapsedGroups.size > 0) {
      setCollapsedGroups(new Set());
    } else {
      const allKeys = new Set(groupedData.map(g => g.groupKey));
      setCollapsedGroups(allKeys);
    }
  };

  const collapseButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            onClick={toggleAllGroups}
          >
            <ChevronsUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">
              {collapsedGroups.size > 0 ? 'Expand All' : 'Collapse All'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {collapsedGroups.size > 0 ? 'Expand all groups' : 'Collapse all groups'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Quotes Yet</h3>
        <p className="text-muted-foreground mb-6">Create your first quote to start comparing against estimates.</p>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create First Quote
        </Button>
      </div>
    );
  }

  const QuotesTable = FinancialTableTemplate<QuoteWithEstimate>;

  return (
    <div className="space-y-4">
      <QuotesTable
        data={groupedData}
        columns={columns}
        isGrouped={true}
        collapsedGroups={collapsedGroups}
        onCollapsedGroupsChange={setCollapsedGroups}
        collapseAllButton={collapseButton}
        onView={onCompare}
        onEdit={onEdit}
        onDelete={onDelete}
        getItemId={(quote) => quote.id}
        className="bg-card shadow-sm"
        emptyMessage="No quotes found"
        emptyIcon={<FileText className="h-16 w-16 text-muted-foreground opacity-50" />}
        showActions={false}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
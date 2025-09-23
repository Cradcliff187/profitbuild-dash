import React, { useState } from "react";
import { Plus, FileText, CheckCircle, Eye, Edit, Trash2, Calendar, User, DollarSign, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { BudgetComparisonBadge, BudgetComparisonStatus } from "./BudgetComparisonBadge";
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

  const getEstimateForQuote = (quote: Quote): Estimate | undefined => {
    return estimates.find(est => est.project_id === quote.project_id);
  };

  const getCostVariance = (quote: Quote): { amount: number; percentage: number; status: 'over' | 'under' | 'exact' } => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate || !estimate.lineItems || !quote.lineItems) {
      return { amount: 0, percentage: 0, status: 'exact' };
    }
    
    const estimateCost = calculateEstimateTotalCost(estimate.lineItems);
    const quoteCost = calculateQuoteTotalCost(quote.lineItems);
    
    const difference = quoteCost - estimateCost; // Quote cost - estimate cost
    const percentage = estimateCost > 0 ? (difference / estimateCost) * 100 : 0;
    
    return {
      amount: Math.abs(difference),
      percentage: Math.abs(percentage),
      // When quote cost > estimate cost = bad for margins (over budget on costs)
      // When quote cost < estimate cost = good for margins (under budget on costs)
      status: difference > 0 ? 'over' : difference < 0 ? 'under' : 'exact'
    };
  };

  const getQuoteStatus = (quote: Quote): BudgetComparisonStatus => {
    const estimate = getEstimateForQuote(quote);
    if (!estimate) return 'awaiting-quotes';
    
    if (quote.total < estimate.total_amount) return 'under-budget';
    if (quote.total > estimate.total_amount) return 'over-budget';
    return 'awaiting-quotes';
  };

  // Add estimate data to quotes
  const quotesWithEstimates: QuoteWithEstimate[] = quotes.map(quote => ({
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
      groupLabel: `${projectQuotes[0].projectName} - ${projectQuotes[0].client}`,
      items: projectQuotes,
      isCollapsible: true,
      defaultExpanded: true,
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

  const columns: FinancialTableColumn<QuoteWithEstimate>[] = [
    {
      key: 'quote_number',
      label: 'Quote #',
      align: 'left',
      width: '160px',
      render: (quote) => (
        <div className="space-y-1">
          <div className="font-mono text-xs text-foreground/80">
            {quote.quoteNumber}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-purple-200 text-purple-700 bg-purple-50">
              {quote.lineItems?.length || 0} item{(quote.lineItems?.length || 0) !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'payee',
      label: 'Quoted By',
      align: 'left',
      width: '140px',
      render: (quote) => (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{quote.quotedBy}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      width: '100px',
      render: (quote) => <QuoteStatusBadge status={quote.status} />,
    },
    {
      key: 'date_received',
      label: 'Received',
      align: 'right',
      width: '100px',
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
      render: (quote) => (
        <div className="font-semibold text-sm tabular-nums">
          ${quote.total.toLocaleString()}
        </div>
      ),
    },
    {
      key: 'estimate_total',
      label: 'Estimate Total',
      align: 'right',
      width: '130px',
      render: (quote) => (
        <div className="text-sm tabular-nums text-foreground/80">
          {quote.estimate ? `$${quote.estimate.total_amount.toLocaleString()}` : 'N/A'}
        </div>
      ),
    },
    {
      key: 'cost_variance',
      label: 'Cost Variance',
      align: 'right',
      width: '120px',
      render: (quote) => {
        const variance = getCostVariance(quote);
        if (!quote.estimate) return <span className="text-xs text-muted-foreground">-</span>;
        
        return (
          <div className="space-y-1">
            <div className={cn(
              "text-xs font-semibold tabular-nums",
              variance.status === 'under' ? 'text-green-700' : 
              variance.status === 'over' ? 'text-red-700' : 'text-foreground/70'
            )}>
              {variance.status === 'over' ? '+' : variance.status === 'under' ? '-' : ''}
              ${variance.amount.toLocaleString()}
            </div>
            <div className={cn(
              "text-xs tabular-nums",
              variance.status === 'under' ? 'text-green-600' : 
              variance.status === 'over' ? 'text-red-600' : 'text-foreground/50'
            )}>
              {variance.status === 'over' ? '+' : variance.status === 'under' ? '-' : ''}
              {variance.percentage.toFixed(1)}%
            </div>
          </div>
        );
      },
    },
    {
      key: 'budget_status',
      label: 'Budget Status',
      align: 'center',
      width: '120px',
      render: (quote) => {
        const status = getQuoteStatus(quote);
        return <BudgetComparisonBadge status={status} />;
      },
    },
    {
      key: 'includes',
      label: 'Includes',
      align: 'center',
      width: '100px',
      render: (quote) => (
        <div className="flex items-center gap-1 text-xs">
          {quote.includes_materials && (
            <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
              Mat
            </Badge>
          )}
          {quote.includes_labor && (
            <Badge variant="outline" className="text-xs px-1 py-0 bg-green-50 text-green-700 border-green-200">
              Lab
            </Badge>
          )}
        </div>
      ),
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
            <DropdownMenuItem 
              onClick={() => onCompare(quote)}
              disabled={!quote.estimate}
            >
              <Eye className="h-4 w-4 mr-2" />
              Compare
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
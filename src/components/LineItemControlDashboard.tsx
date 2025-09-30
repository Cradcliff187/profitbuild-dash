import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Download,
  Target,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { useLineItemControl, LineItemControlData, QuoteData } from '@/hooks/useLineItemControl';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { FinancialTableTemplate, FinancialTableColumn } from '@/components/FinancialTableTemplate';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface LineItemControlDashboardProps {
  projectId: string;
}

export function LineItemControlDashboard({ projectId }: LineItemControlDashboardProps) {
  const { lineItems, summary, isLoading, error, refetch } = useLineItemControl(projectId);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItemControlData | null>(null);

  const getQuoteStatusBadge = (status: LineItemControlData['quoteStatus']) => {
    const variants = {
      none: { variant: 'destructive' as const, label: 'No Quotes' },
      partial: { variant: 'secondary' as const, label: 'Partial' },
      full: { variant: 'default' as const, label: 'Quoted' },
      over: { variant: 'outline' as const, label: 'Over-Quoted' },
      internal: { variant: 'secondary' as const, label: 'Internal' }
    };
    
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVarianceBadge = (variance: number, variancePercent: number) => {
    if (Math.abs(variance) < 100) {
      return <Badge variant="default">On Track</Badge>;
    } else if (variance > 0) {
      return <Badge variant="destructive">Over Budget</Badge>;
    } else {
      return <Badge variant="secondary">Under Budget</Badge>;
    }
  };

  const handleViewDetails = (item: LineItemControlData) => {
    setSelectedLineItem(item);
  };

  const exportToCsv = () => {
    const headers = [
      'Category',
      'Description', 
      'Est. Price',
      'Est. Cost',
      'Quoted Cost',
      'Actual',
      'Cost Variance',
      'Cost Variance %',
      'Quote Status'
    ];

    const csvContent = [
      headers.join(','),
      ...lineItems.map(item => [
        CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category,
        `"${item.description}"`,
        item.estimatedPrice,
        item.estimatedCost,
        item.quotedCost,
        item.actualAmount,
        item.costVariance,
        item.costVariancePercent.toFixed(1) + '%',
        item.quoteStatus
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `project-line-item-control-${projectId}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns: FinancialTableColumn<LineItemControlData>[] = [
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="space-y-1 cursor-help">
              <div className="font-medium text-sm">
                {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {item.description}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p><strong>Category:</strong> {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}</p>
              <p><strong>Description:</strong> {item.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'estimatedPrice',
      label: 'Est. Price',
      align: 'right',
      sortable: true,
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-sm">{formatCurrency(item.estimatedPrice)}</div>
              <div className="text-xs text-muted-foreground">Client price</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Estimated price (what we charge the client) for this line</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'estimatedCost',
      label: 'Est. Cost',
      align: 'right',
      sortable: true,
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-sm">{formatCurrency(item.estimatedCost)}</div>
              <div className="text-xs text-muted-foreground">Your expected cost</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Estimated cost (your internal cost) = quantity × cost per unit</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'quotedCost',
      label: 'Quoted Cost',
      align: 'right',
      sortable: true,
      render: (item) => {
        const acceptedCount = item.quotes.filter(q => q.status === 'accepted').length;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-sm">{formatCurrency(item.quotedCost)}</div>
                <div className="text-xs text-muted-foreground">{acceptedCount} accepted</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sum of vendor costs from accepted quote line items linked to this estimate line</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'actualAmount',
      label: 'Actual',
      align: 'right',
      sortable: true,
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-sm">{formatCurrency(item.actualAmount)}</div>
              <div className="text-xs text-muted-foreground">{item.expenses.length} expense{item.expenses.length !== 1 ? 's' : ''}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total actual expenses recorded (category-based)</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'costVariance',
      label: 'Cost Variance',
      align: 'right',
      sortable: true,
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className={cn(
                "font-medium text-sm",
                item.costVariance > 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {formatCurrency(item.costVariance)}
              </div>
              <div className={cn(
                "text-xs",
                item.costVariance > 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {item.costVariancePercent > 0 ? '+' : ''}{item.costVariancePercent.toFixed(1)}%
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Quoted Cost − Estimated Cost (positive = over estimate)</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'quoteStatus',
      label: 'Quote Status',
      align: 'center',
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {getQuoteStatusBadge(item.quoteStatus)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p><strong>Quote Status:</strong> {item.quoteStatus}</p>
              {item.quoteStatus === 'internal' ? (
                <p>Internal work - no external quotes needed</p>
              ) : (
                <>
                  <p>{item.quotes.length} quotes received for this line item</p>
                  <p>Quoted price: {formatCurrency(item.quotedPrice)}</p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'status',
      label: 'Budget Status',
      align: 'center',
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {getVarianceBadge(item.costVariance, item.costVariancePercent)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Budget indicator based on quoted vs estimated costs</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'completion',
      label: 'Progress',
      align: 'center',
      render: (item) => {
        const completionPercent = item.actualAmount > 0 && item.estimatedPrice > 0
          ? Math.min(Math.round((item.actualAmount / item.estimatedPrice) * 100), 100)
          : 0;

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help w-20">
                <Progress 
                  value={completionPercent} 
                  className="h-2" 
                />
                <div className="text-xs text-center text-muted-foreground">
                  {completionPercent}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Completion based on actual expenses vs estimated price</p>
              <p>{completionPercent}% of estimated price spent</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading line item data: {error}</p>
            <Button variant="outline" onClick={refetch} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Total Estimated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalEstimated)}
              </div>
              <div className="text-xs text-muted-foreground">
                {lineItems.length} line items
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Total Quoted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalQuoted)}
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.lineItemsWithQuotes} items quoted
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalActual)}
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.completionPercentage.toFixed(1)}% of estimate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                summary.totalVariance > 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {formatCurrency(summary.totalVariance)}
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.lineItemsOverBudget} items over budget
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Line Item Control ({lineItems.length})</h2>
          <Button variant="outline" size="sm" onClick={exportToCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <FinancialTableTemplate
          data={lineItems}
          columns={columns}
          emptyMessage="No line items found for this project"
          emptyIcon={<AlertTriangle className="h-8 w-8" />}
          showActions={true}
          onView={handleViewDetails}
          getItemId={(item) => item.id}
        />

        {/* Line Item Details Modal */}
        <Dialog open={!!selectedLineItem} onOpenChange={() => setSelectedLineItem(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Line Item Details</DialogTitle>
            </DialogHeader>
            
            {selectedLineItem && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Category</div>
                    <div className="font-medium">
                      {CATEGORY_DISPLAY_MAP[selectedLineItem.category as keyof typeof CATEGORY_DISPLAY_MAP] || selectedLineItem.category}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Description</div>
                    <div className="font-medium">{selectedLineItem.description}</div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Estimated</div>
                      <div className="text-lg font-bold">{formatCurrency(selectedLineItem.estimatedAmount)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Quoted</div>
                      <div className="text-lg font-bold">{formatCurrency(selectedLineItem.quotedAmount)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Actual</div>
                      <div className="text-lg font-bold">{formatCurrency(selectedLineItem.actualAmount)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Variance</div>
                      <div className={cn(
                        "text-lg font-bold",
                        selectedLineItem.variance > 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {formatCurrency(selectedLineItem.variance)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Completion Progress</span>
                    <span className="font-medium">
                      {selectedLineItem.actualAmount > 0 && selectedLineItem.estimatedAmount > 0
                        ? `${Math.min(Math.round((selectedLineItem.actualAmount / selectedLineItem.estimatedAmount) * 100), 100)}% of estimate`
                        : 'Not started'
                      }
                    </span>
                  </div>
                  <Progress 
                    value={selectedLineItem.actualAmount > 0 && selectedLineItem.estimatedAmount > 0 
                      ? Math.min((selectedLineItem.actualAmount / selectedLineItem.estimatedAmount) * 100, 100) 
                      : 0
                    } 
                    className="h-3" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quotes Section */}
                  <div>
                    <div className="font-medium mb-4 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Quotes ({selectedLineItem.quotes.length})
                    </div>
                    {selectedLineItem.quotes.length > 0 ? (
                      <div className="space-y-3">
                        {selectedLineItem.quotes.map((quote) => (
                          <Card key={quote.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="font-medium">{quote.quotedBy}</div>
                                  <div className="text-muted-foreground text-sm">#{quote.quoteNumber}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{formatCurrency(quote.total)}</div>
                                  <Badge variant="secondary" className={cn(
                                    quote.status === 'accepted' && 'bg-green-50 text-green-700 border-green-200',
                                    quote.status === 'pending' && 'bg-blue-50 text-blue-700 border-blue-200',
                                    quote.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200'
                                  )}>
                                    {quote.status}
                                  </Badge>
                                </div>
                              </div>
                              {(quote.includes_labor || quote.includes_materials) && (
                                <div className="text-xs text-muted-foreground">
                                  Includes: {[
                                    quote.includes_labor && 'Labor',
                                    quote.includes_materials && 'Materials'
                                  ].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic text-center p-8 border-2 border-dashed border-muted rounded-lg">
                        No quotes received for this line item
                      </div>
                    )}
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <div className="font-medium mb-4 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Expenses ({selectedLineItem.expenses.length})
                    </div>
                    {selectedLineItem.expenses.length > 0 ? (
                      <div className="space-y-3">
                        {selectedLineItem.expenses.map((expense) => (
                          <Card key={expense.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="font-medium">{expense.payee_name || 'Unknown Payee'}</div>
                                  <div className="text-muted-foreground text-sm">
                                    {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                                  </div>
                                  {expense.payee_name && (
                                    <div className="text-xs text-muted-foreground">
                                      {expense.payee_name}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{formatCurrency(expense.amount)}</div>
                                  <div className="text-xs text-muted-foreground capitalize">
                                    {expense.transaction_type.replace(/_/g, ' ')}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic text-center p-8 border-2 border-dashed border-muted rounded-lg">
                        No expenses recorded for this category
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
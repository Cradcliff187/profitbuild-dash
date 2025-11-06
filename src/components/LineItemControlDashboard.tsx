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
import { cn, formatCurrency, getExpensePayeeLabel } from '@/lib/utils';
import { format } from 'date-fns';
import { Project } from '@/types/project';

interface LineItemControlDashboardProps {
  projectId: string;
  project: Project;
}

export function LineItemControlDashboard({ projectId, project }: LineItemControlDashboardProps) {
  const { lineItems, summary, isLoading, error, refetch } = useLineItemControl(projectId, project);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItemControlData | null>(null);

  const getQuoteStatusBadge = (status: LineItemControlData['quoteStatus']) => {
    const variants = {
      none: { variant: 'destructive' as const, label: 'Not Quoted' },
      partial: { variant: 'secondary' as const, label: 'Awaiting Quote' },
      full: { variant: 'default' as const, label: 'Quoted' },
      over: { variant: 'outline' as const, label: 'Multiple Quotes' },
      internal: { variant: 'secondary' as const, label: 'Internal' }
    };
    
    const config = variants[status];
    return <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 h-4 leading-none font-medium">{config.label}</Badge>;
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
      'Payee Name',
      'Allocated Expenses',
      'Remaining to Allocate',
      'Allocation Status',
      'Actual',
      'Expense Count',
      'Est vs Quote',
      'Est vs Quote %',
      'Quote Status'
    ];

    const csvContent = [
      headers.join(','),
      ...lineItems.map(item => {
        const acceptedQuotes = item.quotes.filter(q => q.status === 'accepted');
        const payeeNames = acceptedQuotes.map(q => q.quotedBy).join('; ');
        const payeeNameValue = item.quoteStatus === 'internal' 
          ? 'Internal' 
          : payeeNames || '—';
        
        return [
          CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category,
          `"${item.description}"`,
          item.estimatedPrice,
          item.estimatedCost,
          item.quotedCost,
          `"${payeeNameValue}"`,
          item.allocatedAmount,
          item.remainingToAllocate,
          item.allocationStatus,
          item.actualAmount,
          item.correlatedExpenses.length,
          item.costVariance,
          item.costVariancePercent.toFixed(1) + '%',
          item.quoteStatus
        ].join(',');
      })
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
              <div className="flex items-center gap-2">
                <div className="font-medium text-sm">
                  {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}
                </div>
                {item.source === 'change_order' && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 leading-none">
                    CO
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {item.description}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p><strong>Category:</strong> {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}</p>
              <p><strong>Description:</strong> {item.description}</p>
              {item.source === 'change_order' && (
                <>
                  <p className="text-xs text-muted-foreground pt-1 border-t mt-1">
                    <strong>Change Order:</strong> {item.change_order_number}
                  </p>
                </>
              )}
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
            <div className="text-right cursor-help font-medium text-sm tabular-nums">
              {formatCurrency(item.estimatedPrice)}
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
            <div className="text-right cursor-help font-medium text-sm tabular-nums">
              {formatCurrency(item.estimatedCost)}
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
        const acceptedQuotes = item.quotes.filter(q => q.status === 'accepted');
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help font-medium text-sm tabular-nums">
                {formatCurrency(item.quotedCost)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {acceptedQuotes.length > 0 ? (
                  <>
                    <p className="font-semibold">Accepted Quotes:</p>
                    {acceptedQuotes.map(q => (
                      <div key={q.id} className="text-xs">
                        • {q.quotedBy}: {formatCurrency(q.total)} ({q.quoteNumber})
                      </div>
                    ))}
                  </>
                ) : (
                  <p>No accepted quotes for this line item</p>
                )}
              </div>
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
            <div className="text-right cursor-help font-medium text-sm tabular-nums">
              {formatCurrency(item.actualAmount)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>Total actual expenses explicitly allocated to this line item</p>
              <p className="text-xs text-muted-foreground">{item.correlatedExpenses.length} expense{item.correlatedExpenses.length !== 1 ? 's' : ''} allocated</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'expenseCount',
      label: '# Expenses',
      align: 'center',
      sortable: true,
      render: (item) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-center cursor-help">
              {item.correlatedExpenses.length > 0 ? (
                <span className="text-sm tabular-nums font-medium">
                  {item.correlatedExpenses.length}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 max-w-xs">
              <p className="font-semibold">
                {item.correlatedExpenses.length} expense{item.correlatedExpenses.length !== 1 ? 's' : ''} allocated
              </p>
              {item.correlatedExpenses.length > 0 && (
                <div className="text-xs pt-2 border-t max-h-40 overflow-y-auto">
                  {item.correlatedExpenses.slice(0, 5).map((exp: any) => (
                    <div key={exp.id} className="py-0.5">
                      • {formatCurrency(exp.amount)} - {exp.description || 'No description'}
                      <div className="text-muted-foreground pl-2">
                        {format(new Date(exp.expense_date), 'MMM d, yyyy')} - {exp.payees?.payee_name || 'Unknown'}
                      </div>
                    </div>
                  ))}
                  {item.correlatedExpenses.length > 5 && (
                    <p className="text-muted-foreground mt-1">
                      ...and {item.correlatedExpenses.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'costVariance',
      label: 'Est vs Quote',
      align: 'right',
      sortable: true,
      render: (item) => {
        // Don't show cost variance for internal work (no quotes to compare)
        if (item.quoteStatus === 'internal') {
          return (
            <div className="text-right text-xs text-muted-foreground italic">
              Internal
            </div>
          );
        }

        // Don't show variance if no quotes exist yet
        if (item.quoteStatus === 'none') {
          return (
            <div className="text-right text-xs text-muted-foreground">
              —
            </div>
          );
        }

        // Show variance for items with quotes
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={cn(
                  "font-medium text-sm tabular-nums flex items-center justify-end gap-2",
                  item.costVariance > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  <span>{formatCurrency(item.costVariance)}</span>
                  <span className="text-xs">
                    {item.costVariancePercent > 0 ? '+' : ''}{item.costVariancePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quoted Cost − Estimated Cost (positive = quote came in higher than estimate)</p>
            </TooltipContent>
          </Tooltip>
        );
      },
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
            <div className="max-w-xs space-y-1">
              <p className="font-semibold">Quote Status: {item.quoteStatus}</p>
              {item.quoteStatus === 'internal' ? (
                <p className="text-xs">Internal work performed by your team - no external quotes needed</p>
              ) : item.quoteStatus === 'full' ? (
                <p className="text-xs">Work is covered by {item.quotes.filter(q => q.status === 'accepted').length} accepted quote(s)</p>
              ) : item.quoteStatus === 'none' ? (
                <p className="text-xs">⚠️ No quotes accepted yet - follow up with vendors or accept pending quotes</p>
              ) : item.quoteStatus === 'over' ? (
                <p className="text-xs">Multiple quotes accepted - may indicate split work or comparison</p>
              ) : null}
              <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                {item.quotes.length} total quote{item.quotes.length !== 1 ? 's' : ''} received
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'payeeName',
      label: 'Payee Name',
      align: 'left',
      render: (item) => {
        if (item.quoteStatus === 'internal') {
          return (
            <div className="text-xs text-muted-foreground italic">
              Internal
            </div>
          );
        }

        const acceptedQuotes = item.quotes.filter(q => q.status === 'accepted');
        
        if (acceptedQuotes.length === 0) {
          return (
            <div className="text-xs text-muted-foreground">
              —
            </div>
          );
        }

        const payeeNames = [...new Set(acceptedQuotes.map(q => q.quotedBy))];

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                {payeeNames.length === 1 ? (
                  <div className="font-medium text-sm">
                    {payeeNames[0]}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {payeeNames[0]}
                    </div>
                    {payeeNames.length > 1 && (
                      <div className="text-xs text-muted-foreground">
                        +{payeeNames.length - 1} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">Accepted Quote Vendors:</p>
                {acceptedQuotes.map(q => (
                  <div key={q.id} className="text-xs">
                    • {q.quotedBy} - {formatCurrency(q.total)} ({q.quoteNumber})
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'allocationStatus',
      label: 'Expense Allocation',
      align: 'center',
      render: (item) => {
        const getAllocationBadge = (status: LineItemControlData['allocationStatus'], remaining: number) => {
          const configs = {
            full: {
              variant: 'default' as const,
              label: 'Fully Allocated',
              icon: <CheckCircle className="h-3 w-3" />,
            },
            partial: {
              variant: 'secondary' as const,
              label: `${formatCurrency(remaining)} Remaining`,
              icon: <AlertTriangle className="h-3 w-3" />,
            },
            none: {
              variant: 'destructive' as const,
              label: 'No Expenses',
              icon: <AlertTriangle className="h-3 w-3" />,
            },
            internal: {
              variant: 'outline' as const,
              label: 'Internal',
              icon: null,
            },
            not_quoted: {
              variant: 'outline' as const,
              label: 'Not Quoted',
              icon: null,
            }
          };
          
          return configs[status];
        };
        
        const config = getAllocationBadge(item.allocationStatus, item.remainingToAllocate);
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Badge variant={config.variant} className="flex items-center gap-1 justify-center text-[10px] px-1.5 py-0 h-4 leading-none font-medium">
                  {config.icon}
                  {config.label}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs space-y-2">
                <p className="font-semibold">Expense Allocation Status</p>
                
                {item.allocationStatus === 'internal' ? (
                  <p className="text-xs">Internal work - no expense tracking needed</p>
                ) : item.allocationStatus === 'not_quoted' ? (
                  <p className="text-xs">No accepted quote yet - accept a quote before allocating expenses</p>
                ) : (
                  <>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Quoted Cost:</span>
                        <span className="font-medium">{formatCurrency(item.quotedCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allocated Expenses:</span>
                        <span className="font-medium">{formatCurrency(item.allocatedAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>Remaining:</span>
                        <span className={cn(
                          "font-semibold",
                          item.remainingToAllocate > 0 ? "text-yellow-600" : "text-green-600"
                        )}>
                          {formatCurrency(item.remainingToAllocate)}
                        </span>
                      </div>
                    </div>
                    
                    {item.allocationStatus === 'none' && (
                      <p className="text-xs text-destructive mt-2">
                        ⚠️ No expenses allocated yet - import or match expenses to this line item
                      </p>
                    )}
                    
                    {item.allocationStatus === 'partial' && (
                      <p className="text-xs text-yellow-700 mt-2">
                        ⚠️ Still missing {formatCurrency(item.remainingToAllocate)} in expense receipts
                      </p>
                    )}
                    
                    {item.allocationStatus === 'full' && (
                      <p className="text-xs text-green-700 mt-2">
                        ✅ All quoted costs have matching expense allocations
                      </p>
                    )}
                    
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      {item.correlatedExpenses.length} expense{item.correlatedExpenses.length !== 1 ? 's' : ''} explicitly matched
                    </div>
                  </>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'completion',
      label: 'Progress',
      align: 'center',
      render: (item) => {
        // Use quoted cost if available (external work with quotes)
        // Otherwise use estimated cost (internal work or no quotes)
        const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
        
        const completionPercent = item.actualAmount > 0 && baseline > 0
          ? Math.min(Math.round((item.actualAmount / baseline) * 100), 100)
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
              <div className="space-y-1 max-w-xs">
                <p className="font-semibold">Progress: {completionPercent}%</p>
                <p className="text-xs text-muted-foreground">
                  {item.quotedCost > 0 
                    ? 'Actual expenses vs Quoted cost'
                    : 'Actual expenses vs Estimated cost'
                  }
                </p>
                <div className="text-xs border-t pt-1 mt-1">
                  <div className="flex justify-between">
                    <span>Baseline:</span>
                    <span className="font-medium">{formatCurrency(baseline)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual:</span>
                    <span className="font-medium">{formatCurrency(item.actualAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span>Progress:</span>
                    <span className="font-semibold">{completionPercent}%</span>
                  </div>
                </div>
                {completionPercent >= 100 && item.quotedCost > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    ✅ All invoices received for accepted quote
                  </p>
                )}
                {completionPercent < 100 && item.quotedCost > 0 && item.actualAmount > 0 && (
                  <p className="text-xs text-yellow-600 mt-2">
                    ⚠️ Still waiting for {formatCurrency(baseline - item.actualAmount)} in invoices
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3">
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
        <CardContent className="p-3">
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
      <div className="space-y-3">
      {/* Summary Cards - Compact Design */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Contract Value */}
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium flex items-center gap-1 text-muted-foreground mb-2">
                <Target className="h-3 w-3" />
                Contract Value
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(summary.totalContractValue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Client contract
              </div>
            </div>

            {/* Quoted + Internal */}
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium flex items-center gap-1 text-muted-foreground mb-2">
                <CheckCircle className="h-3 w-3" />
                Quoted + Internal
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(summary.totalQuotedWithInternal)}
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.lineItemsWithQuotes} quoted
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium flex items-center gap-1 text-muted-foreground mb-2">
                <Target className="h-3 w-3" />
                Estimated Cost
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(summary.totalEstimatedCost)}
              </div>
              <div className="text-xs text-muted-foreground">
                Baseline estimate
              </div>
            </div>

            {/* Est vs Quote Variance */}
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium flex items-center gap-1 text-muted-foreground mb-2">
                <TrendingUp className="h-3 w-3" />
                Est vs Quote Variance
              </div>
              <div className={cn(
                "text-lg font-bold",
                summary.totalVariance > 0 ? "text-destructive" : "text-green-600"
              )}>
                {formatCurrency(summary.totalVariance)}
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.lineItemsUnderBudget > 0 || summary.lineItemsOverBudget > 0 ? (
                  <>
                    {summary.lineItemsUnderBudget > 0 && (
                      <span className="text-green-600">{summary.lineItemsUnderBudget} lower</span>
                    )}
                    {summary.lineItemsUnderBudget > 0 && summary.lineItemsOverBudget > 0 && ', '}
                    {summary.lineItemsOverBudget > 0 && (
                      <span className="text-destructive">{summary.lineItemsOverBudget} higher</span>
                    )}
                  </>
                ) : (
                  'All match'
                )}
              </div>
            </div>

            {/* Actual Cost to Date */}
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium flex items-center gap-1 text-muted-foreground mb-2">
                <DollarSign className="h-3 w-3" />
                Actual Cost to Date
              </div>
              <div className="space-y-2">
                <div className="text-lg font-bold">
                  {formatCurrency(summary.totalActual)}
                </div>
                
                {/* Breakdown of allocated vs unallocated */}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Allocated to line items:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(summary.totalAllocated)}
                    </span>
                  </div>
                  {summary.totalUnallocated > 0 && (
                    <div className="flex justify-between">
                      <span className="text-warning">Unallocated expenses:</span>
                      <span className="font-medium text-warning">
                        {formatCurrency(summary.totalUnallocated)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {summary.completionPercentage.toFixed(1)}% complete
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

                {/* Expense Allocation Breakdown */}
                {selectedLineItem.allocationStatus !== 'internal' && 
                 selectedLineItem.allocationStatus !== 'not_quoted' && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Expense Allocation
                    </h4>
                    
                    <div className="bg-muted p-3 rounded-lg mb-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quoted Cost:</span>
                        <span className="font-medium">{formatCurrency(selectedLineItem.quotedCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Allocated Expenses:</span>
                        <span className="font-medium">{formatCurrency(selectedLineItem.allocatedAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Remaining to Allocate:</span>
                        <span className={cn(
                          selectedLineItem.remainingToAllocate > 0 ? "text-yellow-600" : "text-green-600"
                        )}>
                          {formatCurrency(selectedLineItem.remainingToAllocate)}
                        </span>
                      </div>
                    </div>
                    
                    {selectedLineItem.correlatedExpenses.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground mb-2">
                          Explicitly allocated expenses ({selectedLineItem.correlatedExpenses.length}):
                        </p>
                        {selectedLineItem.correlatedExpenses.map((expense: any) => (
                          <div key={expense.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                            <div className="flex-1">
                              <div className="font-medium">{expense.payees?.payee_name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(expense.expense_date), 'MMM d, yyyy')} • {expense.description}
                              </div>
                            </div>
                            <div className="font-medium">{formatCurrency(expense.amount)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>No expenses have been explicitly allocated to this line item yet.
                          Go to the Expense Matching interface to allocate expenses.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
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

                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
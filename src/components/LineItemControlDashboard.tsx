import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Target
} from 'lucide-react';
import { useLineItemControl, LineItemControlData, QuoteData } from '@/hooks/useLineItemControl';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LineItemControlDashboardProps {
  projectId: string;
}

export function LineItemControlDashboard({ projectId }: LineItemControlDashboardProps) {
  const { lineItems, summary, isLoading, error, refetch } = useLineItemControl(projectId);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getQuoteStatusBadge = (status: LineItemControlData['quoteStatus']) => {
    const variants = {
      none: { variant: 'destructive' as const, label: 'No Quotes' },
      partial: { variant: 'secondary' as const, label: 'Partial' },
      full: { variant: 'default' as const, label: 'Quoted' },
      over: { variant: 'outline' as const, label: 'Over-Quoted' }
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

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const exportToCsv = () => {
    const headers = [
      'Category',
      'Description', 
      'Estimated Amount',
      'Quoted Amount',
      'Actual Amount',
      'Variance',
      'Variance %',
      'Quote Status'
    ];

    const csvContent = [
      headers.join(','),
      ...lineItems.map(item => [
        CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category,
        `"${item.description}"`,
        item.estimatedAmount,
        item.quotedAmount,
        item.actualAmount,
        item.variance,
        item.variancePercent.toFixed(1) + '%',
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Item Control</CardTitle>
            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead className="text-right">Quoted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Quote Status</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <Collapsible key={item.id} open={expandedItems.has(item.id)}>
                  <CollapsibleTrigger asChild>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <TableCell>
                        {expandedItems.has(item.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.estimatedAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.quotedAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.actualAmount)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        item.variance > 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {formatCurrency(item.variance)}
                      </TableCell>
                      <TableCell>
                        {getQuoteStatusBadge(item.quoteStatus)}
                      </TableCell>
                      <TableCell>
                        {getVarianceBadge(item.variance, item.variancePercent)}
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent asChild>
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="p-4 bg-muted/20 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Quotes Section */}
                            <div>
                              <div className="font-medium mb-2 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Quotes ({item.quotes.length})
                              </div>
                              {item.quotes.length > 0 ? (
                                <div className="space-y-2">
                                  {item.quotes.map((quote) => (
                                    <div key={quote.id} className="text-sm p-2 bg-background rounded border">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium">{quote.quotedBy}</div>
                                          <div className="text-muted-foreground">#{quote.quoteNumber}</div>
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
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Includes: {[
                                            quote.includes_labor && 'Labor',
                                            quote.includes_materials && 'Materials'
                                          ].filter(Boolean).join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic">
                                  No quotes received for this line item
                                </div>
                              )}
                            </div>

                            {/* Expenses Section */}
                            <div>
                              <div className="font-medium mb-2 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Expenses ({item.expenses.length})
                              </div>
                              {item.expenses.length > 0 ? (
                                <div className="space-y-2">
                                  {item.expenses.slice(0, 3).map((expense) => (
                                    <div key={expense.id} className="text-sm p-2 bg-background rounded border">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium">{expense.description || 'No description'}</div>
                                          <div className="text-muted-foreground">
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
                                    </div>
                                  ))}
                                  {item.expenses.length > 3 && (
                                    <div className="text-sm text-muted-foreground">
                                      +{item.expenses.length - 3} more expenses
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic">
                                  No expenses recorded for this category
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Progress indicator for completion */}
                          <div className="mt-4 pt-3 border-t">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Completion Status</span>
                              <span className="font-medium">
                                {item.actualAmount > 0 && item.estimatedAmount > 0
                                  ? `${Math.min(Math.round((item.actualAmount / item.estimatedAmount) * 100), 100)}% of estimate`
                                  : 'Not started'
                                }
                              </span>
                            </div>
                            <Progress 
                              value={item.actualAmount > 0 && item.estimatedAmount > 0 
                                ? Math.min((item.actualAmount / item.estimatedAmount) * 100, 100) 
                                : 0
                              } 
                              className="h-2" 
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </TableBody>
          </Table>

          {lineItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No line items found for this project</p>
              <p className="text-sm">Create an estimate to see line item control data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
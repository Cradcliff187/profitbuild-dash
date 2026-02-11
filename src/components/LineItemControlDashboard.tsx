import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Eye,
  MoreHorizontal,
  FileText,
  ClipboardList,
  AlertCircle,
  Layers,
  type LucideIcon
} from 'lucide-react';
import { useLineItemControl, LineItemControlData, QuoteData } from '@/hooks/useLineItemControl';
import { CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { FinancialTableTemplate, FinancialTableColumn } from '@/components/FinancialTableTemplate';
import { cn, formatCurrency, getExpensePayeeLabel } from '@/lib/utils';
import { format } from 'date-fns';
import { Project } from '@/types/project';
import { useIsMobile } from '@/hooks/use-mobile';
import { LineItemControlCardView } from '@/components/LineItemControlCardView';
import { getFinancialHealth, getFinancialHealthColor, getCostVarianceColor } from '@/utils/financialColors';
import { ColumnSelector } from '@/components/ui/column-selector';

interface LineItemControlDashboardProps {
  projectId: string;
  project: Project;
}

const columnDefinitions = [
  { key: 'category', label: 'Category', required: true },
  { key: 'estimatedPrice', label: 'Est. Price', required: false },
  { key: 'estimatedCost', label: 'Est. Cost', required: false },
  { key: 'quotedCost', label: 'Quoted Cost', required: false },
  { key: 'actualAmount', label: 'Actual', required: true },
  { key: 'expenseCount', label: '# Expenses', required: false },
  { key: 'costVariance', label: 'Est vs Quote', required: false },
  { key: 'quoteStatus', label: 'Quote Status', required: false },
  { key: 'payeeName', label: 'Payee Name', required: false },
  { key: 'allocationStatus', label: 'Expense Allocation', required: true },
  { key: 'completion', label: 'Progress', required: false },
  { key: 'costFlow', label: 'Cost Flow', required: false },
];

const DEFAULT_VISIBLE_COLUMNS = [
  'category', 'costFlow', 'actualAmount',
  'quoteStatus', 'allocationStatus', 'completion',
];

export function LineItemControlDashboard({ projectId, project }: LineItemControlDashboardProps) {
  const { lineItems, summary, isLoading, error, refetch } = useLineItemControl(projectId, project);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItemControlData | null>(null);
  const isMobile = useIsMobile();

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('cost-tracking-visible-columns');
    if (saved) {
      const savedVisible = JSON.parse(saved) as string[];
      let validVisible = savedVisible.filter((key: string) =>
        columnDefinitions.some(col => col.key === key)
      );
      // Ensure required columns are included
      const requiredKeys = columnDefinitions.filter(c => c.required).map(c => c.key);
      for (const key of requiredKeys) {
        if (!validVisible.includes(key)) validVisible.push(key);
      }
      return validVisible;
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('cost-tracking-column-order');
    if (saved) {
      const savedOrder = JSON.parse(saved) as string[];
      let validOrder = savedOrder.filter((key: string) =>
        columnDefinitions.some(col => col.key === key)
      );
      const newColumns = columnDefinitions
        .map(col => col.key)
        .filter(key => !validOrder.includes(key));
      return [...validOrder, ...newColumns];
    }
    return columnDefinitions.map(col => col.key);
  });

  useEffect(() => {
    localStorage.setItem('cost-tracking-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('cost-tracking-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);


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
    // Build CSV columns based on visible columns + always include Description
    const csvColumnMap: Record<string, { header: string; getValue: (item: LineItemControlData) => string }> = {
      category: {
        header: 'Category',
        getValue: (item) => CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category,
      },
      estimatedPrice: {
        header: 'Est. Price',
        getValue: (item) => String(item.estimatedPrice),
      },
      estimatedCost: {
        header: 'Est. Cost',
        getValue: (item) => String(item.estimatedCost),
      },
      quotedCost: {
        header: 'Quoted Cost',
        getValue: (item) => String(item.quotedCost),
      },
      actualAmount: {
        header: 'Actual',
        getValue: (item) => String(item.actualAmount),
      },
      expenseCount: {
        header: '# Expenses',
        getValue: (item) => String(item.correlatedExpenses.length),
      },
      costVariance: {
        header: 'Est vs Quote',
        getValue: (item) => String(item.costVariance),
      },
      quoteStatus: {
        header: 'Quote Status',
        getValue: (item) => item.quoteStatus,
      },
      payeeName: {
        header: 'Payee Name',
        getValue: (item) => {
          const acceptedQuotes = item.quotes.filter(q => q.status === 'accepted');
          const payeeNames = acceptedQuotes.map(q => q.quotedBy).join('; ');
          return item.quoteStatus === 'internal' ? 'Internal' : payeeNames || '—';
        },
      },
      allocationStatus: {
        header: 'Allocation Status',
        getValue: (item) => item.allocationStatus,
      },
      completion: {
        header: 'Progress %',
        getValue: (item) => {
          const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
          return item.actualAmount > 0 && baseline > 0
            ? `${Math.min(Math.round((item.actualAmount / baseline) * 100), 100)}%`
            : '0%';
        },
      },
      costFlow: {
        header: 'Cost Flow (Est/Committed/Spent)',
        getValue: (item) => `${item.estimatedCost}/${item.quotedCost}/${item.actualAmount}`,
      },
    };

    // Always include Description as the second column
    const activeCols = columnOrder.filter(key => visibleColumns.includes(key));
    const headers = [
      csvColumnMap[activeCols[0]]?.header || 'Category',
      'Description',
      ...activeCols.slice(1).map(key => csvColumnMap[key]?.header || key),
    ];

    const csvContent = [
      headers.join(','),
      ...lineItems.map(item => {
        const firstCol = csvColumnMap[activeCols[0]]?.getValue(item) || '';
        const restCols = activeCols.slice(1).map(key => {
          const col = csvColumnMap[key];
          if (!col) return '';
          const val = col.getValue(item);
          return val.includes(',') ? `"${val}"` : val;
        });
        return [firstCol, `"${item.description}"`, ...restCols].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `project-cost-tracking-${projectId}.csv`);
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
                  {item.description}
                </div>
                {item.source === 'change_order' && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 leading-none">
                    CO
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {CATEGORY_DISPLAY_MAP[item.category as keyof typeof CATEGORY_DISPLAY_MAP] || item.category}
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
                        {exp.expense_date ? format(new Date(exp.expense_date), 'MMM d, yyyy') : 'No date'} - {exp.payees?.payee_name || 'Unknown'}
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
        const getAllocationBadge = (status: LineItemControlData['allocationStatus'], remaining: number, quotedCost: number) => {
          if (status === 'full') {
            return {
              className: 'bg-success/15 text-success border-success/30',
              label: 'Fully Allocated',
              icon: <CheckCircle className="h-3 w-3" />,
            };
          }
          if (status === 'partial') {
            return {
              className: 'bg-warning/15 text-warning-foreground border-warning/30',
              label: `${formatCurrency(remaining)} Remaining`,
              icon: <AlertTriangle className="h-3 w-3" />,
            };
          }
          if (status === 'none' && quotedCost > 0) {
            return {
              className: 'bg-destructive/15 text-destructive border-destructive/30',
              label: 'No Expenses',
              icon: <AlertTriangle className="h-3 w-3" />,
            };
          }
          if (status === 'none') {
            return {
              className: 'text-muted-foreground border-border',
              label: 'Not Quoted',
              icon: null,
            };
          }
          // internal, not_quoted
          return {
            className: 'text-muted-foreground border-border',
            label: status === 'internal' ? 'Internal' : 'Not Quoted',
            icon: null,
          };
        };

        const config = getAllocationBadge(item.allocationStatus, item.remainingToAllocate, item.quotedCost);

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Badge variant="outline" className={cn("compact-badge flex items-center gap-1 justify-center text-[10px] px-1.5 py-0 h-4 leading-none font-medium", config.className)}>
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
                          item.remainingToAllocate > 0 ? "text-warning-foreground" : "text-success"
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
                      <p className="text-xs text-warning-foreground mt-2">
                        ⚠️ Still missing {formatCurrency(item.remainingToAllocate)} in expense receipts
                      </p>
                    )}
                    
                    {item.allocationStatus === 'full' && (
                      <p className="text-xs text-success mt-2">
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
              <div className="cursor-help">
                <div className="text-xs text-center text-muted-foreground font-medium">
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
    {
      key: 'costFlow',
      label: 'Cost Flow',
      align: 'left' as const,
      sortable: false,
      render: (item) => {
        if (['labor_internal', 'management'].includes(item.category)) {
          return <span className="text-xs text-muted-foreground italic">Internal</span>;
        }

        const estimated = item.estimatedCost;
        const committed = item.quotedCost;
        const spent = item.actualAmount;

        const getDirection = (from: number, to: number, hasTo: boolean) => {
          if (!hasTo || to === 0) return 'none';
          if (to > from) return 'up';
          if (to < from) return 'down';
          return 'flat';
        };

        const estToCommitted = getDirection(estimated, committed, committed > 0);
        const committedToSpent = getDirection(committed, spent, committed > 0 && spent > 0);

        const getStepColor = (direction: string) => {
          if (direction === 'up') return 'text-destructive';
          if (direction === 'down') return 'text-success';
          return 'text-muted-foreground';
        };

        const getArrow = (direction: string) => {
          if (direction === 'up') return '\u2191';
          if (direction === 'down') return '\u2193';
          if (direction === 'flat') return '\u2192';
          return '\u00b7';
        };

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs tabular-nums cursor-help">
                <span className="text-muted-foreground">{formatCurrency(estimated)}</span>
                <span className={cn("text-[10px] font-bold", getStepColor(estToCommitted))}>
                  {getArrow(estToCommitted)}
                </span>
                <span className={cn(
                  "font-medium",
                  committed > 0 ? getStepColor(estToCommitted) : "text-muted-foreground/50"
                )}>
                  {committed > 0 ? formatCurrency(committed) : '\u2014'}
                </span>
                <span className={cn("text-[10px] font-bold", getStepColor(committedToSpent))}>
                  {getArrow(committedToSpent)}
                </span>
                <span className={cn(
                  "font-medium",
                  spent > 0 ? getStepColor(committedToSpent) : "text-muted-foreground/50"
                )}>
                  {spent > 0 ? formatCurrency(spent) : '\u2014'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1.5 max-w-xs">
                <p className="font-semibold">Cost Pipeline</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between gap-4">
                    <span>Estimated Cost:</span>
                    <span className="font-medium tabular-nums">{formatCurrency(estimated)}</span>
                  </div>
                  {committed > 0 && (
                    <>
                      <div className="flex justify-between gap-4">
                        <span>Committed (Quote):</span>
                        <span className="font-medium tabular-nums">{formatCurrency(committed)}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>Quote Variance:</span>
                        <span className={cn(
                          "font-medium tabular-nums",
                          committed > estimated ? "text-destructive" : "text-success"
                        )}>
                          {committed > estimated ? '+' : ''}{formatCurrency(committed - estimated)}
                        </span>
                      </div>
                    </>
                  )}
                  {spent > 0 && (
                    <>
                      <div className="flex justify-between gap-4 border-t pt-1">
                        <span>Actual Spent:</span>
                        <span className="font-medium tabular-nums">{formatCurrency(spent)}</span>
                      </div>
                      {committed > 0 && (
                        <div className="flex justify-between gap-4 text-muted-foreground">
                          <span>Invoice vs Quote:</span>
                          <span className={cn(
                            "font-medium tabular-nums",
                            spent > committed ? "text-destructive" : "text-success"
                          )}>
                            {spent > committed ? '+' : ''}{formatCurrency(spent - committed)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {committed === 0 && spent === 0 && (
                    <p className="text-muted-foreground italic">No quotes or expenses yet</p>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
  ];

  // Filter and order columns based on user preferences
  const filteredColumns = useMemo(() => {
    return columnOrder
      .filter(key => visibleColumns.includes(key))
      .map(key => columns.find(col => col.key === key))
      .filter(Boolean) as FinancialTableColumn<LineItemControlData>[];
  }, [columns, visibleColumns, columnOrder]);

  // Helper: check if a category is internal (labor/management)
  const isInternalItem = (item: LineItemControlData) =>
    ['labor_internal', 'management'].includes(item.category);

  // Attention items for the summary banner
  const attentionItems = useMemo(() => {
    const items: Array<{
      type: string;
      label: string;
      detail: string;
      severity: 'critical' | 'warning' | 'info';
      icon: LucideIcon;
    }> = [];

    // 1. Items significantly over budget (actual > baseline by >10%)
    const overBudgetItems = lineItems.filter(item => {
      if (isInternalItem(item)) return false;
      const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
      return baseline > 0 && item.actualAmount > baseline * 1.10;
    });
    if (overBudgetItems.length > 0) {
      const worstItem = overBudgetItems.reduce((worst, item) => {
        const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;
        const pct = ((item.actualAmount - baseline) / baseline) * 100;
        const worstBaseline = worst.quotedCost > 0 ? worst.quotedCost : worst.estimatedCost;
        const worstPct = ((worst.actualAmount - worstBaseline) / worstBaseline) * 100;
        return pct > worstPct ? item : worst;
      });
      const worstBaseline = worstItem.quotedCost > 0 ? worstItem.quotedCost : worstItem.estimatedCost;
      const worstPct = Math.round(((worstItem.actualAmount - worstBaseline) / worstBaseline) * 100);
      items.push({
        type: 'over_budget',
        label: `${overBudgetItems.length} item${overBudgetItems.length > 1 ? 's' : ''} over budget`,
        detail: `Worst: ${worstItem.description.substring(0, 30)} at ${worstPct}% over`,
        severity: 'critical',
        icon: AlertTriangle,
      });
    }

    // 2. Quoted items with zero expenses
    const quotedNoExpenses = lineItems.filter(item =>
      !isInternalItem(item) &&
      item.quotedCost > 0 &&
      item.allocatedAmount === 0 &&
      item.actualAmount === 0
    );
    if (quotedNoExpenses.length > 0) {
      items.push({
        type: 'no_invoices',
        label: `${quotedNoExpenses.length} quoted item${quotedNoExpenses.length > 1 ? 's' : ''} awaiting invoices`,
        detail: `${formatCurrency(quotedNoExpenses.reduce((s, i) => s + i.quotedCost, 0))} committed but no expenses recorded`,
        severity: 'warning',
        icon: FileText,
      });
    }

    // 3. Unquoted external items
    const unquotedExternal = lineItems.filter(item =>
      !isInternalItem(item) &&
      item.quotedCost === 0 &&
      item.quoteStatus === 'none'
    );
    if (unquotedExternal.length > 0) {
      items.push({
        type: 'needs_quotes',
        label: `${unquotedExternal.length} item${unquotedExternal.length > 1 ? 's' : ''} need quotes`,
        detail: `${formatCurrency(unquotedExternal.reduce((s, i) => s + i.estimatedCost, 0))} in estimated costs without vendor pricing`,
        severity: 'warning',
        icon: ClipboardList,
      });
    }

    // 4. Unallocated expenses
    if (summary.totalUnallocated > 0) {
      items.push({
        type: 'unallocated',
        label: `${formatCurrency(summary.totalUnallocated)} in unallocated expenses`,
        detail: 'Expenses recorded but not matched to line items',
        severity: 'info',
        icon: AlertCircle,
      });
    }

    return items;
  }, [lineItems, summary]);

  // Risk score for sorting — display-layer only
  const getRiskScore = (item: LineItemControlData): number => {
    let score = 0;
    const baseline = item.quotedCost > 0 ? item.quotedCost : item.estimatedCost;

    // Over budget (highest risk)
    if (!isInternalItem(item) && baseline > 0 && item.actualAmount > baseline) {
      const overPct = ((item.actualAmount - baseline) / baseline) * 100;
      score += 100 + overPct;
    }

    // Quoted but no expenses (vendor committed, no invoices)
    if (!isInternalItem(item) && item.quotedCost > 0 && item.actualAmount === 0) {
      score += 50;
    }

    // Unquoted external items
    if (!isInternalItem(item) && item.quotedCost === 0 && item.quoteStatus === 'none') {
      score += 30;
    }

    // Partial allocation
    if (item.allocationStatus === 'partial') {
      score += 20;
    }

    // Internal items are lowest priority in risk view
    if (isInternalItem(item)) {
      score -= 10;
    }

    return score;
  };

  const [sortMode, setSortMode] = useState<'risk' | 'category' | 'custom'>('risk');

  const sortedLineItems = useMemo(() => {
    if (sortMode === 'risk') {
      return [...lineItems].sort((a, b) => getRiskScore(b) - getRiskScore(a));
    }
    if (sortMode === 'category') {
      return [...lineItems].sort((a, b) => a.category.localeCompare(b.category));
    }
    return lineItems; // 'custom' = FinancialTableTemplate handles it
  }, [lineItems, sortMode]);

  // Group line items into External and Internal sections
  const useGrouping = sortMode === 'risk' || sortMode === 'category';

  const groupedLineItems = useMemo(() => {
    if (!useGrouping) return [];

    const external = sortedLineItems.filter(item => !isInternalItem(item));
    const internal = sortedLineItems.filter(item => isInternalItem(item));

    const groups: Array<{
      groupKey: string;
      groupLabel: string;
      items: LineItemControlData[];
      isCollapsible: boolean;
      defaultExpanded: boolean;
    }> = [];

    if (external.length > 0) {
      groups.push({
        groupKey: 'external',
        groupLabel: `Vendor & Subcontractor (${external.length})`,
        items: external,
        isCollapsible: true,
        defaultExpanded: true,
      });
    }

    if (internal.length > 0) {
      groups.push({
        groupKey: 'internal',
        groupLabel: `Internal Labor & Management (${internal.length})`,
        items: internal,
        isCollapsible: true,
        defaultExpanded: true,
      });
    }

    return groups;
  }, [sortedLineItems, useGrouping]);

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
      <div className="space-y-3 w-full max-w-full overflow-x-hidden box-border min-w-0" data-line-item-dashboard style={{ maxWidth: '100%', width: '100%' }}>
      {/* Cost Tracking Status Bar */}
      {(() => {
        // Use shared financial health system for progress bar color
        const spendHealth = getFinancialHealth(summary.completionPercentage, 80, 95, true);
        const progressBarClass = spendHealth === 'critical' ? '[&>div]:bg-destructive'
          : spendHealth === 'warning' ? '[&>div]:bg-warning'
          : '[&>div]:bg-success';

        return (
          <Card className="w-full">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col gap-2">
                {/* Summary line */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{lineItems.length} line items</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{summary.lineItemsWithQuotes} quoted</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(summary.totalActual)} of {formatCurrency(summary.totalEstimatedCost)} spent
                  </span>
                  {summary.totalUnallocated > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-destructive font-medium">
                        {formatCurrency(summary.totalUnallocated)} unallocated
                      </span>
                    </>
                  )}
                </div>
                {/* Progress bar — using shared financial health colors */}
                <div className="flex items-center gap-2">
                  <Progress
                    value={summary.completionPercentage}
                    className={cn("h-2 flex-1", progressBarClass)}
                  />
                  <span className={cn(
                    "text-xs tabular-nums w-10 text-right font-medium",
                    getFinancialHealthColor(spendHealth)
                  )}>
                    {summary.completionPercentage.toFixed(0)}%
                  </span>
                </div>
                {/* Variance callout — using shared getCostVarianceColor */}
                {summary.totalVariance !== 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <TrendingUp className={cn(
                      "h-3.5 w-3.5",
                      getCostVarianceColor(
                        summary.totalEstimatedCost > 0
                          ? (Math.abs(summary.totalVariance) / summary.totalEstimatedCost) * 100
                          : 0
                      )
                    )} />
                    <span className={cn(
                      "font-medium",
                      getCostVarianceColor(
                        summary.totalEstimatedCost > 0
                          ? (Math.abs(summary.totalVariance) / summary.totalEstimatedCost) * 100
                          : 0
                      )
                    )}>
                      {formatCurrency(Math.abs(summary.totalVariance))} {summary.totalVariance > 0 ? 'over' : 'under'} estimate
                    </span>
                    {(summary.lineItemsOverBudget > 0 || summary.lineItemsUnderBudget > 0) && (
                      <span className="text-muted-foreground">
                        ({summary.lineItemsOverBudget > 0 && `${summary.lineItemsOverBudget} over`}
                        {summary.lineItemsOverBudget > 0 && summary.lineItemsUnderBudget > 0 && ', '}
                        {summary.lineItemsUnderBudget > 0 && `${summary.lineItemsUnderBudget} under`})
                      </span>
                    )}
                  </div>
                )}
                {/* Needs Attention section */}
                {attentionItems.length > 0 && (
                  <div className="pt-2 mt-2 border-t space-y-1">
                    {attentionItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.type}
                          className={cn(
                            "flex items-start gap-2 p-1.5 rounded text-xs",
                            item.severity === 'critical' && "bg-destructive/10 text-destructive",
                            item.severity === 'warning' && "bg-warning/10 text-warning-foreground",
                            item.severity === 'info' && "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-muted-foreground ml-1">{'\u2014'} {item.detail}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

        {/* Main Table/Cards */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">Cost Tracking ({lineItems.length})</h2>
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant={sortMode === 'risk' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSortMode('risk')}
                className="h-7 text-xs"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                By Risk
              </Button>
              <Button
                variant={sortMode === 'category' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSortMode('category')}
                className="h-7 text-xs"
              >
                <Layers className="h-3 w-3 mr-1" />
                By Category
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ColumnSelector
              columns={columnDefinitions}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              className="h-9 md:h-8 mobile-touch-target hidden md:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {isMobile ? (
          <LineItemControlCardView
            lineItems={sortedLineItems}
            onViewDetails={handleViewDetails}
          />
        ) : (
          <FinancialTableTemplate
            data={useGrouping ? groupedLineItems : sortedLineItems}
            columns={filteredColumns}
            isGrouped={useGrouping}
            emptyMessage="No line items found for this project"
            emptyIcon={<AlertTriangle className="h-8 w-8" />}
            showActions={true}
            onView={handleViewDetails}
            getItemId={(item) => item.id}
            expandable={true}
            renderExpandedContent={(item) => (
              <>
                {/* Accepted Quote */}
                {item.quotes.filter(q => q.status === 'accepted').length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Accepted Quote
                    </h4>
                    {item.quotes.filter(q => q.status === 'accepted').map(q => (
                      <div key={q.id} className="flex items-center justify-between text-xs bg-card p-2 rounded border">
                        <span>{q.quotedBy} <span className="text-muted-foreground">#{q.quoteNumber}</span></span>
                        <span className="font-medium tabular-nums">{formatCurrency(q.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Allocated Expenses */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Allocated Expenses ({item.correlatedExpenses.length})
                  </h4>
                  {item.correlatedExpenses.length > 0 ? (
                    <div className="space-y-1">
                      {item.correlatedExpenses.map((exp: any, idx: number) => (
                        <div key={exp.id || idx} className="flex items-center justify-between text-xs bg-card p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {exp.expense_date ? format(new Date(exp.expense_date), 'MMM d, yyyy') : '\u2014'}
                            </span>
                            <span>{exp.payees?.payee_name || exp.payee_name || 'Unknown'}</span>
                          </div>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(exp.amount || exp.split_amount || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No expenses allocated yet</p>
                  )}
                </div>

                {/* Variance Summary */}
                <div className="flex gap-4 text-xs pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground">Est. Cost: </span>
                    <span className="font-medium tabular-nums">{formatCurrency(item.estimatedCost)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quoted: </span>
                    <span className="font-medium tabular-nums">{formatCurrency(item.quotedCost)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Allocated: </span>
                    <span className="font-medium tabular-nums">{formatCurrency(item.allocatedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining: </span>
                    <span className={cn(
                      "font-medium tabular-nums",
                      item.remainingToAllocate > 0 ? "text-warning-foreground" : "text-success"
                    )}>
                      {formatCurrency(item.remainingToAllocate)}
                    </span>
                  </div>
                </div>
              </>
            )}
          />
        )}

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
                      <div className="text-sm text-muted-foreground">Est. Cost</div>
                      <div className="text-lg font-bold">{formatCurrency(selectedLineItem.estimatedCost)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Quoted Cost</div>
                      <div className="text-lg font-bold">{formatCurrency(selectedLineItem.quotedCost)}</div>
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
                        selectedLineItem.actualAmount - selectedLineItem.quotedCost > 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {formatCurrency(selectedLineItem.actualAmount - selectedLineItem.quotedCost)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Completion Progress</span>
                    <span className="font-medium">
                      {selectedLineItem.actualAmount > 0 && selectedLineItem.quotedCost > 0
                        ? `${Math.min(Math.round((selectedLineItem.actualAmount / selectedLineItem.quotedCost) * 100), 100)}% of quoted cost`
                        : 'Not started'
                      }
                    </span>
                  </div>
                  <Progress 
                    value={selectedLineItem.actualAmount > 0 && selectedLineItem.quotedCost > 0 
                      ? Math.min((selectedLineItem.actualAmount / selectedLineItem.quotedCost) * 100, 100) 
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
                                {expense.expense_date ? format(new Date(expense.expense_date), 'MMM d, yyyy') : 'No date'} • {expense.description}
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
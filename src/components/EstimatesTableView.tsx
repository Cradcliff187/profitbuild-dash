import React, { useState, useEffect } from "react";
import { Plus, FileText, AlertTriangle, ChevronsUpDown } from "lucide-react";
import { ColumnSelector } from "@/components/ui/column-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Estimate, EstimateStatus } from "@/types/estimate";
import { FinancialTableTemplate, FinancialTableColumn, FinancialTableGroup } from "./FinancialTableTemplate";
import { BudgetComparisonBadge, BudgetComparisonStatus } from "./BudgetComparisonBadge";
import { EstimateActionsMenu } from "./EstimateActionsMenu";
import { EstimateStatusSelector } from "./EstimateStatusSelector";
import { cn, formatCurrency } from "@/lib/utils";
import { 
  calculateEstimateFinancials, 
  getMarginPerformanceStatus, 
  getMarkupPerformanceStatus 
} from "@/utils/estimateFinancials";
import { useIsMobile } from "@/hooks/use-mobile";

type EstimateWithQuotes = Estimate & { quotes?: Array<{ id: string; total_amount: number; status: string }> };

interface EstimatesTableViewProps {
  estimates: EstimateWithQuotes[];
  onEdit: (estimate: Estimate) => void;
  onDelete: (id: string) => void;
  onView: (estimate: Estimate) => void;
  onCreateNew: () => void;
}

export const EstimatesTableView = ({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesTableViewProps) => {
  const isMobile = useIsMobile();
  const [localEstimates, setLocalEstimates] = useState(estimates);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Define column metadata for selector
  const columnDefinitions = [
    { key: 'estimate_number', label: 'Estimate #', required: true },
    { key: 'line_items', label: 'Line Items', required: false },
    { key: 'version_number', label: 'Version', required: false },
    { key: 'status', label: 'Status', required: true },
    { key: 'date_created', label: 'Created', required: false },
    { key: 'total_amount', label: 'Price', required: true },
    { key: 'total_cost', label: 'Cost', required: false },
    { key: 'gross_profit', label: 'Profit', required: false },
    { key: 'gross_margin_percent', label: 'Margin %', required: false },
    { key: 'markup_percent', label: 'Markup %', required: false },
    { key: 'markup_amount', label: 'Markup $', required: false },
    { key: 'budget_status', label: 'Budget Status', required: false },
    { key: 'variance', label: 'Quote Variance', required: false },
    { key: 'contingency', label: 'Contingency %', required: false },
    { key: 'contingency_amount', label: 'Contingency $', required: false },
    { key: 'total_with_contingency', label: 'Total w/ Cont.', required: false },
    { key: 'actions', label: 'Actions', required: true },
  ];

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('estimates-visible-columns');
    if (saved) {
      const savedVisible = JSON.parse(saved);
      // Filter out invalid column keys
      return savedVisible.filter((key: string) => 
        columnDefinitions.some(col => col.key === key)
      );
    }
    return [
      'estimate_number',
      'line_items',
      'version_number',
      'status',
      'date_created',
      'total_amount',
      'total_cost',
      'gross_profit',
      'gross_margin_percent',
      'markup_percent',
      'budget_status',
      'actions'
    ];
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('estimates-column-order');
    if (saved) {
      const savedOrder = JSON.parse(saved);
      // Filter out any invalid column keys that no longer exist
      const validOrder = savedOrder.filter((key: string) => 
        columnDefinitions.some(col => col.key === key)
      );
      // Add any new columns that aren't in saved order
      const newColumns = columnDefinitions
        .map(col => col.key)
        .filter(key => !validOrder.includes(key));
      
      return [...validOrder, ...newColumns];
    }
    // Default: use order from columnDefinitions
    return columnDefinitions.map(col => col.key);
  });

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem('estimates-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save order to localStorage
  useEffect(() => {
    localStorage.setItem('estimates-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Update local state when estimates prop changes
  React.useEffect(() => {
    setLocalEstimates(estimates);
  }, [estimates]);

  const handleStatusUpdate = (estimateId: string, newStatus: EstimateStatus) => {
    setLocalEstimates(prev => 
      prev.map(est => 
        est.id === estimateId 
          ? { ...est, status: newStatus }
          : est
      )
    );
  };

  // Group estimates by project
  const estimatesByProject = localEstimates.reduce((groups, estimate) => {
    const projectKey = estimate.project_id;
    if (!groups[projectKey]) {
      groups[projectKey] = [];
    }
    groups[projectKey].push(estimate);
    return groups;
  }, {} as Record<string, EstimateWithQuotes[]>);

  // Sort estimates within each project by version number (descending - newest first)
  Object.keys(estimatesByProject).forEach(projectId => {
    estimatesByProject[projectId].sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
  });

  const getQuoteStatus = (estimate: EstimateWithQuotes): BudgetComparisonStatus => {
    if (!estimate.quotes || estimate.quotes.length === 0) {
      return 'awaiting-quotes';
    }
    
    const acceptedQuotes = estimate.quotes.filter(q => q.status === 'accepted');
    if (acceptedQuotes.length === 0) {
      return 'awaiting-quotes';
    }
    
    const totalAcceptedAmount = acceptedQuotes.reduce((sum, q) => sum + q.total_amount, 0);
    
    if (totalAcceptedAmount < estimate.total_amount) {
      return 'under-budget';
    } else if (totalAcceptedAmount > estimate.total_amount) {
      return 'over-budget';
    }
    
    return 'awaiting-quotes';
  };

  const getAcceptedQuoteVariance = (estimate: EstimateWithQuotes) => {
    if (!estimate.quotes || estimate.quotes.length === 0) {
      return null;
    }
    
    const acceptedQuotes = estimate.quotes.filter(q => q.status === 'accepted');
    if (acceptedQuotes.length === 0) {
      return null;
    }
    
    const totalAcceptedAmount = acceptedQuotes.reduce((sum, q) => sum + q.total_amount, 0);
    const variance = totalAcceptedAmount - estimate.total_amount;
    return variance;
  };

  // Convert to grouped format for the table
  const groupedData: FinancialTableGroup<EstimateWithQuotes>[] = Object.entries(estimatesByProject).map(
    ([projectId, projectEstimates]) => ({
      groupKey: projectId,
      groupLabel: `[${projectEstimates[0].project_number}] ${projectEstimates[0].project_name} - ${projectEstimates[0].client_name}`,
      items: projectEstimates,
      isCollapsible: true,
      defaultExpanded: true,
    })
  );

  const allColumns: FinancialTableColumn<EstimateWithQuotes>[] = [
    {
      key: 'estimate_number',
      label: 'Estimate #',
      align: 'left',
      width: isMobile ? '140px' : '120px',
      sortable: true,
      getSortValue: (estimate) => estimate.estimate_number,
      render: (estimate) => (
        <div className={cn("font-mono text-foreground/80", isMobile ? "text-xs" : "text-[11px]")}>
          {estimate.estimate_number}
        </div>
      ),
    },
    {
      key: 'line_items',
      label: 'Line Items',
      align: 'center',
      width: '90px',
      sortable: true,
      getSortValue: (estimate) => estimate.lineItems?.length || 0,
      render: (estimate) => {
        const count = estimate.lineItems?.length || 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                  {count}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total line items in this estimate</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'version_number',
      label: 'Version',
      align: 'left',
      width: '80px',
      sortable: true,
      getSortValue: (estimate) => estimate.version_number || 1,
      render: (estimate) => (
        <div className="flex items-center gap-1">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1 py-0 h-4 leading-none font-mono",
              estimate.is_current_version 
                ? "border-primary/30 text-primary bg-primary/5" 
                : "border-muted text-muted-foreground"
            )}
          >
            v{estimate.version_number || 1}
          </Badge>
          {estimate.is_current_version && (
            <div className="h-1.5 w-1.5 rounded-full bg-primary" title="Current Version" />
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      width: '100px',
      render: (estimate) => (
        <EstimateStatusSelector
          estimateId={estimate.id}
          currentStatus={estimate.status}
          estimateNumber={estimate.estimate_number}
          projectId={estimate.project_id}
          totalAmount={estimate.total_amount}
          onStatusChange={(newStatus) => handleStatusUpdate(estimate.id, newStatus)}
        />
      ),
    },
    {
      key: 'date_created',
      label: 'Created',
      align: 'right',
      width: '100px',
      sortable: true,
      getSortValue: (estimate) => new Date(estimate.date_created).getTime(),
      render: (estimate) => (
        <div className="text-xs text-foreground/70">
          {format(estimate.date_created, 'MMM dd')}
        </div>
      ),
    },
    {
      key: 'total_amount',
      label: 'Price',
      align: 'right',
      width: isMobile ? '120px' : '100px',
      sortable: true,
      getSortValue: (estimate) => estimate.total_amount,
      render: (estimate) => (
        <div className={cn("font-semibold font-mono tabular-nums", isMobile ? "text-sm" : "text-xs")}>
          {formatCurrency(estimate.total_amount, { showCents: false })}
        </div>
      ),
    },
    {
      key: 'total_cost',
      label: 'Cost',
      align: 'right',
      width: '110px',
      sortable: true,
      getSortValue: (estimate) => calculateEstimateFinancials(estimate.lineItems).totalCost,
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        return (
          <div className="text-sm font-mono tabular-nums text-foreground/80">
            {formatCurrency(financials.totalCost, { showCents: false })}
          </div>
        );
      },
    },
    {
      key: 'gross_profit',
      label: 'Profit',
      align: 'right',
      width: '110px',
      sortable: true,
      getSortValue: (estimate) => calculateEstimateFinancials(estimate.lineItems).grossProfit,
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        return (
          <div className={cn(
            "text-sm font-mono tabular-nums font-medium",
            financials.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'
          )}>
            {formatCurrency(financials.grossProfit, { showCents: false })}
          </div>
        );
      },
    },
    {
      key: 'gross_margin_percent',
      label: 'Margin %',
      align: 'right',
      width: '90px',
      sortable: true,
      getSortValue: (estimate) => calculateEstimateFinancials(estimate.lineItems).grossMarginPercent,
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        const status = getMarginPerformanceStatus(financials.grossMarginPercent);
        
        return (
          <div className={cn(
            "text-sm font-semibold font-mono tabular-nums",
            status === 'excellent' && 'text-green-700',
            status === 'good' && 'text-blue-700',
            status === 'poor' && 'text-yellow-700',
            status === 'critical' && 'text-red-700'
          )}>
            {financials.grossMarginPercent.toFixed(1)}%
          </div>
        );
      },
    },
    {
      key: 'markup_percent',
      label: 'Markup %',
      align: 'right',
      width: '90px',
      sortable: true,
      getSortValue: (estimate) => calculateEstimateFinancials(estimate.lineItems).averageMarkupPercent,
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        const status = getMarkupPerformanceStatus(financials.averageMarkupPercent);
        
        return (
          <div className={cn(
            "text-sm font-mono tabular-nums",
            status === 'excellent' && 'text-green-700',
            status === 'good' && 'text-blue-700',
            status === 'poor' && 'text-yellow-700',
            status === 'critical' && 'text-red-700'
          )}>
            {financials.averageMarkupPercent.toFixed(1)}%
          </div>
        );
      },
    },
    {
      key: 'markup_amount',
      label: 'Markup $',
      align: 'right',
      width: '100px',
      sortable: true,
      getSortValue: (estimate) => calculateEstimateFinancials(estimate.lineItems).totalMarkupAmount,
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        return (
          <div className="text-sm font-mono tabular-nums text-foreground/80">
            {formatCurrency(financials.totalMarkupAmount, { showCents: false })}
          </div>
        );
      },
    },
    {
      key: 'budget_status',
      label: 'Budget Status',
      align: 'center',
      width: '120px',
      render: (estimate) => {
        const quoteStatus = getQuoteStatus(estimate);
        return <BudgetComparisonBadge status={quoteStatus} />;
      },
    },
    {
      key: 'variance',
      label: 'Quote Variance',
      align: 'right',
      width: '100px',
      render: (estimate) => {
        const variance = getAcceptedQuoteVariance(estimate);
        if (variance === null) return <span className="text-xs text-muted-foreground">-</span>;
        
        return (
          <div className={cn(
            "text-xs font-semibold font-mono tabular-nums",
            variance < 0 ? 'text-green-700' : 'text-red-700'
          )}>
            {formatCurrency(variance, { showCents: false })}
          </div>
        );
      },
    },
    {
      key: 'contingency',
      label: 'Contingency %',
      align: 'right',
      width: '100px',
      sortable: true,
      getSortValue: (estimate) => estimate.contingency_percent || 0,
      render: (estimate) => {
        if (!estimate.contingency_percent || estimate.contingency_percent === 0) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="text-xs text-foreground/70">
            {estimate.contingency_percent}%
          </div>
        );
      },
    },
    {
      key: 'contingency_amount',
      label: 'Contingency $',
      align: 'right',
      width: '110px',
      sortable: true,
      getSortValue: (estimate) => estimate.contingency_amount || 0,
      render: (estimate) => {
        if (!estimate.contingency_amount || estimate.contingency_amount === 0) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="text-sm font-mono tabular-nums text-foreground/80">
            {formatCurrency(estimate.contingency_amount, { showCents: false })}
          </div>
        );
      },
    },
    {
      key: 'total_with_contingency',
      label: 'Total w/ Cont.',
      align: 'right',
      width: '130px',
      sortable: true,
      getSortValue: (estimate) => estimate.total_amount + (estimate.contingency_amount || 0),
      render: (estimate) => {
        const totalWithContingency = estimate.total_amount + (estimate.contingency_amount || 0);
        return (
          <div className="text-sm font-semibold font-mono tabular-nums">
            {formatCurrency(totalWithContingency, { showCents: false })}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      width: '60px',
      render: (estimate) => (
        <EstimateActionsMenu
          estimate={estimate}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    },
  ];

  const columns = columnOrder
    .map(key => allColumns.find(col => col.key === key))
    .filter((col): col is FinancialTableColumn<EstimateWithQuotes> => 
      col !== undefined && visibleColumns.includes(col.key)
    );

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

  if (localEstimates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            0 estimates
          </div>
          <ColumnSelector
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
          />
        </div>
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Estimates Yet</h3>
          <p className="text-muted-foreground mb-6">Create your first estimate to get started.</p>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Estimate
          </Button>
        </div>
      </div>
    );
  }

  const EstimatesTable = FinancialTableTemplate<EstimateWithQuotes>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {localEstimates.length} {localEstimates.length === 1 ? 'estimate' : 'estimates'} across {groupedData.length} {groupedData.length === 1 ? 'project' : 'projects'}
        </div>
        <ColumnSelector
          columns={columnDefinitions}
          visibleColumns={visibleColumns}
          onVisibilityChange={setVisibleColumns}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
        />
      </div>
      
      <EstimatesTable
        data={groupedData}
        columns={columns}
        isGrouped={true}
        collapsedGroups={collapsedGroups}
        onCollapsedGroupsChange={setCollapsedGroups}
        collapseAllButton={collapseButton}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        getItemId={(estimate) => estimate.id}
        className="bg-card shadow-sm"
        emptyMessage="No estimates found"
        emptyIcon={<FileText className="h-16 w-16 text-muted-foreground opacity-50" />}
        showActions={false}
      />
    </div>
  );
};
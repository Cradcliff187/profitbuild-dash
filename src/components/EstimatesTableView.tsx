import React, { useState } from "react";
import { Plus, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Estimate, EstimateStatus } from "@/types/estimate";
import { FinancialTableTemplate, FinancialTableColumn, FinancialTableGroup } from "./FinancialTableTemplate";
import { BudgetComparisonBadge, BudgetComparisonStatus } from "./BudgetComparisonBadge";
import { EstimateActionsMenu } from "./EstimateActionsMenu";
import { cn } from "@/lib/utils";
import { 
  calculateEstimateFinancials, 
  getMarginPerformanceStatus, 
  getMarkupPerformanceStatus 
} from "@/utils/estimateFinancials";

type EstimateWithQuotes = Estimate & { quotes?: Array<{ id: string; total_amount: number }> };

interface EstimatesTableViewProps {
  estimates: EstimateWithQuotes[];
  onEdit: (estimate: Estimate) => void;
  onDelete: (id: string) => void;
  onView: (estimate: Estimate) => void;
  onCreateNew: () => void;
}

export const EstimatesTableView = ({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesTableViewProps) => {
  const [localEstimates, setLocalEstimates] = useState(estimates);

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
    
    const hasUnderBudgetQuote = estimate.quotes.some(q => q.total_amount < estimate.total_amount);
    if (hasUnderBudgetQuote) {
      return 'under-budget';
    }
    
    const allQuotesOverBudget = estimate.quotes.every(q => q.total_amount > estimate.total_amount);
    if (allQuotesOverBudget) {
      return 'over-budget';
    }
    
    return 'awaiting-quotes';
  };

  const getBestQuoteVariance = (estimate: EstimateWithQuotes) => {
    if (!estimate.quotes || estimate.quotes.length === 0) {
      return null;
    }
    
    const bestQuote = estimate.quotes.reduce((best, current) => 
      current.total_amount < best.total_amount ? current : best
    );
    
    const variance = bestQuote.total_amount - estimate.total_amount;
    return variance;
  };

  // Convert to grouped format for the table
  const groupedData: FinancialTableGroup<EstimateWithQuotes>[] = Object.entries(estimatesByProject).map(
    ([projectId, projectEstimates]) => ({
      groupKey: projectId,
      groupLabel: `${projectEstimates[0].project_name} - ${projectEstimates[0].client_name}`,
      items: projectEstimates,
      isCollapsible: true,
      defaultExpanded: true,
    })
  );

  const columns: FinancialTableColumn<EstimateWithQuotes>[] = [
    {
      key: 'estimate_number',
      label: 'Estimate #',
      align: 'left',
      width: '160px',
      render: (estimate) => {
        const hasLineItems = estimate.lineItems && estimate.lineItems.length > 0;
        const lineItemCount = estimate.lineItems?.length || 0;
        const hasAmount = estimate.total_amount > 0;
        const hasDataIssue = !hasLineItems && hasAmount;
        
        return (
          <div className="space-y-1">
            <div className="font-mono text-xs text-foreground/80">
              {estimate.estimate_number}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs px-1.5 py-0.5",
                  hasDataIssue ? "border-amber-200 text-amber-700 bg-amber-50" : "border-blue-200 text-blue-700 bg-blue-50"
                )}
              >
                {lineItemCount} item{lineItemCount !== 1 ? 's' : ''}
              </Badge>
              {hasDataIssue && (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'version_number',
      label: 'Version',
      align: 'left',
      width: '80px',
      render: (estimate) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            v{estimate.version_number || 1}
          </Badge>
          {estimate.is_current_version && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">
              Current
            </Badge>
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
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs capitalize px-2 py-0.5",
            estimate.status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
            estimate.status === 'draft' && 'border-gray-200 text-gray-700 bg-gray-50',
            estimate.status === 'sent' && 'border-blue-200 text-blue-700 bg-blue-50',
            estimate.status === 'rejected' && 'border-red-200 text-red-700 bg-red-50',
            estimate.status === 'expired' && 'border-yellow-200 text-yellow-700 bg-yellow-50'
          )}
        >
          {estimate.status}
        </Badge>
      ),
    },
    {
      key: 'date_created',
      label: 'Created',
      align: 'right',
      width: '100px',
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
      width: '120px',
      render: (estimate) => (
        <div className="font-semibold text-sm tabular-nums">
          ${estimate.total_amount.toLocaleString()}
        </div>
      ),
    },
    {
      key: 'total_cost',
      label: 'Cost',
      align: 'right',
      width: '110px',
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        return (
          <div className="text-sm tabular-nums text-foreground/80">
            ${financials.totalCost.toLocaleString()}
          </div>
        );
      },
    },
    {
      key: 'gross_profit',
      label: 'Profit',
      align: 'right',
      width: '110px',
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        return (
          <div className={cn(
            "text-sm tabular-nums font-medium",
            financials.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'
          )}>
            ${financials.grossProfit.toLocaleString()}
          </div>
        );
      },
    },
    {
      key: 'gross_margin_percent',
      label: 'Margin %',
      align: 'center',
      width: '90px',
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        const status = getMarginPerformanceStatus(financials.grossMarginPercent);
        
        return (
          <div className={cn(
            "text-sm font-semibold tabular-nums",
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
      align: 'center',
      width: '90px',
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        const status = getMarkupPerformanceStatus(financials.averageMarkupPercent);
        
        return (
          <div className={cn(
            "text-sm tabular-nums",
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
      render: (estimate) => {
        const financials = calculateEstimateFinancials(estimate.lineItems);
        return (
          <div className="text-sm tabular-nums text-foreground/80">
            ${financials.totalMarkupAmount.toLocaleString()}
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
      label: 'Variance',
      align: 'right',
      width: '100px',
      render: (estimate) => {
        const variance = getBestQuoteVariance(estimate);
        if (variance === null) return <span className="text-xs text-muted-foreground">-</span>;
        
        return (
          <div className={cn(
            "text-xs font-semibold tabular-nums",
            variance < 0 ? 'text-green-700' : 'text-red-700'
          )}>
            {variance < 0 ? '-' : '+'}${Math.abs(variance).toLocaleString()}
          </div>
        );
      },
    },
    {
      key: 'contingency',
      label: 'Contingency',
      align: 'right',
      width: '100px',
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
          onStatusUpdate={handleStatusUpdate}
        />
      ),
    },
  ];

  if (localEstimates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Estimates Yet</h3>
        <p className="text-muted-foreground mb-6">Create your first estimate to get started.</p>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create First Estimate
        </Button>
      </div>
    );
  }

  const EstimatesTable = FinancialTableTemplate<EstimateWithQuotes>;

  return (
    <div className="space-y-4">
      <EstimatesTable
        data={groupedData}
        columns={columns}
        isGrouped={true}
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
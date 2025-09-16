import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Expense, ProjectExpenseSummary, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { Estimate } from '@/types/estimate';
import { VarianceBadge } from '@/components/ui/variance-badge';
import { Database } from '@/integrations/supabase/types';

interface ProjectExpenseTrackerProps {
  expenses: Expense[];
  estimates: Estimate[];
  changeOrders?: Database['public']['Tables']['change_orders']['Row'][];
}

export const ProjectExpenseTracker: React.FC<ProjectExpenseTrackerProps> = ({ expenses, estimates, changeOrders = [] }) => {
  const calculateProjectSummary = (estimate: Estimate): ProjectExpenseSummary => {
    const projectExpenses = expenses.filter(e => e.project_id === estimate.project_id);
    const actualExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const plannedExpenses = projectExpenses.filter(e => e.is_planned === true).reduce((sum, e) => sum + e.amount, 0);
    const unplannedExpenses = projectExpenses.filter(e => e.is_planned === false).reduce((sum, e) => sum + e.amount, 0);
    
    // Get approved change orders for this project
    const projectChangeOrders = changeOrders.filter(co => 
      co.project_id === estimate.project_id && 
      co.status === 'approved' &&
      co.amount !== null
    );
    
    // Sum approved change order amounts
    const approvedChangeOrdersTotal = projectChangeOrders.reduce((sum, co) => 
      sum + (co.amount || 0), 0
    );
    
    // Calculate revised contract total
    const revisedContractTotal = estimate.total_amount + approvedChangeOrdersTotal;
    
    const variance = actualExpenses - revisedContractTotal;
    const percentageSpent = revisedContractTotal > 0 ? (actualExpenses / revisedContractTotal) * 100 : 0;

    const categoryBreakdown = {
      labor_internal: {
        estimated: 0, // Would need to get from estimate line items
        actual: projectExpenses.filter(e => e.category === 'labor_internal').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      },
      subcontractors: {
        estimated: 0,
        actual: projectExpenses.filter(e => e.category === 'subcontractors').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      },
      materials: {
        estimated: 0,
        actual: projectExpenses.filter(e => e.category === 'materials').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      },
      equipment: {
        estimated: 0,
        actual: projectExpenses.filter(e => e.category === 'equipment').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      },
      other: {
        estimated: 0,
        actual: projectExpenses.filter(e => e.category === 'other').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      }
    };

    // Calculate category variances
    Object.keys(categoryBreakdown).forEach(key => {
      const category = categoryBreakdown[key as keyof typeof categoryBreakdown];
      category.variance = category.actual - category.estimated;
    });

    return {
      project_id: estimate.project_id || estimate.id,
      project_name: estimate.project_name || 'Unknown Project',
      estimate_total: estimate.total_amount,
      approved_change_orders: approvedChangeOrdersTotal,
      revised_contract_total: revisedContractTotal,
      actual_expenses: actualExpenses,
      planned_expenses: plannedExpenses,
      unplanned_expenses: unplannedExpenses,
      variance,
      percentage_spent: percentageSpent,
      category_breakdown: categoryBreakdown
    };
  };

  const projectSummaries = estimates.map(calculateProjectSummary);
  const totalEstimated = projectSummaries.reduce((sum, p) => sum + p.estimate_total, 0);
  const totalApprovedChanges = projectSummaries.reduce((sum, p) => sum + p.approved_change_orders, 0);
  const totalRevisedContract = projectSummaries.reduce((sum, p) => sum + p.revised_contract_total, 0);
  const totalActual = projectSummaries.reduce((sum, p) => sum + p.actual_expenses, 0);
  const totalVariance = totalActual - totalRevisedContract;

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    return <DollarSign className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Contract Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Original Contract</div>
              <div className="text-xl font-semibold">${totalEstimated.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Approved Changes</div>
              <div className="text-xl font-semibold text-blue-600">+${totalApprovedChanges.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Revised Contract</div>
              <div className="text-2xl font-bold">${totalRevisedContract.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Actual</div>
              <div className="text-xl font-semibold">${totalActual.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance vs Revised</CardTitle>
          </CardHeader>
          <CardContent>
            <VarianceBadge 
              variance={totalVariance}
              percentage={totalRevisedContract > 0 ? (totalVariance / totalRevisedContract) * 100 : 0}
              className="text-base font-bold"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilized</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevisedContract > 0 ? ((totalActual / totalRevisedContract) * 100).toFixed(1) : '0'}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Change Orders Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalEstimated > 0 ? ((totalApprovedChanges / totalEstimated) * 100).toFixed(1) : '0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overbudget Alert */}
      {totalVariance > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Projects are currently ${totalVariance.toFixed(2)} over the revised contract total 
            (including approved change orders). Review project expenses and consider scope adjustments.
          </AlertDescription>
        </Alert>
      )}

      {/* Project Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Project Breakdown</h3>
        {projectSummaries.map((summary) => (
          <Card key={summary.project_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{summary.project_name}</CardTitle>
                <Badge variant={summary.variance > 0 ? 'destructive' : summary.variance < 0 ? 'default' : 'secondary'}>
                  {summary.variance >= 0 ? '+' : ''}${summary.variance.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contract Breakdown */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Contract Summary</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Original:</span>
                    <div className="font-semibold">${summary.estimate_total.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Changes:</span>
                    <div className="font-semibold text-blue-600">+${summary.approved_change_orders.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revised:</span>
                    <div className="font-bold">${summary.revised_contract_total.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Budget Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Budget Progress vs Revised Contract</span>
                  <span>{summary.percentage_spent.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={Math.min(summary.percentage_spent, 100)} 
                  className={summary.percentage_spent > 100 ? 'bg-red-100' : ''}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Revised Contract: ${summary.revised_contract_total.toFixed(2)}</span>
                  <span>Actual: ${summary.actual_expenses.toFixed(2)}</span>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Expense Types</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Planned:</span>
                      <span>${summary.planned_expenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unplanned:</span>
                      <span className="text-orange-600">${summary.unplanned_expenses.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Top Categories</p>
                  <div className="space-y-1 text-sm">
                    {Object.entries(summary.category_breakdown)
                      .sort(([,a], [,b]) => b.actual - a.actual)
                      .slice(0, 3)
                      .map(([category, data]) => (
                        <div key={category} className="flex justify-between">
                          <span>{EXPENSE_CATEGORY_DISPLAY[category as keyof typeof EXPENSE_CATEGORY_DISPLAY]}:</span>
                          <span className={data.variance > 0 ? 'text-red-600' : data.variance < 0 ? 'text-green-600' : ''}>
                            ${data.actual.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Category Variance Details */}
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Category Variance</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {Object.entries(summary.category_breakdown).map(([category, data]) => (
                    <div key={category} className="text-xs">
                      <div className="font-medium">{EXPENSE_CATEGORY_DISPLAY[category as keyof typeof EXPENSE_CATEGORY_DISPLAY]}</div>
                      <div className={getVarianceColor(data.variance)}>
                        {data.variance >= 0 ? '+' : ''}${data.variance.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projectSummaries.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Project Data</h3>
            <p className="text-muted-foreground">
              Create some estimates and add expenses to see project tracking data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
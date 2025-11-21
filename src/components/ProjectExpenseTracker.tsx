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
import { formatCurrency } from '@/lib/utils';
import { calculateProjectExpenses } from '@/utils/expenseSplits';

interface ProjectExpenseTrackerProps {
  expenses: Expense[];
  estimates: Estimate[];
  changeOrders?: Database['public']['Tables']['change_orders']['Row'][];
}

export const ProjectExpenseTracker: React.FC<ProjectExpenseTrackerProps> = ({ expenses, estimates, changeOrders = [] }) => {
  const calculateProjectSummary = async (estimate: Estimate): Promise<ProjectExpenseSummary> => {
    const projectExpenses = expenses.filter(e => e.project_id === estimate.project_id);
    const actualExpenses = await calculateProjectExpenses(estimate.project_id, expenses);
    
    // Calculate planned/unplanned using split-aware logic
    const plannedExpenses = await calculateProjectExpenses(
      estimate.project_id, 
      expenses.filter(e => e.is_planned === true)
    );
    const unplannedExpenses = await calculateProjectExpenses(
      estimate.project_id, 
      expenses.filter(e => e.is_planned === false)
    );
    
    // Calculate estimated costs from line items
    const estimateLineItems = (estimate as any).estimate_line_items || [];
    const estimatedTotalCost = estimateLineItems.reduce((sum: number, item: any) => 
      sum + (item.total_cost || 0), 0
    );
    
    // Calculate cost breakdown by category
    const categoryTotalsFromLineItems = estimateLineItems.reduce((acc: any, item: any) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = { estimated: 0, estimated_cost: 0 };
      }
      acc[category].estimated_cost += item.total_cost || 0;
      return acc;
    }, {});
    
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
    
    // Calculate cost overrun and true margin
    const costOverrun = actualExpenses - estimatedTotalCost;
    const costOverrunPercentage = estimatedTotalCost > 0 ? (costOverrun / estimatedTotalCost) * 100 : 0;
    const trueMargin = revisedContractTotal > 0 ? ((revisedContractTotal - actualExpenses) / revisedContractTotal) * 100 : 0;
    
    const variance = actualExpenses - revisedContractTotal;
    const percentageSpent = revisedContractTotal > 0 ? (actualExpenses / revisedContractTotal) * 100 : 0;
    const costUtilizationPercentage = estimatedTotalCost > 0 ? (actualExpenses / estimatedTotalCost) * 100 : 0;

    // Calculate category breakdown with split-aware calculations
    const categoryBreakdown = {
      labor_internal: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.labor_internal?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'labor_internal')
        ),
        variance: 0,
        cost_overrun: 0
      },
      subcontractors: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.subcontractors?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'subcontractors')
        ),
        variance: 0,
        cost_overrun: 0
      },
      materials: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.materials?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'materials')
        ),
        variance: 0,
        cost_overrun: 0
      },
      equipment: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.equipment?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'equipment')
        ),
        variance: 0,
        cost_overrun: 0
      },
      permits: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.permits?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'permits')
        ),
        variance: 0,
        cost_overrun: 0
      },
      management: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.management?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'management')
        ),
        variance: 0,
        cost_overrun: 0
      },
      tools: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.tools?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'tools')
        ),
        variance: 0,
        cost_overrun: 0
      },
      software: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.software?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'software')
        ),
        variance: 0,
        cost_overrun: 0
      },
      vehicle_maintenance: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.vehicle_maintenance?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'vehicle_maintenance')
        ),
        variance: 0,
        cost_overrun: 0
      },
      gas: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.gas?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'gas')
        ),
        variance: 0,
        cost_overrun: 0
      },
      meals: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.meals?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'meals')
        ),
        variance: 0,
        cost_overrun: 0
      },
      other: {
        estimated: 0,
        estimated_cost: categoryTotalsFromLineItems.other?.estimated_cost || 0,
        actual: await calculateProjectExpenses(
          estimate.project_id, 
          expenses.filter(e => e.category === 'other')
        ),
        variance: 0,
        cost_overrun: 0
      }
    };

    // Calculate category variances and cost overruns
    Object.keys(categoryBreakdown).forEach(key => {
      const category = categoryBreakdown[key as keyof typeof categoryBreakdown];
      category.variance = category.actual - category.estimated;
      category.cost_overrun = category.actual - category.estimated_cost;
    });

    return {
      project_id: estimate.project_id || estimate.id,
      project_name: estimate.project_name || 'Unknown Project',
      estimate_total: estimate.total_amount,
      estimated_total_cost: estimatedTotalCost,
      approved_change_orders: approvedChangeOrdersTotal,
      revised_contract_total: revisedContractTotal,
      actual_expenses: actualExpenses,
      planned_expenses: plannedExpenses,
      unplanned_expenses: unplannedExpenses,
      variance,
      cost_overrun: costOverrun,
      cost_overrun_percentage: costOverrunPercentage,
      true_margin: trueMargin,
      percentage_spent: percentageSpent,
      cost_utilization_percentage: costUtilizationPercentage,
      category_breakdown: categoryBreakdown
    };
  };

  const [projectSummaries, setProjectSummaries] = React.useState<ProjectExpenseSummary[]>([]);

  React.useEffect(() => {
    const calculateSummaries = async () => {
      const summaries = await Promise.all(estimates.map(calculateProjectSummary));
      setProjectSummaries(summaries);
    };
    calculateSummaries();
  }, [estimates, expenses, changeOrders]);
  const totalEstimated = projectSummaries.reduce((sum, p) => sum + p.estimate_total, 0);
  const totalEstimatedCosts = projectSummaries.reduce((sum, p) => sum + p.estimated_total_cost, 0);
  const totalApprovedChanges = projectSummaries.reduce((sum, p) => sum + p.approved_change_orders, 0);
  const totalRevisedContract = projectSummaries.reduce((sum, p) => sum + p.revised_contract_total, 0);
  const totalActual = projectSummaries.reduce((sum, p) => sum + p.actual_expenses, 0);
  const totalVariance = totalActual - totalRevisedContract;
  const totalCostOverrun = totalActual - totalEstimatedCosts;
  const totalTrueMargin = totalRevisedContract > 0 ? ((totalRevisedContract - totalActual) / totalRevisedContract) * 100 : 0;

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Original Contract</div>
              <div className="text-xl font-semibold">{formatCurrency(totalEstimated)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Estimated Costs</div>
              <div className="text-xl font-semibold text-orange-600">{formatCurrency(totalEstimatedCosts)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Approved Changes</div>
              <div className="text-xl font-semibold text-blue-600">+{formatCurrency(totalApprovedChanges)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Revised Contract</div>
              <div className="text-2xl font-bold">{formatCurrency(totalRevisedContract)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Actual</div>
              <div className="text-xl font-semibold">{formatCurrency(totalActual)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Cost Overrun</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <VarianceBadge 
              variance={totalCostOverrun}
              percentage={totalEstimatedCosts > 0 ? (totalCostOverrun / totalEstimatedCosts) * 100 : 0}
              className="text-base font-bold"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">True Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalTrueMargin >= 20 ? 'text-green-600' : totalTrueMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {totalTrueMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalRevisedContract - totalActual)} profit
            </div>
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
            <div className="text-xs text-muted-foreground mt-1">
              vs contract
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Overrun Alert */}
      {totalCostOverrun > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cost Overrun Alert:</strong> Actual expenses are {formatCurrency(totalCostOverrun)} over estimated costs 
            ({totalEstimatedCosts > 0 ? ((totalCostOverrun / totalEstimatedCosts) * 100).toFixed(1) : 0}% overrun). 
            This is impacting your profit margins. Consider cost control measures.
          </AlertDescription>
        </Alert>
      )}

      {/* Overbudget Alert */}
      {totalVariance > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Projects are currently {formatCurrency(totalVariance)} over the revised contract total 
            (including approved change orders). Review project expenses and consider scope adjustments.
          </AlertDescription>
        </Alert>
      )}

      {/* Project Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Project Breakdown</h3>
        {projectSummaries.map((summary, index) => (
          <Card key={`${summary.project_id}-${index}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{summary.project_name}</CardTitle>
                 <Badge variant={summary.variance > 0 ? 'destructive' : summary.variance < 0 ? 'default' : 'secondary'}>
                   {formatCurrency(summary.variance)}
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
                    <div className="font-semibold">{formatCurrency(summary.estimate_total)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Changes:</span>
                    <div className="font-semibold text-blue-600">+{formatCurrency(summary.approved_change_orders)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revised:</span>
                    <div className="font-bold">{formatCurrency(summary.revised_contract_total)}</div>
                  </div>
                </div>
              </div>

              {/* Budget Progress */}
              <div className="space-y-3">
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
                    <span>Contract: {formatCurrency(summary.revised_contract_total)}</span>
                    <span>Actual: {formatCurrency(summary.actual_expenses)}</span>
                  </div>
                </div>

                {/* Cost vs Budget Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Cost vs Budget</span>
                    <span>{summary.cost_utilization_percentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(summary.cost_utilization_percentage, 100)} 
                    className={summary.cost_utilization_percentage > 100 ? 'bg-red-100' : summary.cost_utilization_percentage > 90 ? 'bg-yellow-100' : 'bg-green-100'}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Cost Budget: {formatCurrency(summary.estimated_total_cost)}</span>
                    <span>Actual: {formatCurrency(summary.actual_expenses)}</span>
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Expense Types</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Planned:</span>
                        <span>{formatCurrency(summary.planned_expenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unplanned:</span>
                        <span className="text-orange-600">{formatCurrency(summary.unplanned_expenses)}</span>
                      </div>
                    </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Top Categories</p>
                  <div className="space-y-1 text-sm">
                    {Object.entries(summary.category_breakdown)
                      .sort(([,a], [,b]) => b.actual - a.actual)
                      .slice(0, 3)
                       .map(([category, data], catIndex) => (
                         <div key={`top-${category}-${catIndex}`} className="flex justify-between items-center">
                          <span>{EXPENSE_CATEGORY_DISPLAY[category as keyof typeof EXPENSE_CATEGORY_DISPLAY]}:</span>
                           <div className="text-right">
                             <span className={data.cost_overrun > 0 ? 'text-red-600' : data.cost_overrun < 0 ? 'text-green-600' : ''}>
                               {formatCurrency(data.actual)}
                             </span>
                             {data.cost_overrun !== 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(data.cost_overrun)} vs cost
                                </div>
                             )}
                           </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Category Variance Details */}
              <div className="border-t pt-3 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Cost vs Budget by Category</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                     {Object.entries(summary.category_breakdown).map(([category, data], catIndex) => (
                       <div key={`breakdown-${category}-${catIndex}`} className="text-xs">
                        <div className="font-medium">{EXPENSE_CATEGORY_DISPLAY[category as keyof typeof EXPENSE_CATEGORY_DISPLAY]}</div>
                         <div className={getVarianceColor(data.cost_overrun)}>
                           {formatCurrency(data.cost_overrun)}
                         </div>
                        <div className="text-muted-foreground">
                          {data.estimated_cost > 0 ? ((data.cost_overrun / data.estimated_cost) * 100).toFixed(0) : '0'}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">True Margin Analysis</p>
                  <div className="p-2 bg-muted/30 rounded text-xs">
                    <div className="flex justify-between">
                      <span>Contract Value:</span>
                      <span>{formatCurrency(summary.revised_contract_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual Costs:</span>
                      <span>{formatCurrency(summary.actual_expenses)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>True Margin:</span>
                      <span className={summary.true_margin >= 20 ? 'text-green-600' : summary.true_margin >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                        {summary.true_margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
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
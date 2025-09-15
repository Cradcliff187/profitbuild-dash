import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Expense, ProjectExpenseSummary } from '@/types/expense';
import { Estimate } from '@/types/estimate';

interface ProjectExpenseTrackerProps {
  expenses: Expense[];
  estimates: Estimate[];
}

export const ProjectExpenseTracker: React.FC<ProjectExpenseTrackerProps> = ({ expenses, estimates }) => {
  const calculateProjectSummary = (estimate: Estimate): ProjectExpenseSummary => {
    const projectExpenses = expenses.filter(e => e.projectId === estimate.id);
    const actualExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const plannedExpenses = projectExpenses.filter(e => e.type === 'Planned').reduce((sum, e) => sum + e.amount, 0);
    const unplannedExpenses = projectExpenses.filter(e => e.type === 'Unplanned').reduce((sum, e) => sum + e.amount, 0);
    
    const variance = actualExpenses - estimate.total;
    const percentageSpent = estimate.total > 0 ? (actualExpenses / estimate.total) * 100 : 0;

    const categoryBreakdown = {
      Labor: {
        estimated: estimate.subtotals.labor,
        actual: projectExpenses.filter(e => e.category === 'Labor').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      },
      Materials: {
        estimated: estimate.subtotals.materials,
        actual: projectExpenses.filter(e => e.category === 'Materials').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      },
      Equipment: {
        estimated: estimate.subtotals.equipment,
        actual: projectExpenses.filter(e => e.category === 'Equipment').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      },
      Other: {
        estimated: estimate.subtotals.other,
        actual: projectExpenses.filter(e => e.category === 'Other').reduce((sum, e) => sum + e.amount, 0),
        variance: 0
      }
    };

    // Calculate category variances
    Object.keys(categoryBreakdown).forEach(key => {
      const category = categoryBreakdown[key as keyof typeof categoryBreakdown];
      category.variance = category.actual - category.estimated;
    });

    return {
      projectId: estimate.id,
      projectName: estimate.projectName,
      estimateTotal: estimate.total,
      actualExpenses,
      plannedExpenses,
      unplannedExpenses,
      variance,
      percentageSpent,
      categoryBreakdown
    };
  };

  const projectSummaries = estimates.map(calculateProjectSummary);
  const totalEstimated = projectSummaries.reduce((sum, p) => sum + p.estimateTotal, 0);
  const totalActual = projectSummaries.reduce((sum, p) => sum + p.actualExpenses, 0);
  const totalVariance = totalActual - totalEstimated;

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
      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEstimated.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalActual.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
            {getVarianceIcon(totalVariance)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(totalVariance)}`}>
              ${Math.abs(totalVariance).toFixed(2)} {totalVariance >= 0 ? 'over' : 'under'}
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
              {totalEstimated > 0 ? ((totalActual / totalEstimated) * 100).toFixed(1) : '0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overbudget Alert */}
      {totalVariance > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Projects are currently ${totalVariance.toFixed(2)} over budget. Review project expenses and consider adjusting scope or budgets.
          </AlertDescription>
        </Alert>
      )}

      {/* Project Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Project Breakdown</h3>
        {projectSummaries.map((summary) => (
          <Card key={summary.projectId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{summary.projectName}</CardTitle>
                <Badge variant={summary.variance > 0 ? 'destructive' : summary.variance < 0 ? 'default' : 'secondary'}>
                  {summary.variance >= 0 ? '+' : ''}${summary.variance.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Budget Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Budget Progress</span>
                  <span>{summary.percentageSpent.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={Math.min(summary.percentageSpent, 100)} 
                  className={summary.percentageSpent > 100 ? 'bg-red-100' : ''}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Estimated: ${summary.estimateTotal.toFixed(2)}</span>
                  <span>Actual: ${summary.actualExpenses.toFixed(2)}</span>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Expense Types</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Planned:</span>
                      <span>${summary.plannedExpenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unplanned:</span>
                      <span className="text-orange-600">${summary.unplannedExpenses.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Top Categories</p>
                  <div className="space-y-1 text-sm">
                    {Object.entries(summary.categoryBreakdown)
                      .sort(([,a], [,b]) => b.actual - a.actual)
                      .slice(0, 3)
                      .map(([category, data]) => (
                        <div key={category} className="flex justify-between">
                          <span>{category}:</span>
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
                  {Object.entries(summary.categoryBreakdown).map(([category, data]) => (
                    <div key={category} className="text-xs">
                      <div className="font-medium">{category}</div>
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
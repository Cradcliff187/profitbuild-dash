import React from 'react';
import { Calendar, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Expense } from '@/types/expense';
import { Estimate } from '@/types/estimate';

interface ExpenseDashboardProps {
  expenses: Expense[];
  estimates: Estimate[];
}

export const ExpenseDashboard: React.FC<ExpenseDashboardProps> = ({ expenses, estimates }) => {
  // Calculate summary statistics
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const plannedExpenses = expenses.filter(e => e.type === 'Planned').reduce((sum, e) => sum + e.amount, 0);
  const unplannedExpenses = expenses.filter(e => e.type === 'Unplanned').reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = expenses.filter(e => {
    const now = new Date();
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + e.amount, 0);

  const totalEstimated = estimates.reduce((sum, estimate) => sum + estimate.total, 0);
  const budgetVariance = totalExpenses - totalEstimated;
  const budgetUtilization = totalEstimated > 0 ? (totalExpenses / totalEstimated) * 100 : 0;

  // Recent expenses (last 5)
  const recentExpenses = expenses
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Category breakdown
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Project breakdown
  const projectTotals = expenses.reduce((acc, expense) => {
    const estimate = estimates.find(e => e.id === expense.projectId);
    const projectName = estimate ? estimate.projectName : 'Unknown Project';
    acc[projectName] = (acc[projectName] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const getProjectName = (projectId: string) => {
    const estimate = estimates.find(e => e.id === projectId);
    return estimate ? estimate.projectName : 'Unknown Project';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} total transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${thisMonthExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Current month expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${budgetVariance > 0 ? 'text-red-600' : budgetVariance < 0 ? 'text-green-600' : ''}`}>
              ${Math.abs(budgetVariance).toFixed(2)} {budgetVariance >= 0 ? 'over' : 'under'}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetUtilization.toFixed(1)}% of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unplanned Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${unplannedExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {unplannedExpenses > 0 ? ((unplannedExpenses / totalExpenses) * 100).toFixed(1) : '0'}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No expenses recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {getProjectName(expense.projectId)} • {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${expense.amount.toFixed(2)}</p>
                      <Badge variant={expense.type === 'Planned' ? 'default' : 'secondary'} className="text-xs">
                        {expense.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(categoryTotals).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No category data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(categoryTotals)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{category}</span>
                          <span>${amount.toFixed(2)} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Project</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(projectTotals).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No project data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(projectTotals)
                .sort(([,a], [,b]) => b - a)
                .map(([projectName, amount]) => {
                  const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                  const estimate = estimates.find(e => e.projectName === projectName);
                  const estimatedAmount = estimate ? estimate.total : 0;
                  const variance = amount - estimatedAmount;
                  
                  return (
                    <Card key={projectName}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">{projectName}</h4>
                          <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}% of total expenses
                          </div>
                          {estimatedAmount > 0 && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">vs estimate: </span>
                              <span className={variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}>
                                {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
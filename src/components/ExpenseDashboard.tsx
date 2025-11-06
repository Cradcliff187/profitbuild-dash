import React from 'react';
import { Calendar, DollarSign, AlertTriangle, FileText, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Expense } from '@/types/expense';
import { Estimate } from '@/types/estimate';
import { formatCurrency, getExpensePayeeLabel } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ExpenseDashboardProps {
  expenses: Expense[];
  estimates: Estimate[];
}

export const ExpenseDashboard: React.FC<ExpenseDashboardProps> = ({ expenses, estimates }) => {
  // Fetch expense correlations to determine allocation status
  const { data: correlations = [] } = useQuery({
    queryKey: ['expense-correlations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_line_item_correlations')
        .select('expense_id');
      if (error) throw error;
      return data || [];
    }
  });

  const allocatedExpenseIds = new Set(correlations.map(c => c.expense_id));
  
  // Fetch expense splits for accurate calculations
  const { data: expenseSplits = [] } = useQuery({
    queryKey: ['expense-splits-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_splits')
        .select('expense_id, split_amount');
      if (error) throw error;
      return data || [];
    }
  });

  // Group splits by expense_id
  const splitsByExpense = expenseSplits.reduce((acc, split) => {
    if (!acc[split.expense_id]) acc[split.expense_id] = [];
    acc[split.expense_id].push(split);
    return acc;
  }, {} as Record<string, typeof expenseSplits>);

  // Helper function to get the actual expense amount (considering splits)
  const getExpenseAmount = (expense: Expense) => {
    if (expense.is_split && expense.id && splitsByExpense[expense.id]) {
      // For split expenses, sum all split amounts
      return splitsByExpense[expense.id].reduce((sum, s) => sum + s.split_amount, 0);
    }
    return expense.amount;
  };
  
  // Calculate summary statistics (using split-aware amounts)
  const totalExpenses = expenses.reduce((sum, expense) => sum + getExpenseAmount(expense), 0);
  const allocatedExpenses = expenses.filter(e => allocatedExpenseIds.has(e.id)).reduce((sum, e) => sum + getExpenseAmount(e), 0);
  const unallocatedExpenses = expenses.filter(e => !allocatedExpenseIds.has(e.id)).reduce((sum, e) => sum + getExpenseAmount(e), 0);
  const thisMonthExpenses = expenses.filter(e => {
    const now = new Date();
    const expenseDate = new Date(e.expense_date);
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + getExpenseAmount(e), 0);

  // Calculate unassigned expenses
  const unassignedExpenses = expenses.filter(e => 
    e.project_id === "000-UNASSIGNED" || e.project_name === "000-UNASSIGNED"
  );
  const unassignedAmount = unassignedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const unassignedCount = unassignedExpenses.length;

  // Count of unallocated expenses
  const unallocatedCount = expenses.filter(e => !allocatedExpenseIds.has(e.id)).length;

  // Calculate split expense metrics (show original amounts before splitting)
  const splitExpenses = expenses.filter(e => e.is_split);
  const splitExpenseAmount = splitExpenses.reduce((sum, e) => sum + e.amount, 0); // Original amount
  const splitExpenseCount = splitExpenses.length;

  // Recent expenses (last 5)
  const recentExpenses = expenses
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Category breakdown (using split-aware amounts)
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + getExpenseAmount(expense);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      {/* Compact Workflow Help */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 border-b pb-2">
        <Info className="h-3 w-3" />
        <span>
          <strong>Workflow:</strong> First assign expenses to projects, then optionally allocate to line items for detailed tracking.
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
              Learn more
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-w-sm text-xs" align="start">
            <div className="space-y-2">
              <div>
                <strong>Step 1: Project Assignment</strong>
                <p className="text-muted-foreground mt-0.5">Assign each expense to a project to affect project budgets.</p>
              </div>
              <div>
                <strong>Step 2: Line Item Allocation</strong>
                <p className="text-muted-foreground mt-0.5">Match to specific line items for variance analysis.</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
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
            <div className="text-2xl font-bold">{formatCurrency(thisMonthExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Current month expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned Expenses</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(unassignedAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {unassignedCount} {unassignedCount === 1 ? 'expense needs' : 'expenses need'} assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unallocated Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(unallocatedExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {unallocatedCount} {unallocatedCount === 1 ? 'expense' : 'expenses'} • {unallocatedExpenses > 0 ? ((unallocatedExpenses / totalExpenses) * 100).toFixed(1) : '0'}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Split Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(splitExpenseAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {splitExpenseCount} {splitExpenseCount === 1 ? 'expense is' : 'expenses are'} split • {totalExpenses > 0 ? ((splitExpenseAmount / totalExpenses) * 100).toFixed(1) : '0'}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{getExpensePayeeLabel(expense)}</p>
                        {expense.is_split && (
                          <Badge variant="secondary" className="text-xs">Split</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {expense.project_name || 'Unknown Project'} • {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(expense.amount)}</p>
                      <div className="flex gap-1 flex-wrap justify-end">
                        <Badge 
                          variant={
                            expense.project_id === "000-UNASSIGNED" || 
                            expense.project_name === "000-UNASSIGNED"
                              ? "secondary"
                              : "default"
                          } 
                          className="text-xs"
                        >
                          {expense.project_id === "000-UNASSIGNED" || 
                           expense.project_name === "000-UNASSIGNED"
                            ? "Needs Assignment"
                            : "Assigned"
                          }
                        </Badge>
                        <Badge variant={allocatedExpenseIds.has(expense.id) ? 'default' : 'secondary'} className="text-xs">
                          {allocatedExpenseIds.has(expense.id) ? 'Allocated' : 'Unallocated'}
                        </Badge>
                      </div>
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
                          <span>{formatCurrency(amount)} ({percentage.toFixed(1)}%)</span>
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
    </div>
  );
};
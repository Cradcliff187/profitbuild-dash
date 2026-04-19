import React from 'react';
import { Calendar, DollarSign, AlertTriangle, FileText, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, getExpensePayeeLabel } from '@/lib/utils';
import { useExpenseDashboardData, type RecentExpenseRow } from '@/hooks/useExpenseDashboardData';
import { isOperationalProject, isOverheadProject, ProjectCategory } from '@/types/project';
import { EXPENSE_CATEGORY_DISPLAY, type ExpenseCategory } from '@/types/expense';

/**
 * Project dashboard summary cards + category breakdown + recent list.
 *
 * Fully server-aggregated (Gotcha #23 + #27): calls two RPCs plus one
 * LIMIT 5 read from `public.expenses_search`. Does not receive raw
 * expense rows as a prop anymore — the eager fetch in Expenses.tsx is
 * gone. See [useExpenseDashboardData](src/hooks/useExpenseDashboardData.ts).
 */
export const ExpenseDashboard: React.FC = () => {
  const { stats, categories, recent, isLoading, error } = useExpenseDashboardData();

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <div className="text-sm text-destructive">
            Failed to load dashboard: {error instanceof Error ? error.message : String(error)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50 animate-pulse" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  const {
    total_amount: totalExpenses,
    total_count: totalCount,
    this_month_amount: thisMonthExpenses,
    unassigned_amount: unassignedAmount,
    unassigned_count: unassignedCount,
    unallocated_amount: unallocatedExpenses,
    unallocated_count: unallocatedCount,
    split_amount: splitExpenseAmount,
    split_count: splitExpenseCount,
  } = stats;

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
              {totalCount} total transactions
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
              {unallocatedCount} {unallocatedCount === 1 ? 'expense' : 'expenses'} • {totalExpenses > 0 ? ((unallocatedExpenses / totalExpenses) * 100).toFixed(1) : '0'}% of total
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
            {recent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No expenses recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((expense) => (
                  <RecentExpenseRow key={expense.id} expense={expense} />
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
            {categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No category data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((row) => {
                  const pct = totalExpenses > 0 ? (row.total_amount / totalExpenses) * 100 : 0;
                  return (
                    <div key={row.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {EXPENSE_CATEGORY_DISPLAY[row.category as ExpenseCategory] ?? row.category}
                        </span>
                        <span>
                          {formatCurrency(row.total_amount)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
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

// --- Recent expense row ---

function RecentExpenseRow({ expense }: { expense: RecentExpenseRow }) {
  const isUnassigned = expense.project_number === '000-UNASSIGNED';
  const isOverhead =
    (expense.project_category && isOverheadProject(expense.project_category as ProjectCategory)) ||
    (!expense.project_category && expense.project_number && isOperationalProject(expense.project_number));

  return (
    <div className="flex items-center justify-between border-b pb-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">
            {getExpensePayeeLabel({
              payee_name: expense.payee_name,
              payee_type: expense.payee_type,
              payee_full_name: expense.payee_full_name,
            } as Parameters<typeof getExpensePayeeLabel>[0])}
          </p>
          {expense.is_split && <Badge variant="secondary" className="text-xs">Split</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {expense.project_name || 'Unknown Project'} • {new Date(expense.expense_date).toLocaleDateString()}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium">{formatCurrency(expense.amount)}</p>
        <div className="flex gap-1 flex-wrap justify-end">
          <Badge variant={isUnassigned ? 'secondary' : 'default'} className="text-xs">
            {isUnassigned ? 'Needs Assignment' : 'Assigned'}
          </Badge>
          {isOverhead && (
            <Badge variant="secondary" className="text-xs">-</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

import type { QueryClient } from "@tanstack/react-query";

/**
 * Single source of truth for every TanStack Query cache that derives from the
 * expenses surface. Whenever an expense (or its allocation/correlation) is
 * written, ALL of these can show stale data — see CLAUDE.md Gotcha #27, where
 * forgetting one key produced "the badge/column didn't update until F5".
 *
 * Register any new expense-derived query key here so a single `invalidateExpenseCaches`
 * call keeps every surface honest — instead of copying the fanout into each
 * mutation site (which is exactly how it drifted before).
 */
export const EXPENSE_CACHE_KEYS: readonly (readonly string[])[] = [
  ["expenses-search"], // useExpensesQuery — global All Expenses table
  ["expenses-unapproved-count"], // All Expenses tab badge + sidebar count
  ["expense-dashboard-stats"], // ExpenseDashboard server-aggregated totals
  ["expense-category-rollup"], // ExpenseDashboard category rollup
  ["expense-dashboard-recent"], // ExpenseDashboard recent list
  ["expense-allocation-status"], // useExpenseAllocationStatus — the Allocated column
];

/**
 * Invalidate every expenses-derived cache. Call after any expense mutation
 * (create/edit/delete/approve/allocate/split/reassign) so all dependent
 * surfaces refetch without a manual reload.
 */
export function invalidateExpenseCaches(queryClient: QueryClient): void {
  for (const queryKey of EXPENSE_CACHE_KEYS) {
    queryClient.invalidateQueries({ queryKey });
  }
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExpenseCategory } from "@/types/expense";
import { ProjectCategory } from "@/types/project";

export interface DashboardStats {
  total_amount: number;
  total_count: number;
  this_month_amount: number;
  unassigned_amount: number;
  unassigned_count: number;
  unallocated_amount: number;
  unallocated_count: number;
  split_amount: number;
  split_count: number;
}

export interface CategoryRollupRow {
  category: ExpenseCategory;
  total_amount: number;
  row_count: number;
  project_count: number;
  allocated_count: number;
}

export interface RecentExpenseRow {
  id: string;
  expense_date: string;
  created_at: string;
  amount: number;
  category: ExpenseCategory;
  is_split: boolean;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  project_category: ProjectCategory | null;
  payee_id: string | null;
  payee_name: string | null;
  payee_type: string | null;
  payee_full_name: string | null;
}

const STALE_TIME = 30 * 1000;

/**
 * Server-aggregated dashboard data for ExpenseDashboard. Replaces the
 * previous eager `.range(0, 9999)` fetch of raw expense rows.
 *
 * Three parallel queries, each independently cacheable:
 *  - `['expense-dashboard-stats', projectCategory]`   — summary card totals
 *  - `['expense-category-rollup', projectCategory]`   — category bar chart
 *  - `['expense-dashboard-recent', projectCategory]`  — last 5 expenses
 *
 * Invalidation pattern (Gotcha #27): ExpensesList.refreshAll extends the
 * invalidation fan-out to include `['expense-dashboard-stats']`,
 * `['expense-category-rollup']`, and `['expense-dashboard-recent']`.
 */
export function useExpenseDashboardData(projectCategory?: ProjectCategory) {
  const statsQuery = useQuery({
    queryKey: ["expense-dashboard-stats", projectCategory ?? null],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc("get_expense_dashboard_stats", {
        p_project_category: projectCategory ?? null,
      });
      if (error) throw error;
      const row = (data as DashboardStats[] | null)?.[0];
      if (!row) {
        return {
          total_amount: 0,
          total_count: 0,
          this_month_amount: 0,
          unassigned_amount: 0,
          unassigned_count: 0,
          unallocated_amount: 0,
          unallocated_count: 0,
          split_amount: 0,
          split_count: 0,
        };
      }
      return {
        ...row,
        total_amount: Number(row.total_amount),
        this_month_amount: Number(row.this_month_amount),
        unassigned_amount: Number(row.unassigned_amount),
        unallocated_amount: Number(row.unallocated_amount),
        split_amount: Number(row.split_amount),
      };
    },
    staleTime: STALE_TIME,
  });

  const categoriesQuery = useQuery({
    queryKey: ["expense-category-rollup", projectCategory ?? null],
    queryFn: async (): Promise<CategoryRollupRow[]> => {
      const { data, error } = await supabase.rpc("get_expense_category_rollup", {
        p_date_from: null,
        p_date_to: null,
        p_project_category: projectCategory ?? null,
      });
      if (error) throw error;
      return (data ?? []).map((row: CategoryRollupRow) => ({
        ...row,
        total_amount: Number(row.total_amount),
      }));
    },
    staleTime: STALE_TIME,
  });

  const recentQuery = useQuery({
    queryKey: ["expense-dashboard-recent", projectCategory ?? null],
    queryFn: async (): Promise<RecentExpenseRow[]> => {
      let q = supabase
        .from("expenses_search")
        .select(
          "id, expense_date, created_at, amount, category, is_split, project_id, project_name, project_number, project_category, payee_id, payee_name, payee_type, payee_full_name"
        )
        .order("created_at", { ascending: false })
        .limit(5);
      if (projectCategory) q = q.eq("project_category", projectCategory);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RecentExpenseRow[];
    },
    staleTime: STALE_TIME,
  });

  return {
    stats: statsQuery.data,
    categories: categoriesQuery.data ?? [],
    recent: recentQuery.data ?? [],
    isLoading: statsQuery.isLoading || categoriesQuery.isLoading || recentQuery.isLoading,
    error: statsQuery.error ?? categoriesQuery.error ?? recentQuery.error,
  };
}

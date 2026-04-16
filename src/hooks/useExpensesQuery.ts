/**
 * useExpensesQuery — server-side filtered + paginated expenses fetch.
 *
 * Replaces the `supabase.from('expenses').select(...)` pattern that silently
 * dropped rows above the PostgREST default 1,000-row cap. Reads from the
 * `public.expenses_search` view, which denormalizes payees + projects into
 * a single row per non-split expense and exposes a `search_text` column
 * suitable for ILIKE searches.
 *
 * Used by ExpensesList when it renders in "global" mode (no `expenses` prop).
 * Project-scoped callers continue to pass in pre-filtered expense arrays and
 * do not invoke this hook.
 *
 * RLS: the view uses `security_invoker=on`, so the caller's RLS on expenses
 * / projects / payees still applies — admins see everything, field workers
 * see only their authorized rows.
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Expense, ExpenseCategory } from "@/types/expense";
import { parseDateOnly } from "@/utils/dateUtils";

export interface ExpensesQueryFilters {
  searchTerm?: string;
  categories?: string[];
  transactionTypes?: string[];
  projectIds?: string[];
  approvalStatuses?: string[];
  payeeIds?: string[];
  payeeTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
}

const PAGE_SIZE = 100;

interface ExpensesPage {
  data: Expense[];
  count: number;
  nextPage: number;
}

export function useExpensesQuery(
  filters: ExpensesQueryFilters = {},
  options: { enabled?: boolean } = {}
) {
  const query = useInfiniteQuery<ExpensesPage>({
    queryKey: ["expenses-search", filters],
    enabled: options.enabled ?? true,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = (pageParam as number) ?? 0;
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Cast to any: the generated Supabase types don't include this view yet.
      // Schema is pg-proven via migration 20260416034048_create_expenses_search_view.
      let q = (supabase as any)
        .from("expenses_search")
        .select("*", { count: "exact" })
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filters.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.trim().toLowerCase();
        q = q.ilike("search_text", `%${term}%`);
      }
      if (filters.categories?.length) {
        q = q.in("category", filters.categories);
      }
      if (filters.transactionTypes?.length) {
        q = q.in("transaction_type", filters.transactionTypes);
      }
      if (filters.projectIds?.length) {
        q = q.in("project_id", filters.projectIds);
      }
      if (filters.approvalStatuses?.length) {
        // Treat 'pending' as also matching NULL — the legacy client-side filter coerced null → 'pending'.
        if (filters.approvalStatuses.includes("pending")) {
          const nonNullStatuses = filters.approvalStatuses.filter((s) => s !== "pending");
          if (nonNullStatuses.length > 0) {
            q = q.or(
              `approval_status.is.null,approval_status.eq.pending,${nonNullStatuses
                .map((s) => `approval_status.eq.${s}`)
                .join(",")}`
            );
          } else {
            q = q.or("approval_status.is.null,approval_status.eq.pending");
          }
        } else {
          q = q.in("approval_status", filters.approvalStatuses);
        }
      }
      if (filters.payeeIds?.length) {
        q = q.in("payee_id", filters.payeeIds);
      }
      if (filters.payeeTypes?.length) {
        q = q.in("payee_type", filters.payeeTypes);
      }
      if (filters.dateFrom) {
        q = q.gte("expense_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        q = q.lte("expense_date", filters.dateTo);
      }

      const { data, error, count } = await q;

      if (error) {
        console.error("useExpensesQuery error:", error);
        throw error;
      }

      const transformed: Expense[] = (data ?? []).map((row: any) => ({
        ...row,
        category: row.category as ExpenseCategory,
        expense_date: parseDateOnly(row.expense_date),
        created_at: row.created_at ? new Date(row.created_at) : new Date(),
        updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
      }));

      return { data: transformed, count: count ?? 0, nextPage: page + 1 };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return loaded < lastPage.count ? lastPage.nextPage : undefined;
    },
    staleTime: 30 * 1000,
  });

  const allData: Expense[] = query.data?.pages.flatMap((p) => p.data) ?? [];
  const totalCount = query.data?.pages[0]?.count ?? 0;

  return {
    data: allData,
    totalCount,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  };
}

/**
 * useUnapprovedExpensesCount — count of expenses that still need approval.
 *
 * "Unapproved" mirrors the legacy client-side filter logic in ExpensesList:
 *   approval_status IS NULL OR approval_status = 'pending'
 * (rejected expenses are a separate concern and not counted here.)
 *
 * Uses the PostgREST `count: 'exact', head: true` pattern so no row data is
 * transferred — cheap enough to poll on every load. Realtime updates rely on
 * TanStack Query staleTime; mutations elsewhere in the app can invalidate the
 * ['expenses-unapproved-count'] key to refresh immediately.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUnapprovedExpensesCount() {
  return useQuery({
    queryKey: ["expenses-unapproved-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("is_split", false)
        .or("approval_status.is.null,approval_status.eq.pending");

      if (error) {
        console.error("useUnapprovedExpensesCount error:", error);
        throw error;
      }
      return count ?? 0;
    },
    // 30s staleness is aligned with useExpensesQuery — the two surfaces update together.
    staleTime: 30 * 1000,
  });
}

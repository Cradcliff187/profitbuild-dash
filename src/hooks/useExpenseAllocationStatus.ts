import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AllocationType = "estimate" | "quote" | "change_order";
export interface AllocationMatch {
  matched: boolean;
  type?: AllocationType;
}
export type AllocationStatusMap = Record<string, AllocationMatch>;

const BATCH_SIZE = 100;
const EMPTY: AllocationStatusMap = {};

/**
 * Resolve which estimate/quote/CO line a correlation points at. The DB row can
 * carry any one of the three FK columns; precedence matches the cost-tracking
 * read side (quote correlations resolve to their line — CLAUDE.md Rule 28).
 */
function correlationType(c: {
  quote_id: string | null;
  change_order_line_item_id: string | null;
}): AllocationType {
  if (c.quote_id) return "quote";
  if (c.change_order_line_item_id) return "change_order";
  return "estimate";
}

async function fetchAllocationStatus(expenseIds: string[]): Promise<AllocationStatusMap> {
  const map: AllocationStatusMap = {};
  // Default every requested expense to unmatched so the UI is deterministic
  // even for ids that have no correlation row.
  for (const id of expenseIds) map[id] = { matched: false };
  if (expenseIds.length === 0) return map;

  // Batch the .in() filter to stay under PostgREST URL limits on large pages.
  for (let i = 0; i < expenseIds.length; i += BATCH_SIZE) {
    const batch = expenseIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("expense_line_item_correlations")
      .select("expense_id, estimate_line_item_id, quote_id, change_order_line_item_id")
      .in("expense_id", batch);
    if (error) throw error;
    for (const c of data ?? []) {
      if (!c.expense_id) continue;
      map[c.expense_id] = { matched: true, type: correlationType(c) };
    }
  }
  return map;
}

/**
 * Allocation (line-item correlation) status for a set of expenses, as a map
 * keyed by expense id. Backed by TanStack Query so it invalidates cleanly via
 * `invalidateExpenseCaches` (key: `expense-allocation-status`) after any
 * allocation — Cost Analysis, the bulk sheet, or a single match — instead of
 * the manual useEffect+setState it replaced, which silently read the wrong
 * array in the global All Expenses view.
 *
 * Works identically for project-scoped and global-mode callers: it keys off the
 * ids actually being displayed, not whichever prop happened to be populated.
 */
export function useExpenseAllocationStatus(expenseIds: string[]): AllocationStatusMap {
  // Order-independent, de-duplicated key so pagination/sort churn doesn't refetch.
  const ids = useMemo(
    () => Array.from(new Set(expenseIds.filter(Boolean))).sort(),
    [expenseIds],
  );

  const { data } = useQuery({
    queryKey: ["expense-allocation-status", ids],
    queryFn: () => fetchAllocationStatus(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  return data ?? EMPTY;
}

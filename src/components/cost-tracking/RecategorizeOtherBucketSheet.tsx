import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
import { parseDateOnly } from "@/utils/dateUtils";

export interface RecategorizeOtherBucketSheetProps {
  projectId: string;
  /** Source bucket (category being recategorized OUT of). Default `other`. */
  sourceCategory?: ExpenseCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful bulk update — parent invalidates related caches. */
  onRecategorized?: () => void;
}

interface BucketExpenseRow {
  id: string;
  expense_date: string;
  amount: number;
  description: string | null;
  payee_name: string | null;
  category: ExpenseCategory;
}

/**
 * Bulk-recategorize the expenses sitting inside a bucket on the Cost Tracking
 * page (typically the "Other" bucket). Admin picks a target category from the
 * dropdown, deselects any rows that shouldn't move, and confirms. The update
 * is a single `.update().in('id', ids)` — the DB's
 * enforce_project_default_expense_category trigger (Rule 6a) is a no-op here
 * because this sheet is only opened for construction projects whose
 * default_expense_category is NULL.
 *
 * On success: invalidates dashboard + cost-bucket + expenses-search caches
 * via the parent's onRecategorized callback (Gotcha #27 invalidation fanout).
 */
export function RecategorizeOtherBucketSheet({
  projectId,
  sourceCategory = ExpenseCategory.OTHER,
  open,
  onOpenChange,
  onRecategorized,
}: RecategorizeOtherBucketSheetProps) {
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState<ExpenseCategory | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ["other-bucket-expenses", projectId, sourceCategory],
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<BucketExpenseRow[]> => {
      const { data, error } = await supabase
        .from("expenses_search")
        .select("id, expense_date, amount, description, payee_name, category")
        .eq("project_id", projectId)
        .eq("category", sourceCategory)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BucketExpenseRow[];
    },
  });

  // Default-select every row whenever a fresh list arrives.
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
      setTargetCategory("");
    }
  }, [open, expenses]);

  const totalSelected = useMemo(
    () => expenses.filter((e) => selectedIds.has(e.id)).reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses, selectedIds],
  );

  const targetOptions = useMemo(
    () =>
      (Object.keys(EXPENSE_CATEGORY_DISPLAY) as ExpenseCategory[])
        .filter((c) => c !== sourceCategory)
        .map((c) => ({ value: c, label: EXPENSE_CATEGORY_DISPLAY[c] })),
    [sourceCategory],
  );

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  };

  const canSubmit = selectedIds.size > 0 && !!targetCategory && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !targetCategory) return;
    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("expenses")
        .update({ category: targetCategory })
        .in("id", ids);
      if (error) throw error;

      // Invalidate the local list + dashboard + cost bucket caches. Parent's
      // onRecategorized also invalidates its own cost-tracking cache.
      queryClient.invalidateQueries({ queryKey: ["other-bucket-expenses", projectId, sourceCategory] });
      queryClient.invalidateQueries({ queryKey: ["expense-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["expense-category-rollup"] });
      queryClient.invalidateQueries({ queryKey: ["expense-dashboard-recent"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-search"] });
      onRecategorized?.();

      toast.success(
        `Moved ${ids.length} ${ids.length === 1 ? "expense" : "expenses"} to ${EXPENSE_CATEGORY_DISPLAY[targetCategory]}`,
      );
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to recategorize expenses:", err);
      toast.error("Failed to recategorize", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceLabel = EXPENSE_CATEGORY_DISPLAY[sourceCategory] ?? sourceCategory;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Recategorize {sourceLabel} expenses</SheetTitle>
          <SheetDescription>
            Move the selected expenses from the {sourceLabel} bucket to a target category so they
            track against an estimate line. Selection defaults to all rows.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading expenses…
            </div>
          )}

          {error && (
            <div className="flex gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Failed to load: {error instanceof Error ? error.message : String(error)}
              </span>
            </div>
          )}

          {!isLoading && !error && expenses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No {sourceLabel} expenses on this project.
            </p>
          )}

          {!isLoading && expenses.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Checkbox
                  checked={selectedIds.size === expenses.length}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
                <span>
                  {selectedIds.size} of {expenses.length} selected · {formatCurrency(totalSelected)}
                </span>
              </div>

              <div className="border rounded-md divide-y">
                {expenses.map((e) => (
                  <label
                    key={e.id}
                    htmlFor={`rebucket-${e.id}`}
                    className="flex items-start gap-2 p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      id={`rebucket-${e.id}`}
                      checked={selectedIds.has(e.id)}
                      onCheckedChange={() => toggleRow(e.id)}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium truncate">{e.payee_name ?? "(no payee)"}</p>
                        <p className="text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(Number(e.amount))}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {parseDateOnly(e.expense_date).toLocaleDateString()}
                        {e.description ? ` · ${e.description}` : ""}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {!isLoading && expenses.length > 0 && (
          <div className="border-t pt-3 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Move to category</label>
              <Select
                value={targetCategory}
                onValueChange={(v) => setTargetCategory(v as ExpenseCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a target category…" />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Moving…
                  </>
                ) : (
                  <>Move {selectedIds.size}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatCurrency } from "@/lib/utils";
import { CATEGORY_DISPLAY_MAP, LineItemCategory } from "@/types/estimate";
import type { LineItemConnections } from "@/utils/estimateConnections";

export interface DroppedLineReview {
  lineItemId: string;
  description: string;
  category: string;
  /**
   * Line belongs to the estimate this save versions from — restoring it lets
   * the create_estimate_version RPC re-point its quotes/allocations/dispatch
   * links automatically (Rule 27). Lines from a different estimate render
   * informational-only: the RPC's ownership guard would skip them.
   */
  restorable: boolean;
  /** Estimate number the line lives on (shown when not restorable). */
  sourceLabel?: string;
  connections: LineItemConnections;
}

export type CarryForwardDecision =
  | { action: "cancel" }
  | { action: "save" }
  | { action: "restore"; lineItemIds: string[] };

const plural = (n: number, singular: string) => `${n} ${singular}${n === 1 ? "" : "s"}`;

/**
 * Promise-returning review dialog (useConfirmDialog pattern, Gotcha #73) for
 * estimate saves that would leave quotes / expense allocations / dispatch
 * links behind on removed line items. Call `review(lines)` from the save
 * handler and render `dialog` once; the promise resolves with the user's
 * decision — cancel (or any dismissal), save anyway, or restore selected
 * lines back into the form.
 */
export function useCarryForwardReview() {
  const [lines, setLines] = useState<DroppedLineReview[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const resolveRef = useRef<((decision: CarryForwardDecision) => void) | null>(null);

  const review = useCallback((dropped: DroppedLineReview[]): Promise<CarryForwardDecision> => {
    return new Promise<CarryForwardDecision>((resolve) => {
      // A second review while one is pending settles the first as cancelled.
      resolveRef.current?.({ action: "cancel" });
      resolveRef.current = resolve;
      setSelected(new Set());
      setLines(dropped);
    });
  }, []);

  const settle = (decision: CarryForwardDecision) => {
    resolveRef.current?.(decision);
    resolveRef.current = null;
    setLines(null);
  };

  const toggle = (lineItemId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(lineItemId);
      else next.delete(lineItemId);
      return next;
    });
  };

  const restorableCount = lines?.filter((l) => l.restorable).length ?? 0;

  const dialog = (
    <AlertDialog
      open={lines !== null}
      onOpenChange={(open) => {
        if (!open) settle({ action: "cancel" });
      }}
    >
      {/* z-[75] above SheetContent's z-[60] — same rationale as confirm-dialog.tsx. */}
      <AlertDialogContent className="z-[75] max-w-lg max-h-[85vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Removed lines still have records attached
          </AlertDialogTitle>
          <AlertDialogDescription>
            {plural(lines?.length ?? 0, "line item")} not carried onto this estimate{" "}
            {lines?.length === 1 ? "has" : "have"} quotes, expense allocations, or dispatch
            links attached. Anything left behind stays on the old line and drops out of cost
            tracking.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Single scroll zone inside the dialog (Gotcha #40). */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {lines?.map((line) => {
            const checkboxId = `carry-forward-${line.lineItemId}`;
            return (
              <div key={line.lineItemId} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {line.restorable && (
                    <Checkbox
                      id={checkboxId}
                      checked={selected.has(line.lineItemId)}
                      onCheckedChange={(checked) => toggle(line.lineItemId, checked === true)}
                      className="mt-0.5"
                    />
                  )}
                  <label
                    htmlFor={line.restorable ? checkboxId : undefined}
                    className={cn("flex-1 min-w-0", line.restorable && "cursor-pointer")}
                  >
                    <span className="block text-sm font-medium leading-tight">
                      {line.description}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        {CATEGORY_DISPLAY_MAP[line.category as LineItemCategory] ?? line.category}
                      </Badge>
                      {line.restorable ? (
                        <span className="text-[11px] text-muted-foreground">
                          Check to restore — attachments follow automatically
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          On {line.sourceLabel ?? "another estimate"} — switch &ldquo;Copy
                          from&rdquo; to that estimate to carry it
                        </span>
                      )}
                    </span>
                  </label>
                </div>

                <div
                  className={cn(
                    "space-y-1 text-xs text-muted-foreground",
                    line.restorable && "pl-6"
                  )}
                >
                  {line.connections.acceptedQuotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">Accepted quote — {quote.payeeName}</span>
                      <span className="shrink-0 font-medium tabular-nums text-foreground">
                        {formatCurrency(quote.totalAmount)}
                      </span>
                    </div>
                  ))}
                  {line.connections.otherQuoteCount > 0 && (
                    <div>{plural(line.connections.otherQuoteCount, "other quote")} attached</div>
                  )}
                  {line.connections.allocationCount > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span>{plural(line.connections.allocationCount, "expense allocation")}</span>
                      <span className="shrink-0 font-medium tabular-nums text-foreground">
                        {formatCurrency(line.connections.allocationTotal)}
                      </span>
                    </div>
                  )}
                  {line.connections.assignmentCount > 0 && (
                    <div>{plural(line.connections.assignmentCount, "dispatch link")}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => settle({ action: "cancel" })}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => settle({ action: "save" })}
          >
            Save without them
          </Button>
          {restorableCount > 0 && (
            <Button
              className="w-full sm:w-auto"
              disabled={selected.size === 0}
              onClick={() => settle({ action: "restore", lineItemIds: [...selected] })}
            >
              Restore {selected.size > 0 ? `${selected.size} ` : ""}&amp; review
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { review, dialog };
}

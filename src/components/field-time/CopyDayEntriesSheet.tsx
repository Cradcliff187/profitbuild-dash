/**
 * Review sheet for "Copy yesterday" / "Copy last Friday" on the field-worker
 * time landing.
 *
 * Lists the would-be copies (project, start–end, lunch, Paid Hours) each with
 * an include checkbox (all checked by default) plus a target-date field
 * (defaults today). Save inserts the checked rows by REPLICATING the exact
 * insert contract of the existing field create path
 * (`CreateTimeEntryDialog.handleSave` → `supabase.from('expenses').insert`),
 * field-for-field:
 *
 *   payee_id, project_id, expense_date (target date), amount
 *   (payees.hourly_rate || 75 × Paid Hours via calculateTimeEntryAmount),
 *   description, category 'labor_internal' (the DB trigger may rewrite per
 *   payee — fine), transaction_type 'expense', user_id, updated_by,
 *   start_time/end_time (source wall-clock HH:mm rebuilt onto the target date
 *   via buildTimeEntryDateTimes, overnight-adjusted), hours AND gross_hours
 *   (Gotcha #17 — both always sent; the calculate_gross_hours DB trigger
 *   overrides from start/end when both are set and preserves what we send for
 *   PTO rows), lunch_taken, lunch_duration_minutes (null when lunch not
 *   taken). approval_status is intentionally OMITTED — the DB default
 *   ('pending') applies, exactly like CreateTimeEntryDialog.
 *
 * House rules: user id comes in via props from the page's `useAuth()` — no
 * `supabase.auth.getUser()` (Gotcha #63). Errors destructured (Gotcha #16).
 * Inserts run sequentially so each `checkTimeOverlap` sees prior inserts;
 * unique-index collisions (23505 — the time-entry dedup backstop) are
 * skipped, not fatal.
 *
 * Sizing: a centered bottom sheet at every width — full-width on a 390px
 * phone, capped at 42rem on iPad/desktop so it reads as a comfortable panel
 * rather than a stretched phone strip (no `useIsMobile()` layout branch).
 */

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { checkTimeOverlap } from "@/utils/timeEntryValidation";
import {
  buildTimeEntryDateTimes,
  calculateTimeEntryAmount,
  calculateTimeEntryHours,
  formatHoursDisplay,
  DEFAULT_LUNCH_DURATION,
} from "@/utils/timeEntryCalculations";
import { parseDateOnly } from "@/utils/dateUtils";
import {
  FieldTimeEntry,
  formatEntryTimeRange,
  invalidateFieldTimeQueries,
} from "./fieldTimeData";

/**
 * Auto-generated time-range descriptions from old entries are stripped so we
 * don't copy a stale "8:00 AM - 4:30 PM" note onto a new day. Same pattern
 * `EditTimeEntryDialog` applies when loading an entry for edit.
 */
const TIME_RANGE_PATTERN =
  /^\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M$/i;

function cleanDescription(description: string | null): string {
  const raw = (description ?? "").trim();
  return TIME_RANGE_PATTERN.test(raw) ? "" : raw;
}

interface CopyDayEntriesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "yesterday" or "last Friday" — used in the title + toasts. */
  sourceLabel: string;
  /** YYYY-MM-DD of the source day (display only; entries are pre-fetched). */
  sourceDateISO: string;
  /** The source day's own entries (from useMyDayTimeEntries). */
  entries: FieldTimeEntry[];
  /** Signed-in user's id from the page's useAuth() — never getUser(). */
  currentUserId: string;
  /** Default target date (today, YYYY-MM-DD). */
  todayISO: string;
  /** Fired after a successful copy (parent side effects; cache is handled here). */
  onCopied?: () => void;
}

export function CopyDayEntriesSheet({
  open,
  onOpenChange,
  sourceLabel,
  sourceDateISO,
  entries,
  currentUserId,
  todayISO,
  onCopied,
}: CopyDayEntriesSheetProps) {
  const queryClient = useQueryClient();
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [targetDate, setTargetDate] = useState(todayISO);
  const [saving, setSaving] = useState(false);

  // Re-arm the sheet each time it opens: all rows checked, target = today.
  useEffect(() => {
    if (open) {
      const all: Record<string, boolean> = {};
      for (const e of entries) all[e.id] = true;
      setIncluded(all);
      setTargetDate(todayISO);
    }
  }, [open, entries, todayISO]);

  const selectedCount = useMemo(
    () => entries.filter((e) => included[e.id]).length,
    [entries, included]
  );

  const handleSave = async () => {
    const selected = entries.filter((e) => included[e.id]);
    if (selected.length === 0 || !targetDate || !currentUserId) return;

    setSaving(true);
    try {
      // Rate lookup mirrors CreateTimeEntryDialog (payees.hourly_rate || 75),
      // batched across the distinct payees in the selection.
      const payeeIds = Array.from(new Set(selected.map((e) => e.payee_id)));
      const { data: payeeRows, error: payeeError } = await supabase
        .from("payees")
        .select("id, hourly_rate")
        .in("id", payeeIds);
      if (payeeError) throw payeeError;
      const rateByPayee = new Map<string, number>(
        (payeeRows ?? []).map((p) => [p.id, p.hourly_rate || 75])
      );

      let copied = 0;
      let skipped = 0;

      // Sequential on purpose: each overlap check must see rows inserted
      // earlier in this same batch.
      for (const src of selected) {
        let start: Date | null = null;
        let end: Date | null = null;
        const lunchTaken = src.lunch_taken ?? false;
        const lunchMinutes =
          src.lunch_duration_minutes ?? DEFAULT_LUNCH_DURATION;
        let hours: number;
        let grossHours: number;

        if (src.start_time && src.end_time) {
          // Rebuild the source wall-clock times onto the target date
          // (overnight-adjusted), then recompute hours the same way the
          // create form does (Paid = gross − lunch).
          const startHHmm = format(new Date(src.start_time), "HH:mm");
          const endHHmm = format(new Date(src.end_time), "HH:mm");
          const built = buildTimeEntryDateTimes(targetDate, startHHmm, endHHmm);
          start = built.startDateTime;
          end = built.endDateTime;
          const calc = calculateTimeEntryHours(
            start,
            end,
            lunchTaken,
            lunchMinutes
          );
          hours = calc.netHours;
          grossHours = calc.grossHours;

          const overlap = await checkTimeOverlap(
            src.payee_id,
            targetDate,
            start,
            end
          );
          if (overlap.hasOverlap) {
            skipped++;
            continue;
          }
        } else {
          // PTO / manual-hours entry: no clock times; carry the DB values.
          hours = src.hours ?? 0;
          grossHours = src.gross_hours ?? src.hours ?? 0;
        }

        if (hours <= 0) {
          skipped++;
          continue;
        }

        const rate = rateByPayee.get(src.payee_id) || 75;
        const amount = calculateTimeEntryAmount(hours, rate);

        // === The replicated CreateTimeEntryDialog insert contract ===
        const { error } = await supabase.from("expenses").insert({
          payee_id: src.payee_id,
          project_id: src.project_id,
          expense_date: targetDate,
          amount,
          description: cleanDescription(src.description),
          category: "labor_internal",
          transaction_type: "expense",
          user_id: currentUserId,
          updated_by: currentUserId,
          start_time: start ? start.toISOString() : null,
          end_time: end ? end.toISOString() : null,
          hours,
          gross_hours: grossHours,
          lunch_taken: lunchTaken,
          lunch_duration_minutes: lunchTaken ? lunchMinutes : null,
          // approval_status intentionally omitted → DB default 'pending',
          // exactly like CreateTimeEntryDialog.
        });

        if (error) {
          // 23505 = the time-entry unique-index dedup backstop — the same
          // entry already exists on the target day. Skip, don't abort.
          if (error.code === "23505") {
            skipped++;
            continue;
          }
          throw error;
        }
        copied++;
      }

      const dateLabel = format(parseDateOnly(targetDate), "EEE, MMM d");
      if (copied > 0) {
        toast.success(
          `Copied ${copied} ${copied === 1 ? "entry" : "entries"} to ${dateLabel}` +
            (skipped > 0
              ? ` · ${skipped} skipped (overlap or duplicate)`
              : "")
        );
      } else {
        toast.warning(
          `Nothing copied — ${skipped} ${
            skipped === 1 ? "entry" : "entries"
          } skipped (overlap or duplicate)`
        );
      }

      invalidateFieldTimeQueries(queryClient);
      onCopied?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error copying time entries:", error);
      toast.error("Failed to copy time entries");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="left-1/2 right-auto flex max-h-[90vh] w-[94%] -translate-x-1/2 flex-col rounded-t-2xl p-0 sm:max-w-2xl"
      >
        <SheetHeader className="space-y-1 border-b px-5 pb-4 pt-5 sm:px-6">
          <SheetTitle>
            Copy {sourceLabel}'s entries
          </SheetTitle>
          <SheetDescription>
            From {format(parseDateOnly(sourceDateISO), "EEEE, MMM d")} — uncheck
            anything you don't want copied.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <div className="space-y-2">
            {entries.map((entry) => {
              const timeRange = formatEntryTimeRange(entry);
              return (
                <label
                  key={entry.id}
                  className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                >
                  <Checkbox
                    checked={!!included[entry.id]}
                    onCheckedChange={(checked) =>
                      setIncluded((prev) => ({
                        ...prev,
                        [entry.id]: checked === true,
                      }))
                    }
                    aria-label={`Include ${
                      entry.project?.project_number ?? "entry"
                    }`}
                  />
                  {/* Phone: two-line stack. sm+ (iPad): single row with
                      columns so the width is actually used. */}
                  <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {entry.project?.project_number ?? "—"}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {entry.project?.project_name ?? ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeRange ?? "No clock times"}
                        {entry.lunch_taken
                          ? ` · ${
                              entry.lunch_duration_minutes ??
                              DEFAULT_LUNCH_DURATION
                            } min lunch`
                          : ""}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-semibold tabular-nums sm:mt-0 sm:text-right">
                      {formatHoursDisplay(
                        entry.hours ?? 0,
                        entry.lunch_taken ?? false
                      )}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        paid hrs
                      </span>
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="copy-target-date">Copy to</Label>
            <Input
              id="copy-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-11 text-base sm:max-w-[240px] md:text-sm"
            />
          </div>
        </div>

        <footer className="flex shrink-0 gap-3 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="min-h-[48px] flex-1 sm:flex-none sm:min-w-[120px]"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-[48px] flex-1"
            onClick={handleSave}
            disabled={saving || selectedCount === 0 || !targetDate}
          >
            {saving
              ? "Copying..."
              : `Copy ${selectedCount} ${
                  selectedCount === 1 ? "entry" : "entries"
                }`}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

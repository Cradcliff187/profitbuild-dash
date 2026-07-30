/**
 * Day drill-in sheet for the field-worker time landing (Rule 35 surface).
 *
 * Opens when a day dot on the WeeklySummary strip is tapped and lists every
 * own time entry for that date. Tapping an entry closes this sheet and hands
 * the entry to the parent (which opens the shared EditTimeEntryDialog) —
 * two stacked bottom sheets fight over focus and body scroll-lock, so the
 * editor is never opened on top of this sheet.
 *
 * House rules: presentational only — data arrives via props from the
 * page-level `useMyDayTimeEntries` query (no realtime, no getUser).
 * Centering uses `inset-x-0 mx-auto` (Gotcha #72 — never transform-center a
 * bottom sheet).
 */

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { parseDateOnly } from "@/utils/dateUtils";
import { RecentEntriesList } from "./RecentEntriesList";
import { FieldTimeEntry, sumPaidHours } from "./fieldTimeData";

interface DayEntriesSheetProps {
  dateISO: string;
  entries: FieldTimeEntry[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: FieldTimeEntry) => void;
}

export function DayEntriesSheet({
  dateISO,
  entries,
  loading,
  open,
  onOpenChange,
  onSelect,
}: DayEntriesSheetProps) {
  const day = parseDateOnly(dateISO);
  const totalPaid = sumPaidHours(entries);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-0 mx-auto flex max-h-[85vh] w-[94%] flex-col rounded-t-2xl p-0 sm:max-w-2xl"
      >
        <SheetHeader className="space-y-1 border-b px-5 pb-4 pt-5 text-left sm:px-6">
          <SheetTitle>{format(day, "EEEE, MMM d")}</SheetTitle>
          <SheetDescription>
            {loading
              ? "Loading entries…"
              : entries.length === 0
                ? "No time logged on this day"
                : `${entries.length} ${
                    entries.length === 1 ? "entry" : "entries"
                  } · ${totalPaid.toFixed(1)} paid hrs`}
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          {!loading && entries.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nothing was logged on {format(day, "MMM d")}.
              </p>
            </div>
          ) : (
            <RecentEntriesList
              entries={entries}
              loading={loading}
              onSelect={onSelect}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

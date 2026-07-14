/**
 * Recent own time entries for the field-worker time landing.
 *
 * Each row is a ≥44px tap target that opens the shared `EditTimeEntryDialog`
 * (via the parent's `onSelect`). Layout is responsive-Tailwind: single column
 * at phone widths, two columns at md (768px, iPad portrait) and up — no
 * `useIsMobile()` layout branches.
 */

import { format } from "date-fns";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parseDateOnly } from "@/utils/dateUtils";
import { formatHoursDisplay } from "@/utils/timeEntryCalculations";
import {
  FieldTimeEntry,
  formatEntryTimeRange,
  getApprovalBadgeClass,
} from "./fieldTimeData";

interface RecentEntriesListProps {
  entries: FieldTimeEntry[];
  loading: boolean;
  onSelect: (entry: FieldTimeEntry) => void;
}

export function RecentEntriesList({
  entries,
  loading,
  onSelect,
}: RecentEntriesListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed">
        <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No time entries yet</p>
        <p className="text-xs text-muted-foreground">
          Add your first entry with the button above.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {entries.map((entry) => {
        const timeRange = formatEntryTimeRange(entry);
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className="flex min-h-[56px] w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Edit time entry for ${
              entry.project?.project_number ?? "project"
            } on ${format(parseDateOnly(entry.expense_date), "EEE, MMM d")}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {format(parseDateOnly(entry.expense_date), "EEE, MMM d")}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {entry.project?.project_number ?? "—"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {timeRange ?? "No clock times"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatHoursDisplay(
                    entry.hours ?? 0,
                    entry.lunch_taken ?? false
                  )}
                </p>
                <Badge
                  variant="outline"
                  className={`mt-0.5 px-1.5 py-0 text-[10px] capitalize ${getApprovalBadgeClass(
                    entry.approval_status
                  )}`}
                >
                  {entry.approval_status || "pending"}
                </Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

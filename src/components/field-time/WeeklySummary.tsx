/**
 * Weekly summary card for the field-worker time landing.
 *
 * Layout is responsive-Tailwind only (no `useIsMobile()` — iPads land on the
 * desktop side of that hook's 768px break and must NOT get a stretched-phone
 * layout): at 390px the total/dots stack above the per-project list; at
 * md (768) and up the two halves sit side-by-side.
 *
 * Dot semantics per day (Mon–Sun):
 * - filled (primary)  — ≥1 own time entry on that day
 * - amber             — 0 entries BUT ≥1 own crew assignment that day
 * - grey (muted)      — neither
 */

import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { parseDateOnly } from "@/utils/dateUtils";
import {
  FieldTimeEntry,
  paidHoursByProject,
  sumPaidHours,
} from "./fieldTimeData";

interface WeeklySummaryProps {
  /** 7 YYYY-MM-DD strings, Monday first. */
  weekDays: string[];
  todayISO: string;
  entries: FieldTimeEntry[];
  /** Dates (YYYY-MM-DD) with ≥1 own assignment this week. */
  assignmentDates: string[];
  loading: boolean;
}

type DayState = "logged" | "assigned" | "none";

function dayState(
  day: string,
  entryDates: Set<string>,
  assignedDates: Set<string>
): DayState {
  if (entryDates.has(day)) return "logged";
  if (assignedDates.has(day)) return "assigned";
  return "none";
}

const DAY_STATE_LABEL: Record<DayState, string> = {
  logged: "time logged",
  assigned: "assigned, no time logged",
  none: "no activity",
};

export function WeeklySummary({
  weekDays,
  todayISO,
  entries,
  assignmentDates,
  loading,
}: WeeklySummaryProps) {
  if (loading) {
    return (
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-8 w-full max-w-[280px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </Card>
    );
  }

  const entryDates = new Set(entries.map((e) => e.expense_date));
  const assignedDates = new Set(assignmentDates);
  const totalPaid = sumPaidHours(entries);
  const projectRows = paidHoursByProject(entries);

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        {/* Total Paid Hours + day dots */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            This week
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums leading-tight">
            {totalPaid.toFixed(1)}
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">
              paid hrs
            </span>
          </p>

          <div
            className="mt-4 flex items-start justify-between gap-1 max-w-[320px]"
            role="list"
            aria-label="Days this week"
          >
            {weekDays.map((day) => {
              const state = dayState(day, entryDates, assignedDates);
              const label = `${format(parseDateOnly(day), "EEE MMM d")} — ${
                DAY_STATE_LABEL[state]
              }`;
              return (
                <div
                  key={day}
                  role="listitem"
                  aria-label={label}
                  title={label}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-full",
                      state === "logged" && "bg-primary",
                      state === "assigned" && "bg-amber-500",
                      state === "none" && "bg-muted",
                      day === todayISO && "ring-2 ring-primary/30 ring-offset-1"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none",
                      day === todayISO
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(parseDateOnly(day), "EEEEE")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hours per project */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hours per project this week
          </p>
          {projectRows.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No time logged yet this week.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {projectRows.map((row) => (
                <li
                  key={row.projectId}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{row.projectNumber}</span>
                    <span className="ml-1.5 text-muted-foreground hidden sm:inline">
                      {row.projectName}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {row.paidHours.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

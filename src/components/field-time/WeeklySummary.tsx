/**
 * Weekly summary card for the field-worker time landing.
 *
 * The day dots are a DAY SELECTOR, not decoration — tapping one opens that
 * day below (the page drives it through `?date=`). That's the backfill path:
 * 46% of time entries are filed after the work date, so "which days do I still
 * owe" is the question this card answers, and the answer has to be one tap
 * from being fixed.
 *
 * Dot states live in `weekDayState.ts` — shared with Today's `ThisWeekStrip`
 * so the two can't drift.
 *
 * Layout is responsive-Tailwind only (no `useIsMobile()` — iPads land on the
 * desktop side of that hook's 768px break and must NOT get a stretched-phone
 * layout): at 390px the total/dots stack above the per-project list; at
 * md (768) and up the two halves sit side-by-side.
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
import {
  getWeekDayState,
  WEEK_DAY_DOT_CLASS,
  WEEK_DAY_STATE_LABEL,
} from "./weekDayState";

interface WeeklySummaryProps {
  /** 7 YYYY-MM-DD strings, Monday first. */
  weekDays: string[];
  todayISO: string;
  entries: FieldTimeEntry[];
  /** Dates (YYYY-MM-DD) with ≥1 own assignment this week. */
  assignmentDates: string[];
  loading: boolean;
  /** Currently open day (YYYY-MM-DD), or null when showing recent entries. */
  selectedDate: string | null;
  /** Tapping the open day again passes it back — the page clears it. */
  onSelectDate: (day: string) => void;
}

export function WeeklySummary({
  weekDays,
  todayISO,
  entries,
  assignmentDates,
  loading,
  selectedDate,
  onSelectDate,
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

          {/* Each day is a ≥44px tap target — the dot is the mark, the button
              is the column around it. */}
          <div
            className="mt-3 flex items-stretch justify-between gap-1 max-w-[320px]"
            role="group"
            aria-label="Days this week"
          >
            {weekDays.map((day) => {
              const state = getWeekDayState({
                day,
                todayISO,
                hasEntry: entryDates.has(day),
                hasAssignment: assignedDates.has(day),
              });
              const dayLabel = format(parseDateOnly(day), "EEEE, MMM d");
              const label = `${dayLabel} — ${WEEK_DAY_STATE_LABEL[state]}`;
              const isSelected = day === selectedDate;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  aria-label={label}
                  aria-pressed={isSelected}
                  title={label}
                  className={cn(
                    "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1.5 rounded-lg transition-colors",
                    "hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected && "bg-muted ring-1 ring-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-full",
                      WEEK_DAY_DOT_CLASS[state],
                      day === todayISO && "ring-2 ring-primary/30 ring-offset-1"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none",
                      day === todayISO || isSelected
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(parseDateOnly(day), "EEEEE")}
                  </span>
                </button>
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

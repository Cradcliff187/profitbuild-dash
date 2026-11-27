/**
 * The two halves of a one-person weekly timesheet:
 *
 * - `WeekSummaryCard` — week browser, total against 40, the day strip (hours
 *   as numbers, tappable), and the "to check" list.
 * - `WeekDayList` — every day of the week as compact entry rows.
 *
 * Both render a `WeekSheet` built by `buildWeekSheet` (timesheetModel.ts), so
 * My week and Team → person show the same numbers by construction. Purely
 * presentational: no queries, no auth.
 *
 * Layout is responsive Tailwind only (no `useIsMobile()` — iPads land on the
 * desktop side of its 768px break). Touch targets are ≥44px.
 */

import { format } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { parseDateOnly } from "@/utils/dateUtils";
import {
  formatEntryTimeRange,
  paidHoursByProject,
  type FieldTimeEntry,
} from "@/components/field-time/fieldTimeData";
import {
  WEEKLY_TARGET_HOURS,
  dayAnchorId,
  isPendingApproval,
  type SheetDay,
  type SheetDayState,
  type SheetEntry,
  type WeekSheet,
} from "./timesheetModel";

const STRIP_CLASS: Record<SheetDayState, string> = {
  logged: "border-border bg-card",
  idle: "border-border bg-card",
  "needs-time": "border-amber-500 bg-amber-500/10",
  flagged: "border-destructive bg-destructive/10",
};

const STRIP_HOURS_CLASS: Record<SheetDayState, string> = {
  logged: "text-foreground font-bold",
  idle: "text-muted-foreground font-medium",
  "needs-time": "text-amber-600 dark:text-amber-400 font-bold",
  flagged: "text-destructive font-bold",
};

const STATE_LABEL: Record<SheetDayState, string> = {
  logged: "time logged",
  idle: "nothing logged",
  "needs-time": "no time logged",
  flagged: "needs a look",
};

interface WeekSummaryCardProps {
  sheet: WeekSheet;
  loading: boolean;
  todayISO: string;
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  nextWeekDisabled: boolean;
  /** Highlighted day, when the parent keeps one open. */
  selectedDate?: string | null;
  onSelectDate: (day: string) => void;
  /** Pass the week's entries to show the hours-per-project rollup. */
  projectEntries?: FieldTimeEntry[];
}

export function WeekSummaryCard({
  sheet,
  loading,
  todayISO,
  weekLabel,
  onPrevWeek,
  onNextWeek,
  nextWeekDisabled,
  selectedDate,
  onSelectDate,
  projectEntries,
}: WeekSummaryCardProps) {
  const isEmployee = sheet.kind === "employee";
  const scale = Math.max(WEEKLY_TARGET_HOURS, sheet.totalPaid) || 1;
  const pct = (n: number) => `${(n / scale) * 100}%`;
  const projectRows = projectEntries ? paidHoursByProject(projectEntries) : [];

  return (
    <Card className="p-4 sm:p-5">
      {/* Header stays mounted through loading so week-stepping never blocks. */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {weekLabel}
        </p>
        <div className="-my-1.5 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={onPrevWeek}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={onNextWeek}
            disabled={nextWeekDisabled}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-2 space-y-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="mt-1 space-y-4">
          {/* Total against the target */}
          <div className="space-y-2">
            <p className="text-3xl font-bold tabular-nums leading-tight">
              {sheet.totalPaid.toFixed(1)}
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                {isEmployee ? `of ${WEEKLY_TARGET_HOURS} paid hrs` : "paid hrs"}
              </span>
            </p>
            {isEmployee ? (
              <>
                <div
                  className="flex h-2.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${sheet.regularHours.toFixed(1)} regular, ${sheet.overtimeHours.toFixed(1)} overtime, ${sheet.ptoHours.toFixed(1)} time off`}
                >
                  <span className="bg-primary" style={{ width: pct(sheet.regularHours) }} />
                  <span className="bg-success" style={{ width: pct(sheet.ptoHours) }} />
                  <span className="bg-destructive" style={{ width: pct(sheet.overtimeHours) }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <LegendItem className="bg-primary" label={`${sheet.regularHours.toFixed(1)} regular`} />
                  <LegendItem className="bg-destructive" label={`${sheet.overtimeHours.toFixed(1)} overtime`} />
                  <LegendItem className="bg-success" label={`${sheet.ptoHours.toFixed(1)} time off`} />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Subcontractor · no weekly target
              </p>
            )}
          </div>

          {/* Day strip — hours as numbers; each day is a tap target. */}
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="Days this week">
            {sheet.days.map((d) => {
              const date = parseDateOnly(d.day);
              const isSelected = d.day === selectedDate;
              const label = `${format(date, "EEEE, MMM d")} — ${
                d.paidHours > 0 ? `${d.paidHours.toFixed(1)} hours, ` : ""
              }${STATE_LABEL[d.state]}`;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => onSelectDate(d.day)}
                  aria-label={label}
                  aria-pressed={isSelected}
                  title={label}
                  className={cn(
                    "flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors",
                    "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    STRIP_CLASS[d.state],
                    d.day === todayISO && "ring-2 ring-primary/30",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  <span className="text-[11px] font-medium leading-none text-muted-foreground">
                    {format(date, "EEE")}
                  </span>
                  <span className={cn("text-sm leading-tight tabular-nums", STRIP_HOURS_CLASS[d.state])}>
                    {d.paidHours > 0 ? d.paidHours.toFixed(1) : "–"}
                  </span>
                  <span className="text-[11px] leading-none text-muted-foreground tabular-nums">
                    {format(date, "d")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* To check */}
          {sheet.checks.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <p className="bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {sheet.checks.length} to check
              </p>
              <ul>
                {sheet.checks.map((c) => {
                  const dot = (
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        c.severity === "critical" ? "bg-destructive" : "bg-amber-500"
                      )}
                    />
                  );
                  return (
                    <li key={c.key} className="border-t text-sm">
                      {c.day ? (
                        <button
                          type="button"
                          onClick={() => onSelectDate(c.day!)}
                          className="flex min-h-[44px] w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {dot}
                          <span className="min-w-0 break-words">{c.message}</span>
                        </button>
                      ) : (
                        <div className="flex items-start gap-2 px-3 py-2.5">
                          {dot}
                          <span className="min-w-0 break-words">{c.message}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            sheet.totalPaid > 0 && (
              <p className="text-sm font-medium text-success">Nothing to check this week.</p>
            )
          )}

          {projectRows.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hours per project
              </p>
              <ul className="mt-2 space-y-1.5">
                {projectRows.map((row) => (
                  <li
                    key={row.projectId}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{row.projectNumber}</span>
                      <span className="ml-1.5 text-muted-foreground">{row.projectName}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {row.paidHours.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-sm", className)} />
      {label}
    </span>
  );
}

interface WeekDayListProps {
  sheet: WeekSheet;
  loading: boolean;
  todayISO: string;
  onSelectEntry: (entry: FieldTimeEntry) => void;
  /** Renders an Add button on days that are missing time. */
  onAddForDay?: (day: string) => void;
}

export function WeekDayList({
  sheet,
  loading,
  todayISO,
  onSelectEntry,
  onAddForDay,
}: WeekDayListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Days that have not happened yet only appear once they hold an entry.
  const days = sheet.days.filter((d) => d.day <= todayISO || d.entries.length > 0);

  if (days.length === 0) {
    return (
      <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing logged yet this week.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((d) => (
        <DaySection
          key={d.day}
          day={d}
          isToday={d.day === todayISO}
          onSelectEntry={onSelectEntry}
          onAddForDay={onAddForDay}
        />
      ))}
    </div>
  );
}

function DaySection({
  day,
  isToday,
  onSelectEntry,
  onAddForDay,
}: {
  day: SheetDay;
  isToday: boolean;
  onSelectEntry: (entry: FieldTimeEntry) => void;
  onAddForDay?: (day: string) => void;
}) {
  const missing = day.state === "needs-time";
  const dow = parseDateOnly(day.day).getDay();
  const isWeekend = dow === 0 || dow === 6;
  return (
    <section
      id={dayAnchorId(day.day)}
      className="scroll-mt-24 space-y-1.5"
      aria-label={format(parseDateOnly(day.day), "EEEE, MMM d")}
    >
      <div className="flex items-baseline justify-between gap-3 border-b pb-1">
        <h3 className="text-sm font-semibold">
          {format(parseDateOnly(day.day), "EEE, MMM d")}
          {isToday && <span className="ml-2 text-xs font-normal text-muted-foreground">Today</span>}
        </h3>
        {day.paidHours > 0 && (
          <span className="text-sm font-semibold tabular-nums text-primary">
            {day.paidHours.toFixed(1)} hrs
          </span>
        )}
      </div>

      {day.entries.length === 0 ? (
        <div className="flex min-h-[44px] items-center justify-between gap-3">
          <span
            className={cn(
              "text-sm",
              missing ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )}
          >
            {/* Chris, Nov 24 2026: an empty Saturday or Sunday reads "Off";
                an empty Monday–Friday never does — a weekday should carry a
                project, sick, vacation or holiday entry, so it reads "No time
                logged". Amber once the day is over — for employees and
                subcontractors alike (Nov 27 2026); muted only while a future
                weekday has not happened yet. */}
            {isToday
              ? "Nothing logged yet"
              : missing || !isWeekend
                ? "No time logged"
                : "Off"}
          </span>
          {onAddForDay && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px]"
              onClick={() => onAddForDay(day.day)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      ) : (
        day.entries.map((se) => (
          <EntryRow key={se.entry.id} item={se} onSelect={onSelectEntry} />
        ))
      )}
    </section>
  );
}

function EntryRow({
  item,
  onSelect,
}: {
  item: SheetEntry;
  onSelect: (entry: FieldTimeEntry) => void;
}) {
  const { entry, isPTO, flags, gapBeforeHours, longNoLunch } = item;
  const flagged = flags.length > 0;
  const pending = isPendingApproval(entry.approval_status);
  const status = entry.approval_status || "pending";
  const timeRange = formatEntryTimeRange(entry);
  const hasLunch =
    !!entry.lunch_taken && (entry.lunch_duration_minutes ?? 0) > 0;
  const projectLabel = isPTO
    ? entry.project?.project_name ?? "Time off"
    : `${entry.project?.project_number ?? "—"} ${entry.project?.project_name ?? ""}`;

  return (
    <>
      {gapBeforeHours !== null && (
        <p className="pl-3 text-xs text-muted-foreground tabular-nums">
          {gapBeforeHours.toFixed(1)} hr gap
        </p>
      )}
      <button
        type="button"
        onClick={() => onSelect(entry)}
        className={cn(
          "flex min-h-[52px] w-full items-center gap-3 rounded-lg border border-l-4 bg-card px-3 py-2 text-left transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          flagged
            ? "border-l-destructive"
            : pending
              ? "border-l-warning"
              : "border-l-success"
        )}
        aria-label={`Open time entry, ${projectLabel}, ${(entry.hours ?? 0).toFixed(1)} hours, ${status}`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium tabular-nums">
            {isPTO ? "Time off" : timeRange ?? "No clock times"}
            {hasLunch && (
              <span className="font-normal text-muted-foreground">
                {" "}· {entry.lunch_duration_minutes}m lunch
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{projectLabel}</p>
          {flagged && (
            <p className="mt-0.5 flex items-start gap-1 text-xs font-medium text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0 break-words first-letter:uppercase">
                {flags.join(", ")}
              </span>
            </p>
          )}
          {!flagged && longNoLunch && (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
              Over 6 hrs, no lunch recorded
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {(entry.hours ?? 0).toFixed(1)}
          </p>
          <p
            className={cn(
              "text-[11px] capitalize",
              status === "approved"
                ? "text-success"
                : status === "rejected"
                  ? "text-destructive"
                  : "text-warning-fg"
            )}
          >
            {status}
          </p>
        </div>
      </button>
    </>
  );
}

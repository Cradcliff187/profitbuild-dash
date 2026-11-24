/**
 * Pure model for the weekly timesheet (one person, one Mon–Sun payroll week).
 *
 * Everything the timesheet screens show — per-day hours, the day strip state,
 * the regular / overtime / time-off split against 40, and the "to check" list —
 * is derived here from the week's time entries, so My week (field worker) and
 * Team → person (admin) can never disagree. No React, no Supabase.
 *
 * Decisions (Chris, Nov 24 2026):
 * - The payroll week is Monday–Sunday.
 * - 40 hours is the weekly target for EMPLOYEES. Subcontractors who log time
 *   get a plain total: no target, no overtime split, no "missing weekday".
 *
 * Hours are always the DB values (`hours` = Paid, `gross_hours` = shift —
 * Gotcha #17); nothing here recomputes them from clock times.
 *
 * What counts as "to check" was sized against 90 days of real entries
 * (338 rows): a start before 5 AM (2 rows) and an entry over 12 hours (1 row)
 * are rare enough to be worth a red flag. "Over 6 hours with no lunch" is 13%
 * of rows, so it stays a quiet per-row hint and never enters the check list —
 * a warning that fires on one entry in eight is one people learn to ignore.
 */

import { format } from "date-fns";
import { parseDateOnly } from "@/utils/dateUtils";
import { isPTOProject } from "@/utils/timeEntries";
import type { FieldTimeEntry } from "@/components/field-time/fieldTimeData";
import { getWeekDayState } from "@/components/field-time/weekDayState";

export type WorkerKind = "employee" | "sub";

export const WEEKLY_TARGET_HOURS = 40;
/** A start earlier than this local hour is almost always an AM/PM slip. */
const EARLY_START_HOUR = 5;
const LONG_ENTRY_HOURS = 12;
const LONG_SHIFT_NO_LUNCH_HOURS = 6;

export type CheckSeverity = "critical" | "warn";

export interface TimesheetCheck {
  key: string;
  severity: CheckSeverity;
  message: string;
  /** YYYY-MM-DD the check points at; absent for week-level checks. */
  day?: string;
}

export type SheetDayState = "logged" | "needs-time" | "idle" | "flagged";

export interface SheetEntry {
  entry: FieldTimeEntry;
  isPTO: boolean;
  /** Short reasons this entry needs a look (critical only). */
  flags: string[];
  /** Hours between the previous entry's end and this start, when > 0. */
  gapBeforeHours: number | null;
  /** Shift over 6 hours with no lunch recorded — a hint, not a check. */
  longNoLunch: boolean;
}

export interface SheetDay {
  day: string;
  paidHours: number;
  state: SheetDayState;
  entries: SheetEntry[];
}

export interface WeekSheet {
  kind: WorkerKind;
  days: SheetDay[];
  totalPaid: number;
  /** Paid hours excluding time off. */
  workedHours: number;
  ptoHours: number;
  /** Employees only; for subs regular = worked and overtime = 0. */
  regularHours: number;
  overtimeHours: number;
  /** Entry ids awaiting approval (status null or pending). */
  pendingIds: string[];
  checks: TimesheetCheck[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isPendingApproval(status: string | null | undefined): boolean {
  return !status || status === "pending";
}

function dayLabel(day: string): string {
  return format(parseDateOnly(day), "EEE, MMM d");
}

/** Clock-time entries first in start order; duration-only entries (PTO) last. */
function byStartTime(a: FieldTimeEntry, b: FieldTimeEntry): number {
  if (a.start_time && b.start_time) {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  }
  if (a.start_time) return -1;
  if (b.start_time) return 1;
  return 0;
}

interface BuildWeekSheetInput {
  /** 7 YYYY-MM-DD strings, Monday first. */
  weekDays: string[];
  todayISO: string;
  entries: FieldTimeEntry[];
  /** Dates with a crew assignment — makes a weekend day count as expected. */
  assignmentDates?: string[];
  kind: WorkerKind;
}

export function buildWeekSheet({
  weekDays,
  todayISO,
  entries,
  assignmentDates = [],
  kind,
}: BuildWeekSheetInput): WeekSheet {
  const assigned = new Set(assignmentDates);
  const checks: TimesheetCheck[] = [];
  const pendingIds: string[] = [];
  let workedHours = 0;
  let ptoHours = 0;

  const days: SheetDay[] = weekDays.map((day) => {
    const dayEntries = entries
      .filter((e) => e.expense_date === day)
      .sort(byStartTime);
    let paidHours = 0;
    let dayFlagged = false;
    let previousEnd: number | null = null;

    const sheetEntries: SheetEntry[] = dayEntries.map((entry) => {
      const isPTO = isPTOProject(entry.project?.project_number);
      const paid = entry.hours ?? 0;
      const gross = entry.gross_hours ?? paid;
      paidHours += paid;
      if (isPTO) ptoHours += paid;
      else workedHours += paid;
      if (isPendingApproval(entry.approval_status)) pendingIds.push(entry.id);

      const flags: string[] = [];
      let gapBeforeHours: number | null = null;

      if (entry.start_time) {
        const start = new Date(entry.start_time);
        if (!isPTO && start.getHours() < EARLY_START_HOUR) {
          flags.push(`starts at ${format(start, "h:mm a")}`);
        }
        if (previousEnd !== null) {
          const diffMinutes = (start.getTime() - previousEnd) / 60000;
          if (diffMinutes < -1) flags.push("overlaps the entry before it");
          else if (diffMinutes > 1) gapBeforeHours = round2(diffMinutes / 60);
        }
        if (entry.end_time) {
          previousEnd = Math.max(
            previousEnd ?? 0,
            new Date(entry.end_time).getTime()
          );
        }
      }
      if (gross > LONG_ENTRY_HOURS) {
        flags.push(`${gross.toFixed(1)} hrs in one entry`);
      }
      if (entry.approval_status === "rejected") {
        flags.push(
          entry.rejection_reason
            ? `rejected: ${entry.rejection_reason}`
            : "rejected"
        );
      }

      if (flags.length > 0) {
        dayFlagged = true;
        checks.push({
          key: `entry-${entry.id}`,
          severity: "critical",
          message: `${dayLabel(day)}: ${flags.join(", ")}.`,
          day,
        });
      }

      return {
        entry,
        isPTO,
        flags,
        gapBeforeHours,
        longNoLunch:
          !isPTO && !entry.lunch_taken && gross > LONG_SHIFT_NO_LUNCH_HOURS,
      };
    });

    // Same rule as the Today / Time week strips (weekDayState.ts) — a day is
    // never "needs time" until it is over. Subs have no expected weekdays; for
    // them only a day they were dispatched to counts as missing.
    let state: SheetDayState = getWeekDayState({
      day,
      todayISO,
      hasEntry: dayEntries.length > 0,
      hasAssignment: assigned.has(day),
    });
    if (state === "needs-time" && kind === "sub" && !assigned.has(day)) {
      state = "idle";
    }
    if (dayFlagged) state = "flagged";
    if (state === "needs-time") {
      checks.push({
        key: `missing-${day}`,
        severity: "warn",
        message: `${dayLabel(day)}: no time logged.`,
        day,
      });
    }

    return { day, paidHours: round2(paidHours), state, entries: sheetEntries };
  });

  workedHours = round2(workedHours);
  ptoHours = round2(ptoHours);
  const overtimeHours =
    kind === "employee"
      ? round2(Math.max(0, workedHours - WEEKLY_TARGET_HOURS))
      : 0;

  if (overtimeHours > 0) {
    checks.push({
      key: "overtime",
      severity: "warn",
      message: `${overtimeHours.toFixed(1)} hrs over ${WEEKLY_TARGET_HOURS} this week.`,
    });
  }

  // Critical first; otherwise keep calendar order.
  checks.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1
  );

  return {
    kind,
    days,
    totalPaid: round2(workedHours + ptoHours),
    workedHours,
    ptoHours,
    regularHours: round2(workedHours - overtimeHours),
    overtimeHours,
    pendingIds,
    checks,
  };
}

/** The exact shape `EditTimeEntryDialog` accepts. */
export function toEditTimeEntry(entry: FieldTimeEntry) {
  return {
    id: entry.id,
    payee_id: entry.payee_id,
    project_id: entry.project_id,
    expense_date: entry.expense_date,
    amount: entry.amount,
    description: entry.description ?? "",
    user_id: entry.user_id ?? undefined,
    start_time: entry.start_time ?? undefined,
    end_time: entry.end_time ?? undefined,
    attachment_url: entry.attachment_url ?? undefined,
    approval_status: entry.approval_status ?? undefined,
    is_locked: entry.is_locked ?? undefined,
    rejection_reason: entry.rejection_reason ?? undefined,
    lunch_taken: entry.lunch_taken ?? undefined,
    lunch_duration_minutes: entry.lunch_duration_minutes,
  };
}

/** DOM id of a day section — the day strip scrolls to it. */
export const dayAnchorId = (day: string) => `timesheet-day-${day}`;

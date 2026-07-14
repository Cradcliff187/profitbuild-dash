/**
 * Monday–Sunday week model for the Crew Dispatch board.
 *
 * All date-only math routes through the house helpers in
 * `@/utils/scheduleNotes` (`parseDateOnly` / `formatDateOnly`) so `work_date`
 * is always compared as a local-calendar YYYY-MM-DD string — `new Date('YYYY-MM-DD')`
 * parses as UTC midnight and shifts the day in negative-offset timezones.
 */

import { format } from "date-fns";
import { formatDateOnly, parseDateOnly } from "@/utils/scheduleNotes";

/** Monday of the week containing `d`, at local midnight. */
export function getWeekStart(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysSinceMonday = (date.getDay() + 6) % 7; // getDay(): 0 = Sunday
  date.setDate(date.getDate() - daysSinceMonday);
  return date;
}

/** Local-midnight copy of `d` shifted by `n` days. */
export function addDays(d: Date, n: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + n);
  return next;
}

/** The 7 ISO (YYYY-MM-DD) dates of the Monday–Sunday week starting at `weekStart`. */
export function getWeekDayISOs(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => formatDateOnly(addDays(weekStart, i)));
}

/** Shift a YYYY-MM-DD string by `n` days (local-calendar safe). */
export function addDaysISO(iso: string, n: number): string {
  return formatDateOnly(addDays(parseDateOnly(iso), n));
}

/** e.g. "Jul 13 – Jul 19, 2026" */
export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

/**
 * Day-dot state for the week strips — ONE definition, used by both
 * `WeeklySummary` (Time tab) and `ThisWeekStrip` (Today).
 *
 * Those two files each carried their own copy of the state map, which
 * CLAUDE.md flagged as "keep in visual lockstep". This is that lockstep,
 * enforced by the compiler instead of by a comment.
 *
 * Three states, not four:
 *
 * | State        | Mark              | Means                                  |
 * |--------------|-------------------|----------------------------------------|
 * | `logged`     | filled primary    | ≥1 own time entry that day             |
 * | `needs-time` | amber outline     | a finished day with nothing logged     |
 * | `idle`       | muted             | nothing expected (yet)                 |
 *
 * Two deliberate rules:
 *
 * 1. **A day is never `needs-time` until it's over.** Today is in progress —
 *    flagging it amber at 8am would have every worker seeing the warning
 *    colour every morning, and a signal that cries wolf daily gets ignored.
 *    Today gets the ring; it earns amber tomorrow.
 *
 * 2. **"Assigned" folds into `needs-time`.** It used to be its own amber
 *    state, for a signal that fired 3 times in 90 days (`crew_day_assignments`
 *    is barely populated). Assignment data still earns its place — it's what
 *    makes a WEEKEND day count as expected. On weekdays, the day being over is
 *    enough.
 *
 * Known trade-off: an unlogged day off reads `needs-time` until the PTO entry
 * is filed. That's a correct nudge (PTO is logged as a time entry against
 * 006-SICK / 007-VAC / 008-HOL), and it's why this stays a quiet dot and never
 * becomes a count badge or a notification.
 */

import { parseDateOnly } from "@/utils/dateUtils";

export type WeekDayState = "logged" | "needs-time" | "idle";

interface WeekDayStateInput {
  /** The day being rendered, YYYY-MM-DD. */
  day: string;
  /** Today, YYYY-MM-DD — passed in so both strips agree on "now". */
  todayISO: string;
  hasEntry: boolean;
  hasAssignment: boolean;
}

/** Mon–Fri. `getDay()`: 0 = Sunday … 6 = Saturday. */
function isWeekday(day: string): boolean {
  const dow = parseDateOnly(day).getDay();
  return dow >= 1 && dow <= 5;
}

export function getWeekDayState({
  day,
  todayISO,
  hasEntry,
  hasAssignment,
}: WeekDayStateInput): WeekDayState {
  if (hasEntry) return "logged";
  // Date-only strings compare correctly as strings (YYYY-MM-DD).
  if (day >= todayISO) return "idle"; // today is in progress; tomorrow hasn't happened
  return isWeekday(day) || hasAssignment ? "needs-time" : "idle";
}

/** Tailwind classes for the dot itself (h-3.5 w-3.5 rounded-full comes from the caller). */
export const WEEK_DAY_DOT_CLASS: Record<WeekDayState, string> = {
  logged: "bg-primary",
  "needs-time": "border-2 border-amber-500 bg-transparent",
  idle: "bg-muted-foreground/20",
};

/** Spoken by screen readers, and the desktop `title` tooltip. */
export const WEEK_DAY_STATE_LABEL: Record<WeekDayState, string> = {
  logged: "time logged",
  "needs-time": "no time logged",
  idle: "nothing logged",
};

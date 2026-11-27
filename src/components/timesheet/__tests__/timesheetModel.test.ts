import { describe, expect, it } from "vitest";
import type { FieldTimeEntry } from "@/components/field-time/fieldTimeData";
import { buildWeekSheet } from "../timesheetModel";

/**
 * Week of Mon 2026-07-20 … Sun 2026-07-26. Dates are fixed literals so the
 * suite can't drift with the clock. Clock times are built from LOCAL parts so
 * the "starts before 5 AM" rule is timezone-independent.
 */
const WEEK = [
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
  "2026-07-23",
  "2026-07-24",
  "2026-07-25",
  "2026-07-26",
];
const NEXT_MONDAY = "2026-07-27"; // "today" after the whole week is over

let seq = 0;
function entry(
  day: string,
  hours: number,
  opts: {
    start?: [number, number];
    end?: [number, number];
    status?: string | null;
    project?: string;
    gross?: number;
    lunch?: boolean;
  } = {}
): FieldTimeEntry {
  const [y, m, d] = day.split("-").map(Number);
  const at = (hm?: [number, number]) =>
    hm ? new Date(y, m - 1, d, hm[0], hm[1]).toISOString() : null;
  return {
    id: `e${++seq}`,
    payee_id: "payee",
    project_id: opts.project ?? "225-078",
    expense_date: day,
    amount: 0,
    description: null,
    user_id: "user",
    start_time: at(opts.start),
    end_time: at(opts.end),
    attachment_url: null,
    approval_status: opts.status === undefined ? "approved" : opts.status,
    is_locked: false,
    rejection_reason: null,
    lunch_taken: opts.lunch ?? false,
    lunch_duration_minutes: opts.lunch ? 30 : null,
    hours,
    gross_hours: opts.gross ?? hours,
    created_at: null,
    project: {
      project_number: opts.project ?? "225-078",
      project_name: "Test",
    },
  };
}

const build = (
  entries: FieldTimeEntry[],
  kind: "employee" | "sub" = "employee",
  todayISO = NEXT_MONDAY,
  assignmentDates: string[] = []
) => buildWeekSheet({ weekDays: WEEK, todayISO, entries, kind, assignmentDates });

describe("buildWeekSheet", () => {
  it("splits an employee's week into regular, overtime and time off", () => {
    const sheet = build([
      ...WEEK.slice(0, 4).map((d) => entry(d, 11)), // 44 worked
      entry(WEEK[4], 8, { project: "007-VAC" }), // PTO
    ]);
    expect(sheet.workedHours).toBe(44);
    expect(sheet.ptoHours).toBe(8);
    expect(sheet.regularHours).toBe(40);
    expect(sheet.overtimeHours).toBe(4);
    expect(sheet.totalPaid).toBe(52);
    expect(sheet.checks.map((c) => c.key)).toContain("overtime");
  });

  it("gives a subcontractor a plain total: no target, no overtime", () => {
    const sheet = build(
      [0, 1, 2, 3, 4].map((i) => entry(WEEK[i], 9)),
      "sub"
    );
    expect(sheet.totalPaid).toBe(45);
    expect(sheet.overtimeHours).toBe(0);
    expect(sheet.checks).toEqual([]);
  });

  it("flags a subcontractor's empty weekday the same as an employee's", () => {
    const sheet = build(
      [1, 2, 3, 4].map((i) => entry(WEEK[i], 8)),
      "sub"
    );
    expect(sheet.days[0].state).toBe("needs-time");
    expect(sheet.checks).toHaveLength(1);
    expect(sheet.checks[0]).toMatchObject({ severity: "warn", day: WEEK[0] });
    // An empty weekend is still nothing to check.
    expect(sheet.days[5].state).toBe("idle");
  });

  it("flags a weekend day a subcontractor was dispatched to and did not log", () => {
    const sheet = build(
      [0, 1, 2, 3, 4].map((i) => entry(WEEK[i], 8)),
      "sub",
      NEXT_MONDAY,
      [WEEK[5]]
    );
    expect(sheet.days[5].state).toBe("needs-time");
    expect(sheet.days[6].state).toBe("idle");
  });

  it("flags a finished weekday with no time, but never today or a weekend", () => {
    // Today = Wednesday; Monday logged, Tuesday empty.
    const sheet = build([entry(WEEK[0], 8)], "employee", WEEK[2]);
    expect(sheet.days.map((d) => d.state)).toEqual([
      "logged",
      "needs-time",
      "idle", // today is in progress
      "idle",
      "idle",
      "idle",
      "idle",
    ]);
    expect(sheet.checks).toHaveLength(1);
    expect(sheet.checks[0]).toMatchObject({ severity: "warn", day: WEEK[1] });
  });

  it("flags the midnight-start 14-hour entry as critical", () => {
    // The real shape that prompted this screen: 12:00 AM – 2:00 PM.
    const sheet = build([
      entry(WEEK[6], 14, { start: [0, 0], end: [14, 0], status: "pending" }),
    ]);
    const sunday = sheet.days[6];
    expect(sunday.state).toBe("flagged");
    expect(sunday.entries[0].flags).toEqual([
      "starts at 12:00 AM",
      "14.0 hrs in one entry",
    ]);
    expect(sheet.checks[0].severity).toBe("critical");
    expect(sheet.pendingIds).toHaveLength(1);
  });

  it("shows a gap between entries and flags an overlap", () => {
    const sheet = build([
      entry(WEEK[0], 4, { start: [7, 0], end: [11, 0] }),
      entry(WEEK[0], 4.5, { start: [12, 0], end: [16, 30] }),
      entry(WEEK[1], 4, { start: [7, 0], end: [11, 0] }),
      entry(WEEK[1], 4, { start: [10, 0], end: [14, 0] }),
    ]);
    expect(sheet.days[0].entries[1].gapBeforeHours).toBe(1);
    expect(sheet.days[0].state).toBe("logged");
    expect(sheet.days[1].entries[1].flags).toEqual([
      "overlaps the entry before it",
    ]);
    expect(sheet.days[1].state).toBe("flagged");
  });

  it("keeps 'over 6 hours, no lunch' as a row hint, not a check", () => {
    const sheet = build(
      WEEK.slice(0, 5).map((d) =>
        entry(d, 8, { start: [7, 0], end: [15, 0] })
      )
    );
    expect(sheet.days[0].entries[0].longNoLunch).toBe(true);
    expect(sheet.checks).toEqual([]);
    expect(sheet.days[0].state).toBe("logged");
  });

  it("counts null and pending statuses as awaiting approval", () => {
    const sheet = build([
      entry(WEEK[0], 8, { status: null }),
      entry(WEEK[1], 8, { status: "pending" }),
      entry(WEEK[2], 8, { status: "approved" }),
    ]);
    expect(sheet.pendingIds).toHaveLength(2);
  });

  it("puts critical checks ahead of warnings", () => {
    const sheet = build([
      entry(WEEK[4], 13, { start: [6, 0], end: [19, 0] }),
    ]);
    // Mon–Thu are missing (warn); Friday's 13-hour entry is critical.
    expect(sheet.checks[0].severity).toBe("critical");
    expect(sheet.checks.slice(1).every((c) => c.severity === "warn")).toBe(true);
  });
});

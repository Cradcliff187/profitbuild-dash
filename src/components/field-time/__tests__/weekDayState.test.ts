import { describe, it, expect } from "vitest";
import { getWeekDayState } from "../weekDayState";

/**
 * Week of Mon 2026-07-20 … Sun 2026-07-26, with "today" = Wed 2026-07-22.
 * These dates are fixed literals, not derived from the clock, so the suite
 * can't drift into a different weekday next Tuesday.
 */
const TODAY = "2026-07-22"; // Wednesday
const MON = "2026-07-20";
const TUE = "2026-07-21";
const THU = "2026-07-23";
const SAT = "2026-07-18"; // the PAST Saturday
const SUN = "2026-07-19"; // the PAST Sunday

const state = (
  day: string,
  { hasEntry = false, hasAssignment = false } = {}
) => getWeekDayState({ day, todayISO: TODAY, hasEntry, hasAssignment });

describe("getWeekDayState", () => {
  it("marks any day with a time entry as logged", () => {
    expect(state(MON, { hasEntry: true })).toBe("logged");
    expect(state(TODAY, { hasEntry: true })).toBe("logged");
    expect(state(THU, { hasEntry: true })).toBe("logged");
    expect(state(SUN, { hasEntry: true })).toBe("logged");
  });

  it("flags a finished weekday with nothing logged", () => {
    expect(state(MON)).toBe("needs-time");
    expect(state(TUE)).toBe("needs-time");
  });

  // The rule Chris asked for: nothing cute, only once the day is done.
  it("never flags today, however empty it is", () => {
    expect(state(TODAY)).toBe("idle");
    expect(state(TODAY, { hasAssignment: true })).toBe("idle");
  });

  it("never flags a future day", () => {
    expect(state(THU)).toBe("idle");
    expect(state(THU, { hasAssignment: true })).toBe("idle");
  });

  it("leaves past weekends alone unless someone was dispatched", () => {
    expect(state(SAT)).toBe("idle");
    expect(state(SUN)).toBe("idle");
    expect(state(SAT, { hasAssignment: true })).toBe("needs-time");
  });

  it("prefers logged over needs-time when a past day has both", () => {
    expect(state(MON, { hasEntry: true, hasAssignment: true })).toBe("logged");
  });
});

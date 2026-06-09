import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
  isSameDay,
} from "date-fns";
import type { DateRangeValue } from "./filterTypes";

/**
 * Preset pills for the `dateRange` filter field. Mirrors the labels/semantics of
 * the app-wide `TimePeriodFilter`, but produces `Date` objects (not ISO strings)
 * so it stays type-compatible with the `{ start: Date|null; end: Date|null }`
 * shape used by Projects / Quotes / Estimates filter state.
 */
export type DateRangePreset =
  | "all"
  | "this_month"
  | "last_month"
  | "last_30"
  | "this_quarter"
  | "ytd"
  | "custom";

export const DATE_RANGE_PRESETS: { preset: DateRangePreset; label: string }[] = [
  { preset: "all", label: "All Time" },
  { preset: "this_month", label: "This Month" },
  { preset: "last_month", label: "Last Month" },
  { preset: "last_30", label: "Last 30 Days" },
  { preset: "this_quarter", label: "This Quarter" },
  { preset: "ytd", label: "YTD" },
];

export const presetToDateRange = (
  preset: DateRangePreset,
  today: Date = new Date()
): DateRangeValue => {
  switch (preset) {
    case "this_month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    case "last_30":
      return { start: subDays(today, 29), end: today };
    case "this_quarter":
      return { start: startOfQuarter(today), end: today };
    case "ytd":
      return { start: startOfYear(today), end: today };
    case "all":
    case "custom":
    default:
      return { start: null, end: null };
  }
};

/** Reverse-maps a concrete range back to the preset whose pill should appear active. */
export const matchDateRangePreset = (
  value: DateRangeValue | undefined,
  today: Date = new Date()
): DateRangePreset => {
  if (!value || (!value.start && !value.end)) return "all";
  for (const { preset } of DATE_RANGE_PRESETS) {
    if (preset === "all") continue;
    const r = presetToDateRange(preset, today);
    if (
      r.start &&
      r.end &&
      value.start &&
      value.end &&
      isSameDay(r.start, value.start) &&
      isSameDay(r.end, value.end)
    ) {
      return preset;
    }
  }
  return "custom";
};

import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
  format,
} from "date-fns";

export type TimePeriodPreset =
  | "all"
  | "this_month"
  | "last_month"
  | "last_30"
  | "this_quarter"
  | "ytd"
  | "custom";

export interface TimePeriodValue {
  preset: TimePeriodPreset;
  dateFrom: string | null;
  dateTo: string | null;
}

export const TIME_PERIOD_LABELS: Record<TimePeriodPreset, string> = {
  all: "All Time",
  this_month: "This Month",
  last_month: "Last Month",
  last_30: "Last 30 Days",
  this_quarter: "This Quarter",
  ytd: "YTD",
  custom: "Custom",
};

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export function getPresetRange(
  preset: TimePeriodPreset,
  today: Date = new Date()
): { dateFrom: string | null; dateTo: string | null } {
  switch (preset) {
    case "this_month":
      return { dateFrom: fmt(startOfMonth(today)), dateTo: fmt(endOfMonth(today)) };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { dateFrom: fmt(startOfMonth(lm)), dateTo: fmt(endOfMonth(lm)) };
    }
    case "last_30":
      return { dateFrom: fmt(subDays(today, 29)), dateTo: fmt(today) };
    case "this_quarter":
      return { dateFrom: fmt(startOfQuarter(today)), dateTo: fmt(today) };
    case "ytd":
      return { dateFrom: fmt(startOfYear(today)), dateTo: fmt(today) };
    case "all":
    case "custom":
    default:
      return { dateFrom: null, dateTo: null };
  }
}

export const ALL_TIME_PERIOD: TimePeriodValue = {
  preset: "all",
  dateFrom: null,
  dateTo: null,
};

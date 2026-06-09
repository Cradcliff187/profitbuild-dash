/**
 * Shared filter-bar types. A page's typed `FilterState` is mapped to a list of
 * `FilterFieldDef`s and a plain value bag; the `EntityFilterBar` renders the bar,
 * popovers, active-filter chips, and the mobile sheet generically from those defs.
 *
 * The bar never owns the canonical state — pages keep their existing typed
 * `FilterState` (so `*ExportModal`s stay untouched) and adapt it at the edge.
 */

import type { TimePeriodValue } from "@/utils/timePeriodPresets";

export interface FilterOption {
  value: string;
  label: string;
}

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

export interface NumberRangeValue {
  min: number | null;
  max: number | null;
}

/** Free-text search. Rendered as the prominent left-hand input (value: string). */
export interface SearchFieldDef {
  kind: "search";
  key: string;
  placeholder?: string;
}

/** Multi-select facet (value: string[]). `searchable` swaps the checkbox list for a cmdk list. */
export interface MultiSelectFieldDef {
  kind: "multiSelect";
  key: string;
  label: string;
  options: FilterOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
}

/** Single free-text facet (value: string). For one-off text filters, e.g. "amount contains". */
export interface TextFieldDef {
  kind: "text";
  key: string;
  label: string;
  placeholder?: string;
}

/** Single-select facet (value: string | null). `allLabel` is shown when unset. */
export interface SelectFieldDef {
  kind: "select";
  key: string;
  label: string;
  options: FilterOption[];
  allLabel?: string;
}

/** Date range with preset pills (value: { start: Date|null; end: Date|null }). */
export interface DateRangeFieldDef {
  kind: "dateRange";
  key: string;
  label: string;
}

/** Numeric range (value: { min: number|null; max: number|null }). `prefix` e.g. "$". */
export interface NumberRangeFieldDef {
  kind: "numberRange";
  key: string;
  label: string;
  prefix?: string;
}

/**
 * Time-period control (value: `TimePeriodValue` — preset + ISO `yyyy-MM-dd` strings).
 * Wraps the app-wide `TimePeriodFilter`. Use for surfaces whose state is a single
 * `TimePeriodValue` (Expenses, Invoices) so behavior/pagination semantics are preserved.
 */
export interface PeriodFieldDef {
  kind: "period";
  key: string;
  label: string;
}

export type FilterFieldDef =
  | SearchFieldDef
  | TextFieldDef
  | MultiSelectFieldDef
  | SelectFieldDef
  | DateRangeFieldDef
  | NumberRangeFieldDef
  | PeriodFieldDef;

/** The plain value bag the bar reads/writes. Keys match each field's `key`. */
export type FilterValues = Record<string, unknown>;

export const emptyValueForField = (field: FilterFieldDef): unknown => {
  switch (field.kind) {
    case "search":
    case "text":
      return "";
    case "multiSelect":
      return [];
    case "select":
      return null;
    case "dateRange":
      return { start: null, end: null } satisfies DateRangeValue;
    case "numberRange":
      return { min: null, max: null } satisfies NumberRangeValue;
    case "period":
      return { preset: "all", dateFrom: null, dateTo: null } satisfies TimePeriodValue;
  }
};

export const isFieldActive = (field: FilterFieldDef, values: FilterValues): boolean => {
  const v = values[field.key];
  switch (field.kind) {
    case "search":
    case "text":
      return typeof v === "string" && v.trim().length > 0;
    case "multiSelect":
      return Array.isArray(v) && v.length > 0;
    case "select":
      return v !== null && v !== undefined && v !== "";
    case "dateRange": {
      const dr = v as DateRangeValue | undefined;
      return !!(dr && (dr.start || dr.end));
    }
    case "numberRange": {
      const nr = v as NumberRangeValue | undefined;
      return !!(nr && (nr.min !== null && nr.min !== undefined || nr.max !== null && nr.max !== undefined));
    }
    case "period": {
      const p = v as TimePeriodValue | undefined;
      return !!(p && p.preset !== "all");
    }
  }
};

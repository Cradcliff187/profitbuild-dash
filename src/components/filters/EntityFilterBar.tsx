import React, { useState } from "react";
import { format } from "date-fns";
import { Search, X, Check, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { TimePeriodFilter } from "@/components/ui/time-period-filter";
import { TimePeriodValue, TIME_PERIOD_LABELS } from "@/utils/timePeriodPresets";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  FilterFieldDef,
  FilterValues,
  MultiSelectFieldDef,
  SelectFieldDef,
  DateRangeFieldDef,
  NumberRangeFieldDef,
  DateRangeValue,
  NumberRangeValue,
  emptyValueForField,
  isFieldActive,
} from "./filterTypes";
import {
  DATE_RANGE_PRESETS,
  presetToDateRange,
  matchDateRangePreset,
} from "./dateRangePresets";

interface EntityFilterBarProps {
  /** Plural entity noun, e.g. "Projects" — used for the search placeholder fallback + mobile sheet title. */
  entityName: string;
  fields: FilterFieldDef[];
  values: FilterValues;
  /** Shallow-merge patch into the page's typed FilterState. */
  onChange: (patch: FilterValues) => void;
  onClearAll: () => void;
  resultCount?: number;
  /** Optional content rendered at the right edge of the bar (e.g. view toggle, export). */
  actions?: React.ReactNode;
  /**
   * One-tap shortcuts shown beside the Filters button on mobile (e.g. "Pending",
   * "This week"). Each is a plain toggle the page maps onto its own filter state.
   */
  quickFilters?: QuickFilter[];
  className?: string;
}

export interface QuickFilter {
  id: string;
  label: string;
  active: boolean;
  onToggle: () => void;
}

const formatRange = (start: Date | null, end: Date | null): string => {
  const f = (d: Date) => format(d, "MMM d");
  if (start && end) return `${f(start)} – ${f(end)}`;
  if (start) return `From ${f(start)}`;
  if (end) return `Until ${f(end)}`;
  return "";
};

const formatPeriod = (p: TimePeriodValue): string => {
  if (p.preset !== "custom") return TIME_PERIOD_LABELS[p.preset];
  const f = (iso: string) => format(new Date(`${iso}T00:00:00`), "MMM d");
  if (p.dateFrom && p.dateTo) return `${f(p.dateFrom)} – ${f(p.dateTo)}`;
  if (p.dateFrom) return `From ${f(p.dateFrom)}`;
  if (p.dateTo) return `Until ${f(p.dateTo)}`;
  return "Custom";
};

const formatNumberRange = (nr: NumberRangeValue, prefix = ""): string => {
  const hasMin = nr.min !== null && nr.min !== undefined;
  const hasMax = nr.max !== null && nr.max !== undefined;
  const m = (n: number) => `${prefix}${n.toLocaleString()}`;
  if (hasMin && hasMax) return `${m(nr.min!)} – ${m(nr.max!)}`;
  if (hasMin) return `≥ ${m(nr.min!)}`;
  if (hasMax) return `≤ ${m(nr.max!)}`;
  return "";
};

/* --------------------------------- controls -------------------------------- */

const MultiSelectList: React.FC<{
  field: MultiSelectFieldDef;
  selected: string[];
  onToggle: (value: string) => void;
  onSetAll: (values: string[]) => void;
}> = ({ field, selected, onToggle, onSetAll }) => {
  const header = (
    <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2"
        onClick={() => onSetAll(field.options.map((o) => o.value))}
      >
        Select All
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2"
        onClick={() => onSetAll([])}
      >
        Clear
      </Button>
    </div>
  );

  const row = (option: { value: string; label: string }) => (
    <div
      key={option.value}
      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
      onClick={() => onToggle(option.value)}
    >
      <Checkbox
        checked={selected.includes(option.value)}
        className="h-4 w-4 pointer-events-none"
      />
      <label className="text-sm cursor-pointer flex-1">{option.label}</label>
    </div>
  );

  if (field.searchable) {
    return (
      <Command>
        <CommandInput
          placeholder={field.searchPlaceholder ?? `Search ${field.label.toLowerCase()}...`}
          className="h-9"
        />
        <CommandList>
          <CommandEmpty>No match found.</CommandEmpty>
          <CommandGroup>
            {header}
            {field.options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => onToggle(option.value)}
                className="text-sm"
              >
                <div className="flex items-center gap-2 w-full">
                  <Checkbox
                    checked={selected.includes(option.value)}
                    className="h-4 w-4 pointer-events-none"
                  />
                  <span className="truncate">{option.label}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }

  return (
    <div className="space-y-1">
      {header}
      {field.options.map(row)}
    </div>
  );
};

const DateRangeControl: React.FC<{
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  /** Touch sizing (mobile sheet): 40px pills and 44px date triggers. */
  touch?: boolean;
}> = ({ value, onChange, touch }) => {
  const active = matchDateRangePreset(value);
  const pill = touch ? "h-10 rounded-full px-4 text-sm" : "h-7 rounded-full px-3 text-xs";
  const trigger = touch ? "h-11 flex-1 text-sm" : "h-8 flex-1 text-xs";
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("flex flex-wrap items-center", touch ? "gap-2" : "gap-1")}>
        {DATE_RANGE_PRESETS.map(({ preset, label }) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={active === preset ? "default" : "outline"}
            className={pill}
            onClick={() => onChange(presetToDateRange(preset))}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={active === "custom" ? "default" : "outline"}
          className={pill}
          onClick={() => onChange({ start: value.start, end: value.end })}
        >
          Custom
        </Button>
      </div>
      <div className={cn("flex gap-2", touch ? "flex-row" : "flex-col sm:flex-row")}>
        <DatePickerPopover
          value={value.start ?? undefined}
          onSelect={(d) => onChange({ ...value, start: d ?? null })}
          placeholder="Start"
          dateFormat="MMM dd, yyyy"
          size="sm"
          triggerClassName={trigger}
          iconClassName="h-3 w-3 mr-1"
        />
        <DatePickerPopover
          value={value.end ?? undefined}
          onSelect={(d) => onChange({ ...value, end: d ?? null })}
          placeholder="End"
          dateFormat="MMM dd, yyyy"
          size="sm"
          triggerClassName={trigger}
          iconClassName="h-3 w-3 mr-1"
        />
      </div>
    </div>
  );
};

const NumberRangeControl: React.FC<{
  field: NumberRangeFieldDef;
  value: NumberRangeValue;
  onChange: (next: NumberRangeValue) => void;
}> = ({ field, value, onChange }) => {
  const parse = (s: string) => (s ? parseFloat(s) : null);
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        inputMode="decimal"
        placeholder={`Min ${field.prefix ?? ""}`.trim()}
        value={value.min ?? ""}
        onChange={(e) => onChange({ ...value, min: parse(e.target.value) })}
        className="h-9"
      />
      <Input
        type="number"
        inputMode="decimal"
        placeholder={`Max ${field.prefix ?? ""}`.trim()}
        value={value.max ?? ""}
        onChange={(e) => onChange({ ...value, max: parse(e.target.value) })}
        className="h-9"
      />
    </div>
  );
};

/* ------------------------------- facet button ------------------------------ */

const SelectFacet: React.FC<{
  field: SelectFieldDef;
  value: string | null;
  onChange: (v: string | null) => void;
}> = ({ field, value, onChange }) => {
  const selectedLabel =
    field.options.find((o) => o.value === value)?.label ?? field.allLabel ?? `All ${field.label}`;
  const isActive = value !== null && value !== undefined && value !== "";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 justify-between gap-1.5 text-xs",
            isActive && "border-primary/60 bg-primary/5 text-foreground"
          )}
        >
          <span className="truncate max-w-[10rem]">
            {isActive ? `${field.label}: ${selectedLabel}` : field.label}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="space-y-0.5">
          <button
            className={cn(
              "w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent",
              !isActive && "bg-accent/60 font-medium"
            )}
            onClick={() => onChange(null)}
          >
            {field.allLabel ?? `All ${field.label}`}
          </button>
          {field.options.map((o) => (
            <button
              key={o.value}
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent",
                value === o.value && "bg-accent/60 font-medium"
              )}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DesktopFacet: React.FC<{
  field: FilterFieldDef;
  values: FilterValues;
  onChange: (patch: FilterValues) => void;
}> = ({ field, values, onChange }) => {
  const isMobile = useIsMobile();
  const active = isFieldActive(field, values);

  if (field.kind === "select") {
    return (
      <SelectFacet
        field={field}
        value={(values[field.key] as string | null) ?? null}
        onChange={(v) => onChange({ [field.key]: v })}
      />
    );
  }

  if (field.kind === "text") {
    const text = (values[field.key] as string) ?? "";
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-between gap-1.5 text-xs",
              active && "border-primary/60 bg-primary/5 text-foreground"
            )}
          >
            <span className="truncate max-w-[10rem]">
              {active ? `${field.label}: ${text}` : field.label}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            autoFocus
            placeholder={field.placeholder ?? field.label}
            value={text}
            onChange={(e) => onChange({ [field.key]: e.target.value })}
            className="h-9"
          />
        </PopoverContent>
      </Popover>
    );
  }

  if (field.kind === "multiSelect") {
    const selected = (values[field.key] as string[]) ?? [];
    const toggle = (v: string) =>
      onChange({
        [field.key]: selected.includes(v)
          ? selected.filter((x) => x !== v)
          : [...selected, v],
      });
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-between gap-1.5 text-xs",
              active && "border-primary/60 bg-primary/5 text-foreground"
            )}
          >
            <span className="truncate max-w-[10rem]">{field.label}</span>
            {active && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-semibold">
                {selected.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            field.searchable ? "p-0" : "p-2",
            isMobile ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]" : field.searchable ? "w-64" : "w-56"
          )}
          align="start"
        >
          <MultiSelectList
            field={field}
            selected={selected}
            onToggle={toggle}
            onSetAll={(vals) => onChange({ [field.key]: vals })}
          />
        </PopoverContent>
      </Popover>
    );
  }

  if (field.kind === "dateRange") {
    const dr = (values[field.key] as DateRangeValue) ?? { start: null, end: null };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-between gap-1.5 text-xs",
              active && "border-primary/60 bg-primary/5 text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate max-w-[10rem]">
              {active ? formatRange(dr.start, dr.end) : field.label}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("p-3", isMobile ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]" : "w-80")}
          align="start"
        >
          <DateRangeControl value={dr} onChange={(next) => onChange({ [field.key]: next })} />
        </PopoverContent>
      </Popover>
    );
  }

  if (field.kind === "period") {
    const p = (values[field.key] as TimePeriodValue) ?? { preset: "all", dateFrom: null, dateTo: null };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-between gap-1.5 text-xs",
              active && "border-primary/60 bg-primary/5 text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate max-w-[10rem]">{active ? formatPeriod(p) : field.label}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("p-3", isMobile ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]" : "w-80")}
          align="start"
        >
          <TimePeriodFilter value={p} onChange={(next) => onChange({ [field.key]: next })} />
        </PopoverContent>
      </Popover>
    );
  }

  if (field.kind !== "numberRange") return null;

  const nr = (values[field.key] as NumberRangeValue) ?? { min: null, max: null };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 justify-between gap-1.5 text-xs",
            active && "border-primary/60 bg-primary/5 text-foreground"
          )}
        >
          <span className="truncate max-w-[10rem]">
            {active ? `${field.label}: ${formatNumberRange(nr, field.prefix)}` : field.label}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <NumberRangeControl
          field={field}
          value={nr}
          onChange={(next) => onChange({ [field.key]: next })}
        />
      </PopoverContent>
    </Popover>
  );
};

/* ----------------------------------- chips --------------------------------- */

interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

const buildChips = (
  fields: FilterFieldDef[],
  values: FilterValues,
  onChange: (patch: FilterValues) => void
): ActiveChip[] => {
  const chips: ActiveChip[] = [];
  for (const field of fields) {
    if (field.kind === "search") continue; // search has its own input + clear
    if (!isFieldActive(field, values)) continue;

    if (field.kind === "multiSelect") {
      const selected = (values[field.key] as string[]) ?? [];
      if (selected.length > 3) {
        chips.push({
          id: field.key,
          label: `${field.label}: ${selected.length}`,
          onRemove: () => onChange({ [field.key]: [] }),
        });
      } else {
        for (const val of selected) {
          const opt = field.options.find((o) => o.value === val);
          chips.push({
            id: `${field.key}:${val}`,
            label: opt?.label ?? val,
            onRemove: () =>
              onChange({ [field.key]: selected.filter((x) => x !== val) }),
          });
        }
      }
    } else if (field.kind === "text") {
      chips.push({
        id: field.key,
        label: `${field.label}: ${values[field.key] as string}`,
        onRemove: () => onChange({ [field.key]: "" }),
      });
    } else if (field.kind === "select") {
      const v = values[field.key] as string | null;
      const opt = field.options.find((o) => o.value === v);
      chips.push({
        id: field.key,
        label: `${field.label}: ${opt?.label ?? v}`,
        onRemove: () => onChange({ [field.key]: null }),
      });
    } else if (field.kind === "dateRange") {
      const dr = values[field.key] as DateRangeValue;
      chips.push({
        id: field.key,
        label: `${field.label}: ${formatRange(dr.start, dr.end)}`,
        onRemove: () => onChange({ [field.key]: { start: null, end: null } }),
      });
    } else if (field.kind === "numberRange") {
      const nr = values[field.key] as NumberRangeValue;
      chips.push({
        id: field.key,
        label: `${field.label}: ${formatNumberRange(nr, field.prefix)}`,
        onRemove: () => onChange({ [field.key]: { min: null, max: null } }),
      });
    } else if (field.kind === "period") {
      const p = values[field.key] as TimePeriodValue;
      chips.push({
        id: field.key,
        label: `${field.label}: ${formatPeriod(p)}`,
        onRemove: () => onChange({ [field.key]: { preset: "all", dateFrom: null, dateTo: null } }),
      });
    }
  }
  return chips;
};

const ChipRow: React.FC<{ chips: ActiveChip[] }> = ({ chips }) => {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={chip.onRemove}
          className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10"
        >
          <span className="truncate max-w-[14rem]">{chip.label}</span>
          <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
};

/* ---------------------------------- mobile --------------------------------- */

/** Option sets this short render as tap chips; longer or searchable ones get a full-height picker. */
const CHIP_OPTION_LIMIT = 6;

const usesPicker = (field: MultiSelectFieldDef) =>
  !!field.searchable || field.options.length > CHIP_OPTION_LIMIT;

const SECTION_LABEL = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/** A 40px-tall toggle chip — the one touch control for short option sets. */
const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-background text-foreground"
    )}
  >
    {active && <Check className="h-3.5 w-3.5" />}
    {children}
  </button>
);

const summarizeSelection = (field: MultiSelectFieldDef, selected: string[]): string => {
  if (selected.length === 0) return "Any";
  const labels = selected.map((v) => field.options.find((o) => o.value === v)?.label ?? v);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
};

const MobileSheetField: React.FC<{
  field: FilterFieldDef;
  values: FilterValues;
  onChange: (patch: FilterValues) => void;
  onOpenPicker: (key: string) => void;
}> = ({ field, values, onChange, onOpenPicker }) => {
  if (field.kind === "search") return null;

  if (field.kind === "select") {
    const v = (values[field.key] as string | null) ?? null;
    return (
      <div className="space-y-2">
        <p className={SECTION_LABEL}>{field.label}</p>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={!v} onClick={() => onChange({ [field.key]: null })}>
            {field.allLabel ?? "All"}
          </FilterChip>
          {field.options.map((o) => (
            <FilterChip
              key={o.value}
              active={v === o.value}
              onClick={() => onChange({ [field.key]: o.value })}
            >
              {o.label}
            </FilterChip>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "text") {
    const text = (values[field.key] as string) ?? "";
    return (
      <div className="space-y-2">
        <p className={SECTION_LABEL}>{field.label}</p>
        <Input
          placeholder={field.placeholder ?? field.label}
          value={text}
          onChange={(e) => onChange({ [field.key]: e.target.value })}
          className="h-11"
        />
      </div>
    );
  }

  if (field.kind === "multiSelect") {
    const selected = (values[field.key] as string[]) ?? [];

    if (usesPicker(field)) {
      return (
        <button
          type="button"
          onClick={() => onOpenPicker(field.key)}
          className="flex min-h-[56px] w-full items-center gap-3 rounded-lg border bg-background px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1">
            <span className={cn(SECTION_LABEL, "block")}>{field.label}</span>
            <span
              className={cn(
                "block truncate text-sm",
                selected.length > 0 ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {summarizeSelection(field, selected)}
            </span>
          </span>
          {selected.length > 0 && (
            <Badge className="h-5 shrink-0 px-1.5 text-[11px] font-semibold">{selected.length}</Badge>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      );
    }

    const toggle = (val: string) =>
      onChange({
        [field.key]: selected.includes(val)
          ? selected.filter((x) => x !== val)
          : [...selected, val],
      });
    return (
      <div className="space-y-2">
        <p className={SECTION_LABEL}>{field.label}</p>
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => (
            <FilterChip key={o.value} active={selected.includes(o.value)} onClick={() => toggle(o.value)}>
              {o.label}
            </FilterChip>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "dateRange") {
    const dr = (values[field.key] as DateRangeValue) ?? { start: null, end: null };
    return (
      <div className="space-y-2">
        <p className={SECTION_LABEL}>{field.label}</p>
        <DateRangeControl touch value={dr} onChange={(next) => onChange({ [field.key]: next })} />
      </div>
    );
  }

  if (field.kind === "period") {
    const p = (values[field.key] as TimePeriodValue) ?? { preset: "all", dateFrom: null, dateTo: null };
    return (
      <div className="space-y-2">
        <p className={SECTION_LABEL}>{field.label}</p>
        <TimePeriodFilter value={p} onChange={(next) => onChange({ [field.key]: next })} />
      </div>
    );
  }

  if (field.kind !== "numberRange") return null;

  const nr = (values[field.key] as NumberRangeValue) ?? { min: null, max: null };
  return (
    <div className="space-y-2">
      <p className={SECTION_LABEL}>{field.label}</p>
      <NumberRangeControl field={field} value={nr} onChange={(next) => onChange({ [field.key]: next })} />
    </div>
  );
};

/**
 * Full-height picker for one long multi-select (workers, projects, payees…).
 * Replaces the sheet's contents while open. Plain list + substring search — no
 * cmdk here, whose keyboard highlight paints the first row as if it were
 * selected on a touch screen.
 */
const MobilePicker: React.FC<{
  field: MultiSelectFieldDef;
  selected: string[];
  onChange: (next: string[]) => void;
  onBack: () => void;
}> = ({ field, selected, onChange, onBack }) => {
  const [query, setQuery] = useState("");
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const options =
    tokens.length === 0
      ? field.options
      : field.options.filter((o) => {
          const label = o.label.toLowerCase();
          return tokens.every((t) => label.includes(t));
        });
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter((x) => x !== val) : [...selected, val]);

  return (
    <>
      <div className="shrink-0 border-b px-2 pb-3 pt-2">
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onBack} aria-label="Back to filters">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <SheetTitle className="min-w-0 flex-1 truncate text-base">{field.label}</SheetTitle>
          <Button
            variant="ghost"
            className="h-11 shrink-0 px-3 text-sm"
            disabled={selected.length === 0}
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        </div>
        {field.options.length > CHIP_OPTION_LIMIT && (
          <div className="mx-2 mt-1 flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={field.searchPlaceholder ?? `Search ${field.label.toLowerCase()}...`}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="p-1 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
        {options.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No match found.</p>
        ) : (
          <ul className="divide-y">
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(o.value)}
                    className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left focus-visible:outline-none focus-visible:bg-muted"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}
                      aria-hidden
                    >
                      {checked && <Check className="h-4 w-4" />}
                    </span>
                    <span className={cn("min-w-0 flex-1 text-sm", checked && "font-medium")}>{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button className="h-12 w-full text-base font-semibold" onClick={onBack}>
          {selected.length > 0 ? `Done · ${selected.length} selected` : "Done"}
        </Button>
      </div>
    </>
  );
};

/* --------------------------------- the bar --------------------------------- */

export const EntityFilterBar: React.FC<EntityFilterBarProps> = ({
  entityName,
  fields,
  values,
  onChange,
  onClearAll,
  resultCount,
  actions,
  quickFilters,
  className,
}) => {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const pickerField = pickerKey
    ? (fields.find((f) => f.key === pickerKey && f.kind === "multiSelect") as MultiSelectFieldDef | undefined)
    : undefined;

  const searchField = fields.find((f) => f.kind === "search");
  const facetFields = fields.filter((f) => f.kind !== "search");
  const activeCount = facetFields.filter((f) => isFieldActive(f, values)).length;
  const searchActive = searchField ? isFieldActive(searchField, values) : false;
  const anyActive = activeCount > 0 || searchActive;
  const chips = buildChips(fields, values, onChange);

  const searchInput = searchField ? (
    <div
      className={cn(
        "flex h-9 grow basis-[220px] min-w-[160px] items-center gap-2 rounded-md border border-input bg-background pl-2.5 pr-1.5",
        "focus-within:border-foreground/40 focus-within:shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.15)]"
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        placeholder={(searchField as { placeholder?: string }).placeholder ?? `Search ${entityName.toLowerCase()}...`}
        value={(values[searchField.key] as string) ?? ""}
        onChange={(e) => onChange({ [searchField.key]: e.target.value })}
        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
      {searchActive && (
        <button
          onClick={() => onChange({ [searchField.key]: "" })}
          className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {searchInput}

        {/* Desktop: inline facet buttons (wrap freely, never squish) */}
        {!isMobile &&
          facetFields.map((field) => (
            <div key={field.key} className="shrink-0">
              <DesktopFacet field={field} values={values} onChange={onChange} />
            </div>
          ))}

        {/* Mobile: single Filters button → sheet */}
        {isMobile && facetFields.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className={cn("h-10 gap-1.5 shrink-0 px-3", activeCount > 0 && "border-primary/60 bg-primary/5")}
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-sm">Filters</span>
            {activeCount > 0 && (
              <Badge className="h-5 px-1.5 text-[11px] font-semibold">{activeCount}</Badge>
            )}
          </Button>
        )}

        {isMobile &&
          quickFilters?.map((q) => (
            <button
              key={q.id}
              type="button"
              aria-pressed={q.active}
              onClick={q.onToggle}
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                q.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              )}
            >
              {q.label}
            </button>
          ))}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {resultCount !== undefined && (
            <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
              {resultCount} result{resultCount !== 1 ? "s" : ""}
            </span>
          )}
          {actions}
          {anyActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      <ChipRow chips={chips} />

      {/* Mobile sheet: fixed header + footer, one scrolling body, pickers for long lists */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setPickerKey(null);
        }}
      >
        <SheetContent
          side="bottom"
          hideCloseButton
          aria-describedby={undefined}
          className="flex h-[88dvh] max-h-[88dvh] flex-col gap-0 rounded-t-2xl p-0"
        >
          {pickerField ? (
            <MobilePicker
              field={pickerField}
              selected={(values[pickerField.key] as string[]) ?? []}
              onChange={(next) => onChange({ [pickerField.key]: next })}
              onBack={() => setPickerKey(null)}
            />
          ) : (
            <>
              <div className="shrink-0 border-b px-4 pb-2 pt-2">
                <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
                <div className="flex items-center gap-1">
                  <SheetTitle className="min-w-0 flex-1 truncate text-base">Filter {entityName}</SheetTitle>
                  <Button
                    variant="ghost"
                    className="h-11 shrink-0 px-3 text-sm"
                    onClick={onClearAll}
                    disabled={!anyActive}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 h-11 w-11 shrink-0"
                    onClick={() => setSheetOpen(false)}
                    aria-label="Close filters"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain touch-pan-y px-4 py-4">
                {facetFields.map((field) => (
                  <MobileSheetField
                    key={field.key}
                    field={field}
                    values={values}
                    onChange={onChange}
                    onOpenPicker={setPickerKey}
                  />
                ))}
              </div>

              <div className="shrink-0 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button className="h-12 w-full text-base font-semibold" onClick={() => setSheetOpen(false)}>
                  {resultCount !== undefined
                    ? `Show ${resultCount} result${resultCount !== 1 ? "s" : ""}`
                    : "Done"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

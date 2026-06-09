import React, { useState } from "react";
import { format } from "date-fns";
import { Search, X, ChevronDown, SlidersHorizontal, CalendarDays } from "lucide-react";
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
  SheetHeader,
  SheetTitle,
  SheetFooter,
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
  className?: string;
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
}> = ({ value, onChange }) => {
  const active = matchDateRangePreset(value);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {DATE_RANGE_PRESETS.map(({ preset, label }) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={active === preset ? "default" : "outline"}
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => onChange(presetToDateRange(preset))}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={active === "custom" ? "default" : "outline"}
          className="h-7 rounded-full px-3 text-xs"
          onClick={() => onChange({ start: value.start, end: value.end })}
        >
          Custom
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <DatePickerPopover
          value={value.start ?? undefined}
          onSelect={(d) => onChange({ ...value, start: d ?? null })}
          placeholder="Start"
          dateFormat="MMM dd, yyyy"
          size="sm"
          triggerClassName="h-8 flex-1 text-xs"
          iconClassName="h-3 w-3 mr-1"
        />
        <DatePickerPopover
          value={value.end ?? undefined}
          onSelect={(d) => onChange({ ...value, end: d ?? null })}
          placeholder="End"
          dateFormat="MMM dd, yyyy"
          size="sm"
          triggerClassName="h-8 flex-1 text-xs"
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

const MobileSheetField: React.FC<{
  field: FilterFieldDef;
  values: FilterValues;
  onChange: (patch: FilterValues) => void;
}> = ({ field, values, onChange }) => {
  if (field.kind === "search") return null;

  const label = (field as { label?: string }).label;

  if (field.kind === "select") {
    const v = (values[field.key] as string | null) ?? null;
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={!v ? "default" : "outline"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onChange({ [field.key]: null })}
          >
            {field.allLabel ?? "All"}
          </Button>
          {field.options.map((o) => (
            <Button
              key={o.value}
              size="sm"
              variant={v === o.value ? "default" : "outline"}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => onChange({ [field.key]: o.value })}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "text") {
    const text = (values[field.key] as string) ?? "";
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</p>
        <Input
          placeholder={field.placeholder ?? field.label}
          value={text}
          onChange={(e) => onChange({ [field.key]: e.target.value })}
          className="h-9"
        />
      </div>
    );
  }

  if (field.kind === "multiSelect") {
    const selected = (values[field.key] as string[]) ?? [];
    const toggle = (val: string) =>
      onChange({
        [field.key]: selected.includes(val)
          ? selected.filter((x) => x !== val)
          : [...selected, val],
      });
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</p>
        <div className="rounded-md border max-h-56 overflow-y-auto">
          <MultiSelectList
            field={field}
            selected={selected}
            onToggle={toggle}
            onSetAll={(vals) => onChange({ [field.key]: vals })}
          />
        </div>
      </div>
    );
  }

  if (field.kind === "dateRange") {
    const dr = (values[field.key] as DateRangeValue) ?? { start: null, end: null };
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</p>
        <DateRangeControl value={dr} onChange={(next) => onChange({ [field.key]: next })} />
      </div>
    );
  }

  if (field.kind === "period") {
    const p = (values[field.key] as TimePeriodValue) ?? { preset: "all", dateFrom: null, dateTo: null };
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</p>
        <TimePeriodFilter value={p} onChange={(next) => onChange({ [field.key]: next })} />
      </div>
    );
  }

  if (field.kind !== "numberRange") return null;

  const nr = (values[field.key] as NumberRangeValue) ?? { min: null, max: null };
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</p>
      <NumberRangeControl field={field} value={nr} onChange={(next) => onChange({ [field.key]: next })} />
    </div>
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
  className,
}) => {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const searchField = fields.find((f) => f.kind === "search");
  const facetFields = fields.filter((f) => f.kind !== "search");
  const activeCount = facetFields.filter((f) => isFieldActive(f, values)).length;
  const searchActive = searchField ? isFieldActive(searchField, values) : false;
  const anyActive = activeCount > 0 || searchActive;
  const chips = buildChips(fields, values, onChange);

  const searchInput = searchField ? (
    <div
      className={cn(
        "flex h-9 flex-1 min-w-0 items-center gap-2 rounded-md border border-input bg-background pl-2.5 pr-1.5",
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
      <div className="flex items-center gap-2">
        {searchInput}

        {/* Desktop: inline facet buttons */}
        {!isMobile && (
          <div className="flex flex-wrap items-center gap-1.5">
            {facetFields.map((field) => (
              <DesktopFacet key={field.key} field={field} values={values} onChange={onChange} />
            ))}
          </div>
        )}

        {/* Mobile: single Filters button → sheet */}
        {isMobile && facetFields.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9 gap-1.5 shrink-0", activeCount > 0 && "border-primary/60 bg-primary/5")}
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-xs">Filters</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-semibold">
                {activeCount}
              </Badge>
            )}
          </Button>
        )}

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

      {/* Mobile sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Filter {entityName}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            {facetFields.map((field) => (
              <MobileSheetField key={field.key} field={field} values={values} onChange={onChange} />
            ))}
          </div>
          <SheetFooter className="flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClearAll}
              disabled={!anyActive}
            >
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => setSheetOpen(false)}>
              {resultCount !== undefined ? `Show ${resultCount} result${resultCount !== 1 ? "s" : ""}` : "Done"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

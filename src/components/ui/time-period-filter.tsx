import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePickerPopover } from "@/components/ui/date-picker-popover";
import { cn } from "@/lib/utils";
import {
  TimePeriodPreset,
  TimePeriodValue,
  TIME_PERIOD_LABELS,
  getPresetRange,
} from "@/utils/timePeriodPresets";

const PRESETS: TimePeriodPreset[] = [
  "all",
  "this_month",
  "last_month",
  "last_30",
  "this_quarter",
  "ytd",
  "custom",
];

interface TimePeriodFilterProps {
  value: TimePeriodValue;
  onChange: (value: TimePeriodValue) => void;
  /** Visual size of the pill row. `"sm"` matches the `h-9` filter row; `"md"` is for prominent placement. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Standard time period filter — preset pill buttons (All Time / This Month / Last Month
 * / Last 30 / This Quarter / YTD / Custom). Selecting "Custom" reveals two date pickers.
 *
 * Returns ISO date strings (`yyyy-MM-dd`) suitable for direct PostgREST `.gte`/`.lte`
 * filtering on date-only columns (e.g. `expenses.expense_date`, `project_revenues.invoice_date`).
 */
export const TimePeriodFilter: React.FC<TimePeriodFilterProps> = ({
  value,
  onChange,
  size = "sm",
  className,
}) => {
  const buttonHeight = size === "md" ? "h-8" : "h-7";

  const handlePresetClick = (preset: TimePeriodPreset) => {
    if (preset === "custom") {
      onChange({ ...value, preset: "custom" });
      return;
    }
    const range = getPresetRange(preset);
    onChange({ preset, ...range });
  };

  const handleCustomDate = (which: "from" | "to", date: Date | undefined) => {
    const iso = date ? format(date, "yyyy-MM-dd") : null;
    onChange({
      preset: "custom",
      dateFrom: which === "from" ? iso : value.dateFrom,
      dateTo: which === "to" ? iso : value.dateTo,
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((p) => {
          const active = value.preset === p;
          return (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className={cn(buttonHeight, "rounded-full px-3 text-xs")}
              onClick={() => handlePresetClick(p)}
            >
              {TIME_PERIOD_LABELS[p]}
            </Button>
          );
        })}
      </div>
      {value.preset === "custom" && (
        <div className="flex flex-col sm:flex-row gap-2">
          <DatePickerPopover
            value={value.dateFrom ? new Date(value.dateFrom) : undefined}
            onSelect={(d) => handleCustomDate("from", d)}
            placeholder="Start"
            dateFormat="MMM dd, yyyy"
            size="sm"
            triggerClassName={cn(buttonHeight, "flex-1 text-xs")}
            iconClassName="h-3 w-3 mr-1"
          />
          <DatePickerPopover
            value={value.dateTo ? new Date(value.dateTo) : undefined}
            onSelect={(d) => handleCustomDate("to", d)}
            placeholder="End"
            dateFormat="MMM dd, yyyy"
            size="sm"
            triggerClassName={cn(buttonHeight, "flex-1 text-xs")}
            iconClassName="h-3 w-3 mr-1"
          />
        </div>
      )}
    </div>
  );
};


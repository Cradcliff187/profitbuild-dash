import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerPopoverProps {
  /** Selected date. */
  value: Date | undefined;
  /**
   * Called with the new value when the user picks a date.
   * Receives `undefined` if the user clicks the already-selected date (deselect).
   */
  onSelect: (date: Date | undefined) => void;
  /** Placeholder shown when no date is selected. */
  placeholder?: React.ReactNode;
  /** date-fns format string. Default: `"PPP"`. */
  dateFormat?: string;
  /** Disable the trigger button. */
  disabled?: boolean;
  /** Function to disable specific days in the calendar (e.g. block future dates). */
  disabledDays?: (date: Date) => boolean;
  /** Override className on the trigger button (e.g. `"h-9"` for compact, `"min-h-[48px]"` for mobile). */
  triggerClassName?: string;
  /** Trigger button size (forwarded to shadcn Button). */
  size?: "default" | "sm" | "lg";
  /**
   * Where the calendar icon sits in the trigger.
   * - `"start"` (default): `<icon> <value>` — block layout with `justify-start`.
   * - `"end"`: `<value> <icon>` — shadcn RHF Form layout with `pl-3` and a faded right-aligned icon.
   */
  iconPlacement?: "start" | "end";
  /**
   * Override the calendar icon's className. Defaults differ by placement:
   * - `"start"` → `"mr-2 h-4 w-4"`
   * - `"end"` → `"ml-auto h-4 w-4 opacity-50"`
   * Useful for compact filter buttons (e.g. `"h-3 w-3 mr-1"`).
   */
  iconClassName?: string;
  /** Popover alignment. Default: `"start"`. */
  align?: "start" | "center" | "end";
  /** Optional ID for label `htmlFor` association. */
  id?: string;
  /** Forwarded to react-day-picker. Default: `true`. */
  initialFocus?: boolean;
}

/**
 * Date picker built on `Popover` + `Calendar`. Auto-dismisses on selection.
 *
 * Replaces the inline `<Popover><PopoverTrigger><Button>...<Calendar /></PopoverContent></Popover>`
 * boilerplate. The inline pattern leaves the popover open after pick because nothing closes it;
 * this wrapper owns the open state and closes on a real selection.
 */
export function DatePickerPopover({
  value,
  onSelect,
  placeholder = "Pick a date",
  dateFormat = "PPP",
  disabled,
  disabledDays,
  triggerClassName,
  size,
  iconPlacement = "start",
  iconClassName,
  align = "start",
  id,
  initialFocus = true,
}: DatePickerPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    onSelect(date);
    // Close on a real pick. On deselect (clicking the already-selected date),
    // keep the popover open so the user can re-pick without re-opening it.
    if (date) {
      setOpen(false);
    }
  };

  const valueText = value ? format(value, dateFormat) : <span>{placeholder}</span>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size={size}
          disabled={disabled}
          className={cn(
            "w-full text-left font-normal",
            iconPlacement === "start" ? "justify-start" : "pl-3",
            !value && "text-muted-foreground",
            triggerClassName,
          )}
        >
          {iconPlacement === "start" ? (
            <>
              <CalendarIcon className={cn("mr-2 h-4 w-4", iconClassName)} />
              {valueText}
            </>
          ) : (
            <>
              {valueText}
              <CalendarIcon className={cn("ml-auto h-4 w-4 opacity-50", iconClassName)} />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledDays}
          initialFocus={initialFocus}
        />
      </PopoverContent>
    </Popover>
  );
}

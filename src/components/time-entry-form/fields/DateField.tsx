import { DatePickerPopover } from '@/components/ui/date-picker-popover';
import { parseDateOnly, formatDateForDB } from '@/utils/dateUtils';

export interface DateFieldProps {
  /** YYYY-MM-DD */
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
}

export function DateField({ value, onChange, disabled = false }: DateFieldProps) {
  const date = value ? parseDateOnly(value) : undefined;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Date *</label>
      <DatePickerPopover
        value={date}
        onSelect={(d) => d && onChange(formatDateForDB(d))}
        placeholder="Select date..."
        dateFormat="EEE, MMM d, yyyy"
        triggerClassName="min-h-[48px]"
        disabled={disabled}
      />
    </div>
  );
}

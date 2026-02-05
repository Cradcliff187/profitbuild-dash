import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TimePickerButtonProps {
  label: string;
  /** HH:mm 24h format */
  value: string;
  onTap: () => void;
  disabled?: boolean;
  className?: string;
  /** Shown when value is empty (display only, not form state) */
  placeholder?: string;
}

/** Format HH:mm to 12-hour display e.g. "8:00 AM", "5:00 PM" */
export function formatTime12h(hhmm: string): string {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return '--:-- --';
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return '--:-- --';
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${mStr.padStart(2, '0')} ${period}`;
}

export function TimePickerButton({
  label,
  value,
  onTap,
  disabled = false,
  className,
  placeholder = '--:-- --',
}: TimePickerButtonProps) {
  const displayText = value ? formatTime12h(value) : placeholder;
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full min-h-[48px] justify-start text-left font-normal',
          className
        )}
        onClick={onTap}
        disabled={disabled}
      >
        <span
          className={value ? 'text-foreground' : 'text-muted-foreground'}
        >
          {displayText}
        </span>
      </Button>
    </div>
  );
}

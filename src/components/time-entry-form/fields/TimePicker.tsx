import { useState, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MINUTES = [0, 15, 30, 45] as const;
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

/** Parse HH:mm 24h string to { hour12, minute, isPM } */
function parseTime24(hhmm: string): {
  hour12: number;
  minute: number;
  isPM: boolean;
} {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) {
    return { hour12: 12, minute: 0, isPM: false };
  }
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = Math.min(59, Math.max(0, parseInt(mStr, 10)));
  const roundedMinute = (MINUTES.find((x) => x >= m) ?? MINUTES[MINUTES.length - 1]) as number;
  if (h === 0) return { hour12: 12, minute: roundedMinute, isPM: false };
  if (h === 12) return { hour12: 12, minute: roundedMinute, isPM: true };
  if (h < 12) return { hour12: h, minute: roundedMinute, isPM: false };
  return { hour12: h - 12, minute: roundedMinute, isPM: true };
}

/** Build HH:mm 24h from hour12, minute, isPM */
function toTime24(hour12: number, minute: number, isPM: boolean): string {
  let h = hour12;
  if (isPM && hour12 !== 12) h += 12;
  if (!isPM && hour12 === 12) h = 0;
  const m = MINUTES.includes(minute as (typeof MINUTES)[number]) ? minute : 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface TimePickerProps {
  /** HH:mm 24h */
  value: string;
  onChange: (hhmm: string) => void;
  trigger: React.ReactNode;
  disabled?: boolean;
  /** Use larger popover on mobile when inside sheet */
  isMobile?: boolean;
}

export function TimePicker({
  value,
  onChange,
  trigger,
  disabled = false,
  isMobile = false,
}: TimePickerProps) {
  const parsed = parseTime24(value);
  const [open, setOpen] = useState(false);
  const [hour12, setHour12] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [isPM, setIsPM] = useState(parsed.isPM);

  const syncFromValue = useCallback(() => {
    const p = parseTime24(value);
    setHour12(p.hour12);
    setMinute(p.minute);
    setIsPM(p.isPM);
  }, [value]);

  const handleOpenChange = (next: boolean) => {
    if (next) syncFromValue();
    setOpen(next);
  };

  const apply = () => {
    onChange(toTime24(hour12, minute, isPM));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className={cn(
          'w-[280px] p-4',
          isMobile && 'max-w-[min(320px,calc(100vw-2rem))]'
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">
              Hour
            </div>
            <div className="grid grid-cols-4 gap-2">
              {HOURS_12.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={cn(
                    'min-h-[48px] min-w-[48px] rounded-lg text-sm font-medium transition-colors',
                    hour12 === h
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-muted'
                  )}
                  onClick={() => setHour12(h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div>
              <div className="text-xs text-muted-foreground font-medium mb-1">
                Min
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      'min-h-[48px] min-w-[48px] rounded-lg text-sm font-medium transition-colors',
                      minute === m
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    )}
                    onClick={() => setMinute(m)}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium mb-1">
                AM/PM
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(
                    'min-h-[48px] min-w-[48px] rounded-lg text-sm font-medium transition-colors',
                    !isPM
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-muted'
                  )}
                  onClick={() => setIsPM(false)}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={cn(
                    'min-h-[48px] min-w-[48px] rounded-lg text-sm font-medium transition-colors',
                    isPM
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-muted'
                  )}
                  onClick={() => setIsPM(true)}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { Coffee } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LUNCH_DURATION_OPTIONS } from '@/utils/timeEntryCalculations';

export interface LunchSectionProps {
  lunchTaken: boolean;
  onLunchTakenChange: (value: boolean) => void;
  lunchDuration: number;
  onLunchDurationChange: (value: number) => void;
  disabled?: boolean;
  isMobile?: boolean;
  isPTO?: boolean;
}

export function LunchSection({
  lunchTaken,
  onLunchTakenChange,
  lunchDuration,
  onLunchDurationChange,
  disabled = false,
  isMobile = false,
  isPTO = false,
}: LunchSectionProps) {
  if (isPTO) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between min-h-[48px]">
        <Label
          htmlFor="lunch-toggle"
          className="flex items-center gap-2 cursor-pointer"
        >
          <Coffee className="w-4 h-4 text-muted-foreground" />
          Lunch Break Taken
        </Label>
        <Switch
          id="lunch-toggle"
          checked={lunchTaken}
          onCheckedChange={onLunchTakenChange}
          disabled={disabled}
        />
      </div>
      {lunchTaken && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Lunch Duration
          </Label>
          <div
            className={cn(
              'grid gap-2',
              isMobile ? 'grid-cols-3' : 'grid-cols-4'
            )}
          >
            {LUNCH_DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLunchDurationChange(option.value)}
                disabled={disabled}
                className={cn(
                  'min-h-[48px] px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                  lunchDuration === option.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted border-border'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

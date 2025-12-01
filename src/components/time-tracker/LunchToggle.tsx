import React from 'react';
import { Coffee } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LUNCH_DURATION_OPTIONS, DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';

interface LunchToggleProps {
  lunchTaken: boolean;
  onLunchTakenChange: (value: boolean) => void;
  lunchDuration: number;
  onLunchDurationChange: (value: number) => void;
  disabled?: boolean;
  isMobile?: boolean;
  compact?: boolean;  // For inline display in clock-out flow
}

export const LunchToggle: React.FC<LunchToggleProps> = ({
  lunchTaken,
  onLunchTakenChange,
  lunchDuration,
  onLunchDurationChange,
  disabled = false,
  isMobile = false,
  compact = false,
}) => {
  if (compact) {
    // Compact version for clock-out prompt
    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Take lunch?</span>
          </div>
          <Switch
            checked={lunchTaken}
            onCheckedChange={onLunchTakenChange}
            disabled={disabled}
          />
        </div>
        
        {lunchTaken && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {LUNCH_DURATION_OPTIONS.slice(0, 4).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLunchDurationChange(option.value)}
                disabled={disabled}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  "min-h-[44px]", // 48px touch target
                  lunchDuration === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version for forms
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label 
          htmlFor="lunch-toggle" 
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            isMobile ? "text-sm font-medium" : "text-sm"
          )}
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
          <div className={cn(
            "grid gap-2",
            isMobile ? "grid-cols-3" : "grid-cols-4"
          )}>
            {LUNCH_DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLunchDurationChange(option.value)}
                disabled={disabled}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                  isMobile ? "min-h-[48px]" : "min-h-[36px]",
                  lunchDuration === option.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted border-border"
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
};


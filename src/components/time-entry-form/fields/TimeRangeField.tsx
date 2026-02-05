import { TimePickerButton } from './TimePickerButton';
import { TimePicker } from './TimePicker';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface TimeRangeFieldProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (hhmm: string) => void;
  onEndTimeChange: (hhmm: string) => void;
  disabled?: boolean;
}

export function TimeRangeField({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
}: TimeRangeFieldProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn('grid grid-cols-2 gap-3')}>
      <TimePicker
        value={startTime}
        onChange={onStartTimeChange}
        disabled={disabled}
        isMobile={isMobile}
        trigger={
          <div className="min-h-[48px]">
            <TimePickerButton
              label="Start"
              value={startTime}
              onTap={() => {}}
              disabled={disabled}
              className="min-h-[48px] w-full"
              placeholder="8:00 AM"
            />
          </div>
        }
      />
      <TimePicker
        value={endTime}
        onChange={onEndTimeChange}
        disabled={disabled}
        isMobile={isMobile}
        trigger={
          <div className="min-h-[48px]">
            <TimePickerButton
              label="End"
              value={endTime}
              onTap={() => {}}
              disabled={disabled}
              className="min-h-[48px] w-full"
              placeholder="5:00 PM"
            />
          </div>
        }
      />
    </div>
  );
}

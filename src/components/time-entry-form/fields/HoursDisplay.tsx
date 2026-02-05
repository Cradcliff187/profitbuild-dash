import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface HoursDisplayProps {
  grossHours: number;
  lunchHours: number;
  netHours: number;
  isAutoCalculated: boolean;
  manualHours: number;
  onManualHoursChange: (hours: number) => void;
  isPTO: boolean;
}

export function HoursDisplay({
  grossHours,
  lunchHours,
  netHours,
  isAutoCalculated,
  manualHours,
  onManualHoursChange,
  isPTO,
}: HoursDisplayProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      <Label>Hours *</Label>
      {isPTO ? (
        <Input
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          value={manualHours > 0 ? String(manualHours) : ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onManualHoursChange(isNaN(v) ? 0 : v);
          }}
          placeholder="8"
          className={cn('min-h-[48px] min-w-0', isMobile && 'text-base')}
          style={isMobile ? { fontSize: '16px' } : undefined}
        />
      ) : isAutoCalculated && netHours > 0 ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shift</span>
            <span>{grossHours.toFixed(1)}h</span>
          </div>
          {lunchHours > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lunch</span>
              <span>-{lunchHours.toFixed(1)}h</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-1 border-t">
            <span>Paid</span>
            <span>{netHours.toFixed(1)}h</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground text-center">
          Set start & end times
        </div>
      )}
    </div>
  );
}

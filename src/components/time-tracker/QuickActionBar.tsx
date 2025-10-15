import { Play, Plus, CheckCircle2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionBarProps {
  onClockIn: () => void;
  onManualEntry: () => void;
  onApprove: () => void;
  onClockOut?: () => void;
  activeTimer?: {
    worker: { payee_name: string };
    project: { project_number: string };
  } | null;
  elapsedTime?: string;
  disabled?: boolean;
}

export const QuickActionBar = ({
  onClockIn,
  onManualEntry,
  onApprove,
  onClockOut,
  activeTimer,
  elapsedTime,
  disabled = false,
}: QuickActionBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50 hidden md:block">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onClockIn}
            disabled={!!activeTimer || disabled}
            className="h-8"
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            Clock In
          </Button>
          <Button size="sm" variant="outline" onClick={onManualEntry} className="h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Manual Entry
          </Button>
          <Button size="sm" variant="outline" onClick={onApprove} className="h-8">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Approve
          </Button>
        </div>

        {activeTimer && (
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              {activeTimer.worker.payee_name} • {activeTimer.project.project_number}
            </div>
            <div className="font-mono font-bold text-green-600 text-sm">
              {elapsedTime || '00:00:00'}
            </div>
            {onClockOut && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onClockOut}
                disabled={disabled}
                className="h-8"
              >
                <Square className="w-3.5 h-3.5 mr-1" />
                Clock Out
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

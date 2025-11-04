import React from 'react';
import { ScheduleWarning } from '@/types/schedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ScheduleWarningBannerProps {
  warnings: ScheduleWarning[];
  onDismiss: (warningId: string) => void;
  onAdjust: (taskId: string) => void;
}

export default function ScheduleWarningBanner({ warnings, onDismiss, onAdjust }: ScheduleWarningBannerProps) {
  if (warnings.length === 0) return null;

  const getIcon = (severity: ScheduleWarning['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (severity: ScheduleWarning['severity']) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
    }
  };

  return (
    <div className="space-y-2">
      {warnings.map(warning => (
        <Alert key={warning.id} variant={getVariant(warning.severity)}>
          {getIcon(warning.severity)}
          <AlertTitle className="flex items-center justify-between">
            <span>Scheduling Notice</span>
            {warning.canDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onDismiss(warning.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2">{warning.message}</p>
            {warning.suggestion && (
              <p className="text-sm opacity-80 mb-2">Suggestion: {warning.suggestion}</p>
            )}
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDismiss(warning.id)}
              >
                Dismiss
              </Button>
              <Button 
                size="sm"
                onClick={() => onAdjust(warning.task_id)}
              >
                Adjust Schedule
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}


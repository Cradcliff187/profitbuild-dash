import { format } from 'date-fns';
import { Moon } from 'lucide-react';
import { parseDateOnly } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

export interface OvernightIndicatorProps {
  isOvernight: boolean;
  /** Next-day date YYYY-MM-DD for display */
  endDate: string;
  className?: string;
}

export function OvernightIndicator({
  isOvernight,
  endDate,
  className,
}: OvernightIndicatorProps) {
  if (!isOvernight) return null;

  const date = parseDateOnly(endDate);

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground',
        className
      )}
      role="status"
    >
      <Moon className="h-4 w-4 shrink-0" />
      <span>Overnight shift — ends {format(date, 'MMM d')}</span>
    </div>
  );
}

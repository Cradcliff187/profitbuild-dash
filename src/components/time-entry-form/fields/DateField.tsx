import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/utils/dateUtils';
import { formatDateForDB } from '@/utils/dateUtils';

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
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full min-h-[48px] justify-start text-left font-normal'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'EEE, MMM d, yyyy') : 'Select date...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onChange(formatDateForDB(d))}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

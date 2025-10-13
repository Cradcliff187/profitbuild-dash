import { useState } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronDown } from "lucide-react";

interface TimesheetWeekSelectorProps {
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
}

type WeekPreset = 'this-week' | 'last-week' | 'custom';

export function TimesheetWeekSelector({ startDate, endDate, onChange }: TimesheetWeekSelectorProps) {
  const [preset, setPreset] = useState<WeekPreset>('this-week');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(startDate);

  const handlePresetChange = (newPreset: WeekPreset) => {
    setPreset(newPreset);
    
    if (newPreset === 'this-week') {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const end = addDays(start, 4); // Monday to Friday
      onChange(start, end);
    } else if (newPreset === 'last-week') {
      const lastWeekDate = subWeeks(new Date(), 1);
      const start = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
      const end = addDays(start, 4); // Monday to Friday
      onChange(start, end);
    } else {
      setShowCustomPicker(true);
    }
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomStart(date);
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = addDays(start, 4); // Monday to Friday
      onChange(start, end);
      setShowCustomPicker(false);
    }
  };

  const getDisplayText = () => {
    if (preset === 'this-week') return 'This Week';
    if (preset === 'last-week') return 'Last Week';
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
  };

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between w-full">
            <span className="text-xs">{getDisplayText()}</span>
            <ChevronDown className="h-3 w-3 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            <Button
              variant={preset === 'this-week' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handlePresetChange('this-week')}
            >
              This Week
            </Button>
            <Button
              variant={preset === 'last-week' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handlePresetChange('last-week')}
            >
              Last Week
            </Button>
            <Button
              variant={preset === 'custom' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handlePresetChange('custom')}
            >
              <CalendarIcon className="h-3 w-3 mr-2" />
              Custom Week
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {showCustomPicker && (
        <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customStart}
              onSelect={handleCustomDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

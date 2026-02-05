import { useMemo } from 'react';
import { addDays } from 'date-fns';
import { parseDateOnly, formatDateForDB } from '@/utils/dateUtils';
import { buildTimeEntryDateTimes } from '@/utils/timeEntryCalculations';

export interface UseOvernightDetectionParams {
  date: string;
  startTime: string;
  endTime: string;
}

export interface UseOvernightDetectionResult {
  isOvernight: boolean;
  adjustedEndDate: string;
  startDateTime: Date | null;
  endDateTime: Date | null;
}

/**
 * Detects when shift crosses midnight (endTime <= startTime in HH:mm)
 * and returns overnight-adjusted end date and Date objects.
 */
export function useOvernightDetection({
  date,
  startTime,
  endTime,
}: UseOvernightDetectionParams): UseOvernightDetectionResult {
  return useMemo(() => {
    if (!date || !startTime || !endTime) {
      return {
        isOvernight: false,
        adjustedEndDate: date ?? '',
        startDateTime: null,
        endDateTime: null,
      };
    }

    const { startDateTime, endDateTime, isOvernight } = buildTimeEntryDateTimes(
      date,
      startTime,
      endTime
    );

    const adjustedEndDate = isOvernight
      ? formatDateForDB(addDays(parseDateOnly(date), 1))
      : date;

    return {
      isOvernight,
      adjustedEndDate,
      startDateTime,
      endDateTime,
    };
  }, [date, startTime, endTime]);
}

import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  calculateTimeEntryHours,
  DEFAULT_LUNCH_DURATION,
} from '@/utils/timeEntryCalculations';
import { useOvernightDetection } from './useOvernightDetection';
import { buildTimeEntryDateTimes } from '@/utils/timeEntryCalculations';

const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

export interface TimeEntryFormData {
  workerId: string;
  projectId: string;
  date: string;
  startTime: Date | null;
  endTime: Date | null;
  hours: number;
  grossHours: number;
  lunchTaken: boolean;
  lunchDurationMinutes: number;
  isOvernight: boolean;
  isPTO: boolean;
}

export interface TimeEntryFormInitialValues {
  workerId: string;
  projectId: string;
  /** Project number (e.g. "007-VAC") for PTO detection in edit mode */
  projectNumber?: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  lunchTaken: boolean;
  lunchDurationMinutes: number;
}

export interface UseTimeEntryFormOptions {
  initialValues?: Partial<TimeEntryFormInitialValues>;
  /** Project number of the currently selected project (e.g. "007-VAC"). Used to derive isPTO. */
  selectedProjectNumber?: string | null;
}

export function useTimeEntryForm(options: UseTimeEntryFormOptions = {}) {
  const {
    initialValues = {},
    selectedProjectNumber: selectedProjectNumberProp = null,
  } = options;
  const selectedProjectNumber =
    selectedProjectNumberProp ?? initialValues.projectNumber ?? null;

  const [workerId, setWorkerId] = useState(initialValues.workerId ?? '');
  const [projectId, setProjectId] = useState(initialValues.projectId ?? '');
  const [date, setDate] = useState(
    initialValues.date ?? format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(initialValues.startTime ?? '');
  const [endTime, setEndTime] = useState(initialValues.endTime ?? '');
  const [lunchTaken, setLunchTaken] = useState(
    initialValues.lunchTaken ?? false
  );
  const [lunchDuration, setLunchDuration] = useState(
    initialValues.lunchDurationMinutes ?? DEFAULT_LUNCH_DURATION
  );
  const [manualHours, setManualHours] = useState(initialValues.hours ?? 0);

  const overnight = useOvernightDetection({ date, startTime, endTime });

  const isPTO = useMemo(
    () =>
      Boolean(
        selectedProjectNumber &&
          PTO_PROJECT_NUMBERS.includes(selectedProjectNumber)
      ),
    [selectedProjectNumber]
  );

  const hasTimes = startTime && endTime && date;
  const isAutoCalculated = hasTimes && !isPTO;

  const { grossHours, netHours, lunchHours } = useMemo(() => {
    if (!isAutoCalculated || !overnight.startDateTime || !overnight.endDateTime) {
      return {
        grossHours: 0,
        netHours: 0,
        lunchHours: 0,
      };
    }
    const result = calculateTimeEntryHours(
      overnight.startDateTime,
      overnight.endDateTime,
      lunchTaken,
      lunchDuration
    );
    return {
      grossHours: result.grossHours,
      netHours: result.netHours,
      lunchHours: result.lunchHours,
    };
  }, [
    isAutoCalculated,
    overnight.startDateTime,
    overnight.endDateTime,
    lunchTaken,
    lunchDuration,
  ]);

  const effectiveNetHours = isAutoCalculated ? netHours : manualHours;

  const getFormData = useCallback((): TimeEntryFormData => {
    let start: Date | null = null;
    let end: Date | null = null;
    let gross = 0;
    let overnightAdjusted = false;

    if (date && startTime && endTime && !isPTO) {
      const built = buildTimeEntryDateTimes(date, startTime, endTime);
      start = built.startDateTime;
      end = built.endDateTime;
      overnightAdjusted = built.isOvernight;
      const calc = calculateTimeEntryHours(
        start,
        end,
        lunchTaken,
        lunchDuration
      );
      gross = calc.grossHours;
    }

    return {
      workerId,
      projectId,
      date,
      startTime: start,
      endTime: end,
      hours: isAutoCalculated ? netHours : manualHours,
      grossHours: isAutoCalculated ? gross : manualHours,
      lunchTaken,
      lunchDurationMinutes: lunchDuration,
      isOvernight: overnightAdjusted,
      isPTO,
    };
  }, [
    workerId,
    projectId,
    date,
    startTime,
    endTime,
    isPTO,
    lunchTaken,
    lunchDuration,
    isAutoCalculated,
    netHours,
    manualHours,
  ]);

  return {
    workerId,
    setWorkerId,
    projectId,
    setProjectId,
    date,
    setDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    lunchTaken,
    setLunchTaken,
    lunchDuration,
    setLunchDuration,
    manualHours,
    setManualHours,
    isOvernight: overnight.isOvernight,
    adjustedEndDate: overnight.adjustedEndDate,
    isPTO,
    grossHours,
    netHours,
    lunchHours,
    isAutoCalculated,
    effectiveNetHours,
    getFormData,
  };
}

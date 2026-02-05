/**
 * Time Entry Calculation Utilities
 * 
 * ⚠️ IMPORTANT: These are for PRE-SAVE calculations only (forms, previews).
 * For displaying saved data, ALWAYS use database values:
 * - expenses.hours (net/billable)
 * - expenses.gross_hours (total shift duration)
 * 
 * These functions handle the core calculations for time entries,
 * including lunch break adjustments.
 */

export interface TimeEntryHours {
  grossHours: number;      // Total shift duration
  lunchHours: number;      // Lunch break duration (0 if not taken)
  netHours: number;        // Billable hours (gross - lunch)
}

/**
 * Calculate hours breakdown for a time entry
 * 
 * @param startTime - Shift start timestamp
 * @param endTime - Shift end timestamp
 * @param lunchTaken - Whether lunch was taken
 * @param lunchDurationMinutes - Lunch duration in minutes (default 30)
 * @returns Object with grossHours, lunchHours, and netHours
 */
export function calculateTimeEntryHours(
  startTime: Date,
  endTime: Date,
  lunchTaken: boolean = false,
  lunchDurationMinutes: number = 30
): TimeEntryHours {
  const grossHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const lunchHours = lunchTaken ? lunchDurationMinutes / 60 : 0;
  const netHours = Math.max(0, grossHours - lunchHours);
  
  return {
    grossHours: Math.round(grossHours * 100) / 100,
    lunchHours: Math.round(lunchHours * 100) / 100,
    netHours: Math.round(netHours * 100) / 100
  };
}

/**
 * Calculate the amount (cost) for a time entry
 * 
 * @param netHours - Net worked hours after lunch deduction
 * @param hourlyRate - Worker's hourly rate
 * @returns Amount in dollars
 */
export function calculateTimeEntryAmount(
  netHours: number,
  hourlyRate: number
): number {
  return Math.round(netHours * hourlyRate * 100) / 100;
}

/**
 * Format hours for display with optional lunch indicator
 * 
 * @param netHours - Net worked hours
 * @param lunchTaken - Whether lunch was taken
 * @param showLunchIndicator - Whether to show 🍴 icon
 * @returns Formatted string like "8.0" or "8.0 🍴"
 */
export function formatHoursDisplay(
  netHours: number,
  lunchTaken: boolean = false,
  showLunchIndicator: boolean = true
): string {
  const hoursStr = netHours.toFixed(1);
  return lunchTaken && showLunchIndicator ? `${hoursStr} 🍴` : hoursStr;
}

/**
 * Standard lunch duration options
 */
export const LUNCH_DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
] as const;

/**
 * Default lunch duration in minutes
 */
export const DEFAULT_LUNCH_DURATION = 30;

/**
 * Build start and end Date objects from date + HH:mm strings with overnight adjustment.
 * When endTime <= startTime (HH:mm comparison), end is treated as next calendar day.
 *
 * @param date - YYYY-MM-DD
 * @param startTime - HH:mm
 * @param endTime - HH:mm
 * @returns startDateTime, endDateTime (overnight-adjusted), isOvernight
 */
export function buildTimeEntryDateTimes(
  date: string,
  startTime: string,
  endTime: string
): { startDateTime: Date; endDateTime: Date; isOvernight: boolean } {
  // Use noon base to avoid timezone day-shift, then set time from HH:mm
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startDateTime = new Date(date + 'T12:00:00');
  startDateTime.setHours(startH, startM, 0, 0);
  const endDateTime = new Date(date + 'T12:00:00');
  endDateTime.setHours(endH, endM, 0, 0);

  const isOvernight = endTime <= startTime;
  if (isOvernight) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return { startDateTime, endDateTime, isOvernight };
}


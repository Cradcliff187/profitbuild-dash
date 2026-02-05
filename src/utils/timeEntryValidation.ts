import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface OverlapCheckResult {
  hasOverlap: boolean;
  overlappingEntries?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    description: string;
    projectName?: string;
  }>;
  message?: string;
}

/**
 * Check if a time range overlaps with existing entries
 */
export const checkTimeOverlap = async (
  payeeId: string,
  date: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string
): Promise<OverlapCheckResult> => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        id,
        start_time,
        end_time,
        description,
        projects (
          project_name,
          project_number
        )
      `)
      .eq('payee_id', payeeId)
      .eq('expense_date', date)
      .eq('category', 'labor_internal')
      .not('start_time', 'is', null)
      .not('end_time', 'is', null);

    if (error) throw error;

    const overlapping = (data || [])
      .filter(entry => {
        if (excludeId && entry.id === excludeId) return false;
        
        const existingStart = new Date(entry.start_time);
        const existingEnd = new Date(entry.end_time);
        
        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        );
      });

    if (overlapping.length > 0) {
      return {
        hasOverlap: true,
        overlappingEntries: overlapping.map(e => ({
          id: e.id,
          startTime: format(new Date(e.start_time), 'h:mm a'),
          endTime: format(new Date(e.end_time), 'h:mm a'),
          description: e.description || 'Time Entry',
          projectName: e.projects?.project_name
        })),
        message: `Overlaps with existing entry: ${format(new Date(overlapping[0].start_time), 'h:mm a')} - ${format(new Date(overlapping[0].end_time), 'h:mm a')}`
      };
    }

    return { hasOverlap: false };
  } catch (error) {
    console.error('Error checking time overlap:', error);
    // Return overlap=true on error to prevent potentially overlapping entries
    // being created when we can't verify. The user can retry.
    return {
      hasOverlap: true,
      message: 'Unable to verify time overlap. Please try again.'
    };
  }
};

/**
 * Validate time entry hours are reasonable
 */
export const validateTimeEntryHours = (
  startTime: Date,
  endTime: Date
): { valid: boolean; message?: string } => {
  if (startTime >= endTime) {
    return {
      valid: false,
      message: 'End time must be after start time'
    };
  }

  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  
  if (hours > 24) {
    return {
      valid: false,
      message: `Entry is ${hours.toFixed(1)} hours - maximum 24 hours per entry allowed`
    };
  }

  if (hours > 16) {
    return {
      valid: false,
      message: `Entry is ${hours.toFixed(1)} hours - please verify this is correct`
    };
  }

  return { valid: true };
};

/**
 * Validate time entry hours (V2) — supports overnight shifts.
 * Accepts startTime and endTime as Date objects where endTime is already overnight-adjusted.
 *
 * @returns valid, optional message, optional isOvernight
 */
export const validateTimeEntryHoursV2 = (
  startTime: Date,
  endTime: Date
): { valid: boolean; message?: string; isOvernight?: boolean } => {
  const hours = (endTime.getTime() - startTime.getTime()) / 3600000;

  if (hours <= 0) {
    return { valid: false, message: 'Invalid time range' };
  }
  if (hours > 24) {
    return {
      valid: false,
      message: `Entry is ${hours.toFixed(1)} hours — maximum 24 hours per entry`,
    };
  }
  if (hours > 16) {
    return {
      valid: true,
      message: `Entry is ${hours.toFixed(1)} hours — please verify`,
      isOvernight: hours > 12,
    };
  }
  return { valid: true, isOvernight: hours > 12 };
};

/**
 * Check if timer has been running too long
 */
export const checkStaleTimer = (startTime: Date): {
  isStale: boolean;
  hoursElapsed: number;
  shouldAutoClose: boolean;
  message?: string;
} => {
  const now = new Date();
  const hoursElapsed = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  
  const isStale = hoursElapsed >= 12;
  const shouldAutoClose = hoursElapsed >= 24;
  
  let message;
  if (shouldAutoClose) {
    message = `Timer has been running for ${hoursElapsed.toFixed(1)} hours and will be auto-closed`;
  } else if (isStale) {
    message = `Timer has been running for ${hoursElapsed.toFixed(1)} hours - please clock out`;
  }
  
  return { isStale, hoursElapsed, shouldAutoClose, message };
};

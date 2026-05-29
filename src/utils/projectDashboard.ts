import { differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import type { Quote } from '@/types/quote';

export interface ScheduleStatus {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  percentComplete: number;
  isOverdue: boolean;
  isComplete: boolean;
}

/** Where a resolved schedule date originated. */
export type ScheduleDateSource = 'project' | 'schedule' | null;

export interface ResolvedScheduleDates {
  start: Date | null;
  end: Date | null;
  /** `'project'` = from the explicit project column, `'schedule'` = derived from line items, `null` = unavailable. */
  startSource: ScheduleDateSource;
  endSource: ScheduleDateSource;
}

const toValidDate = (d?: Date | string | null): Date | null => {
  if (!d) return null;
  const parsed = typeof d === 'string' ? new Date(d) : d;
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Resolve a project's effective start/end dates.
 *
 * Precedence is per-field: the explicit `projects.start_date`/`end_date` column wins,
 * and any field still missing falls back to the approved estimate/change-order line-item
 * schedule (earliest scheduled_start_date / latest scheduled_end_date). Each returned field
 * carries a source flag so callers can indicate when a date was derived from the schedule
 * rather than set on the project.
 */
export async function getProjectScheduleDates(
  projectId: string,
  projectStartDate?: Date | string | null,
  projectEndDate?: Date | string | null
): Promise<ResolvedScheduleDates> {
  const projStart = toValidDate(projectStartDate);
  const projEnd = toValidDate(projectEndDate);

  // Both explicit dates present — no need to touch the schedule.
  if (projStart && projEnd) {
    return { start: projStart, end: projEnd, startSource: 'project', endSource: 'project' };
  }

  // At least one field is missing — query line item schedule dates to fill the gap(s).
  const { supabase } = await import('@/integrations/supabase/client');

  // Get approved estimate line item dates
  const { data: estimateLineItems } = await supabase
    .from('estimate_line_items')
    .select('scheduled_start_date, scheduled_end_date, estimates!inner(project_id, status)')
    .eq('estimates.project_id', projectId)
    .eq('estimates.status', 'approved')
    .not('scheduled_start_date', 'is', null)
    .not('scheduled_end_date', 'is', null);

  // Get approved change order line item dates
  const { data: changeOrderLineItems } = await supabase
    .from('change_order_line_items')
    .select('scheduled_start_date, scheduled_end_date, change_orders!inner(project_id, status)')
    .eq('change_orders.project_id', projectId)
    .eq('change_orders.status', 'approved')
    .not('scheduled_start_date', 'is', null)
    .not('scheduled_end_date', 'is', null);

  const allDates = [
    ...(estimateLineItems || []),
    ...(changeOrderLineItems || [])
  ];

  const startDates = allDates
    .map(item => new Date(item.scheduled_start_date))
    .filter(d => !isNaN(d.getTime()));

  const endDates = allDates
    .map(item => new Date(item.scheduled_end_date))
    .filter(d => !isNaN(d.getTime()));

  const schedStart = startDates.length > 0
    ? new Date(Math.min(...startDates.map(d => d.getTime())))
    : null;
  const schedEnd = endDates.length > 0
    ? new Date(Math.max(...endDates.map(d => d.getTime())))
    : null;

  const start = projStart ?? schedStart;
  const end = projEnd ?? schedEnd;

  return {
    start,
    end,
    startSource: start ? (projStart ? 'project' : 'schedule') : null,
    endSource: end ? (projEnd ? 'project' : 'schedule') : null,
  };
}

export function calculateScheduleStatus(
  startDate?: Date | string | null,
  endDate?: Date | string | null,
  projectStatus?: string | null
): ScheduleStatus | null {
  if (!startDate || !endDate) return null;
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  
  const totalDays = differenceInDays(end, start);
  
  // If project is complete, show as 100% done regardless of dates
  if (projectStatus === 'complete') {
    return {
      totalDays,
      elapsedDays: totalDays,
      remainingDays: 0,
      percentComplete: 100,
      isOverdue: false,
      isComplete: true
    };
  }
  
  const elapsedDays = Math.max(0, differenceInDays(now, start));
  const remainingDays = differenceInDays(end, now);
  const percentComplete = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
  
  return {
    totalDays,
    elapsedDays,
    remainingDays,
    percentComplete: Math.min(percentComplete, 100),
    isOverdue: remainingDays < 0,
    isComplete: false
  };
}

export function getExpiringQuotes(quotes: Quote[], daysAhead: number = 7) {
  const now = new Date();
  const futureDate = addDays(now, daysAhead);
  
  return quotes.filter(quote => {
    if (quote.status !== 'pending' || !quote.valid_until) return false;
    const validUntil = typeof quote.valid_until === 'string' 
      ? new Date(quote.valid_until) 
      : quote.valid_until;
    return isAfter(validUntil, now) && isBefore(validUntil, futureDate);
  });
}

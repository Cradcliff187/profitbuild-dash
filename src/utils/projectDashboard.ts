import { differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import type { Expense } from '@/types/expense';
import type { Quote } from '@/types/quote';

export interface BudgetStatus {
  totalSpent: number;
  remaining: number;
  percentSpent: number;
  status: 'good' | 'warning' | 'critical';
}

export interface ScheduleStatus {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  percentComplete: number;
  isOverdue: boolean;
}

/**
 * Get project schedule dates from project-level dates or line item dates
 * Falls back to estimate/change order line items if project dates not set
 */
export async function getProjectScheduleDates(
  projectId: string,
  projectStartDate?: Date | string | null,
  projectEndDate?: Date | string | null
): Promise<{ start: Date | null; end: Date | null }> {
  // If project has dates set, use those
  if (projectStartDate && projectEndDate) {
    return {
      start: typeof projectStartDate === 'string' ? new Date(projectStartDate) : projectStartDate,
      end: typeof projectEndDate === 'string' ? new Date(projectEndDate) : projectEndDate
    };
  }

  // Otherwise, query line item schedule dates from approved estimates and change orders
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

  // Combine and find earliest/latest
  const allDates = [
    ...(estimateLineItems || []),
    ...(changeOrderLineItems || [])
  ];

  if (allDates.length === 0) {
    return { start: null, end: null };
  }

  const startDates = allDates
    .map(item => new Date(item.scheduled_start_date))
    .filter(d => !isNaN(d.getTime()));
  
  const endDates = allDates
    .map(item => new Date(item.scheduled_end_date))
    .filter(d => !isNaN(d.getTime()));

  return {
    start: startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null,
    end: endDates.length > 0 ? new Date(Math.max(...endDates.map(d => d.getTime()))) : null
  };
}

export function calculateBudgetStatus(
  contracted: number | null | undefined,
  expenses: Expense[]
): BudgetStatus {
  const contractAmount = contracted || 0;
  
  // Use display_amount if available (for split expenses), otherwise fall back to amount
  const totalSpent = expenses.reduce((sum, e) => {
    const amount = (e as any).display_amount ?? e.amount ?? 0;
    return sum + amount;
  }, 0);
  
  const remaining = contractAmount - totalSpent;
  const percentSpent = contractAmount > 0 ? (totalSpent / contractAmount) * 100 : 0;
  
  let status: 'good' | 'warning' | 'critical' = 'good';
  if (percentSpent > 90) {
    status = 'critical';
  } else if (percentSpent > 70) {
    status = 'warning';
  }
  
  return {
    totalSpent,
    remaining,
    percentSpent,
    status
  };
}

export function calculateScheduleStatus(
  startDate?: Date | string | null,
  endDate?: Date | string | null
): ScheduleStatus | null {
  if (!startDate || !endDate) return null;
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  
  const totalDays = differenceInDays(end, start);
  const elapsedDays = Math.max(0, differenceInDays(now, start));
  const remainingDays = differenceInDays(end, now);
  const percentComplete = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
  
  return {
    totalDays,
    elapsedDays,
    remainingDays,
    percentComplete: Math.min(percentComplete, 100),
    isOverdue: remainingDays < 0
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

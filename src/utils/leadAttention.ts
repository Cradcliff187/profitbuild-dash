import { addDays, differenceInCalendarDays, isWeekend, startOfDay } from 'date-fns';
import type { BranchBid } from '@/types/bid';

/**
 * Attention rules for the Leads list (docs/LEADS_CRM_PLAN.md §4.4, sales
 * design §4.1). These DERIVE flags for a person to read; nothing here moves a
 * stage or writes anything — Chris's standing rule (Nov 7 2026): status changes
 * are made by people, never by code.
 *
 * Limits (design defaults): a New lead should get a human reply within 1
 * business day; a Talking lead with no contact for 14 days is stale.
 */
export const NEW_LEAD_REPLY_BUSINESS_DAYS = 1;
export const STALE_AFTER_DAYS = 14;

export type LeadAttention =
  | 'overdue' // next step due date is in the past
  | 'due_today' // next step due today
  | 'new_unanswered' // stage New, older than the reply limit, no touch logged
  | 'stale' // open lead, no human contact for STALE_AFTER_DAYS
  | 'no_next_step' // open lead with nothing scheduled — nobody owns it
  | 'none';

/** Attention sorts before everything else; lower rank = needs eyes sooner. */
const RANK: Record<LeadAttention, number> = {
  overdue: 0,
  due_today: 1,
  new_unanswered: 2,
  stale: 3,
  no_next_step: 4,
  none: 5,
};

/** The next business day after `from` (Mon–Fri; holidays are not modelled). */
export const nextBusinessDay = (from: Date): Date => {
  let d = addDays(startOfDay(from), 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
};

/** Business days strictly between two dates (Mon–Fri). */
export const businessDaysBetween = (from: Date, to: Date): number => {
  let count = 0;
  let d = addDays(startOfDay(from), 1);
  const end = startOfDay(to);
  while (d <= end) {
    if (!isWeekend(d)) count += 1;
    d = addDays(d, 1);
  }
  return count;
};

/** `YYYY-MM-DD` (a DATE column) → local-midnight Date. Never `new Date(str)` — that reads as UTC. */
export const parseDueDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const toDueDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

type AttentionInput = Pick<BranchBid, 'stage' | 'next_step_due' | 'last_contact_at' | 'created_at'> & {
  next_step?: string | null;
};

export const getLeadAttention = (lead: AttentionInput, now: Date = new Date()): LeadAttention => {
  if (lead.stage === 'closed') return 'none';
  const today = startOfDay(now);
  const due = parseDueDate(lead.next_step_due);
  if (due) {
    const delta = differenceInCalendarDays(due, today);
    if (delta < 0) return 'overdue';
    if (delta === 0) return 'due_today';
  }
  const lastTouch = lead.last_contact_at ? new Date(lead.last_contact_at) : null;
  if (lead.stage === 'new' && !lastTouch) {
    if (businessDaysBetween(new Date(lead.created_at), now) >= NEW_LEAD_REPLY_BUSINESS_DAYS) {
      return 'new_unanswered';
    }
  }
  const sinceContact = lastTouch ?? new Date(lead.created_at);
  if (differenceInCalendarDays(today, startOfDay(sinceContact)) >= STALE_AFTER_DAYS) {
    return 'stale';
  }
  if (!due && !lead.next_step) return 'no_next_step';
  return 'none';
};

export const ATTENTION_LABELS: Record<LeadAttention, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  new_unanswered: 'New, unanswered',
  stale: 'Stale',
  no_next_step: 'No next step',
  none: '',
};

/** Semantic-token classes for the attention chip (dark-mode safe). */
export const attentionBadgeClass = (a: LeadAttention): string => {
  switch (a) {
    case 'overdue':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'due_today':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'new_unanswered':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'stale':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'no_next_step':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return '';
  }
};

/**
 * Default list order: what needs eyes first. Within a rank, the earlier due
 * date wins, then the newest lead. Pure — the page passes `now` for tests.
 */
export const compareLeadsByAttention = (a: BranchBid, b: BranchBid, now: Date = new Date()): number => {
  const ra = RANK[getLeadAttention(a, now)];
  const rb = RANK[getLeadAttention(b, now)];
  if (ra !== rb) return ra - rb;
  const da = parseDueDate(a.next_step_due)?.getTime() ?? Number.POSITIVE_INFINITY;
  const db = parseDueDate(b.next_step_due)?.getTime() ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

export interface LeadPipelineStats {
  open: number;
  overdue: number;
  dueToday: number;
  newUnanswered: number;
  stale: number;
  closedThisMonth: number;
}

export const summarizeLeadPipeline = (leads: BranchBid[], now: Date = new Date()): LeadPipelineStats => {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const stats: LeadPipelineStats = { open: 0, overdue: 0, dueToday: 0, newUnanswered: 0, stale: 0, closedThisMonth: 0 };
  for (const lead of leads) {
    if (lead.stage === 'closed') {
      if (lead.closed_at && new Date(lead.closed_at) >= monthStart) stats.closedThisMonth += 1;
      continue;
    }
    stats.open += 1;
    switch (getLeadAttention(lead, now)) {
      case 'overdue':
        stats.overdue += 1;
        break;
      case 'due_today':
        stats.dueToday += 1;
        break;
      case 'new_unanswered':
        stats.newUnanswered += 1;
        break;
      case 'stale':
        stats.stale += 1;
        break;
      default:
        break;
    }
  }
  return stats;
};

/** "Today" · "Tomorrow" · "3 days overdue" · "Mon, Nov 10" — the due chip copy. */
export const describeDue = (value: string | null | undefined, now: Date = new Date()): string | null => {
  const due = parseDueDate(value);
  if (!due) return null;
  const delta = differenceInCalendarDays(due, startOfDay(now));
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return '1 day overdue';
  if (delta < 0) return `${-delta} days overdue`;
  return due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

/** "Today" · "Yesterday" · "6 days ago" · "Never" — last contact copy. */
export const describeLastContact = (value: string | null | undefined, now: Date = new Date()): string => {
  if (!value) return 'Never';
  const days = differenceInCalendarDays(startOfDay(now), startOfDay(new Date(value)));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

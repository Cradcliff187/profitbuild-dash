import { describe, expect, it } from 'vitest';
import {
  businessDaysBetween,
  compareLeadsByAttention,
  describeDue,
  getLeadAttention,
  nextBusinessDay,
  parseDueDate,
  summarizeLeadPipeline,
  toDueDateString,
} from '../leadAttention';
import type { BranchBid } from '@/types/bid';

// Tuesday 2026-11-10, 10:00 local.
const NOW = new Date(2026, 10, 10, 10, 0, 0);

const lead = (over: Partial<BranchBid>): BranchBid =>
  ({
    id: 'x',
    name: 'Lead',
    description: null,
    client_id: null,
    address: null,
    project_type: null,
    job_type: null,
    project_id: null,
    source: 'unknown',
    source_detail: null,
    stage: 'talking',
    closed_reason: null,
    closed_at: null,
    closed_by: null,
    contact_id: null,
    owner_user_id: null,
    next_step: null,
    next_step_due: null,
    size_band: null,
    last_contact_at: null,
    created_by: 'u',
    created_at: new Date(2026, 10, 9, 9).toISOString(),
    updated_at: new Date(2026, 10, 9, 9).toISOString(),
    deleted_at: null,
    ...over,
  }) as BranchBid;

describe('lead attention (plan §4.4 — derived flags only, never a status write)', () => {
  it('skips weekends for the next business day', () => {
    expect(toDueDateString(nextBusinessDay(new Date(2026, 10, 13)))).toBe('2026-11-16'); // Fri → Mon
    expect(toDueDateString(nextBusinessDay(new Date(2026, 10, 10)))).toBe('2026-11-11'); // Tue → Wed
    expect(businessDaysBetween(new Date(2026, 10, 6), new Date(2026, 10, 9))).toBe(1); // Fri → Mon
  });

  it('reads a DATE column as local midnight, never UTC', () => {
    const d = parseDueDate('2026-11-10')!;
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(0);
    expect(toDueDateString(d)).toBe('2026-11-10');
  });

  it('ranks overdue > due today > new unanswered > stale > no next step', () => {
    expect(getLeadAttention(lead({ next_step_due: '2026-11-09', last_contact_at: NOW.toISOString() }), NOW)).toBe('overdue');
    expect(getLeadAttention(lead({ next_step_due: '2026-11-10', last_contact_at: NOW.toISOString() }), NOW)).toBe('due_today');
    expect(getLeadAttention(lead({ stage: 'new', created_at: new Date(2026, 10, 6, 9).toISOString() }), NOW)).toBe('new_unanswered');
    // A New lead created this morning is NOT flagged yet — the reply window is a business day.
    expect(getLeadAttention(lead({ stage: 'new', created_at: new Date(2026, 10, 10, 8).toISOString() }), NOW)).toBe('no_next_step');
    expect(getLeadAttention(lead({ last_contact_at: new Date(2026, 9, 20).toISOString() }), NOW)).toBe('stale');
    expect(getLeadAttention(lead({ last_contact_at: NOW.toISOString(), next_step: 'Call back', next_step_due: '2026-11-12' }), NOW)).toBe('none');
  });

  it('never flags a closed lead', () => {
    expect(getLeadAttention(lead({ stage: 'closed', next_step_due: '2020-01-01' }), NOW)).toBe('none');
  });

  it('sorts the list by attention, then earliest due, then newest', () => {
    const a = lead({ id: 'a', next_step_due: '2026-11-12', last_contact_at: NOW.toISOString(), next_step: 'x' });
    const b = lead({ id: 'b', next_step_due: '2026-11-01', last_contact_at: NOW.toISOString() });
    const c = lead({ id: 'c', next_step_due: '2026-11-10', last_contact_at: NOW.toISOString() });
    const d = lead({ id: 'd', next_step_due: '2026-11-05', last_contact_at: NOW.toISOString() });
    const sorted = [a, b, c, d].sort((x, y) => compareLeadsByAttention(x, y, NOW)).map((l) => l.id);
    expect(sorted).toEqual(['b', 'd', 'c', 'a']);
  });

  it('summarizes the pipeline tiles', () => {
    const stats = summarizeLeadPipeline(
      [
        lead({ next_step_due: '2026-11-01', last_contact_at: NOW.toISOString() }),
        lead({ next_step_due: '2026-11-10', last_contact_at: NOW.toISOString() }),
        lead({ stage: 'new', created_at: new Date(2026, 10, 5).toISOString() }),
        lead({ stage: 'closed', closed_at: new Date(2026, 10, 2).toISOString() }),
        lead({ stage: 'closed', closed_at: new Date(2026, 9, 2).toISOString() }),
      ],
      NOW,
    );
    expect(stats).toEqual({ open: 3, overdue: 1, dueToday: 1, newUnanswered: 1, stale: 0, closedThisMonth: 1 });
  });

  it('describes due dates in plain words', () => {
    expect(describeDue('2026-11-10', NOW)).toBe('Today');
    expect(describeDue('2026-11-11', NOW)).toBe('Tomorrow');
    expect(describeDue('2026-11-07', NOW)).toBe('3 days overdue');
    expect(describeDue(null, NOW)).toBeNull();
  });
});

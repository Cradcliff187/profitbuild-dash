import { describe, expect, it } from 'vitest';
import {
  buildStageUpdate,
  formatLeadClosedReason,
  formatLeadSource,
  formatLeadSourceLine,
  formatLeadStage,
  isLeadClosed,
} from '../leadLabels';
import { LEAD_CLOSED_REASONS, LEAD_SOURCES, LEAD_STAGES } from '@/types/bid';

describe('lead labels', () => {
  it('renders every DB value as plain words (never the raw snake_case)', () => {
    for (const s of LEAD_SOURCES) expect(formatLeadSource(s)).not.toMatch(/_/);
    for (const s of LEAD_STAGES) expect(formatLeadStage(s)).not.toMatch(/_/);
    for (const r of LEAD_CLOSED_REASONS) expect(formatLeadClosedReason(r)).not.toMatch(/_/);
    expect(formatLeadSource('website_form')).toBe('Website form');
    expect(formatLeadStage('estimate_requested')).toBe('Estimate requested');
  });

  it('falls back sensibly for null / unknown values', () => {
    expect(formatLeadSource(null)).toBe('Unknown');
    expect(formatLeadStage(undefined)).toBe('New');
    expect(formatLeadClosedReason(null)).toBeNull();
    expect(formatLeadSource('carrier_pigeon')).toBe('Carrier pigeon');
  });

  it('composes the source line with the detail when present', () => {
    expect(formatLeadSourceLine('website_form', 'teamradcliff.com contact form, 10/12/2026')).toBe(
      'Website form · teamradcliff.com contact form, 10/12/2026',
    );
    expect(formatLeadSourceLine('phone_call', '   ')).toBe('Phone call');
  });
});

describe('buildStageUpdate — mirrors the DB CHECK (stage = closed) = (closed_reason is not null)', () => {
  const now = new Date('2026-10-22T16:00:00Z');

  it('closing requires a reason and stamps closed_at / closed_by', () => {
    expect(() => buildStageUpdate('closed', { userId: 'u1' })).toThrow(/requires a reason/);
    expect(buildStageUpdate('closed', { closedReason: 'we_passed', userId: 'u1', now })).toEqual({
      stage: 'closed',
      closed_reason: 'we_passed',
      closed_at: '2026-10-22T16:00:00.000Z',
      closed_by: 'u1',
    });
  });

  it('any open stage clears the close fields (reopen is clean)', () => {
    for (const stage of ['new', 'talking', 'site_walk', 'estimate_requested'] as const) {
      expect(buildStageUpdate(stage, { closedReason: 'went_cold', userId: 'u1', now })).toEqual({
        stage,
        closed_reason: null,
        closed_at: null,
        closed_by: null,
      });
    }
    expect(isLeadClosed('closed')).toBe(true);
    expect(isLeadClosed('talking')).toBe(false);
  });
});

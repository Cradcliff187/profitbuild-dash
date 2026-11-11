import { describe, expect, it } from 'vitest';
import {
  PROJECT_SOURCES,
  SOURCE_NOT_SET,
  buildProjectPeoplePatch,
  formatProjectSource,
  formatProjectSourceLine,
  hasProjectPeopleColumns,
  isSourceSet,
  matchesSourceFilter,
} from '@/utils/projectSource';

describe('project source vocabulary', () => {
  it('never offers "unknown" on a project', () => {
    expect(PROJECT_SOURCES).not.toContain('unknown');
    expect(PROJECT_SOURCES).toContain('referral');
  });

  it('treats null, empty and unknown as not set', () => {
    expect(isSourceSet(null)).toBe(false);
    expect(isSourceSet('')).toBe(false);
    expect(isSourceSet('unknown')).toBe(false);
    expect(isSourceSet('referral')).toBe(true);
  });

  it('formats labels in plain words', () => {
    expect(formatProjectSource('website_form')).toBe('Website form');
    expect(formatProjectSource('unknown')).toBeNull();
    expect(formatProjectSource('some_new_value')).toBe('Some new value');
  });
});

describe('formatProjectSourceLine', () => {
  it('joins channel, person and detail', () => {
    expect(
      formatProjectSourceLine({ source: 'referral', sourceContactName: 'Dana Reyes', sourceDetail: 'AIA mixer' }),
    ).toBe('Referral · Dana Reyes · AIA mixer');
  });

  it('works with a person and no channel (nothing is required)', () => {
    expect(formatProjectSourceLine({ source: null, sourceContactName: 'Dana Reyes' })).toBe('Dana Reyes');
  });

  it('returns null when nothing is recorded', () => {
    expect(formatProjectSourceLine({ source: null, sourceDetail: '  ' })).toBeNull();
    expect(formatProjectSourceLine({ source: 'unknown' })).toBeNull();
  });
});

describe('buildProjectPeoplePatch', () => {
  it('normalises blanks and unknown to null', () => {
    expect(
      buildProjectPeoplePatch({ primary_contact_id: '', source: 'unknown', source_contact_id: '', source_detail: '   ' }),
    ).toEqual({ primary_contact_id: null, source: null, source_contact_id: null, source_detail: null });
  });

  it('keeps real values and trims the detail', () => {
    expect(
      buildProjectPeoplePatch({ primary_contact_id: 'c1', source: 'referral', source_contact_id: 'c1', source_detail: ' Matt ' }),
    ).toEqual({ primary_contact_id: 'c1', source: 'referral', source_contact_id: 'c1', source_detail: 'Matt' });
  });
});

describe('matchesSourceFilter', () => {
  it('passes everything when nothing is selected', () => {
    expect(matchesSourceFilter(null, [])).toBe(true);
    expect(matchesSourceFilter('referral', [])).toBe(true);
  });

  it('matches "Not set" against null and unknown only', () => {
    expect(matchesSourceFilter(null, [SOURCE_NOT_SET])).toBe(true);
    expect(matchesSourceFilter('unknown', [SOURCE_NOT_SET])).toBe(true);
    expect(matchesSourceFilter('referral', [SOURCE_NOT_SET])).toBe(false);
  });

  it('matches a chosen channel', () => {
    expect(matchesSourceFilter('referral', ['referral', 'email'])).toBe(true);
    expect(matchesSourceFilter('social', ['referral', 'email'])).toBe(false);
  });
});

describe('hasProjectPeopleColumns', () => {
  it('is false before the migration (keys absent from select *)', () => {
    expect(hasProjectPeopleColumns({ id: 'p1', project_name: 'X' })).toBe(false);
    expect(hasProjectPeopleColumns(undefined)).toBe(false);
    expect(hasProjectPeopleColumns(null)).toBe(false);
  });

  it('is true once the columns exist, even when empty', () => {
    expect(hasProjectPeopleColumns({ id: 'p1', source: null, primary_contact_id: null })).toBe(true);
  });
});

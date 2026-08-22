import { describe, it, expect } from 'vitest';
import { ownTimeEntriesOrFilter } from '../ownTimeEntries';

describe('ownTimeEntriesOrFilter', () => {
  it('falls back to a plain user_id match when the user has no linked payees', () => {
    // An empty `payee_id.in.()` is a PostgREST syntax error — must not emit it.
    expect(ownTimeEntriesOrFilter('user-1', [])).toBe('user_id.eq.user-1');
  });

  it('matches user_id OR the single linked payee', () => {
    expect(ownTimeEntriesOrFilter('user-1', ['payee-a'])).toBe(
      'user_id.eq.user-1,payee_id.in.(payee-a)'
    );
  });

  it('matches user_id OR any of multiple linked payees (W-2 shadow + sub record)', () => {
    expect(ownTimeEntriesOrFilter('user-1', ['payee-a', 'payee-b'])).toBe(
      'user_id.eq.user-1,payee_id.in.(payee-a,payee-b)'
    );
  });
});

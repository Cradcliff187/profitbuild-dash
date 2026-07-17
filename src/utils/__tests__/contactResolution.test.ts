import { describe, it, expect } from 'vitest';
import { resolveContact } from '../contactResolution';
import type { Contact } from '@/types/contact';

const base = {
  client_id: 'c1', payee_id: null, title: null, email: null, phone: null,
  notes: null, is_active: true, created_at: '', updated_at: '',
};
const mk = (over: Partial<Contact>): Contact =>
  ({ ...base, id: 'x', name: 'X', role: null, is_primary: false, ...over } as Contact);

describe('resolveContact', () => {
  it('prefers an active role match over primary', () => {
    const contacts = [
      mk({ id: 'p', is_primary: true }),
      mk({ id: 'b', role: 'billing' }),
    ];
    expect(resolveContact(contacts, 'billing')?.id).toBe('b');
  });

  it('falls back to primary when no role match', () => {
    const contacts = [mk({ id: 'p', is_primary: true }), mk({ id: 's', role: 'site' })];
    expect(resolveContact(contacts, 'billing')?.id).toBe('p');
  });

  it('returns null when list is empty or all inactive', () => {
    expect(resolveContact([], 'billing')).toBeNull();
    expect(resolveContact([mk({ is_active: false, is_primary: true })], 'billing')).toBeNull();
  });

  it('ignores inactive role matches', () => {
    const contacts = [
      mk({ id: 'b', role: 'billing', is_active: false }),
      mk({ id: 'p', is_primary: true }),
    ];
    expect(resolveContact(contacts, 'billing')?.id).toBe('p');
  });
});

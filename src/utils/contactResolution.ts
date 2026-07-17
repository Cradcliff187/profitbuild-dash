import type { Contact, ContactRole } from '@/types/contact';

/**
 * Fallback chain shared by every document pipeline (spec: docs/CONTACTS_FEATURE_PLAN.md):
 * active role match → active primary → null (caller falls back to the parent's flat fields).
 */
export function resolveContact(contacts: Contact[], role: ContactRole): Contact | null {
  const active = contacts.filter((c) => c.is_active);
  return active.find((c) => c.role === role) ?? active.find((c) => c.is_primary) ?? null;
}

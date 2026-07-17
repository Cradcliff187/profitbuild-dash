# Contacts Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Multiple role-tagged contacts per client and payee, backfilled from the existing flat fields, resolved by fallback chains in the invoice and contract pipelines. Spec: `docs/CONTACTS_FEATURE_PLAN.md`.

**Architecture:** One `contacts` table with exactly-one-parent CHECK (client_id XOR payee_id), admin/manager RLS, one-shot backfill. Flat columns stay as the last link of every consumer's fallback chain. Hooks (`useInvoiceData`, `useContractData`) do role resolution so the modals prefill correctly with zero form-state changes; a small `ContactQuickPick` adds one-tap switching.

**Tech Stack:** Supabase (Postgres + RLS via MCP `apply_migration`), TanStack Query v5, React Hook Form, shadcn/ui, Vitest.

**Branch:** `feat/contacts` (the spec doc `docs/CONTACTS_FEATURE_PLAN.md` is already in the working tree and rides on this branch's first commit).

**House rules that bind every task:** migrations are placeholder-only locally (CLAUDE.md Critical Migration Rules); regen Supabase types after DDL (Gotcha #30); every mutation invalidates every query key that reads the table (Gotcha #27); destructure `error` from every Supabase call (Gotcha #16); `toast` from `sonner` only.

---

### Task 1: Migration — table, RLS, backfill; placeholder; regenerate types

**Files:**
- Create: `supabase/migrations/{version}_add_contacts_table.sql` (placeholder content only)
- Modify: `src/integrations/supabase/types.ts` (regenerated)

- [ ] **Step 1: Apply the migration to production via MCP**

Call `mcp apply_migration` with name `add_contacts_table` and this SQL:

```sql
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  payee_id  uuid REFERENCES public.payees(id)  ON DELETE CASCADE,
  CONSTRAINT contacts_exactly_one_parent CHECK (num_nonnulls(client_id, payee_id) = 1),
  name text NOT NULL,
  title text,
  email text,
  phone text,
  role text CHECK (role IN (
    'billing', 'estimating', 'project_management', 'site',
    'signatory', 'insurance', 'sales', 'other'
  )),
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_client_id ON public.contacts(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_contacts_payee_id  ON public.contacts(payee_id)  WHERE payee_id  IS NOT NULL;
CREATE UNIQUE INDEX idx_contacts_one_primary_per_client ON public.contacts(client_id)
  WHERE is_primary AND client_id IS NOT NULL;
CREATE UNIQUE INDEX idx_contacts_one_primary_per_payee ON public.contacts(payee_id)
  WHERE is_primary AND payee_id IS NOT NULL;

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/managers can view contacts" ON public.contacts
  FOR SELECT USING (
    (SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'manager'::app_role))
  );
CREATE POLICY "Admins/managers can create contacts" ON public.contacts
  FOR INSERT WITH CHECK (
    (SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'manager'::app_role))
  );
CREATE POLICY "Admins/managers can update contacts" ON public.contacts
  FOR UPDATE USING (
    (SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'manager'::app_role))
  ) WITH CHECK (
    (SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'manager'::app_role))
  );
CREATE POLICY "Admins/managers can delete contacts" ON public.contacts
  FOR DELETE USING (
    (SELECT has_role(auth.uid(), 'admin'::app_role)) OR (SELECT has_role(auth.uid(), 'manager'::app_role))
  );

-- Backfill: existing flat fields become each parent's primary contact.
INSERT INTO public.contacts (client_id, name, email, phone, is_primary)
SELECT id,
       COALESCE(NULLIF(TRIM(contact_person), ''), client_name),
       NULLIF(TRIM(email), ''),
       NULLIF(TRIM(phone), ''),
       true
FROM public.clients
WHERE COALESCE(NULLIF(TRIM(contact_person), ''), NULLIF(TRIM(email), ''), NULLIF(TRIM(phone), '')) IS NOT NULL;

INSERT INTO public.contacts (payee_id, name, title, email, phone, is_primary)
SELECT id,
       COALESCE(NULLIF(TRIM(contact_name), ''), payee_name),
       NULLIF(TRIM(contact_title), ''),
       NULLIF(TRIM(email), ''),
       NULLIF(TRIM(phone_numbers), ''),
       true
FROM public.payees
WHERE is_internal IS NOT TRUE
  AND COALESCE(NULLIF(TRIM(contact_name), ''), NULLIF(TRIM(email), ''), NULLIF(TRIM(phone_numbers), '')) IS NOT NULL;
```

- [ ] **Step 2: Verify backfill counts**

Run via `mcp execute_sql`:

```sql
SELECT
  (SELECT COUNT(*) FROM contacts WHERE client_id IS NOT NULL) AS client_contacts,
  (SELECT COUNT(*) FROM contacts WHERE payee_id IS NOT NULL) AS payee_contacts,
  (SELECT COUNT(*) FROM contacts WHERE is_primary) AS primaries;
```

Expected: `client_contacts` ≈ 25–30, `payee_contacts` ≈ 45–55, `primaries` = their sum (every backfilled row is primary). Spot-check: `SELECT c.name, c.email, c.phone FROM contacts c JOIN clients cl ON cl.id = c.client_id WHERE cl.client_name ILIKE '%UC Health%';`

- [ ] **Step 3: Create the local placeholder migration file**

Get the recorded name: `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;`
Create `supabase/migrations/{version}_{name}.sql` containing exactly:

```sql
-- Applied via Supabase dashboard since the actual SQL is already in your database.
```

No BOM. Verify counts match: `ls supabase/migrations/*.sql | wc -l` equals `SELECT COUNT(*) FROM supabase_migrations.schema_migrations;`

- [ ] **Step 4: Regenerate Supabase types**

Call `mcp generate_typescript_types`, extract the `.types` JSON field, overwrite `src/integrations/supabase/types.ts`. Run `npm run type-check` — expect PASS.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/contacts
git add docs/CONTACTS_FEATURE_PLAN.md docs/superpowers/plans/2026-07-17-contacts-feature.md supabase/migrations src/integrations/supabase/types.ts
git commit -m "feat(contacts): contacts table + RLS + backfill migration, regen types"
```

---

### Task 2: Contact types + resolution util (TDD)

**Files:**
- Create: `src/types/contact.ts`
- Create: `src/utils/contactResolution.ts`
- Test: `src/utils/__tests__/contactResolution.test.ts`

- [ ] **Step 1: Write the types**

```ts
// src/types/contact.ts
export type ContactRole =
  | 'billing'
  | 'estimating'
  | 'project_management'
  | 'site'
  | 'signatory'
  | 'insurance'
  | 'sales'
  | 'other';

export interface Contact {
  id: string;
  client_id: string | null;
  payee_id: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  role: ContactRole | null;
  is_primary: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  billing: 'Billing / AP',
  estimating: 'Estimating',
  project_management: 'Project Management',
  site: 'Site / Field',
  signatory: 'Signatory',
  insurance: 'Insurance',
  sales: 'Sales',
  other: 'Other',
};
```

- [ ] **Step 2: Write the failing test**

```ts
// src/utils/__tests__/contactResolution.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/contactResolution.test.ts`
Expected: FAIL — `Cannot find module '../contactResolution'`

- [ ] **Step 4: Implement**

```ts
// src/utils/contactResolution.ts
import type { Contact, ContactRole } from '@/types/contact';

/**
 * Fallback chain shared by every document pipeline (spec: docs/CONTACTS_FEATURE_PLAN.md):
 * active role match → active primary → null (caller falls back to the parent's flat fields).
 */
export function resolveContact(contacts: Contact[], role: ContactRole): Contact | null {
  const active = contacts.filter((c) => c.is_active);
  return active.find((c) => c.role === role) ?? active.find((c) => c.is_primary) ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/contactResolution.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types/contact.ts src/utils/contactResolution.ts src/utils/__tests__/contactResolution.test.ts
git commit -m "feat(contacts): Contact type + resolveContact fallback chain"
```

---

### Task 3: `useContacts` hook

**Files:**
- Create: `src/hooks/useContacts.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/useContacts.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Contact } from '@/types/contact';
import { toast } from 'sonner';

export type ContactParent = { clientId: string } | { payeeId: string };

const parentKey = (parent: ContactParent) =>
  'clientId' in parent ? (['contacts', 'client', parent.clientId] as const)
                       : (['contacts', 'payee', parent.payeeId] as const);

export type ContactInput = {
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: Contact['role'];
  is_primary?: boolean;
  notes?: string | null;
};

export function useContacts(parent: ContactParent) {
  const queryClient = useQueryClient();
  const queryKey = parentKey(parent);
  const parentCol = 'clientId' in parent
    ? { col: 'client_id' as const, id: parent.clientId }
    : { col: 'payee_id' as const, id: parent.payeeId };

  const query = useQuery({
    queryKey,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq(parentCol.col, parentCol.id)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // Clearing a previous primary first keeps the partial unique index happy.
  const clearPrimary = async () => {
    const { error } = await supabase
      .from('contacts')
      .update({ is_primary: false })
      .eq(parentCol.col, parentCol.id)
      .eq('is_primary', true);
    if (error) throw error;
  };

  const addContact = useMutation({
    mutationFn: async (input: ContactInput) => {
      if (input.is_primary) await clearPrimary();
      const { data, error } = await supabase
        .from('contacts')
        .insert({ [parentCol.col]: parentCol.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => { invalidate(); toast.success('Contact added'); },
    onError: (e) => { console.error('addContact failed:', e); toast.error('Failed to add contact'); },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...input }: ContactInput & { id: string }) => {
      if (input.is_primary) await clearPrimary();
      const { data, error } = await supabase
        .from('contacts')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => { invalidate(); toast.success('Contact updated'); },
    onError: (e) => { console.error('updateContact failed:', e); toast.error('Failed to update contact'); },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Contact deleted'); },
    onError: (e) => { console.error('deleteContact failed:', e); toast.error('Failed to delete contact'); },
  });

  return { ...query, contacts: query.data ?? [], addContact, updateContact, deleteContact };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check` — expect PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useContacts.ts
git commit -m "feat(contacts): useContacts query + mutations"
```

---

### Task 4: `ContactsCard` + form sheet, mounted on both detail modals

**Files:**
- Create: `src/components/contacts/ContactFormSheet.tsx`
- Create: `src/components/contacts/ContactsCard.tsx`
- Modify: `src/components/ClientDetailsModal.tsx` (mount after the sections list, ~line 146)
- Modify: `src/components/PayeeDetailsModal.tsx` (mount after the sections list, ~line 214; hidden for `is_internal`)

- [ ] **Step 1: ContactFormSheet**

```tsx
// src/components/contacts/ContactFormSheet.tsx
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Contact, ContactRole } from '@/types/contact';
import { CONTACT_ROLE_LABELS } from '@/types/contact';
import type { ContactInput } from '@/hooks/useContacts';

interface ContactFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;          // null = create
  onSubmit: (input: ContactInput & { id?: string }) => Promise<unknown>;
  saving: boolean;
}

export function ContactFormSheet({ open, onOpenChange, contact, onSubmit, saving }: ContactFormSheetProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'' | ContactRole>('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '');
      setTitle(contact?.title ?? '');
      setEmail(contact?.email ?? '');
      setPhone(contact?.phone ?? '');
      setRole(contact?.role ?? '');
      setIsPrimary(contact?.is_primary ?? false);
    }
  }, [open, contact]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    await onSubmit({
      id: contact?.id,
      name: name.trim(),
      title: title.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      role: role || null,
      is_primary: isPrimary,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-5 pb-3 border-b">
          <SheetTitle>{contact ? 'Edit Contact' : 'Add Contact'}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name *</Label>
            <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-title">Title</Label>
            <Input id="contact-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AP Manager" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-role">Role</Label>
            <NativeSelect id="contact-role" value={role} onValueChange={(v) => setRole(v as '' | ContactRole)} className="w-full">
              <option value="">— None —</option>
              {(Object.keys(CONTACT_ROLE_LABELS) as ContactRole[]).map((r) => (
                <option key={r} value={r}>{CONTACT_ROLE_LABELS[r]}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input id="contact-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(v === true)} />
            Primary contact
          </label>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t bg-background">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: ContactsCard**

```tsx
// src/components/contacts/ContactsCard.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { useContacts, type ContactParent } from '@/hooks/useContacts';
import type { Contact } from '@/types/contact';
import { CONTACT_ROLE_LABELS } from '@/types/contact';
import { ContactFormSheet } from './ContactFormSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ContactsCard({ parent }: { parent: ContactParent }) {
  const { contacts, isLoading, addContact, updateContact, deleteContact } = useContacts(parent);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const saving = addContact.isPending || updateContact.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contacts</h4>
        <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="text-sm text-muted-foreground">No contacts yet.</div>
      ) : (
        <div className="space-y-2">
          {contacts.filter((c) => c.is_active).map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {c.is_primary && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                  <span className="truncate">{c.name}</span>
                  {c.role && <Badge variant="secondary" className="shrink-0">{CONTACT_ROLE_LABELS[c.role]}</Badge>}
                </div>
                {c.title && <div className="text-xs text-muted-foreground">{c.title}</div>}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Mail className="h-3 w-3" />{c.email}
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Phone className="h-3 w-3" />{c.phone}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setFormOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(c)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ContactFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editing}
        saving={saving}
        onSubmit={async (input) =>
          input.id
            ? updateContact.mutateAsync(input as Parameters<typeof updateContact.mutateAsync>[0])
            : addContact.mutateAsync(input)
        }
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deleting?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleting) deleteContact.mutate(deleting.id); setDeleting(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 3: Mount in ClientDetailsModal**

In `src/components/ClientDetailsModal.tsx`, add import `import { ContactsCard } from '@/components/contacts/ContactsCard';` and insert AFTER the `{sections.map(...)}` closing (inside the `space-y-6` div, ~line 145):

```tsx
            <ContactsCard parent={{ clientId: client.id }} />
```

- [ ] **Step 4: Mount in PayeeDetailsModal**

Same import; insert after `{sections.map(...)}` (~line 213), gated:

```tsx
            {!payee.is_internal && <ContactsCard parent={{ payeeId: payee.id }} />}
```

- [ ] **Step 5: Type-check + visual check**

Run `npm run type-check` — PASS. In the browser preview (`preview_start` name `dev`): `/clients` → open UC Health → Contacts section lists the backfilled primary; add/edit/delete a test contact; same on `/payees` for an external vendor; confirm an internal payee (Type filter → Internal Labor) shows NO contacts card.

- [ ] **Step 6: Commit**

```bash
git add src/components/contacts src/components/ClientDetailsModal.tsx src/components/PayeeDetailsModal.tsx
git commit -m "feat(contacts): ContactsCard CRUD on client + payee detail views"
```

---

### Task 5: QuickAddPayee captures a contact person

**Files:**
- Modify: `src/components/QuickAddPayee.tsx`

- [ ] **Step 1: Add the field + dual-write**

Add state `const [contactName, setContactName] = useState('');` (reset in `reset()`). Add an input between the Type select and Phone (same pattern as the phone field):

```tsx
          <div className="space-y-2">
            <Label htmlFor="quick-payee-contact" className={cn('text-muted-foreground', isMobile && 'text-base')}>
              Contact person (optional)
            </Label>
            <Input
              id="quick-payee-contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className={cn(isMobile && 'h-12 text-base')}
              style={{ fontSize: isMobile ? '16px' : undefined }}
            />
          </div>
```

In `handleSubmit`, after the payee insert succeeds (and is not internal), create the primary contact. Also write `contact_name` to the flat field so the legacy fallback stays consistent. Modify the insert payload to include `contact_name: contactName.trim() || null`, then after the insert:

```ts
      // Contact row is best-effort: the payee is already created; a contact
      // failure must not fail the add (mirrors admin-disable-user's payee step).
      if (!defaultIsInternal && (contactName.trim() || phone.trim() || email.trim())) {
        const { error: contactError } = await supabase.from('contacts').insert({
          payee_id: data.id,
          name: contactName.trim() || trimmed,
          phone: phone.trim() || null,
          email: email.trim() || null,
          is_primary: true,
        });
        if (contactError) console.error('Failed to create payee contact:', contactError);
      }
```

- [ ] **Step 2: Type-check, verify, commit**

`npm run type-check` — PASS. Browser: add a payee via any selector's quick-add with a contact name → open it on `/payees` → Contacts section shows the primary.

```bash
git add src/components/QuickAddPayee.tsx
git commit -m "feat(contacts): QuickAddPayee creates the primary contact"
```

---

### Task 6: Invoice Bill To resolves billing → primary → flat

**Files:**
- Modify: `src/hooks/useInvoiceData.ts:102-115` (client fetch block) and `:160-168` (customer values)

- [ ] **Step 1: Fetch contacts alongside the client**

Add imports: `import { resolveContact } from '@/utils/contactResolution';` and `import type { Contact } from '@/types/contact';`. Replace the client fetch block (lines 102–115) so contacts load in parallel:

```ts
      let client: { /* unchanged shape */ } | null = null;
      let clientContacts: Contact[] = [];
      if (resolvedClientId) {
        const [clientRes, contactsRes] = await Promise.all([
          supabase
            .from('clients')
            .select(
              'client_name, company_name, contact_person, billing_address, mailing_address, email, phone, payment_terms'
            )
            .eq('id', resolvedClientId)
            .single(),
          supabase
            .from('contacts')
            .select('*')
            .eq('client_id', resolvedClientId)
            .eq('is_active', true),
        ]);
        if (clientRes.error) {
          console.warn('Client load failed (will use project.client_name fallback):', clientRes.error.message);
        } else {
          client = clientRes.data;
        }
        if (contactsRes.error) {
          console.warn('Contacts load failed (falling back to flat client fields):', contactsRes.error.message);
        } else {
          clientContacts = (contactsRes.data ?? []) as Contact[];
        }
      }
```

- [ ] **Step 2: Resolve the billing contact into customer values**

Above the `values` construction add:

```ts
      const billingContact = resolveContact(clientContacts, 'billing');
```

Change the `customer` block:

```ts
        customer: {
          name: customerName,
          streetAddress: parsedAddr.street,
          cityStateZip: parsedAddr.cityStateZip,
          contactPerson: billingContact?.name ?? client?.contact_person ?? '',
          email: billingContact?.email ?? client?.email ?? '',
          phone: billingContact?.phone ?? client?.phone ?? '',
        },
```

- [ ] **Step 3: Type-check + regression check**

`npm run type-check` — PASS. Browser: generate an invoice for a client WITH a billing/primary contact (prefills contact) and one with NO contacts (prefills exactly as before — flat fields).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useInvoiceData.ts
git commit -m "feat(contacts): invoice Bill To resolves billing contact with flat-field fallback"
```

---

### Task 7: Contract signatory resolves signatory → primary → flat

**Files:**
- Modify: `src/hooks/useContractData.ts:70-80` (payee fetch) and `:130-140` (subcontractor values)

- [ ] **Step 1: Fetch payee contacts in the existing Promise.all**

Add the same two imports as Task 6. The hook already runs a `Promise.all` including the payee select (line ~72). Add one more query to that array:

```ts
        supabase
          .from('contacts')
          .select('*')
          .eq('payee_id', payeeId)
          .eq('is_active', true),
```

Destructure its result (e.g. `contactsResult`), then:

```ts
      const payeeContacts: Contact[] = contactsResult.error
        ? []
        : ((contactsResult.data ?? []) as Contact[]);
      if (contactsResult.error) {
        console.warn('Contacts load failed (falling back to flat payee fields):', contactsResult.error.message);
      }
      const signatoryContact = resolveContact(payeeContacts, 'signatory');
```

- [ ] **Step 2: Resolve into subcontractor values (lines ~133–139)**

```ts
          contactName: signatoryContact?.name ?? payee?.contact_name ?? '',
          contactTitle: signatoryContact?.title ?? payee?.contact_title ?? '',
          phone: signatoryContact?.phone ?? payee?.phone_numbers ?? '',
          email: signatoryContact?.email ?? payee?.email ?? '',
```

- [ ] **Step 3: Type-check + regression check + commit**

`npm run type-check` — PASS. Browser: open Generate Contract for a quote whose payee has only flat `contact_name` → prefill unchanged from today.

```bash
git add src/hooks/useContractData.ts
git commit -m "feat(contacts): contract signatory resolves signatory contact with flat-field fallback"
```

---

### Task 8: `ContactQuickPick` in the invoice + contract modals

**Files:**
- Create: `src/components/contacts/ContactQuickPick.tsx`
- Modify: `src/components/invoices/InvoiceGenerationModal.tsx` (inside the Bill To `AccordionContent`, before the first `FormField`, ~line 373)
- Modify: `src/components/contracts/ContractGenerationModal.tsx` (top of the subcontractor section's content)

- [ ] **Step 1: The component**

```tsx
// src/components/contacts/ContactQuickPick.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import type { Contact } from '@/types/contact';
import { CONTACT_ROLE_LABELS } from '@/types/contact';
import { cn } from '@/lib/utils';

interface ContactQuickPickProps {
  clientId?: string | null;
  payeeId?: string | null;
  selectedName?: string;             // highlight the chip matching the current form value
  onSelect: (contact: Contact) => void;
}

/** Chip row of a parent's active contacts. Tapping one fills the form fields via onSelect. */
export function ContactQuickPick({ clientId, payeeId, selectedName, onSelect }: ContactQuickPickProps) {
  const { data: contacts = [] } = useQuery({
    queryKey: clientId ? ['contacts', 'client', clientId] : ['contacts', 'payee', payeeId],
    enabled: !!(clientId || payeeId),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq(clientId ? 'client_id' : 'payee_id', (clientId ?? payeeId)!)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  if (contacts.length < 2) return null; // nothing to switch between

  return (
    <div className="flex flex-wrap gap-1.5">
      {contacts.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent',
            selectedName === c.name && 'border-primary bg-primary/5'
          )}
        >
          {c.is_primary && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
          {c.name}
          {c.role && <Badge variant="secondary" className="px-1 py-0 text-[10px]">{CONTACT_ROLE_LABELS[c.role]}</Badge>}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Invoice modal wiring**

`InvoiceGenerationModal` receives `clientId` (check its props; it's passed to `useInvoiceData`). Import the component and add inside the Bill To `AccordionContent` (line ~373), before the first `FormField`:

```tsx
                    <ContactQuickPick
                      clientId={clientId}
                      selectedName={form.watch('customerContact')}
                      onSelect={(c) => {
                        form.setValue('customerContact', c.name);
                        form.setValue('customerEmail', c.email ?? '');
                        form.setValue('customerPhone', c.phone ?? '');
                      }}
                    />
```

- [ ] **Step 3: Contract modal wiring**

Same pattern with `payeeId` and `form.setValue('subcontractorContactName', c.name)`, `subcontractorContactTitle` (from `c.title ?? ''`), `subcontractorEmail`, `subcontractorPhone`. Locate the subcontractor fields section (fields named at lines ~171–178) and insert the chip row at the top of that section's content.

- [ ] **Step 4: Type-check, verify, commit**

`npm run type-check` — PASS. Browser: client with 2+ contacts shows chips in Bill To; tapping swaps contact/email/phone; client with 0–1 contacts shows no chip row (no clutter).

```bash
git add src/components/contacts/ContactQuickPick.tsx src/components/invoices/InvoiceGenerationModal.tsx src/components/contracts/ContractGenerationModal.tsx
git commit -m "feat(contacts): one-tap contact switching in invoice + contract modals"
```

---

### Task 9: Full verification + docs + PR

- [ ] **Step 1: Test suite + pre-deploy**

Run: `npx vitest run` — all pass. Run: `npm run pre-deploy` (via bash) — all checks pass.

- [ ] **Step 2: RLS spot-check**

Via `mcp execute_sql`, confirm policies exist: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'contacts';` — expect 4 rows, admin/manager only.

- [ ] **Step 3: Browser walkthrough**

Client detail → contacts CRUD; payee detail → contacts CRUD; internal payee → no card; invoice modal → prefill + chips; contract modal → prefill + chips. Zero console errors.

- [ ] **Step 4: Update CLAUDE.md**

Add an architectural rule entry (short): contacts table purpose, exactly-one-parent CHECK, fallback chains in `useInvoiceData`/`useContractData` via `resolveContact`, flat fields retained as last-resort fallback, RLS admin/manager-only, internal payees have no contacts.

- [ ] **Step 5: PR**

```bash
git push -u origin feat/contacts
gh pr create --title "feat(contacts): multiple role-tagged contacts per client/payee" --body "..."
```

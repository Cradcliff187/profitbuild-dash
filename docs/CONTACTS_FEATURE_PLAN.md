# Contacts Feature Plan — Multiple Contacts per Client / Payee

**Status:** SHIPPED — Phases 1+2 merged 2026-07-17 (PR [#180](https://github.com/Cradcliff187/profitbuild-dash/pull/180)); Phase 3 deferred (see Phasing)
**Date:** 2026-07-17
**Decision owner:** Chris Radcliff
**Implementation plan:** [docs/superpowers/plans/2026-07-17-contacts-feature.md](superpowers/plans/2026-07-17-contacts-feature.md) · **Architecture:** CLAUDE.md Rule 38

---

## Problem

Contact information lives in exactly two flat, single-slot records:

| Table | Fields | Populated (Jul 2026) |
|---|---|---|
| `clients` | `contact_person`, `email`, `phone` | 63 clients: 22 / 19 / 2 |
| `payees` | `contact_name`, `contact_title`, `email`, `phone_numbers` | 348 external payees: 3 / — / 31 / 38 |

One slot cannot represent a real commercial relationship: the facilities manager who
requests work ≠ the AP department that pays the invoice ≠ the PM who approves the pay
app. On the vendor side, a sub's signatory (principal) ≠ foreman (scheduling calls) ≠
insurance agent (COI chasing). `payees.phone_numbers` is free text with a plural name —
evidence users already needed more than one number (parsed defensively by
`firstUsablePhone()` in `src/components/today/todayData.ts`, CLAUDE.md Rule 36).

`branch_bids` (Leads) has **no contact fields at all** — lead contact info gets crammed
into the client's single slot and is later overwritten by billing details.

~90% of vendors have zero contact data. Interpretation: an anonymous single slot isn't
useful enough to maintain, so nobody maintains it.

**Why now:** invoice email-send via Resend is a documented Phase 2 item (Rule 25), and
pay-app submission is the same shape. The moment the system sends documents instead of
exporting DOCX for manual email, "which contact receives this" becomes load-bearing.

## Current consumers (all single-contact by construction)

| Surface | File | Reads |
|---|---|---|
| Invoice Bill To | `src/hooks/useInvoiceData.ts` | client `contact_person` / `email` / `phone` |
| Contract signatory | `src/hooks/useContractData.ts` | payee `contact_name` / `contact_title` / `email` / `phone_numbers` |
| QB customer sync | `supabase/functions/quickbooks-sync-customer`, `-bulk-sync-customers` | client `email` / `phone` |
| Call owner (field) | `src/components/today/todayData.ts` `firstUsablePhone()` | payee `phone_numbers` |
| CRUD / display | `ClientForm`, `ClientDetailsModal`, `ClientsList`, `PayeeForm`, `PayeeDetailsModal`, `PayeesList`, `QuickAddPayee`, CSV importers | flat fields |

## Decision — Option B: one `contacts` table hanging off both parents

Rejected alternatives:
- **A (more flat columns)**: whack-a-mole; can't represent two PMs at one GC.
- **C (full CRM: unified companies + junctions + per-project directories)**: collides
  with the load-bearing `payees` ledger (Rule 11 — cannot collapse), heavy for
  63 clients / 348 payees. Option B upgrades into C later (`project_contacts` is an
  additive follow-on) if scale ever demands it.

### Schema

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
  )),                                  -- nullable; role is optional metadata
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_client_id ON public.contacts(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_contacts_payee_id  ON public.contacts(payee_id)  WHERE payee_id  IS NOT NULL;
-- one primary per parent (mirrors idx_payees_user_id_internal_unique pattern)
CREATE UNIQUE INDEX idx_contacts_one_primary_per_client ON public.contacts(client_id)
  WHERE is_primary AND client_id IS NOT NULL;
CREATE UNIQUE INDEX idx_contacts_one_primary_per_payee ON public.contacts(payee_id)
  WHERE is_primary AND payee_id IS NOT NULL;
-- house updated_at trigger
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Design notes:
- `is_primary` is separate from `role` — the billing contact can also be the primary.
- `role` is a single value, not an array. A person wearing two hats is rare at this
  scale; if it appears, two rows for the same person is an acceptable representation.
- Soft-delete via `is_active` (consistent with clients/payees). Hard delete allowed —
  nothing financial references `contacts` (deliberate: contacts are directory data,
  never FK'd from the accounting ledger).

### RLS (DB is the security boundary — Gotcha #44)

- SELECT / INSERT / UPDATE / DELETE: `has_role(auth.uid(), 'admin')` OR
  `has_role(auth.uid(), 'manager')`.
- **Field workers get no access in Phase 1.** The Call-owner button keeps reading
  `payees.phone_numbers` (unchanged). If field crews later need site contacts, add a
  column-safe view mirroring `crew_day_assignments_field_view` (Rule 34) — deferred
  until there's a concrete need.

### Backfill (one-shot, in the same migration)

Copy each parent's flat fields into a `is_primary = true` contact row when at least one
field is non-empty:

- `clients` → `contacts(client_id, name := COALESCE(NULLIF(contact_person,''), client_name), email, phone, is_primary := true)`
- `payees` (`is_internal IS NOT TRUE` only) → `contacts(payee_id, name := COALESCE(NULLIF(contact_name,''), payee_name), title := contact_title, email, phone := phone_numbers, is_primary := true)`

Internal payees are excluded — employees are auth users (Rule 11), not directory
contacts.

**The flat columns stay.** No renames, no drops, no dual-write triggers. They become
the last link in every consumer's fallback chain (same philosophy as Gotcha #19: don't
finish renames that have coordination cost and zero functional gain).

### Consumer resolution — fallback chains

A shared util `src/utils/contactResolution.ts`:

```
resolveContact(contacts, role):
  contacts.find(active && role match) ?? contacts.find(active && is_primary) ?? null
```

| Consumer | Chain | Change |
|---|---|---|
| Invoice Bill To | `billing` → primary → flat client fields | `useInvoiceData` fetches contacts; `InvoiceGenerationModal` gets a contact picker defaulting per chain (fields stay editable, as today) |
| Contract signatory | `signatory` → primary → flat `contact_name`/`contact_title` | `useContractData` same pattern; picker in `ContractGenerationModal` |
| QB customer sync | unchanged | QB keeps syncing the flat fields (Phase 1 non-goal) |
| Call owner | unchanged | keeps `firstUsablePhone(payees.phone_numbers)` |

Fallback chains mean nothing breaks at zero contacts, and every contact added makes
documents smarter incrementally.

### UI surfaces

1. **`ContactsCard`** (new, `src/components/contacts/`) — list + add/edit/delete
   sheet, role badge, primary star. Mounted on:
   - Client detail (`ClientDetailsModal` / `ClientForm` edit view)
   - Payee detail (`PayeeDetailsModal` / `PayeeForm`) — for `is_internal` payees the
     card is hidden (locked surface per Rule 11)
2. **Contact pickers** in `InvoiceGenerationModal` + `ContractGenerationModal` —
   dropdown of the parent's active contacts, default chosen by the fallback chain,
   manual override always allowed.
3. **`QuickAddPayee`**: optional name/phone/email inputs → creates the primary contact
   alongside the payee.
4. **Capture-point rule:** any surface that collects a person's name+number for a
   client/payee should write a `contacts` row, not a notes field. (Schema alone won't
   fix the 90%-empty problem; capture points will.)

### Phasing

| PR | Scope |
|---|---|
| **1** | Migration (table + RLS + indexes + backfill, placeholder file per Critical Migration Rules) · regen types (Gotcha #30) · `contactResolution.ts` · `ContactsCard` on client + payee surfaces · `QuickAddPayee` contact fields |
| **2** | Invoice Bill To picker + contract signatory picker with fallback chains |
| **3** (with invoice email-send) | Role-based send routing · `branch_bids.contact_id` (nullable FK) + lead-intake picker · field-safe contacts view if crews need site contacts |

### Non-goals (explicit)

- No unified `companies` table; clients and payees stay separate (Rule 11).
- No per-project contact directory (`project_contacts`) — Option C territory, additive
  later if needed.
- No QB contact sync changes.
- No drops/renames of existing flat contact columns.
- No mention/notification integration — `contacts` are external people, never
  mentionable (mentions come from `get_mentionable_employees()` only, Rule 11 pitfall 4).

### Verification

- Backfill counts: `SELECT COUNT(*) FROM contacts` ≈ clients-with-any-contact-data (≈25)
  + payees-with-any (≈50). Spot-check UC Health, BSMH, Team Fishel.
- Invoice generated for a client with a `billing` contact pre-fills that contact;
  client with none pre-fills exactly what it pre-fills today (regression guard).
- Contract generated for a payee with a `signatory` contact pre-fills it; payee with
  only flat `contact_name` behaves byte-identically to today.
- RLS: field-worker session gets 0 rows from `contacts`.

### Open items for review

1. **Role list** — proposed: billing, estimating, project_management, site, signatory,
   insurance, sales, other. Add/remove per how RCG actually works.
2. **Backfill name fallback** — when a client/payee has an email or phone but no contact
   name, the contact row is named after the company. Acceptable, or skip those rows?
3. **Field-worker site contacts** — deferred by default; pull into Phase 3 if crews
   need a "call the site contact" affordance.

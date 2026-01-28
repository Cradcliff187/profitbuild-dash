# Contract Template Test Results

**Date:** 2026-01-27  
**Plan:** Complete Contract Template Testing and Address Fix  
**Quote:** 225-001-QTE-01-01 (Project 225-001 UC Fire Doors Florence, Payee A&B Flooring)

## Implementation Completed

### Part 1: Address parsing
- **Updated** `parseAddress()` in `supabase/functions/generate-contract/index.ts` to use street-suffix detection and state/ZIP anchoring.
- **Handles:** `"6098 Executive Blvd Huber Heights OH 45424"` → street: `"6098 Executive Blvd"`, cityStateZip: `"Huber Heights, OH 45424"`.
- Uses common street suffixes (Blvd, St, Ave, Rd, Dr, Ln, Ct, Way, Cir, Pkwy, Pl, etc.) to split street from city; fallbacks when no suffix or single-token city.

### Part 2: Payee contract fields
- **A&B Flooring** (id `090594c5-1081-4035-8ae7-68ecb48bb150`) updated via SQL:
  - `contact_name`: Test Contact  
  - `contact_title`: Owner  
  - `email`: test@abflooring.com  
  - `phone_numbers`: (555) 555-5555  
  - `legal_form`: LLC  
  - `state_of_formation`: Ohio  

### Part 3: Edge function deployment
- **Deployed** `generate-contract` via Supabase MCP (version 5, ACTIVE).
- Pre-deploy: ReadLints, duplicate-declaration check, template literal check, `@supabase/supabase-js@2.57.4` pinned.

---

## Manual Test Required (Parts 4–5)

Run the following in the app (user logged in):

1. **Navigate:** Projects → 225-001 UC Fire Doors Florence → Estimates & Quotes → Quotes → 225-001-QTE-01-01.
2. **Confirm:** Quote status = Accepted, **Generate Contract** button visible.
3. **Open modal:** Click **Generate Contract** → “Generate Subcontractor Project Agreement”.
4. **Configure step:** Confirm Subcontractor (A&B Flooring, Test Contact, Owner, phone, email, address “6098 Executive Blvd Huber Heights OH 45424”, State of Formation Ohio, Legal Form LLC), Project, Contract, and RCG sections. Click **Continue to Preview**.
5. **Preview:** Confirm field summary and document preview; click **Generate Contract**.
6. **Result:** Success message, download DOCX.

Then verify the downloaded DOCX and UI as in the sections below.

---

## What to Verify in the DOCX

### Address split (Part 4 / verify-address-split)
- **Header/block:** Line 1: “A&B Flooring”; Line 2: “6098 Executive Blvd” (street only); Line 3: “Huber Heights, OH 45424” (city, state, ZIP with comma). No duplicated full address.

### All placeholders (Part 4 / verify-all-placeholders)
- No remaining `{{...}}` in the body, headers, or footers.
- Empty fields show “N/A” (not blank or error).

### Formatting (Part 4 / verify-formatting)
- “THIS SUBCONTRACTOR AGREEMENT…” starts on **page 2** (not at bottom of page 1).
- Signatures on **page 14**; no blank page before signatures.

### Contract in UI (Part 5 / verify-contract-display)
- **Quote view:** “Quote Document” / generated contract section shows the new contract (e.g. UH225001-X), with preview and download.
- **Project Documents:** Projects → 225-001 → Documents shows the contract (e.g. “Subcontractor Project Agreement - A&B Flooring”), with preview and filename like `UH225001-X_SubcontractorProjectAgreement_YYYY-MM-DD.docx`.

---

## What Worked (to fill after manual test)

- Address parsing: street vs city/state/zip split (expected: **yes**).
- Payee contract fields populated for A&B Flooring (expected: **yes**).
- Edge function deploy and template fetch (expected: **yes**).
- Placeholder fill from `fieldValues` + enriched `streetAddress` / `cityStateZip` (expected: **yes** for all 27 once form is filled).
- UI display and download (to be confirmed in-app).

## Issues Found (to fill after manual test)

- Any placeholders still `{{...}}` or unexpected “N/A”: _TBD_.
- Address formatting or duplication: _TBD_.
- Page breaks or blank pages: _TBD_.
- Contact/alignment issues: _TBD_.

## Payee Data Gaps

- **Resolved for this test:** A&B Flooring has contact_name, contact_title, email, phone_numbers, legal_form, state_of_formation set via SQL.
- **Recommendation:** Add Payees UI (or extend existing payee edit) to edit these contract-related fields so future quotes don’t depend on SQL updates.

---

## Success Criteria (from plan)

| Criterion | Status |
|-----------|--------|
| Address parses: “6098 Executive Blvd Huber Heights OH 45424” → street + city/state/zip | ✅ Implemented |
| All 27 placeholders filled (no `{{...}}`) | Pending manual check |
| Empty fields show “N/A” | Pending manual check |
| Page breaks correct; no extra blank page before signatures | Pending manual check |
| Contract appears in Quote view and Project Documents | Pending manual check |
| Contract type clear: “Subcontractor Project Agreement” in DB/UI | ✅ Implemented |

---

## Contract Type Clarity

- **DB:** `contracts.contract_type` = `'subcontractor_project_agreement'`.
- **Template:** `subcontractor-project-agreement-template.docx` (see `CONTRACT_TEMPLATE_FILENAMES`).
- **UI:** Modal title “Generate Subcontractor Project Agreement”; document description “Subcontractor Project Agreement - {Payee Name}”.

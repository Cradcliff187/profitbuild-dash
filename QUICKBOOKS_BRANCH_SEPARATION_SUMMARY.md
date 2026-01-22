# QuickBooks Branch Separation - Summary

## Problem
The CI/CD pipeline was failing with `failed to bundle function: exit status 1` because QuickBooks edge functions and migrations were merged into `main` alongside the deterministic parser feature, causing bundling issues.

## Solution
Separated QuickBooks integration into its own feature branch while keeping the deterministic parser and labor cushion features in production.

---

## Branch Structure

### `main` (Production) ✅
**Contains:**
- ✅ Labor cushion calculations (billing/actual rates)
- ✅ Deterministic budget sheet parser
- ✅ Import estimate modal UI
- ✅ Optional LLM enrichment (`enrich-estimate-items` function)
- ✅ Test suite (vitest + jsdom)
- ✅ Labor cushion V2 migrations (2 files)

**Does NOT contain:**
- ❌ No QuickBooks edge functions
- ❌ No QuickBooks migrations
- ❌ No QuickBooks types/utils
- ❌ No QuickBooks scripts or documentation

### `feature/quickbooks-integration` 🔧
**Contains ALL QuickBooks code:**
- 6 QuickBooks edge functions
  - `quickbooks-connect`
  - `quickbooks-callback`
  - `quickbooks-sync-customer`
  - `quickbooks-sync-project`
  - `quickbooks-bulk-sync-customers`
  - `quickbooks-bulk-sync-projects`
- `_shared/quickbooks.ts` helper
- 10 QuickBooks migration placeholders
- QuickBooks types, scripts, and documentation
- **PLUS** all the parser and labor cushion code from main

---

## Key Commits

### Main Branch
- `f56272a` - Remove QuickBooks types and utils from main
- `0bd1b84` - Add deterministic budget sheet parser (QuickBooks-free)
- `7258b8a` - Merge branch 'estimate-cushion-build' (base commit)

### Feature Branch
- `fcf3cc6` - Contains full QuickBooks + parser implementation

---

## Production Status

### ✅ Still Working in Production
Even though QuickBooks code is removed from `main` branch:
- QuickBooks edge functions are **deployed and ACTIVE** in Supabase
- QuickBooks database tables **exist and functioning**
- Feature flags, OAuth states, connections **all working**

The functions were deployed directly via Supabase MCP and remain independent of the git repository source code.

### 🔄 Next Steps for QuickBooks
When ready to deploy QuickBooks to production:
1. Test the `feature/quickbooks-integration` branch thoroughly
2. Ensure all edge functions bundle correctly
3. Merge the branch into `main`
4. CI/CD will then build and deploy cleanly

---

## Files Moved to Feature Branch

**Edge Functions (6):**
- `supabase/functions/quickbooks-connect/`
- `supabase/functions/quickbooks-callback/`
- `supabase/functions/quickbooks-sync-customer/`
- `supabase/functions/quickbooks-sync-project/`
- `supabase/functions/quickbooks-bulk-sync-customers/`
- `supabase/functions/quickbooks-bulk-sync-projects/`
- `supabase/functions/_shared/quickbooks.ts`

**Migrations (10):**
- `20260112175539_create_feature_flags.sql`
- `20260112175545_create_quickbooks_connection.sql`
- `20260112175550_create_quickbooks_oauth_states.sql`
- `20260112175555_add_quickbooks_to_receipts.sql`
- `20260112175600_enhance_quickbooks_sync_log.sql`
- `20260112190037_fix_quickbooks_oauth_states_rls.sql`
- `20260112190406_fix_quickbooks_oauth_states_rls_update.sql`
- `20260112190822_fix_quickbooks_oauth_states_select_policy.sql`
- `20260112194122_fix_receipts_approval_rls_policy.sql`
- `20260112221858_add_quickbooks_fields_to_payees.sql`

**Scripts (5):**
- `scripts/bulk-sync-clients-to-quickbooks.ts`
- `scripts/execute-bulk-sync.ts`
- `scripts/execute-bulk-sync-now.ts`
- `scripts/query-quickbooks-schema.ts`
- `scripts/sync-customer-id-from-quickbooks.ts`

**Documentation (5):**
- `docs/QUICKBOOKS_INTEGRATION_SPEC.md`
- `docs/QUICKBOOKS_CUSTOM_FIELDS_RESEARCH.md`
- `docs/QUICKBOOKS_CUSTOM_FIELDS_TEST_RESULTS.md`
- `docs/QUICKBOOKS_CUSTOMERREF_IMPLEMENTATION.md`
- `docs/QUICKBOOKS_SETUP_CHECKLIST.md`

**Other:**
- `quickbooks-schema.json`
- `deploy-quickbooks-functions.ps1`
- `deploy-quickbooks-fix.ps1`
- `public/bulk-sync-clients.html`
- `src/types/quickbooks.ts`
- `src/utils/quickbooksMapping.ts`

---

## CI/CD Status
The GitHub Actions "Supabase Preview" workflow should now pass successfully, as there are no problematic edge function bundles in the `main` branch.

---

**Date:** January 21, 2026  
**Action:** QuickBooks code separated into `feature/quickbooks-integration` branch

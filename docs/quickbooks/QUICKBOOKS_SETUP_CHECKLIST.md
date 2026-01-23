# QuickBooks Integration - Setup Checklist

## Phase 1: Database Infrastructure ✅ COMPLETE

- [x] Applied `create_feature_flags` migration
- [x] Applied `create_quickbooks_connection` migration
- [x] Applied `create_quickbooks_oauth_states` migration
- [x] Applied `add_quickbooks_to_receipts` migration
- [x] Applied `enhance_quickbooks_sync_log` migration
- [x] Verified all local migration files match database (254 total)
- [x] Confirmed feature flag `quickbooks_integration` is disabled by default

**Status:** All 5 migrations applied successfully via Supabase MCP.

---

## Phase 3: Edge Functions ✅ COMPLETE & DEPLOYED

- [x] Created `supabase/functions/_shared/quickbooks.ts` - Utility functions
- [x] Created `supabase/functions/quickbooks-connect/index.ts` - OAuth initiation
- [x] Created `supabase/functions/quickbooks-callback/index.ts` - OAuth callback handler
- [x] Created `supabase/functions/quickbooks-sync-receipt/index.ts` - Receipt sync function
- [x] **Deployed `quickbooks-connect` via Supabase MCP** - Status: ACTIVE (v1)
- [x] **Deployed `quickbooks-callback` via Supabase MCP** - Status: ACTIVE (v1)
- [x] **Deployed `quickbooks-sync-receipt` via Supabase MCP** - Status: ACTIVE (v1)

**Status:** All 3 Edge Functions deployed and active. Shared utilities inlined in each function for deployment compatibility.

---

## Phase 4: Frontend Hooks & Components ✅ COMPLETE

### Hooks Created:
- [x] `src/hooks/useFeatureFlag.ts` - Feature flag management
- [x] `src/hooks/useQuickBooksConnection.ts` - Connection state & OAuth
- [x] `src/hooks/useQuickBooksSync.ts` - Receipt sync operations

### Components Created:
- [x] `src/components/receipts/SendToQuickBooksDialog.tsx` - Post-approval dialog
- [x] `src/components/settings/QuickBooksSettings.tsx` - Settings panel

**Status:** All hooks and components implemented with proper error handling and loading states.

---

## Phase 5: Integration ✅ COMPLETE

- [x] Modified `src/components/ReceiptsManagement.tsx` - Added QB dialog trigger
- [x] Modified `src/components/receipts/ReceiptsTableRow.tsx` - Added sync status badges
- [x] Modified `src/components/receipts/ReceiptsCardView.tsx` - Added sync status badges
- [x] Modified `src/pages/Settings.tsx` - Added QuickBooksSettings component

**Status:** All integrations complete with conditional rendering based on feature flag.

---

## Phase 6: TypeScript Types ✅ COMPLETE

- [x] Created `src/types/quickbooks.ts` - QB-specific type definitions
- [x] Updated `src/integrations/supabase/types.ts` - Added QB fields to receipts table
- [x] Updated `src/hooks/useReceiptsData.ts` - Added QB fields to UnifiedReceipt

**Status:** All types defined. No linter errors. TypeScript compilation ready.

---

## Phase 2: Supabase Secrets Configuration ⚠️ MANUAL ACTION REQUIRED

### Instructions

1. **Navigate to Supabase Dashboard:**
   - Go to your Supabase project: `clsjdxwbsjbhjibvlqbz`
   - Click: **Settings** → **Edge Functions** → **Secrets**

2. **Add the following secrets:**

| Secret Name | Value | Status |
|------------|-------|--------|
| `QUICKBOOKS_CLIENT_ID` | `ABI3ODzfO41PDVRdWt4L7lV8IRxankvubtWzjpLK03vEnrkAMv` | ⬜ Not Set |
| `QUICKBOOKS_CLIENT_SECRET` | `4XjP42ozAYbAEQ2UihNxyQVA8u4Efh2Uv3ltIvmu` | ⬜ Not Set |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` | ⬜ Not Set |
| `QUICKBOOKS_REDIRECT_URI` | `https://clsjdxwbsjbhjibvlqbz.supabase.co/functions/v1/quickbooks-callback` | ⬜ Not Set |

3. **Verification:**
   - [ ] All 4 secrets are saved in Supabase Dashboard
   - [ ] Secrets are visible in the Edge Functions secrets section
   - [ ] No typos in secret names (they are case-sensitive)

### Alternative: CLI Method

If you prefer using the Supabase CLI:

```bash
supabase secrets set QUICKBOOKS_CLIENT_ID=ABI3ODzfO41PDVRdWt4L7lV8IRxankvubtWzjpLK03vEnrkAMv
supabase secrets set QUICKBOOKS_CLIENT_SECRET=4XjP42ozAYbAEQ2UihNxyQVA8u4Efh2Uv3ltIvmu
supabase secrets set QUICKBOOKS_ENVIRONMENT=sandbox
supabase secrets set QUICKBOOKS_REDIRECT_URI=https://clsjdxwbsjbhjibvlqbz.supabase.co/functions/v1/quickbooks-callback
```

### Important Notes

- **Environment:** These are SANDBOX credentials only (safe for testing)
- **Redirect URI:** Must match exactly in both Supabase and Intuit Developer Portal
- **Security:** Secrets are encrypted at rest and never exposed in logs
- **Project ID:** `clsjdxwbsjbhjibvlqbz` (already filled in the redirect URI)

---

## Phase 3: Edge Functions

**Status:** Pending (requires Phase 2 completion)

### Files to Create

- [ ] `supabase/functions/_shared/quickbooks.ts` - Shared utilities
- [ ] `supabase/functions/quickbooks-connect/index.ts` - OAuth initiation
- [ ] `supabase/functions/quickbooks-callback/index.ts` - OAuth callback
- [ ] `supabase/functions/quickbooks-sync-receipt/index.ts` - Receipt sync

---

## Phase 4: Frontend Components

**Status:** Pending (requires Phase 3 completion)

### Files to Create

- [ ] `src/hooks/useFeatureFlag.ts`
- [ ] `src/hooks/useQuickBooksConnection.ts`
- [ ] `src/hooks/useQuickBooksSync.ts`
- [ ] `src/components/receipts/SendToQuickBooksDialog.tsx`
- [ ] `src/components/settings/QuickBooksSettings.tsx`

### Files to Modify

- [ ] `src/pages/ReceiptsManagement.tsx` - Add QB sync dialog
- [ ] Receipt list components - Add QB status badges

---

## Phase 5: TypeScript Types

**Status:** Pending (requires Phase 4 completion)

### Files to Update

- [ ] `src/integrations/supabase/types.ts` - Add feature_flags, quickbooks_connections, receipts QB fields

---

## Phase 6: Testing

**Status:** Pending

### Feature Flag Tests
- [ ] Feature disabled → No QB UI visible
- [ ] Feature enabled → QB connection option in settings
- [ ] Feature enabled → "Send to QB" option after approval

### Connection Tests (Sandbox)
- [ ] Can initiate OAuth flow
- [ ] OAuth popup opens correctly
- [ ] Callback processes successfully
- [ ] Tokens stored in database
- [ ] Connection status shows in settings
- [ ] Can disconnect

### Sync Tests (Sandbox)
- [ ] Dry run returns correct payload preview
- [ ] Sync creates Purchase in QuickBooks sandbox
- [ ] Receipt updated with QB transaction ID
- [ ] Sync log entry created
- [ ] Error handling works
- [ ] Cannot sync unapproved receipt
- [ ] Cannot sync already-synced receipt

### UI Tests
- [ ] Settings page shows connection status
- [ ] Approval triggers QB dialog
- [ ] Skip button works
- [ ] Preview button shows payload
- [ ] Send button syncs and shows success
- [ ] Badge shows sync status in receipt list

---

## Phase 7: Deployment

**Status:** Pending

### Pre-Deployment Checklist
- [ ] All database migrations applied
- [ ] Supabase secrets configured
- [ ] Edge Functions deployed
- [ ] Frontend deployed
- [ ] Feature flag remains DISABLED
- [ ] Intuit Developer Portal redirect URI updated
- [ ] End-to-end OAuth flow tested

### Post-Deployment
- [ ] Enable feature flag for admin testing only
- [ ] Test with sandbox thoroughly
- [ ] Monitor sync logs for errors
- [ ] Document any issues

### Production Switch (Future)
- [ ] Get production QuickBooks credentials from Intuit
- [ ] Update Supabase secrets with production values
- [ ] Update QUICKBOOKS_ENVIRONMENT to 'production'
- [ ] Enable feature flag for all users

---

## Current Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Database | ✅ Complete | All 5 migrations applied successfully |
| Phase 2: Secrets | ⚠️ Manual Required | User must configure in Supabase Dashboard |
| Phase 3: Edge Functions | 🔜 Pending | Awaiting Phase 2 completion |
| Phase 4: Frontend | 🔜 Pending | Awaiting Phase 3 completion |
| Phase 5: Types | 🔜 Pending | Awaiting Phase 4 completion |
| Phase 6: Testing | 🔜 Pending | Awaiting Phase 5 completion |
| Phase 7: Deployment | 🔜 Pending | Awaiting Phase 6 completion |

---

## Safety Features Implemented

✅ **Feature Flag:** QuickBooks integration disabled by default  
✅ **Admin-Only:** All QB operations require admin role  
✅ **Sandbox First:** Using sandbox credentials only  
✅ **Audit Trail:** Every sync logged with full payloads  
✅ **CSRF Protection:** OAuth state tokens for security  
✅ **No Auto-Sync:** Manual trigger only

---

## Next Steps

1. **Complete Phase 2:** Add secrets to Supabase Dashboard (manual step)
2. **Confirm Completion:** Let the AI know when Phase 2 is done
3. **Proceed to Phase 3:** AI will implement Edge Functions
4. **Continue Sequentially:** Each phase builds on the previous

---

## Questions or Issues?

- Check `docs/quickbooks/QUICKBOOKS_INTEGRATION_SPEC.md` for full implementation details
- Review `.cursorrules` for Supabase MCP workflow
- Verify migration sync: `supabase/migrations/` should have 254 files
- Database migration count should also be 254

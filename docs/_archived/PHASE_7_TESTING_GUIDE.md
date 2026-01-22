# Phase 7: QuickBooks Integration Testing Guide

## ✅ Pre-Flight Checklist

### 1. ✅ Database Migrations - COMPLETE
All 5 migrations applied via Supabase MCP:
- `20260112175539_create_feature_flags`
- `20260112175545_create_quickbooks_connection`
- `20260112175550_create_quickbooks_oauth_states`
- `20260112175555_add_quickbooks_to_receipts`
- `20260112175600_enhance_quickbooks_sync_log`

**Status:** All migrations in database and local files synchronized (254 total)

### 2. ⚠️ Supabase Secrets - REQUIRES MANUAL ACTION

**YOU MUST DO THIS BEFORE TESTING:**

1. Go to: https://supabase.com/dashboard/project/clsjdxwbsjbhjibvlqbz/settings/functions
2. Click "Secrets" tab
3. Add these 4 secrets:

| Secret Name | Value |
|-------------|-------|
| `QUICKBOOKS_CLIENT_ID` | `ABI3ODzfO41PDVRdWt4L7lV8IRxankvubtWzjpLK03vEnrkAMv` |
| `QUICKBOOKS_CLIENT_SECRET` | `4XjP42ozAYbAEQ2UihNxyQVA8u4Efh2Uv3ltIvmu` |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` |
| `QUICKBOOKS_REDIRECT_URI` | `https://clsjdxwbsjbhjibvlqbz.supabase.co/functions/v1/quickbooks-callback` |

### 3. ✅ Edge Functions - DEPLOYED

**All 3 Edge Functions deployed via Supabase MCP:**

- ✅ `quickbooks-connect` - ACTIVE (v1, verify_jwt: true)
- ✅ `quickbooks-callback` - ACTIVE (v1, verify_jwt: false)
- ✅ `quickbooks-sync-receipt` - ACTIVE (v1, verify_jwt: true)

**Deployment Date:** January 12, 2025
**Method:** Supabase MCP in Cursor (following .cursorrules)

### 4. ✅ Frontend Compilation - COMPLETE
- TypeScript compiles without errors
- No linter errors
- Build artifacts generated successfully

---

## 🧪 Testing Sequence

### Test 1: Feature Flag (Disabled State)

**Objective:** Verify default behavior with feature disabled

1. **Verify feature is disabled:**
   ```sql
   SELECT * FROM feature_flags WHERE flag_name = 'quickbooks_integration';
   ```
   - Should show `enabled = false`

2. **Check UI visibility:**
   - Go to Settings page
   - **Expected:** NO QuickBooks section visible
   - Approve a receipt
   - **Expected:** NO QuickBooks dialog appears

3. **Result:** ✅ Pass if QuickBooks is completely hidden

---

### Test 2: Enable Feature Flag

**Enable the feature:**

```sql
UPDATE feature_flags 
SET enabled = true 
WHERE flag_name = 'quickbooks_integration';
```

**Verify:**
1. Refresh the app (hard refresh: Ctrl+Shift+R)
2. Go to Settings page
3. **Expected:** "QuickBooks Integration" card now visible
4. **Expected:** Shows "Not Connected" state

**Result:** ✅ Pass if QuickBooks UI appears

---

### Test 3: OAuth Connection Flow

**Steps:**
1. In Settings → QuickBooks Integration
2. Click "Connect to QuickBooks" button
3. **Expected:** Popup window opens to Intuit
4. Log into QuickBooks Sandbox:
   - Use test credentials from Intuit Developer account
   - Select a sandbox company
   - Click "Authorize"
5. **Expected:** 
   - Popup shows "Connected Successfully!"
   - Popup closes automatically after 2 seconds
   - Settings page updates to show "Connected" state
   - Shows company name, connection date

**Verify in database:**
```sql
SELECT realm_id, company_name, environment, is_active, connected_at
FROM quickbooks_connections
WHERE is_active = true;
```

**Result:** ✅ Pass if connection stored and displayed

---

### Test 4: Receipt Approval Flow (Post-Approval Dialog)

**Steps:**
1. Go to Receipts page
2. Find a pending receipt (or create one)
3. Click "Approve" button
4. **Expected:** "Receipt Approved" dialog appears with:
   - Receipt details (vendor, amount, project, date)
   - QuickBooks connection status (🧪 Sandbox)
   - "Preview" button
   - "Send to QuickBooks" button
   - "Skip" button

**Test 4a: Skip Option**
1. Click "Skip"
2. **Expected:** Dialog closes, receipt remains approved, no QB sync

**Test 4b: Preview Option**
1. Approve another receipt
2. Click "Preview" in dialog
3. **Expected:** JSON payload appears showing:
   - PaymentType: "Cash"
   - TotalAmt: (receipt amount)
   - Vendor name
   - Project info in Memo
   - Account: "Job Materials"

**Test 4c: Send to QuickBooks**
1. Approve another receipt
2. Click "Send to QuickBooks"
3. **Expected:**
   - Loading indicator appears
   - Success message: "Successfully sent to QuickBooks!"
   - Dialog auto-closes after 2 seconds
   - Receipt list updates with "QB Synced" green badge

**Verify in database:**
```sql
SELECT 
  id,
  payee_id,
  amount,
  quickbooks_sync_status,
  quickbooks_transaction_id,
  quickbooks_synced_at
FROM receipts
WHERE quickbooks_sync_status = 'success'
ORDER BY quickbooks_synced_at DESC
LIMIT 5;
```

**Result:** ✅ Pass if all options work as expected

---

### Test 5: Verify in QuickBooks Sandbox

**Steps:**
1. Log into QuickBooks Sandbox: https://sandbox.qbo.intuit.com
2. Go to Expenses → Transactions
3. Find the Purchase transaction just created
4. **Expected:**
   - Amount matches receipt
   - Date matches receipt
   - Vendor name matches (if exists in QB)
   - Memo contains project number and name
   - Private Note contains: "RCG Work Receipt ID: [receipt-id]"

**Result:** ✅ Pass if transaction appears correctly in QB

---

### Test 6: QuickBooks Sync Status Badges

**Verify badge display:**

1. Go to Receipts page (list view)
2. **Expected badges:**
   - Approved receipts: "Approved" badge
   - Synced receipts: "QB Synced" green badge next to approval badge
   - Failed syncs: "QB Failed" red badge
   - Pending syncs: "QB Pending" yellow badge

3. Switch to Card view
4. **Expected:** Badges also appear in card headers

**Result:** ✅ Pass if badges display correctly in both views

---

### Test 7: Error Handling

**Test 7a: Not Connected Error**
1. In Settings, click "Disconnect"
2. Confirm disconnection
3. Go to Receipts
4. Approve a receipt
5. Try to send to QuickBooks
6. **Expected:** Warning message: "QuickBooks is not connected. Connect in Settings first."
7. Send button should be disabled

**Test 7b: Already Synced Error**
1. Find a receipt that's already synced (has "QB Synced" badge)
2. Try to trigger sync again (would need to manually test via API)
3. **Expected:** Error: "Receipt already synced to QuickBooks"

**Test 7c: Unapproved Receipt**
1. Try to sync a pending/rejected receipt
2. **Expected:** Error: "Receipt must be approved before syncing to QuickBooks"

**Result:** ✅ Pass if all error cases handled gracefully

---

### Test 8: Audit Trail

**Verify logging:**

```sql
SELECT 
  entity_type,
  entity_id,
  sync_type,
  status,
  quickbooks_id,
  error_message,
  duration_ms,
  environment,
  created_at
FROM quickbooks_sync_log
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- One "connection" entry for OAuth
- Multiple "receipt" entries for syncs
- Status: 'success' for successful syncs
- QuickBooks IDs populated
- Request/response payloads stored (JSONB columns)

**Result:** ✅ Pass if all operations logged

---

### Test 9: Feature Flag Disable (Kill Switch)

**Disable the feature:**

```sql
UPDATE feature_flags 
SET enabled = false 
WHERE flag_name = 'quickbooks_integration';
```

**Verify:**
1. Hard refresh the app (Ctrl+Shift+R)
2. Go to Settings
3. **Expected:** QuickBooks card disappears
4. Approve a receipt
5. **Expected:** NO QuickBooks dialog appears
6. Receipt list shows "QB Synced" badges for previously synced receipts (historical data preserved)

**Result:** ✅ Pass if UI completely hidden, data preserved

---

### Test 10: Admin-Only Access (Security)

**Test with non-admin user:**

1. Log out
2. Log in as a field worker (non-admin)
3. **Expected:** QuickBooks card NOT visible in Settings (even if flag enabled)
4. Approve a receipt (if they have permission)
5. **Expected:** NO QuickBooks dialog appears

**Note:** This test requires a non-admin test user account

**Result:** ✅ Pass if non-admins cannot access QB features

---

## 🐛 Issue Reporting Template

If you encounter any issues during testing:

**Issue #X: [Brief Description]**

**Test:** Test [number] - [name]

**Expected Behavior:**
- [What should happen]

**Actual Behavior:**
- [What actually happened]

**Error Messages:**
- Browser Console: [any console errors]
- UI Toast: [any error toasts]
- Network Tab: [any failed requests]

**Screenshots:**
- [Attach if relevant]

**Database State:**
```sql
-- Include relevant query results
```

---

## ✅ Success Criteria

All tests pass when:

1. ✅ Feature flag controls visibility (disabled = no UI)
2. ✅ OAuth connection flow completes successfully
3. ✅ Receipt sync dialog appears post-approval
4. ✅ Preview shows correct payload
5. ✅ Sync creates transaction in QuickBooks
6. ✅ Status badges display correctly
7. ✅ Error messages are clear and helpful
8. ✅ All operations logged to quickbooks_sync_log
9. ✅ Disabling feature flag hides all UI
10. ✅ Non-admin users cannot access features

---

## 📞 Support

If testing reveals issues:

1. Check browser console for errors
2. Check Supabase Edge Function logs:
   - Go to: https://supabase.com/dashboard/project/clsjdxwbsjbhjibvlqbz/logs/edge-functions
   - Filter by function name
3. Check database for sync_log errors:
   ```sql
   SELECT * FROM quickbooks_sync_log WHERE status = 'failed';
   ```

---

## 🎉 Next Steps After Testing

Once all tests pass:

1. **Phase 8:** User Acceptance Testing (UAT) with real receipts
2. **Phase 9:** Production deployment (switch to production credentials)
3. **Phase 10:** Team training and documentation

**IMPORTANT:** Keep feature flag DISABLED until you're ready for users to access it!

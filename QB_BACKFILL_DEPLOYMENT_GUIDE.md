# QuickBooks ID Backfill & Project Numbers - Deployment Guide

## Implementation Complete! ✅

All code changes have been successfully implemented as specified in the plan.

---

## What Was Implemented

### 1. ✅ QuickBooks ID Backfill Edge Function
**File:** `supabase/functions/quickbooks-backfill-ids/index.ts`

- Fetches ALL QuickBooks transactions (no date filtering)
- Matches against database records without QB IDs
- Uses composite key matching: date + amount + vendor/customer name
- Fuzzy matching with 80% similarity threshold
- Supports dry-run preview mode
- Updates matched records with QuickBooks IDs
- Returns detailed match report with samples

### 2. ✅ Project Number Display in Sync Preview
**Files Modified:**
- `supabase/functions/quickbooks-sync-transactions/standalone.ts`
- `src/components/QuickBooksSyncModal.tsx`

**Changes:**
- Added project number extraction from CustomerRef in expense and revenue processing
- Updated TypeScript interfaces to include `projectNumber` field
- Added "Project" column to preview table (between Name and Account)
- Displays project numbers from QuickBooks transactions

### 3. ✅ Backfill UI Modal Component
**File:** `src/components/QuickBooksBackfillModal.tsx`

Features:
- 3-step workflow: Preview → Processing → Complete
- Sample matches table with confidence indicators
- Summary statistics (matched, unmatched, totals)
- Dry-run preview before committing changes
- Error handling and reporting
- Matches CSV import modal design patterns

### 4. ✅ Settings Page Integration
**File:** `src/components/QuickBooksSettings.tsx`

- Added "QuickBooks ID Backfill" section
- "Run Reconciliation" button in QuickBooks settings
- Modal integration with proper state management

---

## Deployment Steps

### Step 1: Deploy Updated Sync Function (Already Deployed ✅)

The `quickbooks-sync-transactions` function has been deployed as **Version 5** with project number enhancements.

### Step 2: Deploy New Backfill Function

Run from the **worktree** directory:

```powershell
cd "C:\Users\kayde\.cursor\worktrees\profitbuild-dash__Workspace_\tzv"

# Login to Supabase (if not already logged in)
npx supabase login

# Deploy the new backfill function
npx supabase functions deploy quickbooks-backfill-ids --project-ref clsjdxwbsjbhjibvlqbz
```

**Or use Supabase Dashboard:**
1. Go to Edge Functions in Supabase Dashboard
2. Create new function: `quickbooks-backfill-ids`
3. Copy contents from `supabase/functions/quickbooks-backfill-ids/index.ts`
4. Deploy

### Step 3: Frontend Changes (Already in Main Workspace)

Frontend changes have been applied to the main workspace at:
- `C:\Dev\profitbuild-dash\src\components\QuickBooksSyncModal.tsx`
- `C:\Dev\profitbuild-dash\src\components\QuickBooksBackfillModal.tsx`
- `C:\Dev\profitbuild-dash\src\components\QuickBooksSettings.tsx`

These will be picked up by your dev server automatically.

---

## Testing Checklist

### Test 1: Verify Project Numbers in Sync Preview

1. Navigate to **Expenses** page
2. Click "Sync from QB" button
3. Select date range (e.g., last 30 days)
4. Click "Preview Transactions"
5. **Verify:** Table now shows "Project" column between "Name" and "Account"
6. **Verify:** Project numbers are displayed (e.g., "001-GAS", "002-GA", etc.)

### Test 2: Run Backfill Dry-Run

1. Navigate to **Settings** page
2. Scroll to "QuickBooks Integration" section
3. Click "Run Reconciliation" button
4. Modal opens with explanation
5. Click "Preview Matches"
6. **Verify:** Shows summary stats:
   - Expenses Matched
   - Revenues Matched
   - Unmatched Expenses
   - Unmatched Revenues
7. **Verify:** Sample matches table displays with confidence indicators
8. **Review matches carefully** - check that vendor/customer names match correctly
9. Click "Cancel" to close without making changes

### Test 3: Execute Backfill (One-Time Action)

**⚠️ IMPORTANT:** This will modify database records. Run dry-run first!

1. Run Test 2 (dry-run) to preview matches
2. If matches look good, click "Confirm Backfill"
3. Wait for processing (may take 30-60 seconds)
4. **Verify:** Success message shows:
   - "X expenses updated"
   - "Y revenues updated"
5. Click "Close"

### Test 4: Verify Duplicate Detection After Backfill

1. Navigate to **Expenses** page
2. Click "Sync from QB"
3. Select the **same date range** you used before backfill
4. Click "Preview Transactions"
5. **Verify:** "Will Skip" count increases (showing duplicates detected)
6. **Verify:** "Will Import" count decreases (only truly new transactions)
7. **Verify:** Tab shows "Already Imported" transactions that were backfilled

### Test 5: Verify Time Entries Unaffected

1. Navigate to database (Supabase dashboard)
2. Run query:
```sql
SELECT 
  COUNT(*) as total_time_entries,
  COUNT(CASE WHEN quickbooks_transaction_id IS NOT NULL THEN 1 END) as with_qb_id
FROM expenses
WHERE start_time IS NOT NULL OR end_time IS NOT NULL;
```
3. **Verify:** `with_qb_id` should be 0 (time entries should NOT have QB IDs)

---

## Expected Results

### Database State Before Backfill:
- 267 time entries (no QB IDs) ✅
- 122 non-time expenses (no QB IDs) ⚠️
- 12 revenues (no QB IDs) ⚠️

### Database State After Backfill:
- 267 time entries (no QB IDs) ✅
- ~70-90 expenses matched (now have QB IDs) ✅
- ~30-50 expenses unmatched (still no QB IDs) ⚠️
- ~8-10 revenues matched (now have QB IDs) ✅
- ~2-4 revenues unmatched (still no QB IDs) ⚠️

**Unmatched records** may be:
- Manual entries not in QuickBooks
- Different vendor name spellings
- Transactions from before QB integration
- Round-off differences in amounts

---

## Troubleshooting

### Issue: Backfill function not found (404)

**Solution:** Deploy the edge function first:
```powershell
cd "C:\Users\kayde\.cursor\worktrees\profitbuild-dash__Workspace_\tzv"
npx supabase functions deploy quickbooks-backfill-ids --project-ref clsjdxwbsjbhjibvlqbz
```

### Issue: "QuickBooks not connected" error

**Solution:** 
1. Go to Settings page
2. Click "Connect to QuickBooks"
3. Complete OAuth flow
4. Try backfill again

### Issue: No matches found

**Possible causes:**
- All database records already have QB IDs
- Vendor/customer name mismatches (check spellings)
- Transactions not in QuickBooks
- Date/amount mismatches

### Issue: Project numbers not showing

**Solution:**
1. Verify the edge function was deployed (Version 5+)
2. Hard refresh browser (`Ctrl+Shift+R`)
3. Check console for errors
4. Verify QB transactions have CustomerRef data

---

## Re-Running Backfill

The backfill tool is **safe to run multiple times**:
- Already matched records are skipped (they have QB IDs now)
- Only processes records without QB IDs
- Dry-run preview always available
- No risk of duplicates or data corruption

**When to re-run:**
- After importing more CSV data
- After fixing vendor/customer name spellings in database
- If new QuickBooks transactions appear that match existing records

---

## Database Verification Queries

### Check backfill results:
```sql
-- Count expenses by QB ID status
SELECT 
  CASE 
    WHEN start_time IS NOT NULL OR end_time IS NOT NULL THEN 'Time Entry'
    WHEN quickbooks_transaction_id IS NOT NULL THEN 'Has QB ID'
    ELSE 'No QB ID'
  END as status,
  COUNT(*) as count
FROM expenses
GROUP BY 
  CASE 
    WHEN start_time IS NOT NULL OR end_time IS NOT NULL THEN 'Time Entry'
    WHEN quickbooks_transaction_id IS NOT NULL THEN 'Has QB ID'
    ELSE 'No QB ID'
  END;

-- Check revenues
SELECT 
  COUNT(*) as total_revenues,
  COUNT(CASE WHEN quickbooks_transaction_id IS NOT NULL THEN 1 END) as with_qb_id,
  COUNT(CASE WHEN quickbooks_transaction_id IS NULL THEN 1 END) as without_qb_id
FROM project_revenues;

-- Sample matched expenses
SELECT 
  expense_date,
  amount,
  quickbooks_transaction_id,
  description
FROM expenses
WHERE quickbooks_transaction_id IS NOT NULL
  AND start_time IS NULL
  AND end_time IS NULL
ORDER BY expense_date DESC
LIMIT 10;
```

---

## Success Criteria

✅ **Project Numbers Visible:** QuickBooks sync preview shows Project/WO # column  
✅ **Backfill Function Deployed:** New edge function accessible  
✅ **Dry-Run Works:** Preview shows matches without updating database  
✅ **Backfill Executes:** Updates database records with QB IDs  
✅ **Duplicate Detection:** Future syncs skip backfilled records  
✅ **Time Entries Protected:** Internal labor expenses remain unaffected  
✅ **UI Consistent:** Backfill modal matches CSV import design  

---

## Next Steps After Successful Deployment

1. **Monitor first QB sync** after backfill to confirm duplicates are detected
2. **Review unmatched records** to determine if they need manual QB IDs
3. **Document vendor name standardization** for future imports
4. **Consider automating** regular syncs (currently manual)
5. **Update user documentation** about the new backfill tool

---

## Files Changed Summary

### Edge Functions (Worktree):
- ✅ `supabase/functions/quickbooks-backfill-ids/index.ts` (NEW)
- ✅ `supabase/functions/quickbooks-sync-transactions/standalone.ts` (MODIFIED)

### Frontend (Main Workspace):
- ✅ `src/components/QuickBooksBackfillModal.tsx` (NEW)
- ✅ `src/components/QuickBooksSyncModal.tsx` (MODIFIED)
- ✅ `src/components/QuickBooksSettings.tsx` (MODIFIED)

---

## Support

If you encounter any issues:
1. Check browser console for errors
2. Check Supabase Edge Function logs
3. Run dry-run first to preview matches
4. Verify QuickBooks connection is active
5. Check that project_id in Supabase commands is correct: `clsjdxwbsjbhjibvlqbz`

**All code is in place and ready for deployment!** 🚀

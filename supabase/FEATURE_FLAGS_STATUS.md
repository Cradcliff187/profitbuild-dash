# Feature Flags Status

This document tracks the current state of feature flags in the application.

## QuickBooks Integration

**Flag Name**: `quickbooks_auto_sync`
**Status**: ❌ DISABLED
**Last Updated**: January 22, 2026
**Reason**: Disabled pending full testing and production readiness

### Configuration
```json
{
  "sync_frequency": "manual",
  "default_days_back": 30
}
```

### What This Affects
When disabled, the following features are hidden from the UI:
- QuickBooks Settings card in Settings page
- "Sync from QB" button in Expenses page
- QuickBooks Sync History
- QuickBooks Backfill modal

### How to Re-enable
To re-enable QuickBooks features:

1. Update the database flag:
```sql
UPDATE feature_flags 
SET enabled = true, updated_at = NOW() 
WHERE flag_name = 'quickbooks_auto_sync';
```

2. Or use the Supabase dashboard:
   - Navigate to Table Editor → feature_flags
   - Find row with flag_name = 'quickbooks_auto_sync'
   - Set enabled = true

### Technical Details
- Feature flag table: `feature_flags`
- Implementation: `src/hooks/useQuickBooksSync.ts`
- Components affected:
  - `src/components/QuickBooksSettings.tsx`
  - `src/pages/Expenses.tsx`
  - `src/components/QuickBooksSyncModal.tsx`
  - `src/components/QuickBooksSyncHistory.tsx`
  - `src/components/QuickBooksBackfillModal.tsx`

## Other Feature Flags

### Schedule View Features
**Location**: `src/lib/featureFlags.ts`
**Type**: Environment-based (not database)

- `scheduleView`: Enabled via `VITE_FEATURE_SCHEDULE=true`
- `scheduleWarnings`: Enabled via `VITE_FEATURE_SCHEDULE_WARNINGS=true`
- `scheduleDependencies`: Enabled via `VITE_FEATURE_SCHEDULE_DEPS=true`

Current Status: ✅ ALL ENABLED (via .env file)

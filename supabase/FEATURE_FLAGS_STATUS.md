# Feature Flags Status

This document tracks the current state of feature flags in the application.

## Field-Worker Redesign (Jul 2026)

**Flag Names**: `crew_dispatch_board`, `field_worker_v2`
**Status**: ❌ OFF globally — **per-user overrides ON for both flags** for both Chris accounts + Tom Finn (verified against `feature_flag_user_overrides` July 15, 2026)
**Last Updated**: July 15, 2026

| Flag | Controls |
|---|---|
| `crew_dispatch_board` | Admin Crew Dispatch board at `/dispatch` + its sidebar entry (assign person → project → day, schedule-task links, copy-week) |
| `field_worker_v2` | The field-worker experience: five-tab IA (Today `/` · Time · Receipts · Projects · Notes), `NextStopChip`, `FieldTimeLanding`. Today's hero always resolves to a project — dispatched **Next Stop** card, else **"Your last site"** (most recent time-entry project), else browse. Quick actions: Log time · Receipt · Note · Projects. **No visible timer affordance** (removed Jul 15 2026 per usage data — 355/356 entries in 90 days were manual; `/time-tracker/timer` survives as an unlisted escape hatch, delete after stable rollout). |

### Per-user overrides
`feature_flag_user_overrides` (`flag_id`, `user_id`, `enabled`, UNIQUE per pair) — an override row wins over the global `enabled`. Resolution via the `useDbFeatureFlag(flagName)` hook. Admin UI: **`/settings/feature-flags`** (global switches + per-user overrides + audit trail). Every change to a flag or override is auto-logged to `feature_flag_audit` by the `log_feature_flag_change()` trigger.

### Rollout plan
Flags stay OFF globally until dogfooding (Chris + Matt on the board; Tom on the field experience) proves stable in production for a few days. Flip per-user first via `/settings/feature-flags`; global enable is the last step.

Note: the DB-side pieces (assignment-notification trigger, dispatch auto-allocation trigger) are active regardless of the flags — they only fire on `crew_day_assignments` writes, which only flag-enabled surfaces produce.

## QuickBooks Integration

**Flag Name**: `quickbooks_auto_sync`
**Status**: ❌ DISABLED
**Last Updated**: January 22, 2026
**Reason**: Disabled pending full testing and production readiness

> A second row, `quickbooks_integration`, also exists in the `feature_flags` table (OFF, no
> overrides) but has **zero code consumers** — dormant; safe to ignore or delete.

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

### Environment-Based Feature Flags
**Location**: `src/lib/featureFlags.ts`
**Type**: Environment-based (not database)

| Flag | Env Variable | Default | Status |
|------|-------------|---------|--------|
| `scheduleView` | `VITE_FEATURE_SCHEDULE=true` | Off | ✅ Enabled |
| `aiaBilling` | `VITE_FEATURE_AIA_BILLING` | On (unless explicitly set to `false`) | ✅ Enabled |

**Note:** Only two environment-based feature flags exist in `featureFlags.ts`. The schedule warnings and dependencies features are built into the schedule module directly — they are not feature-flagged.

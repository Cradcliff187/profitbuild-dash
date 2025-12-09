# Scheduled SMS System - Build Audit Report

## Executive Summary

The scheduled SMS system has been implemented with **1 CRITICAL BREAK** and **3 minor deviations** from the plan that must be resolved before deployment.

---

## 🔴 CRITICAL BREAKS (Must Fix Before Deployment)

### 1. Authentication Mismatch - `send-sms` Edge Function Call

**Location**: `supabase/functions/process-scheduled-sms/index.ts:185-201`

**Issue**: 
- `process-scheduled-sms` calls `send-sms` with service role key: `Authorization: Bearer ${supabaseServiceKey}`
- `send-sms` requires user JWT token and validates admin/manager role via `supabaseClient.auth.getUser()`
- Service role key is NOT a user JWT, so `getUser()` will fail with "Unauthorized"
- **Result**: All scheduled SMS sends will fail immediately

**Current Code**:
```typescript
// process-scheduled-sms/index.ts:185-201
const sendSMSResponse = await fetch(
  `${supabaseUrl}/functions/v1/send-sms`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`, // ❌ Service role key
    },
    // ...
  }
);
```

**Required Fix**:
Modify `send-sms` to accept service role key for internal/system calls, OR create a separate internal send function. Options:

**Option A (Recommended)**: Add `internalCall` flag to `send-sms`
```typescript
// In send-sms/index.ts
const requestData: SMSRequest = await req.json();
const { internalCall, ... } = requestData;

if (internalCall) {
  // Skip user auth check, use service role client directly
  // Verify it's actually from process-scheduled-sms by checking service role key
  if (!authHeader?.includes(supabaseServiceKey)) {
    throw new Error('Unauthorized');
  }
} else {
  // Existing user auth flow
  const { data: { user: sender } } = await supabaseClient.auth.getUser();
  // ... role check
}
```

**Option B**: Create separate `send-sms-internal` function that bypasses auth

**Option C**: Use service role client to create a user JWT for the schedule creator (complex)

---

## ⚠️ DEVIATIONS FROM PLAN

### 2. Missing ScheduledSMSLogs Integration

**Location**: `src/pages/SMSAdmin.tsx`

**Issue**: 
- Plan specified: "View logs button (shows execution history from `scheduled_sms_logs`)"
- `ScheduledSMSLogs` component is imported but **never rendered**
- No way to view execution logs from the UI

**Current State**: Component exists but is orphaned

**Required Fix**: 
Add logs view to `ScheduledSMSManager` component:
- Add "View Logs" button in schedule row
- Open dialog/modal showing `ScheduledSMSLogs` component filtered by schedule ID
- OR add sub-tab in ScheduledSMSManager for logs

### 3. Missing Validation Rules

**Location**: `src/components/sms/ScheduledSMSManager.tsx`

**Plan Specified**:
- Cron expressions validated using cron-parser
- One-time schedules must be in the future
- At least one recipient (user or role) required ✅ (implemented)
- Message template required, max 300 chars ❌ (only required check exists)

**Missing**:
- No cron expression validation (could save invalid cron to DB)
- No future date validation for one-time schedules
- No message length validation (300 char limit)

**Required Fix**: Add validation in `handleSave()`:
```typescript
// Validate message length
if (messageTemplate.length > 300) {
  toast.error('Message template must be 300 characters or less');
  return;
}

// Validate one-time schedule is in future
if (scheduleType === 'one_time') {
  const scheduledTime = new Date(scheduledDateTime);
  if (scheduledTime <= new Date()) {
    toast.error('One-time schedule must be in the future');
    return;
  }
}

// Validate cron expression (try to parse it)
if (scheduleType === 'recurring') {
  try {
    new Cron(cronExpression, { timezone });
  } catch (error) {
    toast.error('Invalid cron expression');
    return;
  }
}
```

### 4. Cron Setup Migration Uses Wrong Extension

**Location**: `supabase/migrations/20251208203002_setup_scheduled_sms_cron.sql:8`

**Issue**:
- Migration enables `http` extension: `CREATE EXTENSION IF NOT EXISTS http;`
- But SQL example uses `net.http_post` (from `pg_net` extension, not `http`)
- Supabase uses `pg_net` extension for HTTP calls, not `http`

**Current Code**:
```sql
CREATE EXTENSION IF NOT EXISTS http; -- ❌ Wrong extension
-- ...
net.http_post(...) -- This is from pg_net, not http
```

**Required Fix**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net; -- ✅ Correct extension
```

---

## ✅ CORRECTLY IMPLEMENTED

1. ✅ Database schema matches plan exactly
2. ✅ RLS policies correctly implemented
3. ✅ Recipient resolution function matches plan
4. ✅ Edge function structure and logic correct (except auth issue)
5. ✅ UI components match plan specifications
6. ✅ Cron expression builder utility created
7. ✅ SMSAdmin page updated with Scheduled tab
8. ✅ Test send functionality implemented
9. ✅ Activate/deactivate toggle works
10. ✅ Delete with confirmation implemented

---

## 🔍 POTENTIAL ISSUES (Not Breaking, But Should Review)

### 5. Timezone Handling

**Location**: `supabase/functions/process-scheduled-sms/index.ts:95`

**Issue**: Cron library uses timezone, but cron expressions are timezone-agnostic. The timezone is applied to the cron evaluation, which should work, but needs testing.

**Recommendation**: Test with different timezones to ensure correct behavior.

### 6. Duplicate Prevention Logic

**Location**: `supabase/functions/process-scheduled-sms/index.ts:96-104`

**Issue**: The duplicate prevention checks `last_sent_at < prevMinute`, but if the cron job runs multiple times in the same minute (edge case), duplicates could occur.

**Current Logic**:
```typescript
const prevMinute = new Date(now);
prevMinute.setSeconds(0, 0);
prevMinute.setMinutes(prevMinute.getMinutes() - 1);
const nextRun = cron.nextRun(prevMinute);
shouldRun = nextRun && nextRun <= now && (!lastRun || lastRun < prevMinute);
```

**Recommendation**: Add a lock mechanism or check `last_sent_at` is more than 30 seconds ago.

### 7. Error Handling in Batch Sends

**Location**: `supabase/functions/process-scheduled-sms/index.ts:176-221`

**Issue**: If one recipient fails, others continue (good), but there's no rate limiting. Sending to 100+ recipients could hit API limits.

**Recommendation**: Add batching (send in groups of 10 with small delays) as mentioned in plan notes.

### 8. Missing Project Selector in UI

**Location**: `src/components/sms/ScheduledSMSManager.tsx`

**Issue**: Plan mentions `project_id` field exists, but UI doesn't have a project selector when `link_type='project'`.

**Recommendation**: Add conditional project selector when link type is "project".

---

## 📋 IMPLEMENTATION CHECKLIST

### Database
- [x] `scheduled_sms_messages` table created
- [x] `scheduled_sms_logs` table created
- [x] RLS policies added
- [x] `get_scheduled_sms_recipients()` function created
- [ ] ⚠️ Cron setup migration needs `pg_net` not `http` extension

### Edge Functions
- [x] `process-scheduled-sms` function created
- [x] Cron parsing implemented
- [x] Recipient resolution implemented
- [x] Logging implemented
- [ ] 🔴 **CRITICAL**: Fix authentication for `send-sms` calls

### Frontend
- [x] `ScheduledSMSManager` component created
- [x] Create/Edit/Delete functionality
- [x] Test send functionality
- [x] Activate/deactivate toggle
- [x] `ScheduledSMSLogs` component created
- [ ] ⚠️ `ScheduledSMSLogs` not integrated into UI
- [ ] ⚠️ Missing validation rules (cron, future date, message length)
- [ ] ⚠️ Missing project selector for project links

### Testing
- [ ] Cron job setup (manual step)
- [ ] Test recurring schedule
- [ ] Test one-time schedule
- [ ] Test user targeting
- [ ] Test role targeting
- [ ] Test timezone handling
- [ ] Test error scenarios

---

## 🚀 DEPLOYMENT BLOCKERS

**MUST FIX BEFORE DEPLOYMENT**:
1. 🔴 Fix `send-sms` authentication to accept service role key for internal calls
2. ⚠️ Fix cron migration to use `pg_net` extension
3. ⚠️ Integrate `ScheduledSMSLogs` into UI
4. ⚠️ Add missing validation rules

**SHOULD FIX BEFORE PRODUCTION**:
5. Add rate limiting for batch sends
6. Improve duplicate prevention
7. Add project selector to UI
8. Test timezone handling thoroughly

---

## 📝 SUMMARY

**Status**: Implementation is **85% complete** but has **1 critical break** that will prevent all scheduled sends from working.

**Priority Actions**:
1. **IMMEDIATE**: Fix authentication in `send-sms` to support internal calls
2. **HIGH**: Fix cron migration extension name
3. **HIGH**: Integrate logs view into UI
4. **MEDIUM**: Add validation rules
5. **LOW**: Add project selector and rate limiting

**Estimated Fix Time**: 2-3 hours for critical + high priority items.


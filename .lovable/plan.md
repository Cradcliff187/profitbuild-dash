
# Update Time Entry KPI Aliases and Notes

## Overview
Add employee-facing terminology to the gross hours and net hours KPI definitions to ensure the documentation reflects the UI terms used in the WeekView time entry cards.

## File to Modify
**File:** `src/lib/kpi-definitions/time-entry-kpis.ts`

## Changes

### 1. Update `time_entry_gross_hours` aliases (Line 151)
**Before:**
```typescript
aliases: ['gross hours', 'total hours', 'shift hours', 'raw hours', 'total time'],
```

**After:**
```typescript
aliases: ['gross hours', 'total hours', 'shift hours', 'raw hours', 'total time', 'time logged', 'clock time'],
```

### 2. Update `time_entry_gross_hours` notes (Line 150)
**Before:**
```typescript
notes: 'CALCULATED FIELD - total shift duration before lunch deduction. Computed from start_time/end_time. For compliance tracking (e.g., >8 hours may indicate OT eligibility).',
```

**After:**
```typescript
notes: 'CALCULATED FIELD - total shift duration before lunch deduction. Computed from start_time/end_time. For compliance tracking (e.g., >8 hours may indicate OT eligibility). Employee-facing term: "Shift Hours".',
```

### 3. Update `time_entry_hours` aliases (Line 166)
**Before:**
```typescript
aliases: ['hours', 'billable hours', 'net hours', 'productive hours', 'worked hours', 'payable hours'],
```

**After:**
```typescript
aliases: ['hours', 'billable hours', 'net hours', 'productive hours', 'worked hours', 'payable hours', 'paid hours'],
```

### 4. Update `time_entry_hours` notes (Line 165)
**Before:**
```typescript
notes: 'Stored billable hours after lunch deduction. Used for: amount = hours × hourly_rate.',
```

**After:**
```typescript
notes: 'Stored billable hours after lunch deduction. Used for: amount = hours × hourly_rate. Employee-facing term: "Paid Hours".',
```

## Summary of Changes

| Field | Change Type | Addition |
|-------|-------------|----------|
| `time_entry_gross_hours` | aliases | Added "time logged", "clock time" |
| `time_entry_gross_hours` | notes | Added employee-facing term: "Shift Hours" |
| `time_entry_hours` | aliases | Added "paid hours" |
| `time_entry_hours` | notes | Added employee-facing term: "Paid Hours" |

## Why This Matters
- Ensures KPI documentation matches the UI terminology in the WeekView time entry cards
- Helps AI Report Assistant understand employee-facing terms when users ask questions
- Maintains consistency between technical definitions and user-facing language
- After updating, run `npx tsx scripts/sync-edge-kpi-context.ts` to regenerate the edge function context

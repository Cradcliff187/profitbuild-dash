

# Add Lunch Tracking Fields to Today Entries Data Loading

## Overview
Update the `loadTodayEntries` function in `MobileTimeTracker.tsx` to:
1. Fetch lunch tracking fields from the database
2. Include them in the mapped TimeEntry objects

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Changes

### Change 1: Update the Select Query (Lines 463-478)
Add `lunch_taken`, `lunch_duration_minutes`, and `gross_hours` to the select query.

**Current:**
```typescript
let query = supabase
  .from('expenses')
  .select(`
    id,
    amount,
    expense_date,
    description,
    attachment_url,
    created_at,
    user_id,
    approval_status,
    start_time,
    end_time,
    payees!inner(id, payee_name, hourly_rate),
    projects!inner(id, project_number, project_name, client_name, address)
  `)
```

**Updated:**
```typescript
let query = supabase
  .from('expenses')
  .select(`
    id,
    amount,
    expense_date,
    description,
    attachment_url,
    created_at,
    user_id,
    approval_status,
    start_time,
    end_time,
    lunch_taken,
    lunch_duration_minutes,
    gross_hours,
    payees!inner(id, payee_name, hourly_rate),
    projects!inner(id, project_number, project_name, client_name, address)
  `)
```

### Change 2: Update the Mapped Object (Lines 553-571)
Add the lunch fields to the returned entry object.

**Current (lines 553-571):**
```typescript
return {
  id: expense.id,
  teamMember: expense.payees,
  project: expense.projects,
  payee_id: expense.payees?.id,
  project_id: expense.projects?.id,
  expense_date: expense.expense_date,
  description: expense.description,
  hours,
  note: cleanNote,
  attachment_url: expense.attachment_url,
  user_id: expense.user_id,
  approval_status: expense.approval_status,
  is_locked: expense.is_locked,
  startTime,
  endTime,
  startTimeString,
  endTimeString
};
```

**Updated:**
```typescript
return {
  id: expense.id,
  teamMember: expense.payees,
  project: expense.projects,
  payee_id: expense.payees?.id,
  project_id: expense.projects?.id,
  expense_date: expense.expense_date,
  description: expense.description,
  hours,
  note: cleanNote,
  attachment_url: expense.attachment_url,
  user_id: expense.user_id,
  approval_status: expense.approval_status,
  is_locked: expense.is_locked,
  startTime,
  endTime,
  startTimeString,
  endTimeString,
  lunch_taken: expense.lunch_taken || false,
  lunch_duration_minutes: expense.lunch_duration_minutes || null,
  gross_hours: expense.gross_hours || ((startTime && endTime)
    ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    : hours)
};
```

## Summary of Changes

| Location | Change |
|----------|--------|
| Query select (line 474) | Add `lunch_taken, lunch_duration_minutes, gross_hours` |
| Mapped object (line 569) | Add 3 new properties with fallback values |

## Data Flow After Changes
```
Database → lunch_taken, lunch_duration_minutes, gross_hours
    ↓
loadTodayEntries() → maps to TimeEntry object
    ↓
todayEntries state → used in entry card rendering
    ↓
Entry cards → display accurate lunch indicators
```


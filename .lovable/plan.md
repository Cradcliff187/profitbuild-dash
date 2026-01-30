

# Update Week Selector to Sunday-Start Weeks

## Overview
Change the TimesheetWeekSelector component to use Sunday as the week start day (matching field worker views and KPI definitions) and extend the range to show full 7-day weeks.

## File to Modify
**File:** `src/components/TimesheetWeekSelector.tsx`

## Changes

### 1. "This Week" Preset (Lines 24-27)
**Before:**
```typescript
if (newPreset === 'this-week') {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = addDays(start, 4); // Monday to Friday
  onChange(start, end);
}
```

**After:**
```typescript
if (newPreset === 'this-week') {
  const start = startOfWeek(new Date(), { weekStartsOn: 0 });
  const end = addDays(start, 6); // Sunday to Saturday
  onChange(start, end);
}
```

### 2. "Last Week" Preset (Lines 28-32)
**Before:**
```typescript
} else if (newPreset === 'last-week') {
  const lastWeekDate = subWeeks(new Date(), 1);
  const start = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
  const end = addDays(start, 4); // Monday to Friday
  onChange(start, end);
}
```

**After:**
```typescript
} else if (newPreset === 'last-week') {
  const lastWeekDate = subWeeks(new Date(), 1);
  const start = startOfWeek(lastWeekDate, { weekStartsOn: 0 });
  const end = addDays(start, 6); // Sunday to Saturday
  onChange(start, end);
}
```

### 3. Custom Date Selection (Lines 38-46)
**Before:**
```typescript
const handleCustomDateSelect = (date: Date | undefined) => {
  if (date) {
    setCustomStart(date);
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = addDays(start, 4); // Monday to Friday
    onChange(start, end);
    setShowCustomPicker(false);
  }
};
```

**After:**
```typescript
const handleCustomDateSelect = (date: Date | undefined) => {
  if (date) {
    setCustomStart(date);
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = addDays(start, 6); // Sunday to Saturday
    onChange(start, end);
    setShowCustomPicker(false);
  }
};
```

## Summary of Changes

| Location | Change | Effect |
|----------|--------|--------|
| All 3 functions | `weekStartsOn: 1` → `0` | Weeks now start on Sunday |
| All 3 functions | `addDays(start, 4)` → `addDays(start, 6)` | Full 7-day week (Sun-Sat) |

## Why This Matters
- Aligns admin timesheet view with field worker WeekView
- Matches the `reporting.weekly_labor_hours` view which uses Sunday-based weeks
- Ensures consistent KPI calculations across all time entry displays


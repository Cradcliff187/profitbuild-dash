
# Replace Today Entry Cards with Compact Lunch Badge Design

## Overview
Replace the entry card rendering section in `MobileTimeTracker.tsx` with a new design that:
- Uses explicit lunch tracking fields instead of inferred calculations
- Features compact pill-style lunch badges
- Uses consistent "Paid:" terminology
- Provides a cleaner visual layout

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Import Check
**AlertTriangle is already imported** on line 2. No change needed.

## Change: Replace Entry Card Rendering (Lines 1529-1627)

**Current (lines 1529-1627):**
Uses old logic that infers lunch from timestamp differences:
```typescript
const grossHours = entry.startTime && entry.endTime
  ? (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60)
  : entry.hours;
const hasLunchDeduction = grossHours > entry.hours + 0.01;
const lunchMinutes = hasLunchDeduction ? Math.round((grossHours - entry.hours) * 60) : 0;
```

**New Implementation:**
Uses explicit `lunch_taken` and `lunch_duration_minutes` fields:
- Uses `entry.gross_hours` with fallback calculation
- Uses `entry.lunch_taken` and `entry.lunch_duration_minutes` directly
- Compact pill-style lunch badges with emerald/amber backgrounds
- Cleaner horizontal layout for hours display

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| Lunch detection | Inferred from hour difference | Explicit `lunch_taken` field |
| Lunch minutes | Calculated from difference | Explicit `lunch_duration_minutes` |
| Badge style | Text-only with icon | Pill badge with background |
| Hours layout | Stacked rows | Horizontal with labels |
| No lunch warning | `Square` icon | `AlertTriangle` icon |

## Technical Details

### New Lunch Logic
```typescript
const grossHours = entry.gross_hours || (entry.startTime && entry.endTime
  ? (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60)
  : entry.hours);

const hasLunch = entry.lunch_taken && entry.lunch_duration_minutes && entry.lunch_duration_minutes > 0;
const lunchMinutes = hasLunch ? entry.lunch_duration_minutes : 0;
const showShiftHours = hasLunch && grossHours && Math.abs(grossHours - entry.hours) > 0.01;
const isLongShiftNoLunch = !isPTO && !entry.lunch_taken && grossHours > 6;
```

### New Badge Styles
**Lunch taken (emerald):**
```typescript
<div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">
```

**No lunch warning (amber):**
```typescript
<div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs">
```

## Visual Result
The new card layout:
```
┌────────────────────────────────────────┐
│ 001-ABC - Smith Construction  [pending]│
│ 7:00 AM - 3:30 PM                      │
│                                        │
│ Shift:  8.5 hrs          ┌──────────┐  │
│ Paid:   8.0 hrs          │ ✓ 30m    │  │
│                          └──────────┘  │
└────────────────────────────────────────┘
```

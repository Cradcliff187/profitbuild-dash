
# Update Today Time Entry Cards with New Design

## Overview
Replace the current Today time entry cards with an enhanced design that includes:
- PTO project detection and specialized display
- Gross hours vs. net hours (shift vs. paid) terminology
- Lunch status indicators (green checkmark for taken, amber warning for long shifts without lunch)
- Improved layout with status badges

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Current State (Lines 1517-1571)
The current implementation renders a simple card with:
- Time range at top
- Project number and client name
- Project name
- Pending approval badge
- Hours on the right side

## Change Details

### Replace Lines 1517-1571
Replace the entire `todayEntries.map(entry => (...))` block with the new implementation that:

1. **Detects PTO entries** using the `isPTOProject()` helper added earlier
2. **Calculates gross hours** from start/end timestamps
3. **Detects lunch deductions** by comparing gross to net hours
4. **Shows warning** for long shifts (>6 hrs) without lunch

### New Card Layout
```
┌─────────────────────────────────────────┐
│ [Project/PTO Name]            [Badge]   │
│ 7:00 AM - 3:30 PM                       │
│                                         │
│ Shift:                     8.5 hrs      │
│ Paid:                      8.0 hrs      │
│                                         │
│ ✓ 30 min lunch                          │
└─────────────────────────────────────────┘
```

## Technical Details

### Variables Calculated Per Entry
- `isPTO`: Whether the entry is for a PTO project (006-SICK, 007-VAC, 008-HOL)
- `grossHours`: Total shift hours from start to end time
- `hasLunchDeduction`: True if gross > net + 0.01 (tolerance for rounding)
- `lunchMinutes`: Calculated lunch duration in minutes
- `showBothHours`: Show both shift and paid rows
- `isLongShiftNoLunch`: Warning condition for >6 hr shifts without lunch

### Icons Used
- `CheckSquare` (green): Lunch was taken
- `Square` (amber): No lunch recorded on long shift

## Scope
Only the `todayEntries.map` block is replaced. The empty state check before it and the code after (WeekView section) remain unchanged.

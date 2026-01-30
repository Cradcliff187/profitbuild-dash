

# Update Time Entry Cards in WeekView.tsx

## Overview
Replace the current time entry card rendering with a new field-worker-friendly design that better displays PTO entries, lunch breaks, and hours breakdown.

## File to Modify

**File:** `src/components/time-tracker/WeekView.tsx`

## Change Details

**Location:** Lines 223-309 (the dayEntries.map() section)

**Current Implementation:**
- Shows payee name, times, project info in a two-column layout
- Displays hours with emoji lunch indicator (🍴)
- Shows receipt attachment section

**New Implementation:**
- Calculates PTO status, lunch status, and warning conditions upfront
- **Row 1:** Project/PTO name + status badge (always visible)
- **Row 2:** Time range (only for non-PTO entries)
- **Row 3:** Hours display (shift vs paid when lunch taken, or simple hours)
- **Row 4:** Lunch status with CheckSquare icon OR no-lunch warning with Square icon for 6+ hour shifts

## What Changes

| Aspect | Before | After |
|--------|--------|-------|
| Layout | Two-column (info left, hours/status right) | Stacked rows for better mobile readability |
| PTO Display | Shows project number | Shows friendly project name (e.g., "Vacation") |
| Hours | Single hours value with emoji | Shift vs Paid breakdown when lunch taken |
| Lunch Indicator | 🍴 emoji | CheckSquare icon with duration text |
| Warnings | None | Amber warning for 6+ hour shifts without lunch |
| Status Badge | Only shown if approval_status exists | Always shown (defaults to "pending") |

## Visual Examples

**Regular entry with lunch:**
```
001-ABC - Client Name          [pending]
7:00 AM - 3:30 PM

Shift:                         8.5 hrs
Paid:                          8.0 hrs

☑ 30 min lunch
```

**PTO entry:**
```
Vacation                       [approved]

8.0 hrs paid
```

**Long shift without lunch (warning):**
```
001-ABC - Client Name          [pending]
6:00 AM - 1:00 PM

Hours:                         7.0 hrs

☐ No lunch recorded
```

## Technical Notes
- Uses existing `isPTOProject()` helper (line 12)
- Uses already-imported `CheckSquare` and `Square` icons from lucide-react
- Receipt/attachment section is removed in the new design (can be re-added if needed)
- Payee name is no longer displayed on the card (cards already grouped by day, and this is the logged-in user's own entries)


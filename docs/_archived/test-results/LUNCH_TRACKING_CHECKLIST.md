# Lunch Tracking Implementation Checklist

> Quick reference for implementing lunch period tracking in RCG Work.
> See `LUNCH_TRACKING_FEATURE_SPEC.md` for complete specifications.

## Critical Business Logic

```
NET_HOURS = GROSS_HOURS - (LUNCH_TAKEN ? LUNCH_DURATION_MINUTES/60 : 0)
AMOUNT = NET_HOURS × HOURLY_RATE
```

**Example**: 7:30 AM - 4:00 PM (8.5h) with 30min lunch = 8.0h worked × $75 = $600

---

## Implementation Order

### Step 1: Database Migration
Create `supabase/migrations/[timestamp]_add_lunch_tracking.sql`:
```sql
ALTER TABLE expenses 
ADD COLUMN lunch_taken boolean DEFAULT false,
ADD COLUMN lunch_duration_minutes integer DEFAULT 30;

ALTER TABLE expenses 
ADD CONSTRAINT valid_lunch_duration 
CHECK (lunch_taken = false OR lunch_duration_minutes BETWEEN 15 AND 120);

CREATE INDEX idx_expenses_lunch_taken ON expenses(lunch_taken) 
WHERE category = 'labor_internal';
```

### Step 2: TypeScript Types
**File**: `src/integrations/supabase/types.ts`
- Add `lunch_taken: boolean` to expenses Row/Insert/Update
- Add `lunch_duration_minutes: number | null` to expenses Row/Insert/Update

**File**: `src/types/timeEntry.ts`
- Add to `TimeEntryListItem`:
  - `lunch_taken: boolean`
  - `lunch_duration_minutes: number | null`
  - `gross_hours: number`

### Step 3: Utility Functions
**Create**: `src/utils/timeEntryCalculations.ts`
- `calculateTimeEntryHours(start, end, lunchTaken, lunchDuration)` → {grossHours, lunchHours, netHours}
- `calculateTimeEntryAmount(netHours, hourlyRate)` → amount
- `formatHoursDisplay(netHours, lunchTaken)` → "8.0 🍴"
- `LUNCH_DURATION_OPTIONS` = [15, 30, 45, 60, 90, 120]
- `DEFAULT_LUNCH_DURATION` = 30

### Step 4: LunchToggle Component
**Create**: `src/components/time-tracker/LunchToggle.tsx`
```tsx
interface LunchToggleProps {
  lunchTaken: boolean;
  onLunchTakenChange: (value: boolean) => void;
  lunchDuration: number;
  onLunchDurationChange: (value: number) => void;
  disabled?: boolean;
  isMobile?: boolean;
  compact?: boolean;  // For clock-out dialog
}
```
- Full mode: Switch + duration button grid
- Compact mode: Inline toggle + 4 duration buttons (15/30/45/60)

### Step 5: Clock-Out Flow
**File**: `src/components/time-tracker/MobileTimeTracker.tsx`

1. Add state: `lunchTaken`, `lunchDuration`, `showLunchPrompt`
2. Change `handleClockOut` to show prompt instead of immediate clock-out
3. Add `confirmClockOut` that calls `completeClockOut(lunchTaken, lunchDuration)`
4. Update `completeClockOut` to:
   - Calculate netHours using new utility
   - Save `lunch_taken` and `lunch_duration_minutes` to database
5. Add AlertDialog with LunchToggle (compact mode)

### Step 6: Manual Entry Dialog
**File**: `src/components/time-tracker/CreateTimeEntryDialog.tsx`
1. Add `lunchTaken`, `lunchDuration` state
2. Add to `resetForm()`
3. Calculate netHours before saving
4. Include lunch fields in insert
5. Pass props to TimeEntryForm

### Step 7: Edit Dialog
**File**: `src/components/time-tracker/EditTimeEntryDialog.tsx`
1. Add `lunchTaken`, `lunchDuration` state
2. Initialize from `entry.lunch_taken`, `entry.lunch_duration_minutes`
3. Calculate netHours before saving
4. Include lunch fields in update

### Step 8: TimeEntryForm
**File**: `src/components/time-tracker/TimeEntryForm.tsx`
- Add props: `lunchTaken`, `setLunchTaken`, `lunchDuration`, `setLunchDuration`
- Add LunchToggle component after hours input
- Show calculation helper text when lunch enabled

### Step 9: Display Updates
**Files to update**:
- `src/hooks/useTimeEntries.ts` - Add lunch fields to mapping, update calculateHours
- `src/components/time-tracker/WeekView.tsx` - Show 🍴 indicator
- `src/pages/TimeEntries.tsx` - Add lunch column to admin table
- `src/components/role-management/ActiveTimersTable.tsx` - Add lunch to force clock-out

### Step 10: Export Updates
**File**: `src/utils/timeEntryExport.ts`
Add columns: Gross Hours, Lunch Taken, Lunch Duration (min), Net Hours

---

## Key Files Reference

| Component | File |
|-----------|------|
| Mobile Timer | `src/components/time-tracker/MobileTimeTracker.tsx` |
| Create Dialog | `src/components/time-tracker/CreateTimeEntryDialog.tsx` |
| Edit Dialog | `src/components/time-tracker/EditTimeEntryDialog.tsx` |
| Time Entry Form | `src/components/time-tracker/TimeEntryForm.tsx` |
| Week View | `src/components/time-tracker/WeekView.tsx` |
| Admin Table | `src/pages/TimeEntries.tsx` |
| Force Clock-Out | `src/components/role-management/ActiveTimersTable.tsx` |
| Hooks | `src/hooks/useTimeEntries.ts` |
| Types | `src/types/timeEntry.ts` |
| Export | `src/utils/timeEntryExport.ts` |

---

## Validation Rules

1. `lunch_duration_minutes` must be 15-120 when `lunch_taken = true`
2. Net hours must be > 0 (lunch can't exceed shift)
3. Existing entries default to `lunch_taken = false` (no backfill needed)

---

## UI Requirements

- **Touch targets**: 48px minimum on mobile buttons
- **Default lunch duration**: 30 minutes
- **Duration options**: 15, 30, 45, 60, 90, 120 minutes
- **Visual indicator**: 🍴 emoji for entries with lunch

---

## Testing Scenarios

1. ✅ Clock out with no lunch → amount = gross hours × rate
2. ✅ Clock out with 30min lunch → amount = (gross - 0.5) × rate
3. ✅ Clock out with lunch → receipt prompt still appears after
4. ✅ Cancel lunch prompt → timer stays active, no receipt prompt
5. ✅ Manual entry with lunch selected
6. ✅ Edit existing entry, add lunch
7. ✅ Edit existing entry, remove lunch
8. ✅ Force clock-out with lunch
9. ✅ CSV export shows all lunch columns
10. ✅ Offline clock-out preserves lunch data
11. ❌ Lunch duration > shift duration → error
12. ❌ Negative net hours → error

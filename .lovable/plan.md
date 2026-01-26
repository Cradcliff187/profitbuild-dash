
# Fix Hours Field to Display Net Hours

## Problem
The Hours field in `AdminTimeEntryForm` displays **gross hours** (total shift duration) instead of **net hours** (after lunch deduction). This creates confusion because:
- User enters 8 AM - 7 PM with 30 min lunch
- Hours field shows **11.00** (gross)
- But the actual saved/billed amount is based on **10.50** (net)

## Root Cause
The `useEffect` at lines 84-93 only considers start/end times:
```typescript
useEffect(() => {
  if (startTime && endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (end > start) {
      const calculatedHours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2);
      setHours(calculatedHours);
    }
  }
}, [startTime, endTime, setHours]);
```

Issues:
1. Ignores `lunchTaken` and `lunchDuration` in calculation
2. Missing these variables from dependency array (won't recalculate when lunch changes)

## Solution

### File: `src/components/time-entries/AdminTimeEntryForm.tsx`

**Update the useEffect (lines 84-93)** to:
1. Use the existing `calculateTimeEntryHours` utility (already imported)
2. Add `lunchTaken` and `lunchDuration` to dependencies
3. Display net hours instead of gross hours

```typescript
useEffect(() => {
  if (startTime && endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (end > start) {
      const { netHours } = calculateTimeEntryHours(
        start,
        end,
        lunchTaken,
        lunchDuration
      );
      setHours(netHours.toFixed(2));
    }
  }
}, [startTime, endTime, lunchTaken, lunchDuration, setHours]);
```

## Result
- Toggling lunch ON with 8 AM - 7 PM will now show **10.50** in the Hours field
- Changing lunch duration will immediately update the Hours field
- The displayed value will match what gets saved to the database

## Technical Details
- The `calculateTimeEntryHours` utility is already imported and used elsewhere in this file (lines 365-370 for the info text)
- This change reuses the same calculation logic, ensuring consistency
- No new dependencies required

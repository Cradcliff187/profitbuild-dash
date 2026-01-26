
# Fix Expense Date Timezone Bug

## Problem Confirmed
The expense date shows **January 25** in the UI but should show **January 26** (the actual work completion date stored in the database).

## Root Cause
JavaScript's `new Date()` interprets date-only strings as midnight UTC. For users in timezones west of UTC (like Eastern US), this shifts the displayed date backward by one day.

**Example:**
- Database value: `"2026-01-26"`
- JavaScript parses as: `2026-01-26T00:00:00Z` (midnight UTC)
- In Eastern time (UTC-5): `2026-01-25T19:00:00` → displays as **Jan 25**

## Solution
Use the existing `parseDateOnly()` utility which adds a noon anchor (`T12:00:00`) to prevent timezone shifts.

---

## Files to Update

### 1. `src/components/reports/ReportViewer.tsx`

**Line 1:** Add import
```typescript
import { parseDateOnly } from '@/utils/dateUtils';
```

**Lines 52-56:** Update `formatValue` function
```typescript
case 'date':
  if (value) {
    return parseDateOnly(value).toLocaleDateString();
  }
  return '';
```

### 2. `src/components/TimeEntriesCardView.tsx`

**Line 10:** Add import
```typescript
import { parseDateOnly } from '@/utils/dateUtils';
```

**Line 237:** Update date formatting
```typescript
{format(parseDateOnly(entry.expense_date), "MMM dd, yyyy")}
```

---

## Result
After this fix:
- **Database stores:** `2026-01-26` (work completion date)
- **UI displays:** `Jan 26, 2026` (correct date)
- **AI Report summary:** `Jan 26, 2026` (already correct)

All date displays will now correctly show the date the work was completed.

## Technical Notes
- The `parseDateOnly` utility is already used correctly in `TimeEntriesTableRow.tsx` (line 99)
- This is the same fix pattern already applied elsewhere in the codebase
- No new dependencies required

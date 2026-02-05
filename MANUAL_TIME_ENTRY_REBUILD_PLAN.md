# Manual Time Entry Module — Complete Rebuild Plan

## Executive Summary

The manual time entry form is used in **two separate areas** of the application, each with its own parallel component tree. Both suffer from the same mobile overflow bug on date/time inputs, and neither supports overnight shifts. This plan rebuilds the shared form from scratch as a single unified component, then drops it into both locations.

---

## Part 1: What Exists Today (Exact File Inventory)

### Location A — Time Tracker (`/time-tracker`, field-worker facing)

| Component | File Path | Role |
|---|---|---|
| `CreateTimeEntryDialog` | `src/components/time-tracker/CreateTimeEntryDialog.tsx` | Create wrapper — state + save logic |
| `EditTimeEntryDialog` | `src/components/time-tracker/EditTimeEntryDialog.tsx` | Edit wrapper — state + save + delete logic |
| `TimeEntryForm` | `src/components/time-tracker/TimeEntryForm.tsx` | **The form UI** — worker picker, project picker, date, start/end time, hours, lunch, receipt |
| `TimeEntryDialog` | `src/components/time-tracker/TimeEntryDialog.tsx` | Shell — wraps content in a Sheet (bottom on mobile, right on desktop) |
| `LunchToggle` | `src/components/time-tracker/LunchToggle.tsx` | Lunch taken switch + duration selector |

### Location B — Time Entries (`/time-entries`, admin/manager facing)

| Component | File Path | Role |
|---|---|---|
| `AdminCreateTimeEntrySheet` | `src/components/time-entries/AdminCreateTimeEntrySheet.tsx` | Create wrapper — state + save logic |
| `AdminEditTimeEntrySheet` | `src/components/time-entries/AdminEditTimeEntrySheet.tsx` | Edit wrapper — state + save + delete logic |
| `AdminTimeEntryForm` | `src/components/time-entries/AdminTimeEntryForm.tsx` | **The form UI** — nearly identical to TimeEntryForm with minor styling differences |

### Shared Utilities

| File | Role |
|---|---|
| `src/utils/timeEntryCalculations.ts` | `calculateTimeEntryHours()`, `calculateTimeEntryAmount()`, lunch constants |
| `src/utils/timeEntryValidation.ts` | `validateTimeEntryHours()`, `checkTimeOverlap()`, `checkStaleTimer()` |
| `src/utils/dateUtils.ts` | `parseDateOnly()`, `formatDateForDB()` — timezone-safe date parsing |
| `src/components/ui/dialog.tsx` | Custom dialog with `isNativePickerInteraction` workaround |

---

## Part 2: Root Cause Analysis — Mobile Overflow

### Primary Cause: Native `<input type="time">` in a 2-column grid inside a constrained sheet

The current layout:
```tsx
<div className="grid grid-cols-2 gap-3">
  <Input type="time" className="h-12" style={{ fontSize: '16px' }} />  {/* Start */}
  <Input type="time" className="h-12" style={{ fontSize: '16px' }} />  {/* End */}
</div>
```

Inside a Sheet that is `w-[92%]` of the viewport with `px-6` padding on the scroll area.

**Why it overflows on mobile:**

1. **Native time inputs have a browser-imposed minimum width.** On iOS Safari, `<input type="time">` with `font-size: 16px` renders at ~140-160px minimum width (the AM/PM text, the hour:minute digits, and the clear button all take space). Two of those side-by-side need ~300px+ but the available content area inside the sheet on a 375px phone is only ~275px (`375 × 0.92 = 345px - 48px padding = 297px`... minus border/scrollbar = ~275px).

2. **CSS `grid-cols-2` does NOT prevent children from overflowing** — grid items have an implicit `min-width: auto` which means native inputs can push wider than their grid track. The fix requires `min-width: 0` on grid children, but even then the native picker chrome may still clip.

3. **The `<input type="date">` has the same issue** — on some Android devices, the native date picker renders a full "MM/DD/YYYY" string that overflows its container at `font-size: 16px`.

4. **The `font-size: 16px` inline style is required** (prevents iOS auto-zoom on focus) but makes the rendered text wider.

### Secondary Issues

- **No overnight shift support:** `validateTimeEntryHours()` rejects `startTime >= endTime`, making 10 PM → 6 AM impossible.
- **Fragile timezone handling:** `new Date(\`${date}T${startTime}\`)` creates dates in **local browser timezone**, then `.toISOString()` converts to UTC. No explicit timezone is stored or tracked. If a worker's browser has a different timezone than expected, times shift.
- **Two nearly-identical form components** (`TimeEntryForm` and `AdminTimeEntryForm`) that drift over time.

---

## Part 3: Rebuild Strategy

### Approach: Build New → Preview → Replace

1. **Phase 1** — Build a brand-new `ManualTimeEntryForm` component in a new directory
2. **Phase 2** — Create a dev preview route to test it in isolation on mobile
3. **Phase 3** — Wire it into new Create/Edit wrappers for both locations
4. **Phase 4** — After approval, swap old components to new ones
5. **Phase 5** — Remove old components, clean up

This is **zero-risk additive** until Phase 4 (the swap).

---

## Part 4: New Component Architecture

### New Files to Create

```
src/components/time-entry-form/
├── ManualTimeEntryForm.tsx          # The unified form — THE replacement for both TimeEntryForm & AdminTimeEntryForm
├── fields/
│   ├── WorkerPicker.tsx             # Worker selector (dropdown with search)
│   ├── ProjectPicker.tsx            # Project selector (dropdown with search, PTO-aware)
│   ├── DateField.tsx                # Date input — NO native picker, custom mobile-safe
│   ├── TimeRangeField.tsx           # Start/End time — NO native picker, mobile-safe
│   ├── OvernightIndicator.tsx       # Visual indicator when shift crosses midnight
│   ├── HoursDisplay.tsx             # Calculated hours (read-only, derived from times + lunch)
│   └── LunchSection.tsx             # Lunch toggle + duration (replaces LunchToggle)
├── hooks/
│   ├── useTimeEntryForm.ts          # All form state + derived calculations
│   └── useOvernightDetection.ts     # Detects and handles cross-midnight shifts
├── utils/
│   └── timeEntryFormHelpers.ts      # Form-specific helpers (format, parse, validate)
├── ManualTimeEntrySheet.tsx          # Sheet wrapper (replaces TimeEntryDialog + AdminSheet wrappers)
└── index.ts                         # Barrel export
```

### Updated Shared Utilities

```
src/utils/
├── timeEntryCalculations.ts         # UPDATE: Add overnight-aware calculation
├── timeEntryValidation.ts           # UPDATE: Remove startTime >= endTime rejection, add overnight support
└── dateUtils.ts                     # No changes needed
```

---

## Part 5: Solving Each Problem

### 5A. Mobile Overflow — Eliminate Native Pickers

**The fix:** Replace `<input type="date">` and `<input type="time">` with custom controlled inputs that render predictably on all devices.

**Date Field (`DateField.tsx`):**
- Render as a tappable button showing formatted date (e.g., "Wed, Feb 5")
- On tap: open a simple date picker using a calendar popover (Radix Popover + simple calendar grid) or use a controlled `<input type="date">` that is **positioned absolutely and invisible**, triggered by the button tap
- Alternative (simpler): Keep `<input type="date">` but wrap it in a container with `overflow: hidden`, `max-width: 100%`, and the input styled with explicit `width: 100%` and `box-sizing: border-box`. Add `min-width: 0` to the parent.
- **Recommended approach:** Use the shadcn Calendar + Popover pattern that already exists in the project. This gives full control over rendering.

**Time Range Field (`TimeRangeField.tsx`):**
- **Do NOT use `<input type="time">`** — this is the #1 source of overflow
- Instead, render **two tappable buttons** showing formatted time (e.g., "8:00 AM", "5:00 PM")
- On tap: open a **time picker sheet/popover** with:
  - Hour selector: scrollable list or ±buttons (1-12)
  - Minute selector: 00, 15, 30, 45 (quarter-hour increments for construction — configurable)
  - AM/PM toggle
- This gives **100% layout control** — no browser-native rendering surprises
- Each button is a fixed, predictable width
- The two buttons live in a `grid grid-cols-2 gap-3` that will never overflow because button text is controlled

**Layout structure:**
```tsx
// Instead of:
<div className="grid grid-cols-2 gap-3">
  <Input type="time" ... />  {/* UNPREDICTABLE WIDTH */}
  <Input type="time" ... />
</div>

// New:
<div className="grid grid-cols-2 gap-3">
  <TimePickerButton label="Start" value="8:00 AM" onTap={openStartPicker} />
  <TimePickerButton label="End" value="5:00 PM" onTap={openEndPicker} />
</div>
// Each button renders at exactly the width of its grid track — no overflow possible
```

### 5B. Overnight Shift Support

**Current behavior (broken):**
```ts
// timeEntryValidation.ts
if (startTime >= endTime) {
  return { valid: false, message: 'End time must be after start time' };
}
```
A 10 PM → 6 AM shift creates `startTime = 2026-02-05T22:00` and `endTime = 2026-02-05T06:00`, so `startTime >= endTime` → rejected.

**New behavior:**

1. **Detection:** When `endTime <= startTime` (in raw HH:mm comparison), the form automatically detects an overnight shift and shows an `OvernightIndicator` (e.g., 🌙 "Shift crosses midnight — ends next day")

2. **Date handling:** The form stores a single `date` (the **start** date of the shift). When constructing the end DateTime for save:
   ```ts
   const startDateTime = new Date(`${date}T${startTime}`);
   let endDateTime = new Date(`${date}T${endTime}`);
   if (endDateTime <= startDateTime) {
     // Overnight: end time is the next calendar day
     endDateTime.setDate(endDateTime.getDate() + 1);
   }
   ```

3. **Validation update:** Remove the blanket `startTime >= endTime` rejection. Replace with:
   ```ts
   export const validateTimeEntryHours = (
     startTime: Date,
     endTime: Date
   ): { valid: boolean; message?: string; isOvernight?: boolean } => {
     const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
     
     // After overnight adjustment, hours should be positive
     if (hours <= 0) {
       return { valid: false, message: 'Invalid time range' };
     }
     if (hours > 24) {
       return { valid: false, message: `Entry is ${hours.toFixed(1)} hours — maximum 24 hours per entry` };
     }
     if (hours > 16) {
       // Warning, not rejection — confirm with user
       return { valid: true, message: `Entry is ${hours.toFixed(1)} hours — please verify`, isOvernight: true };
     }
     return { valid: true, isOvernight: hours > 12 };
   };
   ```

4. **Calculation update:** `calculateTimeEntryHours()` already works correctly as long as the `endTime` Date object is properly adjusted (it just does `endTime - startTime` in milliseconds).

5. **Overlap check update:** `checkTimeOverlap()` queries by `expense_date` — for overnight shifts, we may need to also check the next day. Update the query to check both `date` and `date + 1 day` for the worker.

### 5C. Timezone Handling

**Current approach:** Times are created with `new Date(\`${date}T${startTime}\`)` (local browser TZ) then stored via `.toISOString()` (UTC). On retrieval, `format(new Date(entry.start_time), 'HH:mm')` converts UTC → local.

**This actually works correctly** as long as:
- The worker's browser is in the same timezone when creating AND viewing entries
- The server (Supabase) stores timestamps in UTC (which it does — `timestamptz` columns)

**What we preserve:**
- Continue using `timestamptz` for `start_time` and `end_time` in the database
- Continue creating Date objects in local time, storing as ISO/UTC
- Continue displaying by parsing from UTC back to local time

**What we improve:**
- Use `Intl.DateTimeFormat` with explicit `timeZone: 'America/New_York'` (or detect from browser) for display formatting, rather than relying on implicit locale
- Add a `timezone` field to the form state (default: `Intl.DateTimeFormat().resolvedOptions().timeZone`) — not stored in DB yet but available for future use
- Add a small timezone indicator in the form (e.g., "Times shown in ET") so workers know what they're entering in

**No schema changes needed** — the existing `timestamptz` columns handle this correctly at the DB level.

### 5D. Hours Auto-Calculation

**Current issue:** Users manually type hours AND enter start/end times. These can get out of sync.

**New behavior:**
- When start time, end time, and date are all set → **hours auto-calculate** and the hours field becomes **read-only display**
- Hours = gross hours - lunch deduction
- User can see the breakdown: "Shift: 9.0h − Lunch: 0.5h = **8.5h worked**"
- If the user clears start or end time, hours becomes editable again (manual override for PTO/overhead entries)

### 5E. PTO/Overhead Entry Support

PTO projects (`006-SICK`, `007-VAC`, `008-HOL`) don't need start/end times.

**New behavior:**
- When a PTO project is selected, the time range fields **hide** and hours becomes **directly editable**
- Lunch section also hides for PTO entries
- Overnight indicator is irrelevant and hidden

---

## Part 6: Implementation Phases

### Phase 1 — New Form Component (Zero-Risk, Additive Only)

**Files to create:**
1. `src/components/time-entry-form/fields/TimePickerButton.tsx` — Tappable time display button
2. `src/components/time-entry-form/fields/TimePicker.tsx` — The picker popover (hour/minute/AM-PM)
3. `src/components/time-entry-form/fields/TimeRangeField.tsx` — Start + End time side by side
4. `src/components/time-entry-form/fields/DateField.tsx` — Date picker using shadcn Calendar
5. `src/components/time-entry-form/fields/WorkerPicker.tsx` — Extract from existing form
6. `src/components/time-entry-form/fields/ProjectPicker.tsx` — Extract from existing form
7. `src/components/time-entry-form/fields/HoursDisplay.tsx` — Calculated hours readout
8. `src/components/time-entry-form/fields/OvernightIndicator.tsx` — Moon icon + messaging
9. `src/components/time-entry-form/fields/LunchSection.tsx` — Refactored LunchToggle
10. `src/components/time-entry-form/hooks/useTimeEntryForm.ts` — All state + derived values
11. `src/components/time-entry-form/hooks/useOvernightDetection.ts` — Midnight crossing logic
12. `src/components/time-entry-form/ManualTimeEntryForm.tsx` — The composed form
13. `src/components/time-entry-form/ManualTimeEntrySheet.tsx` — Sheet wrapper
14. `src/components/time-entry-form/index.ts` — Barrel exports

**Utilities to update (additive only):**
- `timeEntryCalculations.ts` — Add `calculateOvernightHours()` helper
- `timeEntryValidation.ts` — Add `validateTimeEntryHoursV2()` with overnight support (keep V1 intact)

**Estimated scope:** ~800-1200 lines of new code across 14 files

### Phase 2 — Dev Preview Route

1. Add a route `/dev/time-entry-form` in `App.tsx` (same pattern as existing `/dev/mobile-cards`)
2. Create `src/pages/DevTimeEntryForm.tsx` — renders `ManualTimeEntrySheet` in both "create" and "edit" modes with mock data
3. Test on mobile devices / Chrome DevTools mobile emulation
4. **Gate:** You (Chris) review on actual phone, approve the form layout and interactions

### Phase 3 — Wire Into Application

**Time Tracker location:**
1. Create `src/components/time-tracker/CreateTimeEntryDialogV2.tsx` — uses `ManualTimeEntrySheet` + existing save logic
2. Create `src/components/time-tracker/EditTimeEntryDialogV2.tsx` — uses `ManualTimeEntrySheet` + existing save logic
3. Add a feature flag or env variable to toggle between V1 and V2

**Time Entries location:**
1. Create `src/components/time-entries/AdminCreateTimeEntrySheetV2.tsx` — uses `ManualTimeEntrySheet` + existing save logic
2. Create `src/components/time-entries/AdminEditTimeEntrySheetV2.tsx` — uses `ManualTimeEntrySheet` + existing save logic
3. Same feature flag toggle

### Phase 4 — Swap (After Approval)

1. Update `MobileTimeTracker.tsx` to import V2 dialogs
2. Update `TimeEntries.tsx` (page) to import V2 sheets
3. Test all flows:
   - Create entry from Time Tracker (field worker)
   - Edit entry from Time Tracker
   - Create entry from Time Entries (admin)
   - Edit entry from Time Entries (admin)
   - Overnight shift: 10 PM → 6 AM
   - PTO entry: 8 hours, no start/end time
   - Lunch taken: verify hours deduction
   - Mobile: verify no overflow on 375px viewport

### Phase 5 — Cleanup

1. Remove old `TimeEntryForm.tsx`
2. Remove old `AdminTimeEntryForm.tsx`
3. Remove old `CreateTimeEntryDialog.tsx` / `EditTimeEntryDialog.tsx`
4. Remove old `AdminCreateTimeEntrySheet.tsx` / `AdminEditTimeEntrySheet.tsx`
5. Remove `TimeEntryDialog.tsx` wrapper (replaced by `ManualTimeEntrySheet.tsx`)
6. Remove V1 validation function (if V2 is proven)
7. Remove dev preview route
8. Remove feature flag

---

## Part 7: The New `ManualTimeEntryForm` — Component Spec

### Props Interface

```typescript
interface ManualTimeEntryFormProps {
  // Mode
  mode: 'create' | 'edit';
  
  // Initial values (for edit mode)
  initialValues?: {
    workerId: string;
    projectId: string;
    date: string;              // YYYY-MM-DD
    startTime: string;         // HH:mm (24h format)
    endTime: string;           // HH:mm (24h format)
    hours: number;
    lunchTaken: boolean;
    lunchDurationMinutes: number;
    receiptUrl?: string;
  };
  
  // Callbacks
  onSave: (data: TimeEntryFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;  // Edit mode only
  
  // Constraints
  disabled?: boolean;
  canEdit?: boolean;             // For locked/approved entries
  canDelete?: boolean;
  showReceipt?: boolean;         // Field worker gets receipt, admin doesn't
  showRates?: boolean;           // Admin may see hourly rates
  
  // Status display (edit mode)
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  isLocked?: boolean;
  rejectionReason?: string;
}

interface TimeEntryFormData {
  workerId: string;
  projectId: string;
  date: string;                // YYYY-MM-DD
  startTime: Date | null;      // Full DateTime (with overnight adjustment)
  endTime: Date | null;        // Full DateTime (with overnight adjustment)
  hours: number;               // Net hours after lunch
  grossHours: number;          // Total shift hours
  lunchTaken: boolean;
  lunchDurationMinutes: number;
  isOvernight: boolean;
  isPTO: boolean;
}
```

### Layout (Mobile)

```
┌──────────────────────────────────┐
│ ✕  Create Time Entry             │  ← Sheet header
├──────────────────────────────────┤
│                                  │
│  Worker *                        │
│  ┌──────────────────────────┐    │
│  │ 👤 Select worker...      │    │  ← Tappable dropdown (48px height)
│  └──────────────────────────┘    │
│                                  │
│  Project *                       │
│  ┌──────────────────────────┐    │
│  │ 📁 Select project...     │    │  ← Tappable dropdown (48px height)
│  └──────────────────────────┘    │
│                                  │
│  Date *                          │
│  ┌──────────────────────────┐    │
│  │ 📅 Wed, Feb 5, 2026      │    │  ← Tappable button → calendar popover
│  └──────────────────────────┘    │
│                                  │
│  Start Time        End Time      │
│  ┌────────────┐  ┌────────────┐  │
│  │  8:00 AM   │  │  5:00 PM   │  │  ← Tappable buttons → time picker
│  └────────────┘  └────────────┘  │
│                                  │
│  🌙 Overnight shift — ends 2/6  │  ← Only shown when detected
│                                  │
│  ☕ Lunch Break                  │
│  ┌──────────────────────────┐    │
│  │  ○ No lunch    ● 30 min  │    │  ← Toggle + duration chips
│  │  ○ 15 min  ○ 45 min      │    │
│  │  ○ 1 hour  ○ 1.5 hours   │    │
│  └──────────────────────────┘    │
│                                  │
│  Hours                           │
│  ┌──────────────────────────┐    │
│  │ Shift: 9.0h              │    │
│  │ Lunch: -0.5h             │    │
│  │ ─────────────            │    │
│  │ Paid:  8.5h   ✓          │    │  ← Auto-calculated, read-only
│  └──────────────────────────┘    │
│                                  │
├──────────────────────────────────┤
│  [ Cancel ]       [ Create ]     │  ← Fixed footer buttons
└──────────────────────────────────┘
```

---

## Part 8: Risk Assessment

| Risk | Mitigation |
|---|---|
| New form breaks existing save logic | Form emits same data shape; save logic stays in wrappers unchanged |
| Custom time picker UX is worse than native | Build with construction workers in mind — big targets, quarter-hour increments, fast entry. Test with actual users before swapping |
| Overnight shift overlap detection misses entries | Update `checkTimeOverlap` to query both start date and next day |
| Feature flag adds complexity | Flag is temporary (Phase 4→5 is immediate once approved) |
| Workers rely on native picker accessibility features | Custom picker must support: focus management, aria labels, keyboard nav. Time buttons must be announced by screen readers |

---

## Part 9: Database Impact

**No schema changes required for this rebuild.**

The existing columns handle everything:
- `expenses.start_time` (`timestamptz`) — already stores full datetime with timezone
- `expenses.end_time` (`timestamptz`) — already stores full datetime with timezone
- `expenses.expense_date` (`date`) — the start date of the shift
- `expenses.hours` (`numeric`) — net/billable hours
- `expenses.gross_hours` (`numeric`) — total shift hours (trigger-calculated)
- `expenses.lunch_taken` (`boolean`)
- `expenses.lunch_duration_minutes` (`integer`)

The database trigger that calculates `gross_hours` from `end_time - start_time` will automatically handle overnight shifts correctly because both are stored as full `timestamptz` values.

---

## Part 10: Acceptance Criteria

Before Phase 4 swap, ALL must pass:

- [ ] **Mobile (375px):** No horizontal overflow on any field — verified on iPhone SE, iPhone 14, Pixel 7
- [ ] **Standard shift:** 8:00 AM → 5:00 PM, 30-min lunch → saves correctly as 8.5h gross, 8.0h net
- [ ] **Overnight shift:** 10:00 PM → 6:00 AM, no lunch → saves correctly as 8.0h, end_time is next calendar day
- [ ] **PTO entry:** Select "007-VAC", enter 8 hours, no start/end time → saves correctly
- [ ] **Edit existing:** Load entry with times → shows correct values, can modify and save
- [ ] **Overlap detection:** Create overlapping entry → warning shown
- [ ] **Lunch deduction:** Toggle lunch on, select 45 min → hours recalculate automatically
- [ ] **Both locations:** Create/Edit works from Time Tracker AND Time Entries page
- [ ] **Timezone display:** Shows "Times in ET" (or appropriate browser TZ)
- [ ] **Touch targets:** All interactive elements ≥ 48px height
- [ ] **Existing data:** Editing a pre-existing entry doesn't corrupt its values

---

## Appendix: Files NOT Changing

These related files are **out of scope** for this rebuild:

- `MobileTimeTracker.tsx` — Only the import of CreateTimeEntryDialog/EditTimeEntryDialog changes (Phase 4)
- `TimeEntries.tsx` (page) — Only the import of AdminCreate/AdminEdit sheets changes (Phase 4)
- `WeekView.tsx` — Display only, no form
- `TimeEntriesTable.tsx` / `TimeEntriesCardView.tsx` — Display only
- `BulkActionsBar.tsx` — Approval actions, not form
- `TimeEntryExportModal.tsx` — Export, not form
- Clock in/out flow in `MobileTimeTracker.tsx` — Timer-based, not manual entry
- `LunchToggle.tsx` — Will be superseded by new `LunchSection.tsx` but removed only in Phase 5

# Lunch Period Tracking Feature Specification

## Overview

This document provides complete specifications for implementing lunch period tracking in RCG Work's time management system. The feature allows tracking whether a lunch break was taken during a shift and automatically adjusts billable hours accordingly.

**Business Rule**: When lunch is taken, the lunch duration is subtracted from the gross shift hours to calculate net worked hours. This net hours value is what gets billed and paid.

**Example**: 
- Shift: 7:30 AM - 4:00 PM (8.5 gross hours)
- Lunch: 30 minutes taken
- Net Hours: 8.0 hours (billable)
- Amount: 8.0 × $75/hr = $600

---

## Phase 1: Database Schema Changes

### 1.1 Migration File

**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_lunch_tracking.sql`

```sql
-- Add lunch tracking columns to expenses table
ALTER TABLE expenses 
ADD COLUMN lunch_taken boolean DEFAULT false,
ADD COLUMN lunch_duration_minutes integer DEFAULT 30;

-- Add constraint: lunch_duration only meaningful when lunch_taken is true
-- Valid durations: 15, 30, 45, 60, 90, 120 minutes
ALTER TABLE expenses 
ADD CONSTRAINT valid_lunch_duration 
CHECK (
  lunch_taken = false 
  OR (lunch_duration_minutes IS NOT NULL AND lunch_duration_minutes BETWEEN 15 AND 120)
);

-- Add index for reporting queries
CREATE INDEX idx_expenses_lunch_taken ON expenses(lunch_taken) WHERE category = 'labor_internal';

-- Add comment for documentation
COMMENT ON COLUMN expenses.lunch_taken IS 'Whether a lunch break was taken during this time entry';
COMMENT ON COLUMN expenses.lunch_duration_minutes IS 'Duration of lunch break in minutes (15-120). Only applicable when lunch_taken is true.';
```

### 1.2 TypeScript Types Update

**File**: `src/integrations/supabase/types.ts`

Add to the `expenses` table type definitions:

```typescript
// In the Row type:
lunch_taken: boolean;
lunch_duration_minutes: number | null;

// In the Insert type:
lunch_taken?: boolean;
lunch_duration_minutes?: number | null;

// In the Update type:
lunch_taken?: boolean;
lunch_duration_minutes?: number | null;
```

### 1.3 TimeEntryListItem Type Update

**File**: `src/types/timeEntry.ts`

```typescript
export interface TimeEntryListItem {
  // ... existing fields ...
  
  // Add these new fields:
  lunch_taken: boolean;
  lunch_duration_minutes: number | null;
  gross_hours: number;  // Total shift duration (end - start)
  hours: number;        // Net worked hours (gross - lunch)
}
```

---

## Phase 2: Utility Functions

### 2.1 Hours Calculation Utility

**File**: `src/utils/timeEntryCalculations.ts` (NEW FILE)

```typescript
/**
 * Time Entry Calculation Utilities
 * 
 * These functions handle the core calculations for time entries,
 * including lunch break adjustments.
 */

export interface TimeEntryHours {
  grossHours: number;      // Total shift duration
  lunchHours: number;      // Lunch break duration (0 if not taken)
  netHours: number;        // Billable hours (gross - lunch)
}

/**
 * Calculate hours breakdown for a time entry
 * 
 * @param startTime - Shift start timestamp
 * @param endTime - Shift end timestamp
 * @param lunchTaken - Whether lunch was taken
 * @param lunchDurationMinutes - Lunch duration in minutes (default 30)
 * @returns Object with grossHours, lunchHours, and netHours
 */
export function calculateTimeEntryHours(
  startTime: Date,
  endTime: Date,
  lunchTaken: boolean = false,
  lunchDurationMinutes: number = 30
): TimeEntryHours {
  const grossHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const lunchHours = lunchTaken ? lunchDurationMinutes / 60 : 0;
  const netHours = Math.max(0, grossHours - lunchHours);
  
  return {
    grossHours: Math.round(grossHours * 100) / 100,
    lunchHours: Math.round(lunchHours * 100) / 100,
    netHours: Math.round(netHours * 100) / 100
  };
}

/**
 * Calculate the amount (cost) for a time entry
 * 
 * @param netHours - Net worked hours after lunch deduction
 * @param hourlyRate - Worker's hourly rate
 * @returns Amount in dollars
 */
export function calculateTimeEntryAmount(
  netHours: number,
  hourlyRate: number
): number {
  return Math.round(netHours * hourlyRate * 100) / 100;
}

/**
 * Format hours for display with optional lunch indicator
 * 
 * @param netHours - Net worked hours
 * @param lunchTaken - Whether lunch was taken
 * @param showLunchIndicator - Whether to show 🍴 icon
 * @returns Formatted string like "8.0" or "8.0 🍴"
 */
export function formatHoursDisplay(
  netHours: number,
  lunchTaken: boolean = false,
  showLunchIndicator: boolean = true
): string {
  const hoursStr = netHours.toFixed(1);
  return lunchTaken && showLunchIndicator ? `${hoursStr} 🍴` : hoursStr;
}

/**
 * Standard lunch duration options
 */
export const LUNCH_DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
] as const;

/**
 * Default lunch duration in minutes
 */
export const DEFAULT_LUNCH_DURATION = 30;
```

### 2.2 Update calculateHours in useTimeEntries

**File**: `src/hooks/useTimeEntries.ts`

Update the `calculateHours` function to account for lunch:

```typescript
const calculateHours = (
  startTime: string | null, 
  endTime: string | null, 
  description: string,
  lunchTaken: boolean = false,
  lunchDurationMinutes: number | null = null
): number => {
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const grossHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const lunchHours = lunchTaken && lunchDurationMinutes ? lunchDurationMinutes / 60 : 0;
    return Math.max(0, grossHours - lunchHours);
  }
  
  // Fallback to description parsing for old entries
  const timeMatch = description?.match(/(\d+\.?\d*)\s*hours?/i);
  return timeMatch ? parseFloat(timeMatch[1]) : 0;
};
```

---

## Phase 3: UI Components

### 3.1 Lunch Toggle Component

**File**: `src/components/time-tracker/LunchToggle.tsx` (NEW FILE)

```typescript
import React from 'react';
import { Coffee } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LUNCH_DURATION_OPTIONS, DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';

interface LunchToggleProps {
  lunchTaken: boolean;
  onLunchTakenChange: (value: boolean) => void;
  lunchDuration: number;
  onLunchDurationChange: (value: number) => void;
  disabled?: boolean;
  isMobile?: boolean;
  compact?: boolean;  // For inline display in clock-out flow
}

export const LunchToggle: React.FC<LunchToggleProps> = ({
  lunchTaken,
  onLunchTakenChange,
  lunchDuration,
  onLunchDurationChange,
  disabled = false,
  isMobile = false,
  compact = false,
}) => {
  if (compact) {
    // Compact version for clock-out prompt
    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Take lunch?</span>
          </div>
          <Switch
            checked={lunchTaken}
            onCheckedChange={onLunchTakenChange}
            disabled={disabled}
          />
        </div>
        
        {lunchTaken && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {LUNCH_DURATION_OPTIONS.slice(0, 4).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLunchDurationChange(option.value)}
                disabled={disabled}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  "min-h-[44px]", // 48px touch target
                  lunchDuration === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version for forms
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label 
          htmlFor="lunch-toggle" 
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            isMobile ? "text-sm font-medium" : "text-sm"
          )}
        >
          <Coffee className="w-4 h-4 text-muted-foreground" />
          Lunch Break Taken
        </Label>
        <Switch
          id="lunch-toggle"
          checked={lunchTaken}
          onCheckedChange={onLunchTakenChange}
          disabled={disabled}
        />
      </div>
      
      {lunchTaken && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Lunch Duration
          </Label>
          <div className={cn(
            "grid gap-2",
            isMobile ? "grid-cols-3" : "grid-cols-4"
          )}>
            {LUNCH_DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLunchDurationChange(option.value)}
                disabled={disabled}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                  isMobile ? "min-h-[48px]" : "min-h-[36px]",
                  lunchDuration === option.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted border-border"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 3.2 Time Entry Form Update

**File**: `src/components/time-tracker/TimeEntryForm.tsx`

Add lunch tracking props and UI to the existing form:

```typescript
// Add to props interface
interface TimeEntryFormProps {
  // ... existing props ...
  lunchTaken: boolean;
  setLunchTaken: (value: boolean) => void;
  lunchDuration: number;
  setLunchDuration: (value: number) => void;
}

// Add to component (after the hours input)
<LunchToggle
  lunchTaken={lunchTaken}
  onLunchTakenChange={setLunchTaken}
  lunchDuration={lunchDuration}
  onLunchDurationChange={setLunchDuration}
  disabled={disabled}
  isMobile={isMobile}
/>

// Update the hours display to show net hours
{lunchTaken && (
  <p className="text-xs text-muted-foreground mt-1">
    Shift: {grossHours}h - Lunch: {lunchDuration/60}h = <strong>{netHours}h worked</strong>
  </p>
)}
```

---

## Phase 4: Clock In/Out Flow Updates

### 4.1 MobileTimeTracker Clock-Out Flow

**File**: `src/components/time-tracker/MobileTimeTracker.tsx`

#### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOCK OUT FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User taps CLOCK OUT button                                      │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────┐                                        │
│  │   LUNCH PROMPT       │  ◄── NEW STEP                          │
│  │   DIALOG             │                                        │
│  │   ┌────────────────┐ │                                        │
│  │   │ Take lunch?    │ │                                        │
│  │   │ [OFF] / [ON]   │ │                                        │
│  │   │                │ │                                        │
│  │   │ Duration:      │ │                                        │
│  │   │ [15][30][45][60]│ │                                        │
│  │   └────────────────┘ │                                        │
│  │                      │                                        │
│  │  [Cancel] [Clock Out]│                                        │
│  └──────────────────────┘                                        │
│         │                    │                                   │
│    (confirm)              (cancel)                               │
│         │                    │                                   │
│         ▼                    ▼                                   │
│  completeClockOut()    Dialog closes,                            │
│  - Calculates net hrs  timer stays active                        │
│  - Saves to database                                             │
│  - Returns expenseId                                             │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────┐                                        │
│  │   RECEIPT PROMPT     │  ◄── EXISTING (unchanged)              │
│  │   DIALOG             │                                        │
│  │                      │                                        │
│  │  "Add a receipt?"    │                                        │
│  │  [Skip] [Add Receipt]│                                        │
│  └──────────────────────┘                                        │
│         │                                                        │
│         ▼                                                        │
│  handleReceiptFromClockOut() or skip                             │
│         │                                                        │
│         ▼                                                        │
│      COMPLETE                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.1.1 Add State Variables

```typescript
// Add to component state declarations
const [showLunchPrompt, setShowLunchPrompt] = useState(false);
const [lunchTaken, setLunchTaken] = useState(false);
const [lunchDuration, setLunchDuration] = useState(30);
```

#### 4.1.2 Update handleClockOut Function

Replace the current `handleClockOut` with a two-step process.

**IMPORTANT**: The existing receipt prompt flow must be preserved. The sequence is:
1. User taps CLOCK OUT → Lunch prompt appears
2. User confirms → `completeClockOut()` saves entry
3. Lunch dialog closes → Receipt prompt appears (existing flow)
4. User adds/skips receipt → Flow complete

```typescript
const handleClockOut = async () => {
  // Step 1: Show lunch prompt instead of immediately clocking out
  // DO NOT call completeClockOut here - that happens in confirmClockOut
  setShowLunchPrompt(true);
};

const confirmClockOut = async () => {
  setShowLunchPrompt(false);
  
  // Capture project before completing clock out (same as original)
  const projectId = activeTimer?.project.id;
  
  // Pass lunch info to completeClockOut
  const expenseId = await completeClockOut(lunchTaken, lunchDuration);
  
  // Reset lunch state for next entry
  setLunchTaken(false);
  setLunchDuration(30);
  
  // PRESERVE EXISTING RECEIPT FLOW - This code is unchanged from original
  // The receipt prompt shows AFTER clock-out completes and lunch dialog closes
  if (expenseId && isOnline && projectId) {
    setPendingReceiptExpenseId(expenseId);
    setPendingReceiptProjectId(projectId);
    setShowReceiptPrompt(true);
  }
};
```

**Note**: The `handleReceiptFromClockOut`, `showReceiptPrompt`, `pendingReceiptExpenseId`, and `pendingReceiptProjectId` states remain completely unchanged. Only the trigger point moves from `handleClockOut` to `confirmClockOut`.

#### 4.1.3 Update completeClockOut Function

```typescript
const completeClockOut = async (
  lunchTaken: boolean = false,
  lunchDurationMinutes: number = 30
): Promise<string | null> => {
  if (!activeTimer) return null;

  setLoading(true);
  try {
    const endTime = new Date();
    
    // Calculate hours with lunch adjustment
    const { grossHours, netHours } = calculateTimeEntryHours(
      activeTimer.startTime,
      endTime,
      lunchTaken,
      lunchDurationMinutes
    );

    // Validate net hours are reasonable
    if (netHours <= 0) {
      toast({
        title: 'Invalid Time Entry',
        description: 'Lunch duration cannot exceed shift duration',
        variant: 'destructive'
      });
      setLoading(false);
      return null;
    }

    // ... existing validation code ...

    const amount = calculateTimeEntryAmount(netHours, activeTimer.teamMember.hourly_rate);

    // Update expense data to include lunch info
    const expenseData = {
      project_id: activeTimer.project.id,
      payee_id: activeTimer.teamMember.id,
      category: 'labor_internal' as const,
      transaction_type: 'expense' as const,
      amount: amount,  // Now based on net hours
      expense_date: format(activeTimer.startTime, 'yyyy-MM-dd'),
      description: '',
      is_planned: false,
      approval_status: 'pending',
      user_id: user?.id,
      start_time: activeTimer.startTime.toISOString(),
      end_time: endTime.toISOString(),
      lunch_taken: lunchTaken,
      lunch_duration_minutes: lunchTaken ? lunchDurationMinutes : null,
    };

    // ... rest of existing save logic ...

    toast({
      title: 'Clocked Out',
      description: lunchTaken 
        ? `Saved ${netHours.toFixed(2)} hours (${lunchDurationMinutes}min lunch)`
        : `Saved ${netHours.toFixed(2)} hours`,
    });

    // ... rest of function ...
  }
};
```

#### 4.1.4 Add Lunch Prompt Dialog

Add this dialog component in the JSX, near other dialogs:

```tsx
{/* Lunch Prompt Dialog */}
<AlertDialog open={showLunchPrompt} onOpenChange={setShowLunchPrompt}>
  <AlertDialogContent className="max-w-sm">
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <Coffee className="w-5 h-5" />
        Clock Out
      </AlertDialogTitle>
      <AlertDialogDescription asChild>
        <div className="space-y-4">
          <div className="text-sm text-foreground">
            {activeTimer && (
              <div className="bg-muted rounded-lg p-3 mb-4">
                <div className="text-lg font-bold text-primary">
                  {getElapsedTime()} on site
                </div>
                <div className="text-xs text-muted-foreground">
                  {activeTimer.project.project_number} - {activeTimer.project.client_name}
                </div>
              </div>
            )}
          </div>
          
          <LunchToggle
            lunchTaken={lunchTaken}
            onLunchTakenChange={setLunchTaken}
            lunchDuration={lunchDuration}
            onLunchDurationChange={setLunchDuration}
            compact={true}
          />
          
          {lunchTaken && activeTimer && (
            <div className="bg-primary/10 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span>Shift duration:</span>
                <span>{getElapsedTime()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Lunch:</span>
                <span>-{lunchDuration} min</span>
              </div>
              <div className="flex justify-between font-bold text-primary border-t mt-2 pt-2">
                <span>Worked hours:</span>
                <span>{calculateNetHours()} hrs</span>
              </div>
            </div>
          )}
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
      <AlertDialogCancel className="w-full sm:w-auto">
        Cancel
      </AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmClockOut}
        className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
      >
        <Square className="w-4 h-4 mr-2" />
        Clock Out
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Phase 5: Manual Entry & Edit Dialogs

### 5.1 CreateTimeEntryDialog Updates

**File**: `src/components/time-tracker/CreateTimeEntryDialog.tsx`

```typescript
// Add state
const [lunchTaken, setLunchTaken] = useState(false);
const [lunchDuration, setLunchDuration] = useState(30);

// Update resetForm
const resetForm = () => {
  // ... existing resets ...
  setLunchTaken(false);
  setLunchDuration(30);
};

// Update handleSave
const handleSave = async () => {
  // ... existing validation ...

  const startDateTime = new Date(`${date}T${startTime}`);
  const endDateTime = new Date(`${date}T${endTime}`);

  // Calculate hours with lunch adjustment
  const { netHours } = calculateTimeEntryHours(
    startDateTime,
    endDateTime,
    lunchTaken,
    lunchDuration
  );

  if (netHours <= 0) {
    toast.error('Lunch duration cannot exceed shift duration');
    return;
  }

  const rate = workerData?.hourly_rate || 75;
  const amount = calculateTimeEntryAmount(netHours, rate);

  const { error } = await supabase.from('expenses').insert({
    // ... existing fields ...
    amount,
    lunch_taken: lunchTaken,
    lunch_duration_minutes: lunchTaken ? lunchDuration : null,
  });

  // ... rest of function ...
};

// Add to TimeEntryForm props
<TimeEntryForm
  // ... existing props ...
  lunchTaken={lunchTaken}
  setLunchTaken={setLunchTaken}
  lunchDuration={lunchDuration}
  setLunchDuration={setLunchDuration}
/>
```

### 5.2 EditTimeEntryDialog Updates

**File**: `src/components/time-tracker/EditTimeEntryDialog.tsx`

```typescript
// Add state
const [lunchTaken, setLunchTaken] = useState(false);
const [lunchDuration, setLunchDuration] = useState(30);

// Update initializeForm
const initializeForm = () => {
  // ... existing initialization ...
  setLunchTaken(entry.lunch_taken || false);
  setLunchDuration(entry.lunch_duration_minutes || 30);
};

// Update handleSave (same pattern as CreateTimeEntryDialog)
const handleSave = async () => {
  // ... existing validation ...

  const { netHours } = calculateTimeEntryHours(
    startDateTime,
    endDateTime,
    lunchTaken,
    lunchDuration
  );

  if (netHours <= 0) {
    toast.error('Lunch duration cannot exceed shift duration');
    return;
  }

  const amount = netHours * rate;

  const { error } = await supabase.from('expenses').update({
    // ... existing fields ...
    amount,
    lunch_taken: lunchTaken,
    lunch_duration_minutes: lunchTaken ? lunchDuration : null,
  }).eq('id', entry.id);

  // ... rest of function ...
};
```

---

## Phase 6: Display Updates

### 6.1 Time Entry List Display

**File**: `src/hooks/useTimeEntries.ts`

Update the entry mapping to include lunch fields:

```typescript
return {
  // ... existing fields ...
  lunch_taken: entry.lunch_taken || false,
  lunch_duration_minutes: entry.lunch_duration_minutes,
  gross_hours: startTime && endTime 
    ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60)
    : hours,
  hours,  // This is now net hours
};
```

### 6.2 WeekView Entry Cards

**File**: `src/components/time-tracker/WeekView.tsx`

Update the entry card to show lunch indicator:

```tsx
{/* Hours with lunch indicator */}
<div className="text-right">
  <div className="text-lg font-bold text-primary">
    {entry.hours.toFixed(1)}h
    {entry.lunch_taken && (
      <span className="ml-1 text-xs" title={`${entry.lunch_duration_minutes}min lunch`}>
        🍴
      </span>
    )}
  </div>
  {entry.lunch_taken && (
    <div className="text-xs text-muted-foreground">
      ({entry.gross_hours?.toFixed(1)}h - {entry.lunch_duration_minutes}min)
    </div>
  )}
</div>
```

### 6.3 TimeEntries Admin Table

**File**: `src/pages/TimeEntries.tsx`

Add lunch column to the table:

```typescript
// Add to columnDefinitions
{ key: 'lunch', label: 'Lunch', sortable: false },

// Add to column widths
lunch: "w-16",

// In the table body, add lunch cell
{visibleColumns.includes('lunch') && (
  <TableCell className="p-2 text-center">
    {entry.lunch_taken && (
      <span 
        className="text-sm" 
        title={`${entry.lunch_duration_minutes} min lunch`}
      >
        🍴 {entry.lunch_duration_minutes}m
      </span>
    )}
  </TableCell>
)}

// Update hours cell to show breakdown on hover
<TableCell className="p-2 text-right">
  <span title={entry.lunch_taken 
    ? `Gross: ${entry.gross_hours?.toFixed(2)}h - Lunch: ${entry.lunch_duration_minutes}min`
    : undefined
  }>
    {entry.hours.toFixed(2)}
    {entry.lunch_taken && <span className="ml-1 text-xs">🍴</span>}
  </span>
</TableCell>
```

### 6.4 CSV Export Update

**File**: `src/utils/timeEntryExport.ts`

Add lunch columns to export:

```typescript
const headers = [
  // ... existing headers ...
  "Gross Hours",
  "Lunch Taken",
  "Lunch Duration (min)",
  "Net Hours",
  // ... rest of headers ...
];

const rows = entries.map((entry) => {
  return [
    // ... existing columns ...
    entry.gross_hours?.toFixed(2) || entry.hours.toFixed(2),
    entry.lunch_taken ? "Yes" : "No",
    entry.lunch_taken ? entry.lunch_duration_minutes?.toString() || "" : "",
    entry.hours.toFixed(2),  // Net hours
    // ... rest of columns ...
  ];
});
```

---

## Phase 7: Force Clock-Out Updates

**File**: `src/components/role-management/ActiveTimersTable.tsx`

Add lunch toggle to force clock-out dialog:

```typescript
// Add state
const [lunchTaken, setLunchTaken] = useState(false);
const [lunchDuration, setLunchDuration] = useState(30);

// Update confirmForceClockOut
const confirmForceClockOut = async () => {
  // ... existing validation ...

  const grossHours = (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60 * 60);
  const lunchHours = lunchTaken ? lunchDuration / 60 : 0;
  const netHours = Math.max(0, grossHours - lunchHours);
  const amount = netHours * selectedTimer.hourly_rate;

  const { error } = await supabase
    .from('expenses')
    .update({
      end_time: endTimeDate.toISOString(),
      amount: amount,
      lunch_taken: lunchTaken,
      lunch_duration_minutes: lunchTaken ? lunchDuration : null,
      updated_by: user?.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', selectedTimer.id);

  // ... rest of function ...
  
  toast({
    title: 'Timer Closed',
    description: lunchTaken
      ? `Clocked out ${selectedTimer.payee_name} (${netHours.toFixed(2)} hours, ${lunchDuration}min lunch)`
      : `Clocked out ${selectedTimer.payee_name} (${netHours.toFixed(2)} hours)`
  });
};

// Add LunchToggle to dialog
<LunchToggle
  lunchTaken={lunchTaken}
  onLunchTakenChange={setLunchTaken}
  lunchDuration={lunchDuration}
  onLunchDurationChange={setLunchDuration}
  compact={true}
/>
```

---

## Phase 8: Reports & Statistics

### 8.1 Update Statistics Calculations

**File**: `src/hooks/useTimeEntries.ts`

The statistics already use `calculateHours` which we updated. No additional changes needed if the updated `calculateHours` function properly reads `lunch_taken` and `lunch_duration_minutes` from entries.

### 8.2 Report Builder Fields

**File**: `src/components/reports/SimpleReportBuilder.tsx`

Add lunch fields to time_entries and internal_labor_hours data sources:

```typescript
{ key: 'lunch_taken', label: 'Lunch Taken', type: 'boolean', group: 'time', helpText: 'Whether lunch was taken' },
{ key: 'lunch_duration_minutes', label: 'Lunch Duration', type: 'number', group: 'time', helpText: 'Lunch duration in minutes' },
{ key: 'gross_hours', label: 'Gross Hours', type: 'number', group: 'time', helpText: 'Total shift duration before lunch deduction' },
```

---

## Phase 9: Migration for Existing Data

### 9.1 Backfill Strategy

Existing time entries have `lunch_taken = false` by default. This is intentional - we don't retroactively assume lunch was taken. The amounts stored are already the "worked hours" based on how they were entered.

No data migration is needed beyond the schema changes.

### 9.2 Edge Cases

1. **Entries without start_time/end_time**: Lunch fields are ignored; hours come from description parsing or amount/rate calculation.

2. **Negative net hours**: Validation prevents saving if lunch_duration >= shift_duration.

3. **Offline entries**: Lunch data is captured locally and synced when online.

---

## Implementation Checklist

### Database
- [ ] Create migration file with new columns
- [ ] Apply migration to dev/staging/prod
- [ ] Update TypeScript types

### Utilities
- [ ] Create `timeEntryCalculations.ts`
- [ ] Update `calculateHours` in `useTimeEntries.ts`

### Components
- [ ] Create `LunchToggle.tsx` component
- [ ] Update `TimeEntryForm.tsx` with lunch props
- [ ] Update `MobileTimeTracker.tsx` clock-out flow
- [ ] Update `CreateTimeEntryDialog.tsx`
- [ ] Update `EditTimeEntryDialog.tsx`
- [ ] Update `ActiveTimersTable.tsx` force clock-out

### Display
- [ ] Update `WeekView.tsx` entry cards
- [ ] Update `TimeEntries.tsx` admin table
- [ ] Update `timeEntryExport.ts` CSV export
- [ ] Update report builder fields

### Testing
- [ ] Test clock-in/out with lunch
- [ ] Test manual entry with lunch
- [ ] Test edit entry with lunch
- [ ] Test force clock-out with lunch
- [ ] Test CSV export includes lunch columns
- [ ] Test offline mode preserves lunch data
- [ ] Test validation (lunch > shift duration)
- [ ] Test mobile touch targets (48px minimum)

---

## File Summary

### New Files
1. `supabase/migrations/YYYYMMDDHHMMSS_add_lunch_tracking.sql`
2. `src/utils/timeEntryCalculations.ts`
3. `src/components/time-tracker/LunchToggle.tsx`

### Modified Files
1. `src/integrations/supabase/types.ts` - Add lunch columns to expenses type
2. `src/types/timeEntry.ts` - Add lunch fields to TimeEntryListItem
3. `src/hooks/useTimeEntries.ts` - Update calculateHours, add lunch fields to mapping
4. `src/components/time-tracker/TimeEntryForm.tsx` - Add LunchToggle
5. `src/components/time-tracker/MobileTimeTracker.tsx` - Add lunch prompt in clock-out
6. `src/components/time-tracker/CreateTimeEntryDialog.tsx` - Add lunch state and save
7. `src/components/time-tracker/EditTimeEntryDialog.tsx` - Add lunch state and save
8. `src/components/time-tracker/WeekView.tsx` - Show lunch indicator
9. `src/pages/TimeEntries.tsx` - Add lunch column to table
10. `src/components/role-management/ActiveTimersTable.tsx` - Add lunch to force clock-out
11. `src/utils/timeEntryExport.ts` - Add lunch columns to CSV
12. `src/components/reports/SimpleReportBuilder.tsx` - Add lunch fields

---

## User Experience Summary

### Clock Out Flow (Mobile)
1. User taps "CLOCK OUT" button
2. Lunch prompt dialog appears showing:
   - Current shift duration
   - "Take lunch?" toggle (default OFF)
   - If toggle ON: Duration buttons (15/30/45/60 min)
   - Calculated net hours preview
3. User taps "Clock Out" to confirm
4. Success message shows net hours (and lunch if taken)

### Manual Entry Flow
1. User opens "Add Time Entry" dialog
2. Selects worker, project, date, start/end times
3. Lunch toggle appears below time inputs
4. If lunch enabled, duration buttons appear
5. Hours field updates to show net hours
6. Helper text: "Shift: 8.5h - Lunch: 0.5h = 8.0h worked"

### Display
- Entry cards show hours with 🍴 icon if lunch taken
- Hover/tap reveals "(8.5h - 30min)" breakdown
- Admin table has optional "Lunch" column
- CSV export includes Gross Hours, Lunch Taken, Lunch Duration, Net Hours

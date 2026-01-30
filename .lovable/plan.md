
# Update Today Summary Card with Shift/Paid Terminology

## Overview
Update the Today Summary Card in `MobileTimeTracker.tsx` to show both shift hours and paid hours when lunch deductions are present, matching the terminology used in the Week view.

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Current State (Lines 1478-1482)
```typescript
            <div className="p-4 space-y-3 relative pb-24">
              <div className="bg-card rounded-xl shadow-sm p-4">
                <div className="text-3xl font-bold text-primary">{todayTotal.toFixed(1)} hrs</div>
                <div className="text-sm text-muted-foreground">Total today • {todayEntries.length} entries</div>
              </div>
```

## Change Details

### Replace Lines 1478-1482
**After:**
```typescript
            <div className="p-4 space-y-3 relative pb-24">
              {(() => {
                const todayShiftTotal = todayEntries.reduce((sum, entry) => {
                  // Calculate gross hours from start/end time if available
                  if (entry.startTime && entry.endTime) {
                    return sum + (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60 * 60);
                  }
                  return sum + entry.hours;
                }, 0);
                const hasLunchDeductions = todayShiftTotal > todayTotal + 0.01;
                
                return (
                  <div className="bg-card rounded-xl shadow-sm p-4">
                    <div className="text-3xl font-bold text-primary">
                      {todayTotal.toFixed(1)} hrs{hasLunchDeductions ? ' paid' : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {hasLunchDeductions 
                        ? `${todayShiftTotal.toFixed(1)} hrs shift • ${todayEntries.length} entries`
                        : `Total today • ${todayEntries.length} entries`
                      }
                    </div>
                  </div>
                );
              })()}
```

## Behavior
- **Without lunch deductions:** Shows `"X.X hrs"` with `"Total today • N entries"`
- **With lunch deductions:** Shows `"X.X hrs paid"` with `"Y.Y hrs shift • N entries"`

## Scope
Only the summary card is modified. The empty state check and `todayEntries.map` that follow remain unchanged.

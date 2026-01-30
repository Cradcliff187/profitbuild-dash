

# Update Week Summary Card in WeekView.tsx

## Overview
Replace the simple Week Summary Card with an enhanced version using an IIFE (Immediately Invoked Function Expression) that calculates both paid hours and shift hours, showing lunch deduction context when applicable.

## File to Modify

**File:** `src/components/time-tracker/WeekView.tsx`

## Change Details

**Location:** Lines 165-177

**Current Code:**
```typescript
      {/* Week Summary Card */}
      <div className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-3xl font-bold text-primary">
              {entries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} hrs
            </div>
            <div className="text-sm text-muted-foreground">
              Total hours this week • {entries.length} entries
            </div>
          </div>
        </div>
      </div>
```

**Replacement Code:**
```typescript
      {/* Week Summary Card */}
      {(() => {
        const totalPaidHours = entries.reduce((sum, e) => sum + e.hours, 0);
        const totalShiftHours = entries.reduce((sum, e) => sum + (e.gross_hours || e.hours), 0);
        const hasLunchDeductions = totalShiftHours > totalPaidHours + 0.01;
        
        return (
          <div className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {totalPaidHours.toFixed(1)} hrs{hasLunchDeductions ? ' paid' : ''}
                </div>
                <div className="text-sm text-muted-foreground">
                  {hasLunchDeductions 
                    ? `${totalShiftHours.toFixed(1)} hrs shift • ${entries.length} entries`
                    : `${entries.length} entries this week`
                  }
                </div>
              </div>
            </div>
          </div>
        );
      })()}
```

## What This Changes

| Aspect | Before | After |
|--------|--------|-------|
| Display | Simple total hours | Shows "paid" label when lunch deductions exist |
| Secondary info | "Total hours this week" | Shows shift hours vs entries based on context |
| Calculation | Single reduce | Calculates both paid and gross hours |

## User Experience

**Without lunch deductions:**
```
42.5 hrs
12 entries this week
```

**With lunch deductions:**
```
42.5 hrs paid
46.5 hrs shift • 12 entries
```

This gives users clear visibility into how lunch breaks affect their total hours.


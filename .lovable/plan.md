
# Update WeekView Card Design to Match MobileTimeTracker

## Overview
Update the `WeekView.tsx` component to use the same compact lunch badge design implemented in `MobileTimeTracker.tsx`, ensuring visual consistency across both views.

## File to Modify
**File:** `src/components/time-tracker/WeekView.tsx`

## Changes

### Change 1: Update Lucide Import (Line 3)
Add `AlertTriangle` to the import statement.

**Current:**
```typescript
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckSquare, Square } from 'lucide-react';
```

**Updated:**
```typescript
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckSquare, Square, AlertTriangle } from 'lucide-react';
```

### Change 2: Replace Entry Card Rendering (Lines 224-307)
Replace the entire `dayEntries.map` section with the new compact design.

**Key Changes:**
- Variable rename: `showBothHours` → `showShiftHours` for consistency
- Hours layout: Horizontal with fixed-width labels instead of `justify-between`
- Lunch badge: Compact pill style with background colors
- No lunch warning: Uses `AlertTriangle` icon instead of `Square`
- Unified layout: Lunch indicators positioned inline with hours display

**New Implementation:**
```typescript
{dayEntries.map(entry => {
  const isPTO = isPTOProject(entry.project.project_number);
  const hasLunch = entry.lunch_taken && entry.lunch_duration_minutes && entry.lunch_duration_minutes > 0;
  const showShiftHours = hasLunch && entry.gross_hours && Math.abs(entry.gross_hours - entry.hours) > 0.01;
  const isLongShiftNoLunch = !isPTO && !entry.lunch_taken && entry.gross_hours && entry.gross_hours > 6;

  return (
    <div 
      key={entry.id} 
      className="bg-card rounded-xl shadow-sm p-4 border-l-4 border-primary cursor-pointer hover:shadow-md transition-shadow border"
      onClick={() => onEditEntry(entry)}
    >
      {/* Row 1: Project/PTO Name + Status Badge */}
      <div className="flex justify-between items-start mb-1">
        <div className="font-semibold text-foreground text-sm">
          {isPTO 
            ? entry.project.project_name 
            : `${entry.project.project_number} - ${entry.project.client_name}`
          }
        </div>
        <Badge 
          variant={
            entry.approval_status === 'approved' ? 'default' :
            entry.approval_status === 'rejected' ? 'destructive' :
            'secondary'
          }
          className="text-xs ml-2 shrink-0"
        >
          {entry.approval_status || 'pending'}
        </Badge>
      </div>
      
      {/* Row 2: Time Range (only for non-PTO entries with times) */}
      {!isPTO && entry.start_time && entry.end_time && (
        <div className="text-sm text-muted-foreground mb-2">
          {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
        </div>
      )}
      
      {/* Row 3: Hours Display + Lunch Badge */}
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          {showShiftHours && (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="w-10">Shift:</span>
              <span className="font-mono">{entry.gross_hours?.toFixed(1)} hrs</span>
            </div>
          )}
          <div className="flex gap-2 text-sm">
            <span className="w-10 text-muted-foreground">Paid:</span>
            <span className="font-mono font-semibold text-primary">{entry.hours.toFixed(1)} hrs</span>
          </div>
        </div>
        
        {/* Lunch Badge - Compact indicator */}
        {hasLunch && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">
            <CheckSquare className="h-3 w-3" />
            <span>{entry.lunch_duration_minutes}m</span>
          </div>
        )}
        
        {isLongShiftNoLunch && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>No lunch</span>
          </div>
        )}
      </div>
    </div>
  );
})}
```

## Visual Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Hours layout | Vertical with `justify-between` | Horizontal with fixed-width labels |
| Lunch badge | Text-only row below hours | Pill badge inline with hours |
| No lunch icon | `Square` | `AlertTriangle` |
| Badge style | Plain text with icon | Pill with colored background |
| Terminology | "X min lunch" | "Xm" (compact) |

## Design Consistency
After this change, both `MobileTimeTracker.tsx` (Today view) and `WeekView.tsx` will share:
- Same card structure and layout
- Same pill-style lunch badges with emerald/amber colors
- Same "Paid:" terminology
- Same `AlertTriangle` icon for no-lunch warnings
- Same horizontal hours display pattern

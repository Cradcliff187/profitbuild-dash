
# Fix Schedule FAB Visibility on Desktop

## Problem Summary

The Schedule FAB (blue button, bottom-left) and Manual Entry FAB (primary color, bottom-right) are not visible on desktop because:

1. **Z-index conflict**: The sidebar uses `z-30` while FABs use `z-20`
2. **Nested rendering**: FABs are inside view-specific conditional blocks, making them subject to parent container clipping
3. **Duplicate code**: The Schedule FAB is defined twice (Timer view + Entries view)

## Solution Overview

Move both FAB buttons to the component root level and increase their z-index to appear above the sidebar on all screen sizes.

---

## Changes Required

### File: `src/components/time-tracker/MobileTimeTracker.tsx`

### Step 1: Remove FABs from Timer View

**Location:** Lines 1438-1445

Remove the Schedule FAB from inside the timer view conditional block.

### Step 2: Remove FABs from Entries View

**Location:** Lines 1556-1572

Remove both the Manual Entry FAB and Schedule FAB from inside the entries "today" conditional block.

### Step 3: Add FABs at Component Root Level

**Location:** Just before `ProjectScheduleSelector` (around line 1772)

Add both FABs at the root level with:
- `z-50` instead of `z-20` to appear above the sidebar (`z-30`)
- Schedule FAB: Always visible (useful from any view)
- Manual Entry FAB: Conditionally visible when `view === 'entries' && entriesDateRange === 'today'`

---

## Technical Details

### Z-Index Hierarchy After Fix
```text
z-65  - Dialogs/Modals (highest)
z-50  - FAB buttons (new)
z-30  - Sidebar
z-20  - Previous FAB position (too low)
z-10  - Sticky headers
```

### Code Structure After Fix
```text
return (
  <div className="min-h-screen...">
    {/* Header */}
    {/* Navigation Tabs */}
    
    {view === 'timer' && (...)}      // No FABs inside
    {view === 'entries' && (...)}    // No FABs inside
    {view === 'receipts' && (...)}
    
    {/* Dialogs and Modals */}
    
    {/* FABs at root level - NEW LOCATION */}
    <button className="fixed bottom-6 left-6 z-50...">  {/* Schedule */}
    {view === 'entries' && entriesDateRange === 'today' && (
      <button className="fixed bottom-6 right-6 z-50...">  {/* Manual Entry */}
    )}
    
    <ProjectScheduleSelector ... />
  </div>
);
```

---

## Expected Result

- **Schedule FAB** (blue, bottom-left): Visible on ALL screen sizes in ALL views
- **Manual Entry FAB** (primary, bottom-right): Visible on ALL screen sizes when on Entries > Today view
- Both buttons float above the sidebar navigation on desktop
- No visual changes on mobile (already working there)

---

## Validation Checklist

After implementation:
- [ ] Schedule FAB visible on desktop in Timer view
- [ ] Schedule FAB visible on desktop in Entries view (both Today and Week tabs)
- [ ] Schedule FAB visible on desktop in Receipts view
- [ ] Manual Entry FAB visible on desktop in Entries > Today view
- [ ] Manual Entry FAB hidden in Entries > Week view
- [ ] Manual Entry FAB hidden in Timer view
- [ ] Manual Entry FAB hidden in Receipts view
- [ ] Both FABs appear above sidebar
- [ ] Both FABs remain below dialogs/modals when opened
- [ ] No TypeScript errors
- [ ] Mobile behavior unchanged

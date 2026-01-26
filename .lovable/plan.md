

# Fix Schedule FAB Position on Desktop

## Problem

The Schedule FAB uses `fixed left-6` (24px from left), but the sidebar is 200px wide on desktop. This causes the FAB to appear **inside** the sidebar area, overlapping navigation items.

## Solution

Offset the FAB position on desktop to account for the sidebar width. The FAB should appear 24px (6 = 1.5rem) from the left edge of the **main content area**, not the viewport.

## Changes Required

### File: `src/components/time-tracker/MobileTimeTracker.tsx`

**Location:** Line 1750 (Schedule FAB button)

**Current:**
```tsx
className="fixed bottom-6 left-6 bg-gradient-to-br ..."
```

**Updated:**
```tsx
className="fixed bottom-6 left-6 lg:left-[calc(12.5rem+1.5rem)] bg-gradient-to-br ..."
```

### Calculation Breakdown
- `12.5rem` = 200px sidebar width (from `SIDEBAR_WIDTH` constant)
- `1.5rem` = 24px (same as `left-6`) margin from sidebar edge
- Total: FAB appears 24px to the right of the sidebar on desktop

### Responsive Behavior
- **Mobile (< 1024px):** `left-6` = 24px from viewport edge (no sidebar visible)
- **Desktop (≥ 1024px):** `left-[calc(12.5rem+1.5rem)]` = 224px from viewport edge (to the right of sidebar)

## Technical Details

The `lg:` prefix targets screens 1024px and wider, which matches when the sidebar becomes visible. This approach:
- Uses the same CSS variable value as the sidebar (`12.5rem`)
- Maintains the same visual spacing (`1.5rem`) from the sidebar as mobile has from the viewport edge
- Uses Tailwind's arbitrary value syntax `[calc(...)]` for precise positioning

## Expected Result

- **Mobile:** FAB at bottom-left, 24px from edge (unchanged)
- **Desktop:** FAB at bottom-left of main content area, 24px from sidebar's right edge
- FAB will never overlap sidebar navigation items


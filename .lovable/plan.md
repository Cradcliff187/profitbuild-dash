
# Standardize Lunch Indicator Colors with Dark Mode Support

## Overview
Update the lunch status indicators in `MobileTimeTracker.tsx` to match the emerald/amber color scheme used in `WeekView.tsx` and add proper dark mode support.

## File to Modify
**File:** `src/components/time-tracker/MobileTimeTracker.tsx`

## Changes

### Change 1: Lunch Taken Indicator (Line 1601)
**Current:**
```typescript
<div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
```

**Updated:**
```typescript
<div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
```

### Change 2: No Lunch Warning (Line 1609)
**Current:**
```typescript
<div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
```

**Updated:**
```typescript
<div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
```

## Summary
| Indicator | Before | After |
|-----------|--------|-------|
| Lunch taken (checkmark) | `text-green-600` | `text-emerald-600 dark:text-emerald-400` |
| No lunch warning | `text-amber-600` | `text-amber-600 dark:text-amber-400` |

## Result
- Visual consistency between MobileTimeTracker and WeekView
- Proper dark mode support for both indicators
- More modern/professional emerald color for lunch confirmation

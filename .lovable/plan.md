
# Fix Date Input Border Styling Inconsistency

## Problem
The Date input field appears to have no visible border compared to the Project selector, creating visual inconsistency in the Add Time Entry form.

## Root Cause
The Project selector uses custom styling with a **2px border** (`border-2 border-border`), while the Date input uses the standard Input component with a **1px border** (`border border-input`). Both use the same color, but the thinner border on the Date field is barely visible.

## Solution
Make the Date, Start Time, End Time, and Hours input fields consistent with the Project/Team Member selector styling by applying `border-2 border-border` classes.

### File: `src/components/time-entries/AdminTimeEntryForm.tsx`

**Update Date Input (line 312):**
```typescript
// Before:
className={cn(isMobile ? "h-12" : "h-10")}

// After:
className={cn(
  "border-2 border-border rounded-lg",
  isMobile ? "h-12 p-4" : "h-10 p-3"
)}
```

**Update Start Time Input (around line 328):**
```typescript
// Before:
className={cn(isMobile ? "h-12" : "h-10")}

// After:
className={cn(
  "border-2 border-border rounded-lg",
  isMobile ? "h-12 p-4" : "h-10 p-3"
)}
```

**Update End Time Input (around line 340):**
```typescript
// Before:
className={cn(isMobile ? "h-12" : "h-10")}

// After:
className={cn(
  "border-2 border-border rounded-lg",
  isMobile ? "h-12 p-4" : "h-10 p-3"
)}
```

**Update Hours Input (around line 356):**
```typescript
// Before:
className={cn(isMobile ? "h-12" : "h-10")}

// After:
className={cn(
  "border-2 border-border rounded-lg",
  isMobile ? "h-12 p-4" : "h-10 p-3"
)}
```

## Result
All form fields will have consistent 2px borders with matching border radius (`rounded-lg`), creating visual harmony throughout the Add Time Entry form.

## Technical Notes
- Uses existing Tailwind classes - no new CSS needed
- Matches the selector button styling pattern already in use
- Maintains mobile-responsive sizing with conditional classes

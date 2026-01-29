

# Fix Build Error: Add `actual_margin` to Project Interface

## Problem Analysis
The build errors occur because:
- `ProjectWithVariance` extends `Project` 
- Code at lines 96 & 148 uses `project.actual_margin`
- But `actual_margin` is missing from `src/types/project.ts`

## Database Confirmation
Both fields exist in the database (verified in `types.ts`):
- `actual_margin` - Real-time profit based on actual spending (Contract - Actual Expenses)
- `current_margin` - A separate field (appears to be legacy/alternative)

Your financial documentation confirms `actual_margin` is the correct field for the "Three-Tier Margin System".

## Fix Required

### File: `src/types/project.ts`

Add `actual_margin` to the Project interface after line 27:

```typescript
// Current (line 26-29):
original_margin?: number | null;
projected_margin?: number | null;
adjusted_est_costs?: number | null;

// Updated:
original_margin?: number | null;
projected_margin?: number | null;
actual_margin?: number | null;      // ← ADD THIS LINE
adjusted_est_costs?: number | null;
```

## Why This is Safe
- The field already exists in the database
- The code is already using it (causing the error)
- We're just syncing the frontend type to match reality
- No calculation logic changes

## About Types Regeneration
- `src/integrations/supabase/types.ts` auto-regenerates on schema changes
- `src/types/project.ts` is your **custom frontend interface** - must be manually maintained
- Running a migration won't fix this - the frontend interface needs the explicit addition

---

## Summary

| Change | Risk |
|--------|------|
| Add `actual_margin` to Project interface | None - aligns type with existing database field and code usage |


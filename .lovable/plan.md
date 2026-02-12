

# Fix Build Errors Blocking Login

## What's Wrong

The app cannot load because of 4 TypeScript build errors. Two new expense categories -- `OFFICE_EXPENSES` and `VEHICLE_EXPENSES` -- were added to the `ExpenseCategory` enum but are missing from category mapping objects in 3 files. This breaks the entire build, which is why you cannot log in.

## The Fix

Add the two missing entries to all 4 category map objects across 3 files:

### 1. `src/utils/expenseAllocation.ts` (2 locations)

**Line 54** -- add after the `MEALS` entry:
```
[ExpenseCategory.OFFICE_EXPENSES]: [LineItemCategory.MANAGEMENT],
[ExpenseCategory.VEHICLE_EXPENSES]: [LineItemCategory.EQUIPMENT],
```

**Line 134** -- same addition after `MEALS` entry.

### 2. `src/components/ExpenseAllocationSheet.tsx` (1 location)

**Line 520** -- add after the `MEALS` entry:
```
[ExpenseCategory.OFFICE_EXPENSES]: [LineItemCategory.MANAGEMENT],
[ExpenseCategory.VEHICLE_EXPENSES]: [LineItemCategory.EQUIPMENT],
```

### 3. `src/components/ProjectExpenseTracker.tsx` (1 location)

**Line ~175** -- add `office_expenses` and `vehicle_expenses` keys to the `categoryBreakdown` object with the same structure as the other categories.

## Summary

| File | Change |
|------|--------|
| `src/utils/expenseAllocation.ts` | Add 2 missing keys in 2 category maps |
| `src/components/ExpenseAllocationSheet.tsx` | Add 2 missing keys in 1 category map |
| `src/components/ProjectExpenseTracker.tsx` | Add 2 missing keys in category breakdown |

4 lines added across 3 files. Zero risk. Once applied, the build will pass and you can log in again.


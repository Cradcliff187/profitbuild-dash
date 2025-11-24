# Archived Components

## Expense Matching (Archived 2024-11)

### Files

- `components/GlobalExpenseMatching.tsx` - Old full-page allocation interface
- `pages/ExpenseMatching.tsx` - Route wrapper for GlobalExpenseMatching

### Why Archived

Replaced with inline `ExpenseAllocationSheet` component for better UX:

- Eliminated context switching (no page navigation)
- Faster workflow (fewer clicks)
- Better mobile experience
- Confirmation before allocation
- Deallocation capability

### Reusable Logic Extracted

Core allocation logic was extracted to `src/utils/expenseAllocation.ts`:

- `suggestLineItemAllocation()` - Smart matching algorithm
- `calculateMatchConfidence()` - Confidence scoring
- Category mapping logic

These utilities are used by ExpenseAllocationSheet.

### If You Need to Restore

The components are preserved here for reference. To restore:

1. Copy files back to original locations
2. Re-add route in App.tsx
3. Re-add "Match Expenses" button in Expenses.tsx
4. Test thoroughly before deploying


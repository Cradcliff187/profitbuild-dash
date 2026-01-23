# Invoice Splitting Implementation - Cursor Agent Prompt

## Overview

You are implementing invoice (revenue) splitting functionality for RCG Work, a construction management application. This feature allows a single invoice to be allocated across multiple projects, mirroring the existing expense splitting pattern already in the codebase.

## Reference Documents Location

All implementation files are in the `docs/invoice-splitting/` folder:

```
docs/invoice-splitting/
├── INVOICE_SPLITTING_IMPLEMENTATION_PLAN.md  <- Start here
├── database/
│   ├── add_revenue_splits_migration.sql      <- Run first
│   └── update_project_financials_view.sql    <- Run after migration
└── src/
    ├── types/revenue.ts                       <- Replace existing
    ├── utils/revenueSplits.ts                <- Create new
    └── components/
        ├── RevenueSplitDialog.tsx            <- Create new
        └── RevenueForm.tsx                   <- Replace existing
```

## Implementation Steps

### Phase 1: Database Migration

1. Open Supabase SQL Editor
2. Run `docs/invoice-splitting/database/add_revenue_splits_migration.sql`
3. Verify the migration succeeded using the verification queries at the bottom
4. Run `docs/invoice-splitting/database/update_project_financials_view.sql`

### Phase 2: TypeScript Types

Replace the existing `src/types/revenue.ts` with the version from `docs/invoice-splitting/src/types/revenue.ts`

Key additions:
- `RevenueSplit` interface
- `CreateRevenueSplitInput` interface
- `RevenueSplitFormInput` interface
- `is_split` property on `ProjectRevenue`

### Phase 3: Utility Functions

Create new file `src/utils/revenueSplits.ts` using the contents from `docs/invoice-splitting/src/utils/revenueSplits.ts`

This provides:
- `createRevenueSplits()` - Create new splits
- `getRevenueSplits()` - Fetch splits for a revenue
- `updateRevenueSplits()` - Update existing splits
- `deleteRevenueSplits()` - Remove all splits
- `validateSplitTotal()` - Validate split amounts
- `calculateProjectRevenue()` - Calculate revenue with splits

### Phase 4: UI Components

1. Create new file `src/components/RevenueSplitDialog.tsx` from `docs/invoice-splitting/src/components/RevenueSplitDialog.tsx`

2. Replace `src/components/RevenueForm.tsx` with the version from `docs/invoice-splitting/src/components/RevenueForm.tsx`

Key UI features:
- Split button on existing invoices
- Read-only amount field when split
- Visual split indicator
- Sheet dialog for managing splits

### Phase 5: Integration & Testing

1. **Verify imports** - Ensure all new files are properly imported where needed
2. **Test split creation** - Create a new split invoice
3. **Test split editing** - Modify existing splits
4. **Test split removal** - Remove all splits from an invoice
5. **Verify reporting** - Check that `reporting.project_financials` shows correct totals

## Existing Code to Reference

These files show the expense splitting pattern to follow:

- `src/types/expense.ts` - Has `ExpenseSplit` interface
- `src/utils/expenseSplits.ts` - Has CRUD functions for expense splits
- `src/components/ExpenseSplitDialog.tsx` - UI for expense splitting
- `src/components/ExpenseForm.tsx` - Form with split button integration

## Critical Business Rules

1. **SYS-000 as parent project** - When an invoice is split, its `project_id` changes to the SYS-000 system project
2. **Minimum 2 splits** - Cannot create a single split
3. **Amounts must match** - Split amounts must sum to parent amount (0.01 tolerance)
4. **No duplicate projects** - Each project can only appear once per invoice
5. **QuickBooks ID preserved** - Parent invoice keeps its QB transaction ID

## Validation Checklist

After implementation, verify:

- [ ] `revenue_splits` table exists in Supabase
- [ ] `is_split` column exists on `project_revenues`
- [ ] SYS-000 project exists for split parents
- [ ] RevenueSplitDialog opens from RevenueForm
- [ ] Split creation works with validation
- [ ] Split editing preserves existing data
- [ ] Split removal reverts to single project
- [ ] Project financial totals are correct
- [ ] Reporting view shows accurate data

## Common Issues & Solutions

### Issue: "System project not found"
**Solution:** Ensure SYS-000 project exists. Run the migration which creates it.

### Issue: TypeScript errors on imports
**Solution:** Check that `@/utils/revenueSplits` export path is correct and types are imported.

### Issue: Split amounts don't validate
**Solution:** Ensure you're parsing string inputs to numbers before validation.

### Issue: Reporting view shows wrong totals
**Solution:** Run the `update_project_financials_view.sql` to add revenue split handling.

## Notes

- The implementation closely mirrors expense splitting for consistency
- All new code follows existing patterns (shadcn-ui, Supabase client, form handling)
- Mobile-first design with 48px touch targets maintained
- Sheet component used for split dialog (same as expenses)

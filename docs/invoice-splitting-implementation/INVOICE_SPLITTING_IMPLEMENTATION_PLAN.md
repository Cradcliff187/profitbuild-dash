# Invoice Splitting Implementation Plan

## Overview

This document provides complete instructions for implementing invoice (revenue) splitting functionality in RCG Work. The feature allows a single invoice to be allocated across multiple projects, mirroring the existing expense splitting pattern.

## Architecture Summary

### Existing Pattern (Expenses)
```
expenses (parent)
  ├── is_split: boolean
  ├── project_id → SYS-000 (when split)
  └── amount: total
      │
      └── expense_splits (children)
            ├── project_id → actual project
            └── split_amount: portion
```

### New Pattern (Revenues)
```
project_revenues (parent)
  ├── is_split: boolean
  ├── project_id → SYS-000 (when split)
  └── amount: total
      │
      └── revenue_splits (children)
            ├── project_id → actual project
            └── split_amount: portion
```

## Implementation Phases

### Phase 1: Database Migration
- Add `is_split` column to `project_revenues`
- Create `revenue_splits` table
- Add indexes for performance
- Update RLS policies

### Phase 2: TypeScript Types
- Create `RevenueSplit` interface
- Update `ProjectRevenue` interface
- Export from types/revenue.ts

### Phase 3: Utility Functions
- Create `src/utils/revenueSplits.ts`
- CRUD operations for splits
- Validation functions
- Project revenue calculations

### Phase 4: UI Components
- Create `RevenueSplitDialog.tsx`
- Update `RevenueForm.tsx` with split support
- Update revenue list/table displays

### Phase 5: Reporting Updates
- Update `reporting.project_financials` view
- Ensure split revenues are handled correctly in aggregations

## File Checklist

| File | Type | Status |
|------|------|--------|
| `supabase/migrations/add_revenue_splits.sql` | Database | Create |
| `src/types/revenue.ts` | Types | Update |
| `src/utils/revenueSplits.ts` | Utilities | Create |
| `src/components/RevenueSplitDialog.tsx` | Component | Create |
| `src/components/RevenueForm.tsx` | Component | Update |
| `reporting.project_financials` view | Database | Update |

## Critical Business Rules

1. **Split revenues use SYS-000 as parent project** - Same pattern as expenses
2. **Split amounts must equal parent amount** - Validation with 0.01 tolerance
3. **Minimum 2 splits required** - Cannot split to single project
4. **No duplicate projects in splits** - Each project can only appear once
5. **QuickBooks compatibility** - Parent record maintains QB transaction ID

## Testing Checklist

- [ ] Create new split revenue
- [ ] Edit existing split revenue
- [ ] Remove splits (revert to single project)
- [ ] Verify project financial totals
- [ ] Verify reporting view accuracy
- [ ] Test validation (amounts must match)
- [ ] Test duplicate project prevention

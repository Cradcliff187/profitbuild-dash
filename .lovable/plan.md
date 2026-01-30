
# Fix Build Errors - Add Missing Types

## Overview
Add the missing `adjusted_est_margin` property to all type interfaces that extend `Project` and fix a few other minor issues.

## Changes Required

### 1. Add `adjusted_est_margin` to `Project` interface
**File:** `src/types/project.ts` (Line 28)

Add after `actual_margin`:
```typescript
adjusted_est_margin?: number | null;
```

### 2. Add `adjusted_est_margin` to `ProjectWithVariance` interface
**File:** `src/components/ProjectsList.tsx` (Line 42-53)

Add to the interface:
```typescript
adjusted_est_margin?: number | null;
```

### 3. Add `adjusted_est_margin` to `WorkOrderWithDetails` in WorkOrders.tsx
**File:** `src/pages/WorkOrders.tsx` (Line 36-42)

Add to the interface:
```typescript
adjusted_est_margin?: number | null;
```

### 4. Add `adjusted_est_margin` to `WorkOrderWithDetails` in WorkOrdersTableView.tsx
**File:** `src/components/WorkOrdersTableView.tsx` (Line 42-55)

Add to the interface:
```typescript
adjusted_est_margin?: number | null;
```

### 5. Add `adjusted_est_margin` to `ProfitAnalysisProject` interface
**File:** `src/types/profitAnalysis.ts` (Line 17-22, Margins section)

Add after `margin_percentage`:
```typescript
adjusted_est_margin: number;
```

### 6. Fix RPC parameter names
**Files:** 
- `src/components/ProjectFinancialReconciliation.tsx` (Line 79)
- `src/components/QuoteStatusSelector.tsx` (Line 153)

Change `project_id_param` to `p_project_id`

### 7. Fix StatusBadge ref forwarding
**File:** `src/components/ui/status-badge.tsx` (Line 82)

Remove the `ref` prop from Badge since it doesn't support forwarding

### 8. Fix EstimatesCardView const assertion
**File:** `src/components/EstimatesCardView.tsx` (Line 231)

Fix the invalid `as const` assertion

---

## Summary
This is a quick type synchronization to add the `adjusted_est_margin` property that was recently added to the database but not yet reflected in all TypeScript interfaces.

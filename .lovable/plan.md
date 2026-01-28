
# Fix Contract Price Bug - Use Cost Instead of Sell Price

## Problem

The contract is showing **$1,800** (the sell price to the client) instead of **$1,440** (the cost to pay the subcontractor).

**Database Data for Quote 225-001-QTE-01-01:**
- `quotes.total_amount`: 1800 (sell price - what client pays)
- `quote_line_items.total_cost`: 1440 (cost - what you pay subcontractor)

**Current Code (useContractData.ts line 119):**
```typescript
const subcontractPrice = Number(quote?.total_amount ?? estimate?.total_amount ?? 0);
```
This incorrectly uses `total_amount` (sell price) instead of the sum of line item costs.

---

## Solution

Update `useContractData.ts` to fetch and sum `total_cost` from `quote_line_items` instead of using `quotes.total_amount`.

---

## Technical Changes

### File: `src/hooks/useContractData.ts`

**1. Add a new query to fetch quote line items total cost:**

```typescript
// Add this query in the Promise.all block (around line 76-84)
quoteId
  ? supabase
      .from('quote_line_items')
      .select('total_cost')
      .eq('quote_id', quoteId)
  : Promise.resolve({ data: null, error: null }),
```

**2. Calculate the sum of costs from line items:**

```typescript
// After extracting results (around line 99-104)
const quoteLineItems = quoteLineItemsResult.data as { total_cost: number }[] | null;

// Calculate total cost from line items
const quoteTotalCost = quoteLineItems?.reduce(
  (sum, item) => sum + (item.total_cost || 0), 
  0
) ?? 0;
```

**3. Use the cost sum for the contract price:**

```typescript
// Update line 119
// Before:
const subcontractPrice = Number(quote?.total_amount ?? estimate?.total_amount ?? 0);

// After:
const subcontractPrice = quoteTotalCost || Number(estimate?.total_amount ?? 0);
```

---

## Summary

| Field | Before | After |
|-------|--------|-------|
| Source | `quotes.total_amount` | `SUM(quote_line_items.total_cost)` |
| Value for 225-001-QTE-01-01 | $1,800 | $1,440 |
| Meaning | Sell price to client | Cost to pay subcontractor |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useContractData.ts` | Add query for quote line items, sum total_cost, use for contract price |

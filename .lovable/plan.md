

# Fix Contract Price - Use Cost from Line Items

## Problem

The contract shows **$1,800** (sell price) instead of **$1,440** (cost to pay subcontractor).

- Current code at line 119: `const subcontractPrice = Number(quote?.total_amount ?? estimate?.total_amount ?? 0);`
- This pulls `quotes.total_amount` which is the **sell price**
- The **cost** is stored in `quote_line_items.total_cost`

---

## Solution

Add a query to fetch `total_cost` from `quote_line_items` and sum it.

---

## Technical Changes

### File: `src/hooks/useContractData.ts`

**1. Add query for quote line items (in Promise.all, after line 83):**
```typescript
quoteId
  ? supabase.from('quote_line_items').select('total_cost').eq('quote_id', quoteId)
  : Promise.resolve({ data: null, error: null }),
```

**2. Extract and sum the costs (after line 104):**
```typescript
const quoteLineItems = quoteLineItemsResult.data as { total_cost: number }[] | null;
const quoteTotalCost = quoteLineItems?.reduce((sum, item) => sum + (item.total_cost || 0), 0) ?? 0;
```

**3. Use cost instead of sell price (line 119):**
```typescript
// Before:
const subcontractPrice = Number(quote?.total_amount ?? estimate?.total_amount ?? 0);

// After:
const subcontractPrice = quoteTotalCost || Number(estimate?.total_amount ?? 0);
```

---

## Result

| Quote | Before | After |
|-------|--------|-------|
| 225-001-QTE-01-01 | $1,800 (sell) | $1,440 (cost) |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useContractData.ts` | Add line items query, sum costs, use for contract price |


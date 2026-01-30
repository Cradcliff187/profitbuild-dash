
# Update Weekly Labor View KPI Aliases

## Overview
Add consistent aliases to the weekly labor hours view KPIs to match the terminology used in the base time entry KPIs, ensuring the AI Report Assistant can correctly interpret user queries about weekly aggregated data.

## File to Modify
**File:** `src/lib/kpi-definitions/view-kpis.ts`

## Changes

### 1. Update `weekly_labor_total_hours` aliases (Line 74)
**Before:**
```typescript
aliases: ['total hours', 'weekly hours', 'hours'],
```

**After:**
```typescript
aliases: ['total hours', 'weekly hours', 'hours', 'paid hours', 'net hours'],
```

### 2. Update `weekly_labor_gross_hours` aliases (Line 86)
**Before:**
```typescript
aliases: ['gross hours', 'shift hours'],
```

**After:**
```typescript
aliases: ['gross hours', 'shift hours', 'total shift hours', 'clock hours'],
```

## Summary of Changes

| KPI | New Aliases Added |
|-----|-------------------|
| `weekly_labor_total_hours` | "paid hours", "net hours" |
| `weekly_labor_gross_hours` | "total shift hours", "clock hours" |

## Why This Matters
- Aligns view-level KPIs with the base `time_entry_hours` and `time_entry_gross_hours` definitions
- Ensures AI Report Assistant can correctly map user queries like "show me paid hours by week" to the weekly view
- Maintains consistency across the KPI system for better natural language understanding
- After updating, run `npx tsx scripts/sync-edge-kpi-context.ts` to regenerate the edge function context

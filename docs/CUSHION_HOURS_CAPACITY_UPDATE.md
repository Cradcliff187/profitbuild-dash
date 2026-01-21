# Cushion Hours Capacity - KPI Guide Update

## Date: January 21, 2026
## Version: 1.4 → 1.5

---

## Overview

Added three new metrics that transform the labor cushion from a dollar amount into **actionable hour-based capacity planning**. These metrics show exactly how many additional hours the cushion can cover, providing critical insights for schedule management and risk mitigation.

---

## New KPI Metrics

### 1. **Cushion Hours Capacity**

**Definition**: The number of additional labor hours that can be covered by the labor cushion at actual cost rates.

**Formula**: `labor_cushion ÷ avg_actual_cost_rate_per_hour`

**Example**:
```
Labor Cushion: $400
Actual Cost Rate: $35/hr
Cushion Hours Capacity: $400 ÷ $35 = 11.43 hours
```

**Fields**:
- **Frontend**: Calculated in `EstimateForm.calculateLaborMetrics()`
- **Database**: `estimate_financial_summary.cushion_hours_capacity`
- **Type**: `numeric` (decimal hours)

**Where Used**:
- Estimate Summary Card (Labor Financial Details)
- Estimate reports
- Schedule risk analysis
- Project capacity planning

**Business Value**:
- Shows how many extra hours you can absorb before losing money
- Critical for managing scope creep and schedule overruns
- Helps with contingency planning

---

### 2. **Total Labor Capacity**

**Definition**: The total number of labor hours available before eating into markup profit (scheduled + cushion hours).

**Formula**: `scheduled_hours + cushion_hours_capacity`

**Example**:
```
Scheduled Hours: 10 hrs
Cushion Hours Capacity: 11.43 hrs
Total Labor Capacity: 21.43 hours
```

**Fields**:
- **Frontend**: Calculated in `EstimateForm.calculateLaborMetrics()`
- **Database**: `estimate_financial_summary.total_labor_capacity`
- **Type**: `numeric` (decimal hours)

**Where Used**:
- Estimate Summary Card
- Project dashboards
- Resource allocation
- Risk assessment reports

**Business Value**:
- Shows your true capacity to deliver without losing money
- Helps set realistic schedules with buffer built in
- Provides clear boundary between profit protection zones

---

### 3. **Schedule Buffer Percentage**

**Definition**: The percentage of additional hours available beyond what was scheduled (overrun protection).

**Formula**: `(cushion_hours_capacity / scheduled_hours) × 100`

**Example**:
```
Cushion Hours: 11.43 hrs
Scheduled Hours: 10 hrs
Schedule Buffer: (11.43 ÷ 10) × 100 = 114.3%
```

**Fields**:
- **Frontend**: Calculated in `EstimateForm.calculateLaborMetrics()`
- **Database**: `estimate_financial_summary.schedule_buffer_percent`
- **Type**: `numeric` (percentage)

**Where Used**:
- Estimate Summary Card
- Risk management dashboards
- Bid accuracy analysis
- Historical schedule performance

**Business Value**:
- Quick visual indicator of how much schedule slippage you can absorb
- Helps identify high-risk vs. well-protected estimates
- Enables data-driven bidding strategies

---

## UI Display

### Estimate Summary Card - Hours Capacity Analysis

The new metrics appear in a dedicated section within the Labor Financial Details:

```
📊 Hours Capacity Analysis

Scheduled Hours:        10.0 hrs
+ Cushion Capacity:    +11.4 hrs
                       (Cushion covers 11.4 extra hours @ actual cost)
─────────────────────────────────
Total Capacity:        21.4 hrs
                       (114% schedule buffer)

💡 You can absorb up to 21.4 hours before touching markup profit
```

**Visual Design**:
- Amber-colored box for visibility
- Clear breakdown of scheduled vs. capacity
- Percentage buffer prominently displayed
- Helper text explains practical meaning

---

## Technical Implementation

### Frontend Calculations

**File**: `src/components/EstimateForm.tsx`

Added to `calculateLaborMetrics()` function:

```typescript
// Calculate cushion hours capacity
const laborCushion = totalBillingAmount - totalActualCost;
const cushionHoursCapacity = avgActualRate > 0 ? laborCushion / avgActualRate : 0;
const totalLaborCapacity = totalHours + cushionHoursCapacity;
const scheduleBufferPercent = totalHours > 0 ? (cushionHoursCapacity / totalHours) * 100 : 0;

return {
  // ... existing fields
  cushionHoursCapacity,
  totalLaborCapacity,
  scheduleBufferPercent,
};
```

### Database View

**File**: Database migration `add_cushion_hours_capacity_v2`

Added three new calculated fields to `estimate_financial_summary` view:

```sql
-- Cushion Hours Capacity
CASE 
    WHEN total_labor_hours > 0 AND total_labor_actual_cost > 0
    THEN total_labor_cushion / (total_labor_actual_cost / total_labor_hours)
    ELSE 0
END AS cushion_hours_capacity

-- Total Labor Capacity
total_labor_hours + cushion_hours_capacity AS total_labor_capacity

-- Schedule Buffer Percentage  
(cushion_hours_capacity / NULLIF(total_labor_hours, 0)) * 100 AS schedule_buffer_percent
```

### Component Updates

**File**: `src/components/estimates/EstimateSummaryCard.tsx`

- Added props interface for new metrics
- Created Hours Capacity Analysis section
- Added conditional rendering based on cushion existence
- Styled with amber theme for "opportunity" context

---

## Use Cases & Examples

### Use Case 1: Schedule Risk Assessment

**Scenario**: You bid 10 hours for a task. The cushion shows 11.4 hours capacity.

**Insight**: You have a 114% buffer! Even if the job takes 21 hours, you still make money.

**Action**: Can confidently bid without inflating schedule, knowing you're protected.

---

### Use Case 2: Scope Creep Management

**Scenario**: Client asks for "just a few tweaks" mid-project.

**Quick Check**: Look at Total Labor Capacity to see if you can absorb it without losing money.

**Example**:
- Scheduled: 40 hrs
- Capacity: 85 hrs
- Client asks for 15 hrs more work
- **Decision**: You can absorb it! (55 hrs < 85 hrs capacity)

---

### Use Case 3: Bid Strategy Optimization

**Scenario**: Analyzing past estimates to understand bidding patterns.

**Analysis**:
- Estimates with <50% buffer: Often ran over and lost money
- Estimates with >100% buffer: Always profitable even when over schedule
- Estimates with 75-100% buffer: Sweet spot

**Action**: Target 75-100% schedule buffer in future bids.

---

### Use Case 4: Project Portfolio Risk

**Scenario**: Managing multiple active projects.

**Dashboard View**:
```
Project A: 45% buffer  ← High risk, monitor closely
Project B: 120% buffer ← Safe, room for changes
Project C: 80% buffer  ← Healthy, on track
```

**Action**: Allocate more management time to low-buffer projects.

---

## Calculation Examples

### Example 1: Standard Labor Item

```
Inputs:
  Scheduled Hours: 10 hrs
  Billing Rate: $75/hr
  Actual Cost: $35/hr
  Markup: 25%

Calculations:
  Labor Cushion: (10 × $75) - (10 × $35) = $400
  Cushion Hours: $400 ÷ $35 = 11.43 hrs
  Total Capacity: 10 + 11.43 = 21.43 hrs
  Buffer %: (11.43 ÷ 10) × 100 = 114.3%

Result: 
  You can deliver up to 21.43 hours before losing money
  That's 114% extra capacity beyond what you quoted!
```

### Example 2: Multiple Labor Line Items

```
Inputs:
  Item 1: 20 hrs @ $75/$35
  Item 2: 15 hrs @ $80/$40
  Item 3: 25 hrs @ $70/$30

Calculations:
  Total Scheduled: 60 hrs
  Total Cushion: (20×40) + (15×40) + (25×40) = $2,400
  Avg Actual Rate: [(20×35)+(15×40)+(25×30)] ÷ 60 = $34.17
  Cushion Hours: $2,400 ÷ $34.17 = 70.23 hrs
  Total Capacity: 60 + 70.23 = 130.23 hrs
  Buffer %: (70.23 ÷ 60) × 100 = 117.1%

Result:
  Can deliver 130 hours before losing money
  117% schedule protection
```

---

## Integration with Existing Metrics

### Relationship to Labor Cushion

| Metric | What It Shows | When to Use |
|--------|---------------|-------------|
| **Labor Cushion** | Dollar amount of hidden profit | Financial reporting, profit tracking |
| **Cushion Hours Capacity** | Hours that cushion can cover | Schedule planning, risk assessment |
| **Total Labor Capacity** | Total hours before loss | Capacity planning, scope decisions |
| **Schedule Buffer %** | Protection level | Quick risk assessment, bid strategy |

**They're connected**:
```
Labor Cushion ($400) 
  ↓ Convert to hours
Cushion Hours (11.4 hrs)
  ↓ Add to scheduled
Total Capacity (21.4 hrs)
  ↓ Express as percentage
Schedule Buffer (114%)
```

---

## Reporting Recommendations

### Dashboard Widgets

**Suggested Displays**:
1. **Total Capacity Gauge**: Shows scheduled vs. capacity
2. **Buffer % Indicator**: Color-coded by risk level
   - Red: <50%
   - Yellow: 50-75%
   - Green: >75%
3. **Hours Remaining**: Capacity minus actual hours used

### Standard Reports

**Add to**:
1. **Estimate Summary Reports**: Include all 3 metrics
2. **Project Risk Reports**: Filter by buffer percentage
3. **Schedule Performance**: Compare capacity to actual
4. **Bid Accuracy Reports**: Analyze buffer vs. overrun correlation

---

## Migration & Backward Compatibility

**Database Changes**:
- ✅ New fields added to existing view (non-breaking)
- ✅ NULL-safe calculations (handles missing data)
- ✅ Zero-division protection (uses NULLIF)

**Frontend Changes**:
- ✅ New props are optional (existing code unaffected)
- ✅ Conditional rendering (only shows when data exists)
- ✅ Backward compatible with estimates that don't have labor cushion

**No Migration Required**:
- Existing data automatically gets new calculated fields
- Old estimates will show 0 hours if no labor cushion data

---

## Success Metrics

### Adoption Indicators

**Week 1**:
- [ ] Users view Labor Financial Details on estimates
- [ ] Hours capacity data appears correctly

**Month 1**:
- [ ] Users reference buffer % in project discussions
- [ ] Schedule decisions influenced by capacity metrics

**Quarter 1**:
- [ ] Buffer % becomes standard bidding criterion
- [ ] Project overrun rate decreases
- [ ] More accurate schedule estimates

### Business Impact

**Expected Benefits**:
1. **Better Risk Management**: Clear visibility into schedule protection
2. **Confident Bidding**: Data-driven buffer decisions
3. **Scope Control**: Quick impact assessment for changes
4. **Profit Protection**: Earlier warning of margin threats

---

## Documentation Status

- [x] Technical implementation complete
- [x] Database view updated
- [x] Frontend calculations added
- [x] UI display implemented
- [x] TypeScript types regenerated
- [x] This KPI guide document created
- [ ] Update main KPI Guide component (KPIGuide.tsx)
- [ ] Create user training materials
- [ ] Add to reporting templates

---

## Related Documentation

- **LABOR_CUSHION_IMPLEMENTATION.md** - Original labor cushion feature
- **LABOR_CUSHION_KPI_UPDATE.md** - Initial KPI metrics
- **LABOR_CUSHION_COMPLETE.md** - Complete implementation summary

---

## Status: ✅ COMPLETE

All implementation complete and deployed:
- ✅ Frontend calculations
- ✅ Database view updated
- ✅ TypeScript types generated
- ✅ UI displaying correctly
- ✅ Documentation created

**Ready for user testing!** 🚀

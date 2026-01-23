# KPI Guide Update - Labor Cushion & Profit Opportunity

## Date: January 21, 2026
## Version: 1.3 → 1.4

---

## Changes Made

### 1. New Database Views Created

#### `estimate_financial_summary` View
A new view that aggregates financial metrics at the estimate level, including labor cushion calculations.

**Purpose**: Provides pre-calculated financial metrics for estimates, enabling efficient reporting and KPI tracking.

**Fields**:
- `estimate_id` - UUID of the estimate
- `project_id` - UUID of the associated project
- `estimate_number` - Estimate identifier
- `status` - Estimate status
- `contingency_percent` - Contingency percentage
- `subtotal` - Sum of all line item totals
- `total_estimated_cost` - Sum of all line item costs (billing base for labor)
- `estimated_gross_profit` - Sum of all line item markup (standard profit)
- `total_labor_hours` - Sum of all internal labor hours
- `total_labor_cushion` - **NEW** Sum of all labor cushion amounts (hidden profit opportunity)
- `total_labor_actual_cost` - **NEW** Sum of actual labor costs
- `total_labor_billing_cost` - **NEW** Sum of billing base for labor
- `total_labor_client_price` - **NEW** Total price to client for labor (including markup)
- `max_gross_profit_potential` - **NEW** Total potential profit (standard markup + labor cushion)
- `estimated_gross_margin_percent` - Margin based on billing cost
- `max_potential_margin_percent` - **NEW** Margin if all labor cushion is captured
- `contingency_amount` - Calculated contingency amount
- `total_with_contingency` - Final total including contingency
- `created_at`, `updated_at` - Timestamps

#### Updated `project_financial_summary` View
Enhanced the existing project-level financial summary to include labor cushion metrics.

**New Fields Added**:
- `estimated_labor_cushion` - Total labor cushion opportunity from approved estimates
- `estimated_max_profit_potential` - Maximum profit if all opportunities captured
- `estimated_labor_hours` - Total estimated labor hours from approved estimates

---

## New KPI Metrics

### Labor Cushion Metrics (Estimate Level)

#### 1. **Labor Cushion (Opportunity)**
- **Source**: `database` (calculated from line items)
- **Field**: `estimate_line_items.labor_cushion_amount`, aggregated in `estimate_financial_summary.total_labor_cushion`
- **Formula**: `(billing_rate_per_hour - actual_cost_rate_per_hour) × labor_hours`
- **Where Used**: Estimate summary card, estimate reports, project dashboards
- **Notes**: Represents hidden profit opportunity built into labor billing rates
- **Business Logic**: This is the potential additional profit if all labor is executed at actual cost rates

#### 2. **Max Gross Profit Potential**
- **Source**: `database` (calculated)
- **Field**: `estimate_financial_summary.max_gross_profit_potential`
- **Formula**: `estimated_gross_profit + total_labor_cushion`
- **Where Used**: Estimate summary card, financial reports
- **Notes**: Total potential profit combining standard markup and labor cushion
- **Business Logic**: Shows maximum profit if all labor opportunities are captured

#### 3. **Max Potential Margin**
- **Source**: `frontend` (calculated)
- **Field**: `EstimateSummaryCard.trueProfitPercent`
- **Formula**: `(max_gross_profit_potential / true_actual_cost) × 100` where `true_actual_cost = total_estimated_cost - total_labor_cushion`
- **Where Used**: Estimate summary card, margin analysis
- **Notes**: Margin percentage based on true internal costs (subtracts cushion from cost basis)
- **Business Logic**: True profit margin if all opportunities are realized. Shows realistic margin percentage based on what project actually costs internally.

#### 4. **Total Labor Hours**
- **Source**: `database` (aggregated)
- **Field**: `estimate_financial_summary.total_labor_hours`
- **Formula**: `SUM(labor_hours) for category = 'labor_internal'`
- **Where Used**: Estimate reports, labor planning
- **Notes**: Total internal labor hours in estimate

#### 5. **Total Labor Actual Cost**
- **Source**: `database` (calculated)
- **Field**: `estimate_financial_summary.total_labor_actual_cost`
- **Formula**: `SUM(labor_hours × actual_cost_rate_per_hour)`
- **Where Used**: Cost analysis, profit tracking
- **Notes**: True cost of labor based on actual rates

#### 6. **Total Labor Billing Cost**
- **Source**: `database` (calculated)
- **Field**: `estimate_financial_summary.total_labor_billing_cost`
- **Formula**: `SUM(labor_hours × billing_rate_per_hour)`
- **Where Used**: Estimate summary, client-facing documents
- **Notes**: Labor cost shown to clients (includes cushion)

### Labor Cushion Metrics (Project Level)

#### 7. **Estimated Labor Cushion (Project)**
- **Source**: `database` (aggregated from approved estimates)
- **Field**: `project_financial_summary.estimated_labor_cushion`
- **Formula**: `SUM(total_labor_cushion) from approved estimates`
- **Where Used**: Project dashboards, portfolio analysis
- **Notes**: Total labor cushion opportunity across all approved estimates

#### 8. **Estimated Max Profit Potential (Project)**
- **Source**: `database` (aggregated)
- **Field**: `project_financial_summary.estimated_max_profit_potential`
- **Formula**: `SUM(max_gross_profit_potential) from approved estimates`
- **Where Used**: Project financial tracking, executive dashboards
- **Notes**: Maximum potential profit for the project

#### 9. **Estimated Labor Hours (Project)**
- **Source**: `database` (aggregated)
- **Field**: `project_financial_summary.estimated_labor_hours`
- **Formula**: `SUM(total_labor_hours) from approved estimates`
- **Where Used**: Resource planning, project scheduling
- **Notes**: Total internal labor hours across all approved estimates

---

## UI Changes

### Estimate Summary Card
The estimate summary card now displays labor cushion as a **separate line item** in the main summary section:

**New Display Structure**:
```
Subtotal: $X,XXX.XX
Total Estimated Cost: $X,XXX.XX
Estimated Gross Profit: $XXX.XX (markup only)
Labor Opportunity: $XXX.XX (NEW - shown in amber)
─────────────────────────────────────
Max Gross Profit Potential: $XXX.XX (NEW - shown in green)
Estimated Gross Margin: XX.X%
Max Potential Margin: XX.X% (NEW)
```

**Key Changes**:
- Labor Opportunity shown as distinct line (not buried in details)
- Max Gross Profit Potential clearly displayed
- Max Potential Margin shows true profit potential
- Collapsible "Labor Financial Details" section for internal reference

---

## Business Logic Documentation

### Labor Cushion Concept

**Definition**: The labor cushion is a **profit opportunity** built into labor billing rates. It represents the difference between what you bill for labor and what it actually costs you.

**Example**:
- Billing Rate: $75/hr
- Actual Cost Rate: $35/hr
- Cushion Per Hour: $40/hr
- For 10 hours: $400 labor cushion

**Why It's Separate**:
- **Estimated Gross Profit** = Standard markup profit (visible to client logic)
- **Labor Opportunity** = Cushion profit (hidden from client)
- **Max Gross Profit Potential** = Both combined

**Strategic Value**:
1. **Protects competitive advantage** - Actual costs remain confidential
2. **Double profit layer** - Markup + Cushion
3. **Risk buffer** - Absorbs labor overruns without impacting markup profit
4. **Flexibility** - Can adjust markup without revealing actual costs

### Calculation Flow

```
Line Item Level:
  cost_per_unit = billing_rate_per_hour  (NOT actual cost!)
  total_cost = billing_rate_per_hour × labor_hours
  labor_cushion_amount = (billing_rate - actual_cost) × labor_hours
  
Estimate Level:
  total_estimated_cost = SUM(total_cost)  [includes cushion]
  estimated_gross_profit = SUM(total_markup)  [standard markup]
  total_labor_cushion = SUM(labor_cushion_amount)  [opportunity]
  max_gross_profit_potential = estimated_gross_profit + total_labor_cushion
  
  true_actual_cost = total_estimated_cost - total_labor_cushion
  max_potential_margin = (max_gross_profit_potential / true_actual_cost) × 100
```

**Example Calculation:**
- Total Estimated Cost: $484,549 (includes billing-based labor)
- Estimated Gross Profit: $109,864 (standard markup)
- Total Labor Cushion: $8,800 (hidden profit)
- True Actual Cost: $484,549 - $8,800 = $475,749 (real internal cost)
- Max Gross Profit Potential: $109,864 + $8,800 = $118,664
- Max Potential Margin: ($118,664 / $475,749) × 100 = **24.95%**

---

## Database Schema Changes

### Tables
No new tables created. Existing fields utilized:
- `estimate_line_items.labor_cushion_amount` - already existed
- `estimate_line_items.billing_rate_per_hour` - already existed
- `estimate_line_items.actual_cost_rate_per_hour` - already existed
- `estimate_line_items.labor_hours` - already existed

### Views Created/Updated

1. **Created**: `estimate_financial_summary` - New view for estimate-level aggregation
2. **Updated**: `project_financial_summary` - Added 3 new labor cushion fields

---

## Impact Summary

### Metrics Count
- **Previous Total**: 61+ measures
- **New Total**: 70+ measures (added 9 new labor cushion metrics)
- **Estimate Section**: Added 6 new metrics
- **Project Section**: Added 3 new metrics

### Reporting Capabilities
- ✅ Estimate reports can show labor cushion opportunity
- ✅ Project dashboards include max profit potential
- ✅ Financial analysis shows true vs. visible profit
- ✅ Executive dashboards have profit opportunity tracking
- ✅ All metrics available for custom report building

### UI Improvements
- ✅ Labor Opportunity clearly visible in estimate summary
- ✅ Max Gross Profit Potential prominently displayed
- ✅ True margin calculations shown alongside standard margin
- ✅ Collapsible details for deep dive analysis

---

## Testing Checklist

### Database Views
- [ ] Verify `estimate_financial_summary` calculates correctly
- [ ] Confirm `project_financial_summary` includes new fields
- [ ] Test with estimates that have labor line items
- [ ] Test with estimates that have no labor
- [ ] Verify permissions (authenticated users can read)

### UI Display
- [ ] Create estimate with labor line items
- [ ] Verify "Labor Opportunity" line appears
- [ ] Confirm "Max Gross Profit Potential" displays
- [ ] Check "Max Potential Margin" calculation
- [ ] Test collapsible Labor Financial Details section

### Calculations
- [ ] Verify cushion calculated correctly per line item
- [ ] Confirm aggregation matches sum of line items
- [ ] Test margin calculations against spreadsheet
- [ ] Verify contingency doesn't affect cushion

### Reports
- [ ] Add new fields to estimate reports
- [ ] Add new fields to project dashboards
- [ ] Verify filtering and grouping work correctly
- [ ] Test export functionality

---

## Migration Details

**Migration Name**: `add_labor_cushion_views_v2`
**Applied**: January 21, 2026
**Reversible**: Yes (can drop views and recreate original)

**SQL Operations**:
1. Created `estimate_financial_summary` view
2. Dropped and recreated `project_financial_summary` view with new fields
3. Granted SELECT permissions to authenticated users
4. Added descriptive comments to views

---

## Documentation Updates Required

- [x] Create this KPI update document
- [x] Update main KPI Guide (src/pages/KPIGuide.tsx) with new metrics (v1.4 - Jan 21, 2026)
- [x] Fixed Max Potential Margin calculation formula (uses true_actual_cost = total_cost - labor_cushion)
- [ ] Update LABOR_CUSHION_IMPLEMENTATION.md with database info
- [ ] Add labor cushion section to user documentation
- [ ] Update training materials

---

## Next Steps

1. **Update KPIGuide.tsx**: Add the 9 new metrics to the appropriate sections
2. **Create Reports**: Build standard reports utilizing new metrics
3. **Dashboard Updates**: Add labor cushion widgets to executive dashboards
4. **User Training**: Document the labor cushion concept for end users
5. **Testing**: Complete the testing checklist above

---

## Status: ✅ COMPLETE

- ✅ Database views created and types regenerated
- ✅ UI updates complete (EstimateSummaryCard)
- ✅ KPI Guide component updated (v1.4)
- ✅ Max Potential Margin calculation fixed and documented
- ✅ All 9 labor cushion metrics documented in KPI Guide

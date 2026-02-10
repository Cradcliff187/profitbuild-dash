# Project Financial Calculations Documentation

## Core Financial Fields

### Contract Value
- **Calculation**: Approved Estimate Total + Sum of Approved Change Order Revenue
- **Database Field**: projects.contracted_amount
- **Purpose**: Total revenue expected from client

### Original Contract
- **Calculation**: Approved Estimate Total (before change orders)
- **Source**: estimates.total_amount where status = 'approved'
- **Purpose**: Baseline contract value

### Original Est. Costs
- **Calculation**: Sum(estimate_line_items.cost_per_unit * quantity) for approved estimate
- **Database Field**: projects.original_est_costs (to be added)
- **Purpose**: Initial cost projection from estimate

### Adjusted Est. Costs
- **Calculation**: 
  - External items: Use accepted quote amount if available, else estimate cost
  - Plus: Internal labor costs (labor_internal, management categories)
  - Plus: Approved change order costs
- **Database Field**: projects.adjusted_est_costs (to be added)
- **Purpose**: Current best cost projection using actual quotes

### Cost Variance
- **Calculation**: Adjusted Est. Costs - Original Est. Costs
- **Display**: Positive = cost increase (red), Negative = cost savings (green)
- **Purpose**: Shows impact of quotes on project costs

### Projected Margin ($)
- **Calculation**: Contract Value - Adjusted Est. Costs
- **Database Field**: projects.projected_margin
- **Purpose**: Expected profit using best available cost data

### Projected Margin (%)
- **Calculation**: (Projected Margin / Contract Value) * 100
- **Purpose**: Profit margin percentage

### Actual Expenses
- **Calculation**: Sum(expenses.amount) for project
- **Source**: expenses table
- **Purpose**: Actual costs incurred to date

### Contingency
- **Calculation**: Original contingency - Used contingency - Change order contingency usage
- **Database Field**: projects.contingency_remaining
- **Purpose**: Budget buffer remaining

## Business Rules
- Internal labor categories (labor_internal, management) never have quotes
- External categories can have quotes that override estimate costs
- Change orders affect both revenue and costs
- Original values never change after approval
- Show "-" in UI when no approved estimate exists

## Technical Implementation

### Three-Tier Margin System

#### Original Margin
- **Calculation**: Original Contract - (Internal Labor + External Estimate Costs)
- **Database Field**: `projects.original_margin`
- **Purpose**: Profit from original approved estimate only

#### Projected Margin
- **Calculation**: Current Contract - Adjusted Est. Costs
- **Database Field**: `projects.projected_margin`
- **Purpose**: Expected profit using best available cost data

#### Actual Margin
- **Calculation**: Current Contract - Actual Expenses Incurred
- **Database Field**: `projects.actual_margin`
- **Purpose**: Real-time profit based on actual spending

### Category Logic

#### Internal Categories (Never Quoted)
- `labor_internal`: Company employees/internal labor
- `management`: Project management and overhead

#### External Categories (Can Have Quotes)
- `subcontractors`: Third-party labor
- `materials`: Supplies and materials
- `equipment`: Tools, machinery, rentals
- `permits`: Permits, fees, inspections
- `other`: Miscellaneous external costs

### Quote Integration
- External line items can have accepted quotes (`quotes.estimate_line_item_id`)
- When quote exists: Use quote amount instead of estimate cost
- When no quote: Use original estimate cost
- Internal labor always uses estimate costs (never quoted)

### Quote vs Estimate Comparison
- **Always compare vendor quoted cost against estimate cost (not price)**
- Relevant fields: `quote_line_items.total_cost` vs `estimate_line_items.total_cost`
- Never compare against `estimate.total_amount` (client price) or `estimate_line_items.total` (client price per line)
- `quotes.total_amount` = vendor cost (what we pay), NOT client revenue

### Change Order Impact
- Affects both revenue (`client_amount`) and costs (`cost_impact`)
- Can impact contingency usage (`includes_contingency`)
- Tracked separately for margin analysis

## Critical Issues Identified

### 🚨 Projected Costs Missing Internal Labor
- **Current Issue**: `projectedCosts` calculation excludes internal labor costs
- **Current Formula**: External costs (quotes/estimates) + Change order costs
- **Should Be**: Internal labor + External costs (quotes/estimates) + Change order costs
- **Impact**: Projected margin appears higher than it should be
- **Location**: `src/utils/projectFinancials.ts` lines 190 and 470

### Database Functions
- `calculate_project_margins()`: Server-side margin calculations
- `check_margin_thresholds()`: Validates margin against thresholds
- `calculate_change_order_margin_impact()`: Change order impact analysis

### UI Display Rules
- Show "-" when no approved estimate exists
- Color coding for variance: Red (cost increase), Green (cost savings)
- Tooltips explain calculation methodology
- Three decimal precision for percentages

## Troubleshooting

### Common Calculation Issues
1. **Missing Internal Labor**: Ensure `approvedEstimateInternalLaborCost` is included in projected costs
2. **Quote Mapping**: Verify quotes are properly linked to estimate line items via `estimate_line_item_id`
3. **Change Order Integration**: Confirm both revenue and cost impacts are captured
4. **Status Filtering**: Only include approved estimates and accepted quotes in calculations

### Validation Checks
- Contract value should equal estimate total + change order revenue
- Projected costs should include all cost components
- All three margin calculations should use consistent base values
- Contingency remaining should never be negative
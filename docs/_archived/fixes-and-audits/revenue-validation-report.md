# Revenue Field Validation Report

## Executive Summary

**Issue Identified:** Reports are currently using **ESTIMATED revenue** (`contracted_amount`) instead of **ACTUAL revenue** (`total_invoiced`) from the database.

## Revenue Field Definitions

### 1. `contracted_amount` (ESTIMATED Revenue)
- **Source:** Calculated from `approved_estimate_total + approved_change_order_revenue`
- **Type:** Estimated/Projected revenue
- **Calculation:** 
  ```sql
  contracted_amt := approved_estimate_total + approved_co_revenue;
  ```
- **Location:** Stored in `projects.contracted_amount` column
- **Updated by:** `calculate_project_margins()` function

### 2. `total_invoiced` (ACTUAL Revenue)
- **Source:** Sum of all records in `project_revenues` table
- **Type:** Actual invoiced revenue from QuickBooks/accounting system
- **Calculation:**
  ```sql
  COALESCE(rev_sum.total, 0) as total_invoiced
  FROM (
    SELECT project_id, SUM(amount) as total
    FROM project_revenues
    GROUP BY project_id
  ) rev_sum
  ```
- **Location:** Available in `reporting.project_financials` view
- **Data Source:** `project_revenues` table (invoices from accounting system)

### 3. `estimate_total` (ESTIMATED Revenue - Base Only)
- **Source:** `estimates.total_amount` where `status = 'approved'`
- **Type:** Estimated revenue (base estimate only, no change orders)
- **Location:** Available in `reporting.project_financials` view

## Current Report Template Analysis

### Templates Using `contracted_amount` (ESTIMATED Revenue):

1. **Project Profitability Analysis**
   - Fields: `["contracted_amount", "total_expenses", "current_margin", "margin_percentage"]`
   - **Issue:** Using estimated revenue, not actual

2. **Active Projects Dashboard**
   - Fields: `["contracted_amount", "total_expenses", "margin_percentage", "budget_utilization_percent"]`
   - **Issue:** Using estimated revenue, not actual

3. **Projects Summary**
   - Fields: `["contracted_amount", "total_expenses"]`
   - **Issue:** Using estimated revenue, not actual

4. **Change Order Impact Analysis**
   - Fields: `["contracted_amount", "current_margin"]`
   - **Issue:** Using estimated revenue, not actual

### Templates NOT Using Any Revenue Field:
- Budget vs Actual by Project (uses `estimate_cost`, not revenue)
- Cost Variance Report (uses `estimate_cost`, not revenue)
- Contingency Utilization (no revenue fields)
- Expense Report by Category (expense data source)
- Quote Comparison (quote data source)
- Time Entries Summary (time data source)
- Internal Labor Costs (internal cost data source)

## Database Schema Verification

### `project_revenues` Table Structure:
```sql
CREATE TABLE public.project_revenues (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  invoice_number TEXT,
  client_id UUID,
  amount DECIMAL(15,2) NOT NULL,  -- ACTUAL invoice amount
  invoice_date DATE NOT NULL,
  description TEXT,
  account_name TEXT,
  account_full_name TEXT,
  quickbooks_transaction_id TEXT,  -- Links to QuickBooks
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `reporting.project_financials` View:
- ✅ Includes `total_invoiced` field (ACTUAL revenue)
- ✅ Includes `contracted_amount` field (ESTIMATED revenue)
- ✅ Includes `estimate_total` field (ESTIMATED revenue - base only)

## Report Builder Field Availability

### Available Revenue Fields in Report Builder:
1. ✅ `contracted_amount` - Contract Amount (ESTIMATED)
   - Group: `financial`
   - Type: `currency`
   - **Currently in use by templates**

2. ✅ `total_invoiced` - Total Invoiced (ACTUAL)
   - Group: `invoicing`
   - Type: `currency`
   - **NOT currently used by any templates**

3. ✅ `estimate_total` - Estimate Total (ESTIMATED - base only)
   - Group: `estimates`
   - Type: `currency`
   - **NOT currently used by any templates**

4. ✅ `change_order_revenue` - Change Order Revenue
   - Group: `change_orders`
   - Type: `currency`
   - **Used in Change Order Impact Analysis**

## Validation Results

### ✅ Field Availability
- **ACTUAL revenue field (`total_invoiced`) is available** in the report builder
- **ACTUAL revenue field is available** in the database view
- **ACTUAL revenue data source (`project_revenues`) exists** in the database

### ❌ Template Usage
- **0 templates** are using `total_invoiced` (ACTUAL revenue)
- **4 templates** are using `contracted_amount` (ESTIMATED revenue)
- **0 templates** are using `estimate_total` (ESTIMATED revenue - base)

### ⚠️ Data Availability
- Need to verify if `project_revenues` table has data
- Need to verify if `total_invoiced` values are populated in the view

## Recommendations

### 1. Immediate Actions
1. **Verify Data Availability:**
   - Query `project_revenues` table to confirm actual revenue data exists
   - Query `reporting.project_financials` to verify `total_invoiced` values are populated

2. **Update Report Templates:**
   - Consider updating templates to use `total_invoiced` for actual revenue reporting
   - Or create new templates specifically for actual vs estimated revenue comparison

3. **Add Revenue Comparison Reports:**
   - Create new template: "Actual vs Estimated Revenue"
   - Fields: `["project_number", "project_name", "contracted_amount", "total_invoiced", "revenue_variance"]`

### 2. Field Labeling Improvements
- Consider renaming fields for clarity:
  - `contracted_amount` → "Estimated Contract Amount"
  - `total_invoiced` → "Actual Revenue (Invoiced)"
  - Add help text explaining the difference

### 3. Template Updates
- **Project Profitability Analysis:** Consider adding `total_invoiced` alongside `contracted_amount`
- **Active Projects Dashboard:** Consider using `total_invoiced` for actual revenue tracking
- **Projects Summary:** Consider showing both estimated and actual revenue

## Next Steps

1. ✅ Verify `project_revenues` table has data
2. ✅ Verify `total_invoiced` is populated in reports
3. ⏳ Update templates to use actual revenue where appropriate
4. ⏳ Create revenue comparison templates
5. ⏳ Update field labels and help text

## Conclusion

**Status:** Reports are **NOT** currently pulling actual revenue from the database. All revenue-related templates are using `contracted_amount`, which is estimated revenue calculated from approved estimates and change orders.

**Actual revenue data (`total_invoiced`) is available** in the system but is not being used by any report templates.


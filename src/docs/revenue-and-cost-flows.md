# Revenue and Cost Flows

This document provides a visual and conceptual understanding of how money flows through the system, making it immediately clear what constitutes revenue vs. costs.

## Section 1: Revenue Sources (Money Coming In)

### Primary Revenue

**Original Contract Amount**: Approved estimate total
- Database: `estimates.total_amount` where `status = 'approved'`
- UI Label: "Original Contract" or "Contract Value"
- When it appears: After estimate approval
- Never changes: Locked after approval

### Additional Revenue

**Change Order Revenue**: Client-approved scope changes
- Database: `change_orders.client_amount` where `status = 'approved'`
- UI Label: "Change Orders" (green, positive indicator)
- Tooltip: "Additional revenue from approved change orders"
- Can include billed contingency: `change_orders.contingency_billed_to_client`

### Total Revenue Formula

```
Total Contract Value = Original Contract + Sum(Approved Change Order Revenue) + Sum(Contingency Billed via CO)
Database Field: projects.contracted_amount
```

### Key Principle

Revenue is what the **client pays you**. It only increases when:
1. Estimate is approved (original contract)
2. Change orders are approved (additional revenue)
3. Contingency is billed to client (via change order mechanism)

---

## Section 2: Cost Sources (Money Going Out)

### Estimated Costs (Projected Spending)

#### 1. Original Estimated Costs
- Source: `estimate_line_items` cost calculations
- Formula: `SUM(cost_per_unit × quantity)` for all categories
- Database: `projects.original_est_costs`
- UI Label: "Original Est. Costs"
- Purpose: Baseline cost projection
- Never changes after estimate approval

#### 2. Adjusted Estimated Costs (Most Important for Planning)
- Formula (calculated by `calculate_project_margins()`):
  ```
  Adjusted Est. Costs = 
    Internal Labor Costs (from estimate)
    + External Costs (use accepted quote amounts if available, else estimate costs)
    + Approved Change Order Costs
  ```
- Database: `projects.adjusted_est_costs`
- UI Label: "Adjusted Est. Costs" or "Est. Costs"
- Purpose: Best current cost projection using real quotes
- Updates when: Quotes accepted, change orders approved

### Actual Costs (Real Spending)

#### 3. Total Expenses
- Source: `expenses` table
- Formula: `SUM(expenses.amount)` for project
- Categories:
  - `labor_internal`: Internal employee time (never quoted)
  - `labor_external` / `subcontractors`: External labor (can have quotes)
  - `materials`: Supplies (can have quotes)
  - `equipment`: Tools, rentals (can have quotes)
  - `permits`: Government fees (can have quotes)
  - `other`: Miscellaneous (can have quotes)
- UI Label: "Total Expenses" or "Actual Expenses"
- Purpose: Real money spent to date
- Updates: Every time an expense is added/approved

### Key Principle

Costs are what you **pay vendors/employees**. There are two types:
1. **Estimated costs** (planning): Used for Projected Margin
2. **Actual expenses** (reality): Used for Actual Margin

---

## Section 3: Visual Flow Diagram

### REVENUE FLOW (Money In)

```
Client Signs Contract
       ↓
  Original Contract Amount ($26,674)
  [estimates.total_amount where status='approved']
       ↓
  Change Order Approved (+$10,712 revenue, +$500 contingency)
  [change_orders.client_amount + contingency_billed_to_client]
       ↓
  Total Contract Value = $37,886
  [projects.contracted_amount]
```

### COST FLOW (Money Out)

```
Estimate Created
       ↓
  Original Est. Costs ($21,339)
  [SUM(estimate_line_items: cost_per_unit × quantity)]
       ↓
  Quotes Accepted (External items use quote amounts)
  Change Orders Added (+$8,240 cost impact)
       ↓
  Adjusted Est. Costs = $29,579
  [projects.adjusted_est_costs]
       ↓
  Work Performed → Expenses Created
       ↓
  Total Actual Expenses ($25,000 to date)
  [SUM(expenses.amount)]
```

### MARGIN CALCULATIONS

```
Original Margin:
  Original Contract - Original Est. Costs
  $26,674 - $21,339 = $5,335 (20.0%)
  [projects.original_margin]

Projected Margin (Current Best Estimate):
  Total Contract - Adjusted Est. Costs
  $37,886 - $29,579 = $8,307 (21.9%)
  [projects.projected_margin]

Actual Margin (Reality Check):
  Total Contract - Total Expenses
  $37,886 - $25,000 = $12,886 (34.0%)
  [projects.actual_margin]
  Note: Higher than projected because work isn't complete yet
```

---

## Section 4: Change Order Impact Examples

### Example 1: Change Order WITHOUT Contingency

```
Scenario: Client wants upgraded flooring
- Change Order Revenue: $5,000 (what client pays)
- Change Order Cost: $3,500 (what we pay supplier)
- Contingency Billed: $0 (not using contingency)

Impact:
✅ Revenue increases by $5,000
✅ Costs increase by $3,500
✅ Projected margin increases by $1,500 ($5K - $3.5K)
✅ Contingency remaining: UNCHANGED
```

### Example 2: Change Order WITH Contingency Billing

```
Scenario: Unforeseen foundation work, billing contingency
- Change Order Revenue: $3,000 (what client pays)
- Change Order Cost: $2,000 (what we pay for work)
- Contingency Billed: $1,000 (billing part of our buffer)

Impact:
✅ Revenue increases by $4,000 ($3K + $1K contingency)
✅ Costs increase by $2,000
✅ Projected margin increases by $2,000 ($4K - $2K)
✅ Contingency remaining: DECREASES by $1,000
```

### Example 3: Unforeseen Cost Using Contingency (No Change Order)

```
Scenario: Unexpected plumbing issue, absorbing cost
- Expense Amount: $800 (what we pay plumber)
- Contingency Used: $800 (marked as is_planned: true)

Impact:
✅ Revenue: UNCHANGED (client doesn't pay more)
✅ Costs increase by $800
✅ Projected margin DECREASES by $800 (cost increase)
✅ Contingency remaining: DECREASES by $800
```

---

## Section 5: UI Label Mapping

This table shows exactly where each concept appears in the UI:

| **Concept** | **Desktop Table Column** | **Mobile Card Label** | **Database Source** |
|-------------|--------------------------|----------------------|---------------------|
| Original revenue | "Original Contract" | "Contract" | `projects.contracted_amount` (before COs) |
| Added revenue | "Change Orders" | "Change Orders" | Sum of `change_orders.client_amount` |
| Total revenue | "Contract Value" or "Total Contract" | "Total Contract" | `projects.contracted_amount` |
| Original costs | "Original Est. Costs" | (Not shown on cards) | `projects.original_est_costs` |
| Adjusted costs | "Adjusted Est. Costs" | "Est. Costs" | `projects.adjusted_est_costs` |
| Actual spending | "Total Expenses" | "Expenses" (in Quick Stats) | Sum of `expenses.amount` |
| Expected profit | "Projected Margin" | "Projected" (in 3-tier) | `projects.projected_margin` |
| Real profit | "Actual Margin" | "Actual" (in 3-tier) | `projects.actual_margin` |
| Budget buffer | "Contingency" | "Contingency" | `projects.contingency_remaining` |

---

## Section 6: Quick Reference - "Is This Revenue or Cost?"

### ✅ REVENUE (Money Coming In)

- Approved estimate total
- Change order `client_amount`
- Contingency billed to client via change order
- Anything that increases `projects.contracted_amount`

### ❌ COST (Money Going Out)

- Estimate line item costs (`cost_per_unit × quantity`)
- Accepted quote amounts
- Change order `cost_impact`
- Expense amounts (`expenses.amount`)
- Internal labor costs
- Anything that increases `adjusted_est_costs` or `actual expenses`

### 💡 CONTINGENCY (Special Case)

- **Not revenue** until billed to client via change order
- **Not a cost** until used for unforeseen expenses
- Acts as a **buffer** between revenue and costs
- Can be converted to revenue (via CO) or absorbed as cost

---

## Section 7: Database Trigger Flow

When these tables change, margins recalculate automatically:

```
estimates (INSERT/UPDATE/DELETE)
    ↓
estimate_line_items (INSERT/UPDATE/DELETE)
    ↓
quotes (INSERT/UPDATE/DELETE)
    ↓
quote_line_items (INSERT/UPDATE/DELETE)
    ↓
expenses (INSERT/UPDATE/DELETE)
    ↓
change_orders (INSERT/UPDATE/DELETE)
    ↓
  ALL trigger: trigger_calculate_project_margins()
    ↓
  Calls: calculate_project_margins(project_id)
    ↓
  Updates projects table:
    - contracted_amount (total revenue)
    - original_est_costs (baseline costs)
    - adjusted_est_costs (projected costs with quotes)
    - original_margin (baseline profit)
    - projected_margin (expected profit)
    - actual_margin (current profit)
    - contingency_remaining (buffer left)
```

**Key Insight:** You never manually update financial fields. The triggers handle everything automatically when source data changes.

---

## Section 8: Testing Revenue vs. Cost Changes

### To verify revenue changes:
1. Check `projects.contracted_amount` increases
2. Look for approved estimates or change orders
3. Confirm client is paying more

### To verify cost changes:
1. Check `projects.adjusted_est_costs` or expenses increase
2. Look for new quotes, change order costs, or expenses
3. Confirm company is paying more

### To verify margin impact:
1. Calculate: `new_revenue - new_costs`
2. Compare to old margin
3. If revenue increases more than costs → margin improves
4. If costs increase more than revenue → margin worsens

---

## Related Documentation

- [Financial Calculations](./financial-calculations.md) - Detailed calculation formulas and business rules
- [Code Quality Guidelines](./CODE_QUALITY.md) - Development standards
- [CSV Parser Documentation](./CSV_PARSER.md) - Import functionality
- [Pagination Guidelines](./PAGINATION.md) - Data handling patterns

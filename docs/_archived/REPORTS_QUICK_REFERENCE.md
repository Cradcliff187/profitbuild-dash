# Report Builder - Quick Reference Guide

**Branch:** `cursor/reports-feature-analysis`  
**Main Document:** [REPORTS_BUILDER_COMPREHENSIVE_PLAN.md](./REPORTS_BUILDER_COMPREHENSIVE_PLAN.md)

---

## Database Architecture at a Glance

### Core Tables (14 Primary)
```
projects (master) → estimates → estimate_line_items
                  → quotes → quote_line_items
                  → expenses → expense_splits
                  → change_orders → change_order_line_items
                  → project_revenues
                  → project_media
                  → activity_feed
payees (vendors/employees)
clients
receipts
```

### Key Financial Fields on Projects Table
All calculated automatically by database triggers:
- `contracted_amount` - Base contract + change orders
- `current_margin` - Contracted Amount - actual expenses
- `actual_margin` - Total Invoiced - actual expenses (real profit)
- `margin_percentage` - Margin as % of revenue
- `projected_margin` - Revenue - projected costs
- `original_margin` - From approved estimate
- `contingency_remaining` - Unused contingency
- `adjusted_est_costs` - Costs with accepted quotes
- `original_est_costs` - Original estimate costs

### Critical Database Functions
- `calculate_project_margins(project_id)` - Recalculates all financial fields
- `calculate_contingency_remaining(project_id)` - Updates contingency
- Automatic triggers on: estimates, quotes, expenses, change_orders

---

## Available Metrics Summary

### Project Metrics (40+)
- Financial: contracted_amount, margins (3 types), costs (original/adjusted/actual)
- Contingency: total, used, remaining, utilization %
- Change Orders: revenue, cost, count, margin impact
- Operational: status, dates, duration, type, job_type
- Activity: estimate count, quote count, expense count, invoice count

### Estimate Metrics (20+)
- Totals: amount, cost, profit, margin %
- Markup: average %, total amount
- Contingency: %, amount, used
- Versioning: version number, is current
- Status & dates
- Category breakdown (labor, materials, equipment, etc.)

### Expense Metrics (15+)
- Amounts: by category, by payee, by period
- Counts: total, by category, by status
- Status: pending, approved, rejected
- Splits: is_split, split amounts
- Dates: expense_date, aging

### Quote Metrics (15+)
- Amounts: total, by category
- Status: pending, accepted, rejected
- Comparison: vs estimate, variance, spread
- Dates: received, expires, accepted
- Acceptance rate

### Change Order Metrics (10+)
- Revenue: client_amount
- Cost: cost_impact
- Margin: margin_impact, net margin
- Count, status, approval rate
- Dates: created, approved

### Time Entry Metrics (10+)
- Hours: total, by worker, by project
- Amounts: total cost, hourly rate
- Status: pending, approved, rejected
- Aggregations: weekly, monthly

---

## Report Builder Design Overview

### Architecture
```
React UI (Report Builder)
    ↓
Report Configuration (JSON)
    ↓
Supabase RPC Function (execute_report)
    ↓
PostgreSQL Query Execution
    ↓
Results Returned
    ↓
Export to PDF/Excel/CSV
```

### Key Components
1. **Report Builder UI**
   - Field Browser (left) - drag & drop fields
   - Canvas (center) - configure report
   - Properties (right) - field settings
   - Preview (bottom) - live preview

2. **Data Configuration**
   - Select data source (projects, estimates, etc.)
   - Choose fields to display
   - Add filters (multiple conditions)
   - Set grouping & sorting
   - Define aggregations (SUM, AVG, COUNT, etc.)

3. **Export Options**
   - PDF (jsPDF + autotable)
   - Excel (ExcelJS)
   - CSV (custom generator)
   - JSON (raw data)

4. **Templates**
   - 15+ pre-built reports
   - Categories: Financial, Operational, Client, Vendor, Schedule
   - Customizable starting points

### Sample Report Config
```typescript
{
  name: "Project Profitability Summary",
  data_source: {
    primary_table: "projects",
    joins: ["estimates", "clients"]
  },
  fields: [
    { field: "project_number", name: "Project #" },
    { field: "project_name", name: "Name" },
    { field: "contracted_amount", name: "Contract", type: "currency" },
    { field: "current_margin", name: "Margin", type: "currency" },
    { field: "margin_percentage", name: "Margin %", type: "percent" }
  ],
  filters: [
    { field: "status", operator: "in", value: ["in_progress", "complete"] }
  ],
  sort_by: [
    { field: "margin_percentage", direction: "DESC" }
  ],
  aggregations: [
    { field: "contracted_amount", function: "SUM" },
    { field: "current_margin", function: "SUM" },
    { field: "margin_percentage", function: "AVG" }
  ]
}
```

---

## Pre-built Template List

### Financial Reports (7)
1. **Project Profitability Summary** - All projects with margins
2. **Margin Analysis by Project** - Detailed margin breakdown
3. **Budget vs Actual by Category** - Cost tracking by category
4. **Change Order Impact Analysis** - CO revenue and cost impact
5. **Cash Flow Report** - Revenue vs expenses over time
6. **Cost Variance Report** - Actual vs estimated costs
7. **Contingency Utilization** - Contingency usage tracking

### Operational Reports (6)
1. **Active Projects Dashboard** - Current project status
2. **Project Status Summary** - Counts by status
3. **Estimate Conversion Rate** - Estimate → approved %
4. **Quote Acceptance Rate** - Quote acceptance metrics
5. **Expense Approval Queue** - Pending expenses
6. **Time Entry Summary** - Labor hours and costs

### Client Reports (4)
1. **Client Portfolio Summary** - All clients and their projects
2. **Client Profitability Ranking** - Most profitable clients
3. **Client Project History** - Historical client data
4. **Client Payment Summary** - Payment tracking

### Vendor Reports (4)
1. **Vendor Spend Analysis** - Total spend by vendor
2. **Subcontractor Performance** - Quote acceptance and quality
3. **Quote Comparison Report** - Compare vendor quotes
4. **Vendor Payment Schedule** - Upcoming payments

### Schedule Reports (3)
1. **Project Timeline Overview** - Gantt-style timeline
2. **Task Completion Status** - Task progress tracking
3. **Schedule vs Actual Progress** - Planned vs actual

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Database views and RPC functions
- Report execution engine
- Basic data access layer

### Phase 2: Core UI (Weeks 3-5)
- Report builder interface
- Field browser & canvas
- Filter & grouping builders
- Preview functionality

### Phase 3: Templates (Week 6)
- Template gallery
- 15 pre-built templates
- Template customization

### Phase 4: Export (Week 7)
- PDF export
- Excel export
- CSV export
- Email sharing

### Phase 5: Advanced (Weeks 8-9)
- Calculated fields
- Charts & visualizations
- Report scheduling
- Comparison reports

### Phase 6: Polish (Week 10)
- Testing & optimization
- Documentation
- User training
- Production release

---

## Key Calculations Reference

### Project Margin Calculation
```sql
contracted_amount = approved_estimate_total + change_order_revenue
total_expenses = SUM(expenses.amount) + change_order_costs
current_margin = contracted_amount - total_expenses
margin_percentage = (current_margin / contracted_amount) * 100
```

### Projected Margin (with quotes)
```sql
internal_labor_cost = SUM(estimate_line_items WHERE category IN ('labor_internal', 'management'))
external_costs = SUM(COALESCE(accepted_quote_cost, estimate_cost) WHERE category NOT IN ('labor_internal', 'management'))
projected_costs = internal_labor_cost + external_costs + change_order_costs
projected_margin = contracted_amount - projected_costs
```

### Contingency Remaining
```sql
total_contingency = estimate.contingency_amount
used_contingency = estimate.contingency_used
co_contingency = SUM(change_orders.cost_impact WHERE includes_contingency = true)
remaining = total_contingency - used_contingency - co_contingency
```

---

## Database Queries for Common Reports

### 1. Project Profitability Summary
```sql
SELECT 
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  p.contracted_amount,
  p.current_margin,
  p.margin_percentage,
  p.projected_margin
FROM projects p
WHERE p.status IN ('in_progress', 'complete')
ORDER BY p.margin_percentage DESC;
```

### 2. Budget vs Actual by Category
```sql
SELECT 
  p.project_number,
  p.project_name,
  eli.category,
  SUM(eli.cost_per_unit * eli.quantity) as estimated_cost,
  COALESCE(SUM(e.amount), 0) as actual_cost,
  COALESCE(SUM(e.amount), 0) - SUM(eli.cost_per_unit * eli.quantity) as variance
FROM projects p
JOIN estimates est ON est.project_id = p.id AND est.status = 'approved'
JOIN estimate_line_items eli ON eli.estimate_id = est.id
LEFT JOIN expenses e ON e.project_id = p.id AND e.category = eli.category
GROUP BY p.project_number, p.project_name, eli.category;
```

### 3. Top 10 Profitable Projects
```sql
SELECT 
  project_number,
  project_name,
  client_name,
  contracted_amount,
  current_margin,
  margin_percentage
FROM projects
WHERE status IN ('in_progress', 'complete')
ORDER BY current_margin DESC
LIMIT 10;
```

### 4. Monthly Revenue & Profit Trend
```sql
SELECT 
  DATE_TRUNC('month', pr.invoice_date) as month,
  SUM(pr.amount) as total_revenue,
  COUNT(DISTINCT pr.project_id) as project_count,
  AVG(p.margin_percentage) as avg_margin
FROM project_revenues pr
JOIN projects p ON p.id = pr.project_id
GROUP BY DATE_TRUNC('month', pr.invoice_date)
ORDER BY month DESC;
```

---

## Front-end Calculation Files

**Minimal front-end calculations (most in database):**

| File | Purpose | Lines |
|------|---------|-------|
| `profitCalculations.ts` | Profit trends & analytics | ~225 |
| `projectFinancials.ts` | Project financial formatting (deprecated) | ~691 |
| `estimateFinancials.ts` | Estimate totals & markup | ~101 |
| `marginValidation.ts` | Margin threshold checks | ~138 |

**Total calculation code:** ~1,155 lines across 4 primary files
**Front-end operations:** ~190 `.map()`, `.filter()`, `.reduce()` calls (mostly data transformation)

---

## Critical Insights

### ✅ What Works Well
- **Database-first design:** All calculations in PostgreSQL with triggers
- **Automatic updates:** Financial fields always current
- **Strong data integrity:** Foreign keys and constraints
- **Rich data model:** 14+ tables with comprehensive relationships

### ⚠️ Important Notes
- `projectFinancials.ts` is **deprecated** - use database fields directly
- Split expenses require special handling (`expenseSplits.ts`)
- Always use approved + current estimate for calculations
- Change orders affect contracted_amount and costs
- Contingency tracking includes estimate usage + change order usage

### 🎯 Best Practices for Reports
1. Always join to approved estimates (`status = 'approved' AND is_current_version = true`)
2. Use database-calculated fields from projects table
3. Handle null values with `COALESCE()`
4. Filter out system projects (`project_number NOT IN ('SYS-000', '000-UNASSIGNED')`)
5. Use materialized views for complex aggregations
6. Add proper indexes for commonly filtered fields

---

## Quick Start for Developers

### 1. Read the Database Schema
Start here: `supabase/migrations/20250915193336_2646992b-9b95-42f3-9f3d-9f9ee2317362.sql`

### 2. Understand the Calculation Function
Read: `supabase/migrations/20251030122756_de7730af-c176-4d55-a4d5-4cdaa4580f72.sql`

### 3. Review Type Definitions
- `src/types/project.ts`
- `src/types/estimate.ts`
- `src/types/expense.ts`
- `src/types/quote.ts`

### 4. Explore Existing Calculations
- `src/utils/profitCalculations.ts`
- `src/utils/projectFinancials.ts` (deprecated but educational)
- `src/utils/estimateFinancials.ts`

### 5. Build a Test Report
Try creating a simple report in Supabase SQL editor:
```sql
SELECT 
  project_number,
  project_name,
  contracted_amount,
  current_margin,
  margin_percentage
FROM projects
WHERE status = 'in_progress'
ORDER BY margin_percentage DESC
LIMIT 10;
```

---

## Resources

- **Main Plan:** [REPORTS_BUILDER_COMPREHENSIVE_PLAN.md](./REPORTS_BUILDER_COMPREHENSIVE_PLAN.md)
- **Database Docs:** `supabase/migrations/` directory
- **Type Definitions:** `src/types/` directory
- **Utility Functions:** `src/utils/` directory
- **Existing Components:** `src/components/` directory

---

## Next Steps

1. ✅ **Review** this document and the comprehensive plan
2. ✅ **Approve** the approach with stakeholders
3. 🔄 **Start** Phase 1: Database foundation
4. 🔄 **Build** Phase 2: Core UI
5. 🔄 **Launch** Beta to select users
6. 🔄 **Release** to production

**Status:** Analysis Complete ✅  
**Ready for:** Implementation 🚀  
**Estimated Timeline:** 10 weeks to production release

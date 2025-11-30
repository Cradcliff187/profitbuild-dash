# Report Builder - Comprehensive Analysis & Implementation Plan

**Created:** 2025-11-17  
**Branch:** `cursor/reports-feature-analysis`  
**Status:** Analysis Complete - Ready for Implementation Planning

---

## Executive Summary

This document provides a complete analysis of the ProfitBuild application's database structure, calculations, metrics, and a detailed plan for building an advanced, user-friendly report builder. The analysis reveals a sophisticated construction management system with **14+ core tables**, **50+ database functions**, and **comprehensive financial tracking** capabilities.

### Key Findings
- **Database-First Architecture**: Most calculations are performed in PostgreSQL using triggers and stored procedures
- **Minimal Front-end Calculations**: Only ~190 calculation operations across 24 utility files (most are data transformations)
- **Strong Data Integrity**: Financial calculations are automatically maintained via database triggers
- **Rich Metrics Available**: 100+ potential report metrics across projects, estimates, expenses, quotes, time entries, and schedules

---

## 1. DATABASE ARCHITECTURE ANALYSIS

### 1.1 Core Tables Overview

| Table Name | Purpose | Key Fields | Relationships |
|------------|---------|------------|---------------|
| **projects** | Master project records | `id`, `project_number`, `project_name`, `client_name`, `status`, `contracted_amount`, `current_margin`, `margin_percentage` | Parent to all project-related data |
| **estimates** | Project estimates/bids | `id`, `project_id`, `estimate_number`, `total_amount`, `total_cost`, `status`, `contingency_amount`, `is_current_version` | Links to `estimate_line_items` |
| **estimate_line_items** | Line items for estimates | `id`, `estimate_id`, `category`, `quantity`, `price_per_unit`, `cost_per_unit`, `total_cost` (calculated) | Child of `estimates` |
| **quotes** | Vendor/subcontractor quotes | `id`, `project_id`, `estimate_id`, `payee_id`, `total_amount`, `status`, `accepted_date` | Links to `quote_line_items` |
| **quote_line_items** | Quote line items | `id`, `quote_id`, `estimate_line_item_id`, `category`, `total_cost` | Child of `quotes` |
| **expenses** | Actual project expenses | `id`, `project_id`, `payee_id`, `amount`, `category`, `expense_date`, `approval_status`, `is_split` | Core expense tracking |
| **expense_splits** | Split expenses across projects | `id`, `expense_id`, `project_id`, `split_amount`, `split_percentage` | Allows expense allocation |
| **change_orders** | Project change orders | `id`, `project_id`, `change_order_number`, `client_amount`, `cost_impact`, `margin_impact`, `status` | Tracks scope changes |
| **change_order_line_items** | Change order details | `id`, `change_order_id`, `category`, `cost`, `price` | Child of `change_orders` |
| **payees** | Vendors & employees | `id`, `payee_name`, `payee_type` (vendor/employee), `hourly_rate` | Links to expenses, quotes |
| **clients** | Customer/client records | `id`, `client_name`, `contact_info` | Links to projects |
| **project_revenues** | Revenue/invoices | `id`, `project_id`, `amount`, `invoice_date`, `invoice_number` | Income tracking |
| **receipts** | Receipt images/docs | `id`, `project_id`, `user_id`, `amount`, `approval_status`, `image_url` | Expense documentation |
| **project_media** | Photos/videos | `id`, `project_id`, `file_url`, `latitude`, `longitude`, `taken_at` | Field documentation |
| **activity_feed** | Audit trail | `id`, `activity_type`, `entity_type`, `entity_id`, `description`, `metadata` | System activity log |

### 1.2 Category Enums

**Expense Categories** (used across estimates, quotes, expenses):
- `labor_internal` - Internal labor/employees
- `subcontractors` - External labor
- `materials` - Building materials
- `equipment` - Equipment rental/purchase
- `permits` - Permits & fees
- `management` - Management/overhead
- `other` - Miscellaneous

**Project Status Flow**:
```
estimating → quoted → approved → in_progress → complete
                                            ↓
                                        on_hold
                                            ↓
                                        cancelled
```

**Estimate Status**:
- `draft`, `sent`, `approved`, `rejected`, `expired`

**Quote Status**:
- `pending`, `accepted`, `rejected`, `expired`

**Change Order Status**:
- `draft`, `pending`, `approved`, `rejected`

---

## 2. DATABASE CALCULATIONS ANALYSIS

### 2.1 Core Financial Calculation Function

**Function:** `calculate_project_margins(project_id UUID)`

**Location:** `supabase/migrations/20251030122756_de7730af-c176-4d55-a4d5-4cdaa4580f72.sql`

**What it Calculates:**
```sql
-- Total actual expenses for the project
total_expenses = SUM(expenses.amount) WHERE project_id = X

-- Total accepted quotes
accepted_quotes_total = SUM(quotes.total_amount) WHERE status = 'accepted'

-- Approved estimate total (latest approved)
approved_estimate_total = estimates.total_amount WHERE status = 'approved'

-- Change order impacts
change_order_client_total = SUM(change_orders.client_amount) WHERE status = 'approved'
change_order_cost_total = SUM(change_orders.cost_impact) WHERE status = 'approved'

-- Contracted amount
contracted_amount = approved_estimate_total + change_order_client_total

-- Current margin
current_margin = contracted_amount - total_expenses

-- Margin percentage
margin_percentage = (current_margin / contracted_amount) * 100

-- Original costs (from estimate line items)
original_est_costs = SUM(estimate_line_items.cost_per_unit * quantity)

-- Adjusted costs (uses accepted quote costs when available)
adjusted_est_costs = SUM(
  CASE 
    WHEN category IN ('labor_internal', 'management') 
      THEN estimate_cost
    ELSE COALESCE(accepted_quote_line_item_cost, estimate_cost)
  END
) + change_order_cost_total

-- Margin calculations
original_margin = approved_estimate_total - original_est_costs
projected_margin = contracted_amount - adjusted_est_costs
```

**Fields Updated on Projects Table:**
- `contracted_amount`
- `total_accepted_quotes`
- `current_margin`
- `margin_percentage`
- `contingency_remaining`
- `original_margin`
- `projected_margin`
- `actual_margin`
- `original_est_costs`
- `adjusted_est_costs`

### 2.2 Contingency Calculation Function

**Function:** `calculate_contingency_remaining(project_id UUID)`

**What it Calculates:**
```sql
total_contingency = approved_estimate.contingency_amount
used_contingency = approved_estimate.contingency_used
change_order_contingency = SUM(change_orders.cost_impact) 
                          WHERE includes_contingency = true

remaining_contingency = total_contingency - used_contingency - change_order_contingency
```

### 2.3 Automatic Recalculation Triggers

**Triggers automatically call `calculate_project_margins()` on changes to:**
- `estimates` (INSERT, UPDATE, DELETE)
- `estimate_line_items` (INSERT, UPDATE, DELETE)
- `quotes` (INSERT, UPDATE, DELETE)
- `quote_line_items` (INSERT, UPDATE, DELETE)
- `expenses` (INSERT, UPDATE, DELETE)
- `change_orders` (INSERT, UPDATE, DELETE)

**Result:** Financial data is **ALWAYS current** - no manual refresh needed!

### 2.4 Database Views

**View:** `reporting.project_financials`

**Location:** `reporting` schema

**Purpose:** Comprehensive reporting view that aggregates project-level financial metrics, expenses, quotes, change orders, and revenue data. This is the primary data source for the report builder system.

**Aggregates:**
- Estimate totals and contingency
- Revenue/invoice totals (including `total_invoiced` and `invoice_count`)
- Expense totals (handles split expenses correctly)
- Accepted quote totals
- Change order impacts
- Calculated profit and margins
- **Revenue variance** (`revenue_variance` and `revenue_variance_percent`) - compares estimated revenue (contracted_amount) vs actual revenue (total_invoiced)
- Cost variance calculations
- Budget utilization metrics

**Note:** This view replaces the older `project_financial_summary` view. All new reporting should use `reporting.project_financials`.

---

## 3. FRONT-END CALCULATIONS ANALYSIS

### 3.1 Calculation Distribution

**Analysis Result:** Front-end calculations are **MINIMAL** - most heavy lifting is in the database.

**Front-end Calculation Count:**
- Total calculation operations: ~190 across 24 files
- Most are `.map()`, `.filter()`, `.reduce()` for data transformation
- Direct database queries from utils: Only 10 instances

### 3.2 Front-end Utility Files

| File | Purpose | Calculation Type |
|------|---------|------------------|
| `profitCalculations.ts` | Project profit calculations | Aggregates data from DB, calculates trends |
| `projectFinancials.ts` | Detailed financial metrics | Formats DB data, handles split expenses |
| `estimateFinancials.ts` | Estimate-level calculations | Line item totals, markup, margin |
| `marginValidation.ts` | Margin threshold checks | Status checks, warnings |
| `quoteFinancials.ts` | Quote comparison | Estimate vs quote variance |
| `expenseSplits.ts` | Split expense allocation | Calculates project-specific expense amounts |
| `projectDashboard.ts` | Dashboard aggregations | Summary metrics, status counts |

### 3.3 Key Front-end Functions

#### From `profitCalculations.ts`:
```typescript
// Calculates project profit metrics
calculateProjectProfit(estimate, quotes, expenses, storedProjectData)
  → Returns: {
      projectId, projectName, client,
      estimateTotal, quoteTotal, actualExpenses,
      estimatedProfit, actualProfit, profitMargin,
      profitVariance, status
    }

// Async version that handles split expenses correctly
calculateProjectProfitAsync(...)

// Calculates monthly/quarterly trends
calculateProfitTrends(projectProfits) 
  → Returns monthly aggregated profit data

// Summary analytics
calculateProfitAnalytics(estimates, quotes, expenses, projects)
  → Returns: {
      totalProfit, totalRevenue, averageMargin,
      projectCount, monthlyTrends, quarterlyRunRate,
      projectedAnnualProfit
    }
```

#### From `estimateFinancials.ts`:
```typescript
// Estimate totals
calculateEstimateTotalAmount(lineItems) // Revenue
calculateEstimateTotalCost(lineItems)   // Cost
calculateEstimateGrossProfit(lineItems) // Revenue - Cost
calculateEstimateGrossMargin(lineItems) // (Profit / Revenue) * 100

// Markup calculations
calculateEstimateTotalMarkup(lineItems)
calculateEstimateAverageMarkup(lineItems)

// All-in-one
calculateEstimateFinancials(lineItems)
  → Returns: {
      totalAmount, totalCost, grossProfit,
      grossMarginPercent, averageMarkupPercent,
      totalMarkupAmount
    }
```

#### From `projectFinancials.ts`:
```typescript
// Comprehensive project financial calculation
calculateProjectFinancials(project, estimates, expenses)
  → Returns extensive ProjectWithFinancials object

// NOTE: This function is marked as @deprecated
// Documentation states: "Use database fields directly instead"
// Financial metrics are now calculated by database functions
```

### 3.4 Important Discovery: Database-First Design

**Key Insight:** The codebase has **transitioned to a database-first approach**:

1. **Old Approach (deprecated):**
   - Front-end fetches raw data
   - JavaScript calculates margins, costs, etc.
   - Results shown to user

2. **New Approach (current):**
   - Database calculates everything via triggers
   - Front-end reads pre-calculated fields
   - JavaScript only formats/displays data

**Evidence:**
- `projectFinancials.ts` is marked `@deprecated`
- Projects table has all calculated fields (`current_margin`, `margin_percentage`, `projected_margin`, etc.)
- Database triggers maintain calculations automatically
- Front-end primarily does data transformation, not calculation

---

## 4. AVAILABLE METRICS & KPIs

### 4.1 Project-Level Metrics

#### Financial Metrics
- **Revenue Metrics:**
  - Contracted Amount (base + change orders)
  - Original Contract Amount
  - Change Order Revenue
  - Total Invoiced/Revenue (`total_invoiced` - sum of all project_revenues.amount)
  - Invoice Count (`invoice_count` - number of invoice/revenue records)
  - Revenue Variance (`revenue_variance` - contracted_amount - total_invoiced)
  - Revenue Variance Percent (`revenue_variance_percent` - variance as percentage of contracted amount)

- **Cost Metrics:**
  - Original Estimated Costs
  - Adjusted Estimated Costs (with accepted quotes)
  - Actual Expenses to Date
  - Total Accepted Quote Amounts
  - Change Order Cost Impact
  - Cost Variance (estimated vs actual)
  - Budget Burn Rate (% of budget spent)

- **Margin Metrics:**
  - Original Margin (from approved estimate)
  - Projected Margin (with quotes + change orders)
  - Current Margin (revenue - actual expenses)
  - Actual Margin (allocated costs only)
  - Margin Percentage
  - Margin Status (critical/at_risk/on_target/excellent)
  - Change Order Margin Impact
  - Margin Efficiency (% of target)

- **Contingency Metrics:**
  - Total Contingency
  - Contingency Used
  - Contingency Remaining
  - Contingency Utilization %
  - Change Order Contingency Usage

#### Operational Metrics
- Project Status (estimating → complete)
- Project Type (construction_project, work_order)
- Job Type (Commercial, Residential, etc.)
- Start Date / End Date
- Project Duration (days)
- Days to Completion
- Time Overrun (actual vs planned)

#### Activity Metrics
- Number of Estimates
- Number of Quotes (total, accepted, rejected)
- Number of Expenses
- Number of Change Orders
- Number of Invoices
- Number of Line Items (estimate, quote)
- Number of Receipts
- Number of Photos/Media

### 4.2 Estimate-Level Metrics

- Estimate Number
- Revision Number / Version
- Estimate Status
- Total Amount (revenue)
- Total Cost
- Gross Profit
- Gross Margin %
- Default Markup %
- Target Margin %
- Average Markup %
- Contingency Percent
- Contingency Amount
- Valid For Days
- Days Until Expiration

**By Category Breakdown:**
- Labor Costs
- Subcontractor Costs
- Material Costs
- Equipment Costs
- Permit Costs
- Management Costs
- Other Costs

### 4.3 Quote-Level Metrics

- Quote Number
- Quote Status
- Date Received
- Date Expires
- Quoted By (payee name)
- Total Amount
- Includes Materials (boolean)
- Includes Labor (boolean)
- Variance from Estimate
- Variance % from Estimate
- Acceptance Date
- Days to Accept/Reject

**Quote Comparison Metrics:**
- Lowest Quote
- Highest Quote
- Average Quote
- Quote Spread (high - low)
- Quote Count by Category
- Acceptance Rate %

### 4.4 Expense-Level Metrics

- Expense Date
- Category
- Transaction Type
- Amount
- Payee Name
- Approval Status
- Is Split Expense
- Split Percentage/Amount
- Invoice Number
- Description
- Days Since Expense

**Aggregated:**
- Total Expenses by Category
- Total Expenses by Payee
- Total Expenses by Month/Quarter/Year
- Planned vs Unplanned Expenses
- Approved vs Pending Expenses
- Average Expense Amount
- Expense Count
- Expense Frequency (expenses per day/week)

### 4.5 Change Order Metrics

- Change Order Number
- Change Order Status
- Date Created / Date Approved
- Client Amount (revenue added)
- Cost Impact
- Margin Impact
- Net Margin (client amount - cost impact)
- Includes Contingency (boolean)
- Reason for Change
- Number of Line Items

**Aggregated:**
- Total Change Order Revenue
- Total Change Order Cost
- Total Change Order Count
- Average Change Order Size
- Change Order Margin Impact
- Change Order Approval Rate
- Days to Approve Change Order

### 4.6 Time Entry Metrics (Labor Tracking)

- Worker Name
- Date
- Start Time / End Time
- Hours Worked
- Hourly Rate
- Total Amount
- Approval Status
- Rejection Reason
- Is Locked

**Aggregated:**
- Total Hours by Worker
- Total Hours by Project
- Total Labor Cost
- Average Hourly Rate
- Pending Approval Hours
- Approved Hours This Week/Month
- Rejected Hours
- Labor Utilization Rate

### 4.7 Schedule Metrics

- Task Name
- Task Category
- Start Date / End Date
- Duration (days)
- Progress % (from expenses)
- Completed (boolean)
- Phase Information
- Dependencies
- Estimated Cost
- Actual Cost
- Cost Variance

**Aggregated:**
- Project Timeline Duration
- Tasks on Schedule
- Tasks Behind Schedule
- Average Task Duration
- Percent Complete
- Schedule Variance
- Critical Path Tasks

### 4.8 Client Metrics

- Client Name
- Number of Projects
- Total Revenue
- Total Profit
- Average Margin %
- Project Count by Status
- Lifetime Value
- Average Project Size

### 4.9 Payee/Vendor Metrics

- Payee Name
- Payee Type (vendor/employee)
- Number of Quotes
- Number of Expenses
- Total Paid
- Average Quote Amount
- Quote Acceptance Rate
- On-time Payment Rate

### 4.10 Performance Metrics (Portfolio Level)

- **Profit Metrics:**
  - Total Profit (all projects)
  - Total Revenue (all projects)
  - Average Margin %
  - Quarterly Run Rate
  - Projected Annual Profit

- **Project Metrics:**
  - Total Active Projects
  - Projects by Status
  - Average Project Size
  - Project Win Rate (approved/total)
  - Average Project Duration

- **Trend Metrics:**
  - Monthly Profit Trend
  - Quarterly Revenue Trend
  - Margin Trend Over Time
  - Project Volume Trend

- **Top/Bottom Performers:**
  - Top 5 Profitable Projects
  - Bottom 5 Performing Projects
  - Most Profitable Clients
  - Best Performing Categories

---

## 5. TABLE RELATIONSHIPS & DATA FLOW

### 5.1 Entity Relationship Diagram (Text Format)

```
┌─────────────┐
│   CLIENTS   │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼─────────────────────────────────────┐
│              PROJECTS                       │
│  • project_number, project_name             │
│  • client_name, status                      │
│  • contracted_amount ◄─── Calculated        │
│  • current_margin ◄─────── Calculated        │
│  • margin_percentage ◄──── Calculated        │
│  • projected_margin ◄───── Calculated        │
│  • contingency_remaining ◄─ Calculated       │
└──┬───────┬────────┬────────┬────────┬──────┘
   │       │        │        │        │
   │1:N    │1:N     │1:N     │1:N     │1:N
   │       │        │        │        │
   ▼       ▼        ▼        ▼        ▼
┌────────┐ ┌────┐  ┌────┐  ┌─────┐  ┌──────┐
│ESTIMATE│ │QUOTE│ │EXP │  │CH.  │  │REVENUE│
│        │ │     │  │    │  │ORDER│  │       │
└───┬────┘ └──┬──┘ └────┘  └──┬──┘  └───────┘
    │         │                │
    │1:N      │1:N             │1:N
    │         │                │
    ▼         ▼                ▼
┌─────────┐ ┌──────────┐   ┌──────────┐
│EST LINE │ │QUOTE LINE│   │CO LINE   │
│ITEMS    │ │ITEMS     │   │ITEMS     │
└─────────┘ └──────────┘   └──────────┘
```

### 5.2 Data Flow for Reports

**Primary Flow:**
```
Projects Table (with calculated fields)
    │
    ├─→ Direct Fields: name, number, status, dates, contracted_amount
    │
    ├─→ Join Estimates → Estimate Line Items
    │   ├─→ Total Estimated Amount
    │   ├─→ Contingency
    │   └─→ Cost Breakdown by Category
    │
    ├─→ Join Quotes → Quote Line Items
    │   ├─→ Accepted Quote Totals
    │   └─→ Quote Comparison Data
    │
    ├─→ Join Expenses → Expense Splits
    │   ├─→ Actual Cost Tracking
    │   └─→ Category-level Spending
    │
    ├─→ Join Change Orders → CO Line Items
    │   ├─→ Revenue Changes
    │   ├─→ Cost Changes
    │   └─→ Margin Impact
    │
    ├─→ Join Project Revenues
    │   └─→ Invoice Tracking
    │
    └─→ Join Activity Feed
        └─→ Audit Trail
```

**Calculation Flow:**
```
User Action (Create/Update/Delete)
    ↓
Database Trigger Fires
    ↓
calculate_project_margins(project_id)
    ↓
Aggregates: Expenses, Quotes, Estimates, Change Orders
    ↓
Calculates: Margins, Costs, Contingency
    ↓
Updates Project Record Fields
    ↓
Front-end Reads Updated Values
    ↓
Display to User
```

### 5.3 Key Joins for Reporting

```sql
-- Example: Full Project Financial Report Query
SELECT 
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  p.contracted_amount,
  p.current_margin,
  p.margin_percentage,
  p.projected_margin,
  p.contingency_remaining,
  
  -- From estimates
  e.total_amount as estimate_total,
  e.contingency_amount,
  
  -- From expenses (aggregated)
  COALESCE(exp.total, 0) as total_expenses,
  COALESCE(exp.count, 0) as expense_count,
  
  -- From accepted quotes
  COALESCE(q.total, 0) as accepted_quotes_total,
  
  -- From change orders
  COALESCE(co.revenue, 0) as change_order_revenue,
  COALESCE(co.cost, 0) as change_order_cost

FROM projects p

LEFT JOIN LATERAL (
  SELECT e.* 
  FROM estimates e 
  WHERE e.project_id = p.id 
    AND e.status = 'approved' 
    AND e.is_current_version = true
  LIMIT 1
) e ON true

LEFT JOIN (
  SELECT 
    project_id,
    SUM(amount) as total,
    COUNT(*) as count
  FROM expenses
  GROUP BY project_id
) exp ON exp.project_id = p.id

LEFT JOIN (
  SELECT 
    project_id,
    SUM(total_amount) as total
  FROM quotes
  WHERE status = 'accepted'
  GROUP BY project_id
) q ON q.project_id = p.id

LEFT JOIN (
  SELECT 
    project_id,
    SUM(client_amount) as revenue,
    SUM(cost_impact) as cost
  FROM change_orders
  WHERE status = 'approved'
  GROUP BY project_id
) co ON co.project_id = p.id;
```

---

## 6. REPORT BUILDER DESIGN PLAN

### 6.1 Core Requirements

Based on the analysis, the report builder should support:

1. **Ad-hoc Report Creation** - Users build custom reports without coding
2. **Pre-built Templates** - Common reports ready to use
3. **Visual Builder** - Drag-and-drop or point-and-click interface
4. **Flexible Filtering** - Filter by any field, multiple conditions
5. **Custom Calculations** - Support calculated fields and formulas
6. **Grouping & Aggregation** - Group by dimensions, aggregate metrics
7. **Multiple Output Formats** - Screen, PDF, Excel, CSV
8. **Scheduling** - Run reports on a schedule
9. **Sharing** - Share reports with team members
10. **Performance** - Handle large datasets efficiently

### 6.2 Report Builder Architecture

#### Three-Tier Architecture

```
┌─────────────────────────────────────┐
│     PRESENTATION LAYER              │
│  • Report Builder UI (React)        │
│  • Report Viewer                    │
│  • Export Controls                  │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│     BUSINESS LOGIC LAYER            │
│  • Query Builder Service            │
│  • Report Configuration Manager     │
│  • Aggregation Engine               │
│  • Export Service                   │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│     DATA ACCESS LAYER               │
│  • Database Views                   │
│  • Supabase RPC Functions           │
│  • Query Optimizer                  │
└─────────────────────────────────────┘
```

### 6.3 Data Model for Reports

#### Report Configuration Schema

```typescript
interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'schedule' | 'custom';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  is_template: boolean;
  
  // Data source configuration
  data_source: {
    primary_table: 'projects' | 'estimates' | 'expenses' | 'quotes';
    joins: JoinDefinition[];
  };
  
  // Field selection
  fields: ReportField[];
  
  // Filters
  filters: FilterDefinition[];
  
  // Grouping & sorting
  group_by: string[];
  sort_by: SortDefinition[];
  
  // Aggregations
  aggregations: AggregationDefinition[];
  
  // Display configuration
  display: {
    chart_type?: 'table' | 'bar' | 'line' | 'pie' | 'scatter';
    page_size?: number;
    show_totals: boolean;
    show_subtotals: boolean;
  };
  
  // Schedule (optional)
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    day_of_week?: number;
    day_of_month?: number;
    recipients: string[];
  };
}

interface ReportField {
  id: string;
  source_table: string;
  source_field: string;
  display_name: string;
  data_type: 'text' | 'number' | 'date' | 'currency' | 'percent';
  format?: string; // e.g., "$0,0.00" for currency
  is_calculated: boolean;
  formula?: string; // For calculated fields
  width?: number;
  alignment?: 'left' | 'center' | 'right';
}

interface FilterDefinition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 
           'contains' | 'starts_with' | 'in' | 'between' | 'is_null';
  value: any;
  and_or: 'AND' | 'OR';
}

interface AggregationDefinition {
  field: string;
  function: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'MEDIAN';
  display_name: string;
}

interface JoinDefinition {
  table: string;
  join_type: 'INNER' | 'LEFT' | 'RIGHT';
  on_field: string;
  foreign_field: string;
}

interface SortDefinition {
  field: string;
  direction: 'ASC' | 'DESC';
}
```

### 6.4 Pre-built Report Templates

#### Template Categories

1. **Financial Reports**
   - Project Profitability Summary
   - Margin Analysis by Project
   - Budget vs Actual by Category
   - Change Order Impact Analysis
   - Cash Flow Report
   - Revenue Recognition Report
   - Cost Variance Report

2. **Operational Reports**
   - Active Projects Dashboard
   - Project Status Summary
   - Estimate Conversion Rate
   - Quote Acceptance Rate
   - Expense Approval Queue
   - Time Entry Summary
   - Contingency Utilization

3. **Client Reports**
   - Client Portfolio Summary
   - Client Profitability Ranking
   - Client Project History
   - Client Payment Summary

4. **Vendor/Payee Reports**
   - Vendor Spend Analysis
   - Subcontractor Performance
   - Quote Comparison Report
   - Vendor Payment Schedule

5. **Schedule Reports**
   - Project Timeline Overview
   - Task Completion Status
   - Schedule vs Actual Progress
   - Critical Path Analysis

6. **Compliance Reports**
   - Audit Trail Report
   - Activity Log by User
   - Document Compliance Report
   - Receipt Approval Report

#### Example Template: "Project Profitability Summary"

```javascript
{
  name: "Project Profitability Summary",
  category: "financial",
  data_source: {
    primary_table: "projects",
    joins: [
      { table: "estimates", join_type: "LEFT", on_field: "id", foreign_field: "project_id" },
      { table: "clients", join_type: "LEFT", on_field: "client_name", foreign_field: "client_name" }
    ]
  },
  fields: [
    { source_field: "project_number", display_name: "Project #", data_type: "text" },
    { source_field: "project_name", display_name: "Project Name", data_type: "text" },
    { source_field: "client_name", display_name: "Client", data_type: "text" },
    { source_field: "status", display_name: "Status", data_type: "text" },
    { source_field: "contracted_amount", display_name: "Contract Amount", data_type: "currency" },
    { source_field: "current_margin", display_name: "Current Margin", data_type: "currency" },
    { source_field: "margin_percentage", display_name: "Margin %", data_type: "percent" },
    { source_field: "projected_margin", display_name: "Projected Margin", data_type: "currency" },
  ],
  filters: [
    { field: "status", operator: "in", value: ["in_progress", "complete"], and_or: "AND" }
  ],
  sort_by: [
    { field: "margin_percentage", direction: "DESC" }
  ],
  aggregations: [
    { field: "contracted_amount", function: "SUM", display_name: "Total Contract Value" },
    { field: "current_margin", function: "SUM", display_name: "Total Margin" },
    { field: "margin_percentage", function: "AVG", display_name: "Average Margin %" },
  ],
  display: {
    chart_type: "table",
    show_totals: true,
    show_subtotals: false
  }
}
```

### 6.5 User Interface Design

#### Report Builder Workflow

```
Step 1: Choose Template or Start from Scratch
    ↓
Step 2: Select Data Source (Projects, Estimates, etc.)
    ↓
Step 3: Add Fields (Drag & Drop or Browse)
    ↓
Step 4: Configure Filters
    ↓
Step 5: Set Grouping & Sorting
    ↓
Step 6: Add Calculations/Aggregations
    ↓
Step 7: Preview Report
    ↓
Step 8: Save & Export
```

#### UI Components

1. **Report Builder Canvas**
   - Left Sidebar: Available fields tree view
   - Center: Report configuration workspace
   - Right Sidebar: Field properties & settings
   - Bottom: Preview pane

2. **Field Browser**
   - Hierarchical tree view of all tables and fields
   - Search/filter fields
   - Show field type icons
   - Show descriptions on hover

3. **Filter Builder**
   - Visual filter creator (no SQL needed)
   - Support for complex AND/OR logic
   - Date range picker
   - Multi-select for IN filters
   - Preview filter results count

4. **Aggregation Builder**
   - Drag fields to aggregation area
   - Select aggregation function
   - Support for multiple aggregations
   - Visual grouping indicator

5. **Preview Pane**
   - Live data preview (limited rows)
   - Column resizing
   - Sort by column
   - Export button

### 6.6 Technical Implementation Details

#### Database Layer

**Create Reporting Views:**

```sql
-- Create a comprehensive reporting view
CREATE OR REPLACE VIEW reporting.project_detailed_financials AS
SELECT 
  p.id as project_id,
  p.project_number,
  p.project_name,
  p.client_name,
  p.status,
  p.project_type,
  p.job_type,
  p.start_date,
  p.end_date,
  p.contracted_amount,
  p.current_margin,
  p.margin_percentage,
  p.projected_margin,
  p.original_margin,
  p.contingency_remaining,
  p.minimum_margin_threshold,
  p.target_margin,
  
  -- Estimate data
  e.estimate_number,
  e.total_amount as estimate_total,
  e.total_cost as estimate_cost,
  e.contingency_amount,
  e.contingency_used,
  
  -- Expense aggregations
  COALESCE(exp_summary.total_expenses, 0) as total_expenses,
  COALESCE(exp_summary.labor_expenses, 0) as labor_expenses,
  COALESCE(exp_summary.material_expenses, 0) as material_expenses,
  COALESCE(exp_summary.equipment_expenses, 0) as equipment_expenses,
  COALESCE(exp_summary.subcontractor_expenses, 0) as subcontractor_expenses,
  COALESCE(exp_summary.other_expenses, 0) as other_expenses,
  COALESCE(exp_summary.expense_count, 0) as expense_count,
  
  -- Quote aggregations
  COALESCE(quote_summary.accepted_quote_total, 0) as accepted_quote_total,
  COALESCE(quote_summary.quote_count, 0) as quote_count,
  
  -- Change order aggregations
  COALESCE(co_summary.change_order_revenue, 0) as change_order_revenue,
  COALESCE(co_summary.change_order_cost, 0) as change_order_cost,
  COALESCE(co_summary.change_order_count, 0) as change_order_count,
  
  -- Revenue aggregations
  COALESCE(rev_summary.total_invoiced, 0) as total_invoiced,
  COALESCE(rev_summary.invoice_count, 0) as invoice_count,
  
  -- Calculated fields
  (p.contracted_amount - COALESCE(exp_summary.total_expenses, 0)) as remaining_budget,
  
  -- Revenue variance calculations
  (p.contracted_amount - COALESCE(rev_summary.total_invoiced, 0)) as revenue_variance,
  CASE 
    WHEN p.contracted_amount > 0 
    THEN ((p.contracted_amount - COALESCE(rev_summary.total_invoiced, 0)) / p.contracted_amount) * 100
    ELSE 0
  END as revenue_variance_percent,
  CASE 
    WHEN p.contracted_amount > 0 
    THEN (COALESCE(exp_summary.total_expenses, 0) / p.contracted_amount) * 100
    ELSE 0
  END as budget_utilization_percent,
  
  -- Dates
  p.created_at,
  p.updated_at

FROM projects p

LEFT JOIN LATERAL (
  SELECT * FROM estimates e
  WHERE e.project_id = p.id 
    AND e.status = 'approved' 
    AND e.is_current_version = true
  LIMIT 1
) e ON true

LEFT JOIN (
  SELECT 
    project_id,
    SUM(amount) as total_expenses,
    SUM(CASE WHEN category = 'labor_internal' THEN amount ELSE 0 END) as labor_expenses,
    SUM(CASE WHEN category = 'materials' THEN amount ELSE 0 END) as material_expenses,
    SUM(CASE WHEN category = 'equipment' THEN amount ELSE 0 END) as equipment_expenses,
    SUM(CASE WHEN category = 'subcontractors' THEN amount ELSE 0 END) as subcontractor_expenses,
    SUM(CASE WHEN category = 'other' THEN amount ELSE 0 END) as other_expenses,
    COUNT(*) as expense_count
  FROM expenses
  GROUP BY project_id
) exp_summary ON exp_summary.project_id = p.id

LEFT JOIN (
  SELECT 
    project_id,
    SUM(total_amount) as accepted_quote_total,
    COUNT(*) as quote_count
  FROM quotes
  WHERE status = 'accepted'
  GROUP BY project_id
) quote_summary ON quote_summary.project_id = p.id

LEFT JOIN (
  SELECT 
    project_id,
    SUM(client_amount) as change_order_revenue,
    SUM(cost_impact) as change_order_cost,
    COUNT(*) as change_order_count
  FROM change_orders
  WHERE status = 'approved'
  GROUP BY project_id
) co_summary ON co_summary.project_id = p.id

LEFT JOIN (
  SELECT 
    project_id,
    SUM(amount) as total_invoiced,
    COUNT(*) as invoice_count
  FROM project_revenues
  GROUP BY project_id
) rev_summary ON rev_summary.project_id = p.id;
```

**Create Report Execution Function:**

```sql
CREATE OR REPLACE FUNCTION public.execute_report(
  report_config JSONB
)
RETURNS TABLE (
  column_name TEXT,
  row_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  query_text TEXT;
BEGIN
  -- Build dynamic query from report_config
  -- This function would parse the JSONB config and build SQL
  
  -- Simplified example:
  query_text := format(
    'SELECT %s FROM %s WHERE %s ORDER BY %s',
    report_config->>'fields',
    report_config->>'from',
    report_config->>'where',
    report_config->>'order_by'
  );
  
  RETURN QUERY EXECUTE query_text;
END;
$$;
```

#### Front-end Layer

**React Component Structure:**

```
/src/components/reports/
  ├── ReportBuilder/
  │   ├── index.tsx              # Main report builder component
  │   ├── FieldBrowser.tsx        # Left sidebar - available fields
  │   ├── ReportCanvas.tsx        # Center workspace
  │   ├── FieldProperties.tsx     # Right sidebar - field config
  │   ├── FilterBuilder.tsx       # Filter configuration
  │   ├── GroupingPanel.tsx       # Grouping/aggregation config
  │   └── PreviewPane.tsx         # Report preview
  │
  ├── ReportViewer/
  │   ├── index.tsx               # Report display component
  │   ├── ReportTable.tsx         # Tabular display
  │   ├── ReportChart.tsx         # Chart display
  │   └── ExportControls.tsx      # Export buttons
  │
  ├── ReportTemplates/
  │   ├── index.tsx               # Template gallery
  │   ├── TemplateCard.tsx        # Template preview card
  │   └── TemplateCategories.tsx  # Category navigation
  │
  └── ReportScheduler/
      ├── index.tsx               # Schedule configuration
      └── RecipientSelector.tsx   # Email recipient picker

/src/hooks/
  ├── useReportBuilder.ts         # Report builder state management
  ├── useReportExecution.ts       # Execute and fetch report data
  └── useReportTemplates.ts       # Load/save templates

/src/utils/
  ├── reportQueryBuilder.ts       # Build SQL/RPC from config
  ├── reportExporter.ts           # Export to PDF/Excel/CSV
  └── reportFormatter.ts          # Format data for display
```

**Key React Hooks:**

```typescript
// useReportBuilder.ts
export function useReportBuilder() {
  const [config, setConfig] = useState<ReportDefinition>(defaultConfig);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const addField = (field: ReportField) => {
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, field]
    }));
  };
  
  const addFilter = (filter: FilterDefinition) => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, filter]
    }));
  };
  
  const executePreview = async () => {
    setIsLoading(true);
    const data = await supabase.rpc('execute_report', {
      report_config: config
    });
    setPreviewData(data.data || []);
    setIsLoading(false);
  };
  
  const saveReport = async (name: string) => {
    await supabase.from('saved_reports').insert({
      name,
      config: JSON.stringify(config),
      created_by: user.id
    });
  };
  
  return {
    config,
    previewData,
    isLoading,
    addField,
    removeField,
    addFilter,
    removeFilter,
    setGrouping,
    setAggregation,
    executePreview,
    saveReport
  };
}
```

### 6.7 Export Functionality

#### Supported Formats

1. **PDF**
   - Use `jspdf` + `jspdf-autotable`
   - Support for headers, footers, page numbers
   - Company branding/logo
   - Professional formatting

2. **Excel (XLSX)**
   - Use `exceljs` or `xlsx`
   - Multiple sheets
   - Formatting (bold, colors, borders)
   - Formulas
   - Charts

3. **CSV**
   - Simple CSV export
   - UTF-8 encoding
   - Configurable delimiter

4. **JSON**
   - Raw data export
   - For API integrations

**Export Implementation:**

```typescript
// reportExporter.ts

export async function exportReportToPDF(
  reportData: any[],
  config: ReportDefinition
): Promise<Blob> {
  const { jsPDF } = require('jspdf');
  require('jspdf-autotable');
  
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(config.name, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Add table
  doc.autoTable({
    head: [config.fields.map(f => f.display_name)],
    body: reportData.map(row => 
      config.fields.map(f => row[f.source_field])
    ),
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  return doc.output('blob');
}

export async function exportReportToExcel(
  reportData: any[],
  config: ReportDefinition
): Promise<Blob> {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');
  
  // Add header row
  worksheet.addRow(config.fields.map(f => f.display_name));
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2980B9' }
  };
  
  // Add data rows
  reportData.forEach(row => {
    worksheet.addRow(config.fields.map(f => row[f.source_field]));
  });
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

export function exportReportToCSV(
  reportData: any[],
  config: ReportDefinition
): Blob {
  // Create header row
  const headers = config.fields.map(f => f.display_name).join(',');
  
  // Create data rows
  const rows = reportData.map(row => 
    config.fields.map(f => {
      const value = row[f.source_field];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}
```

### 6.8 Performance Optimization

#### Database Optimization

1. **Indexes**
   - Ensure all foreign keys have indexes
   - Add indexes on commonly filtered fields (date, status, etc.)
   - Create composite indexes for common joins

2. **Materialized Views**
   - For heavy aggregations, use materialized views
   - Refresh on schedule or trigger

3. **Query Optimization**
   - Use `EXPLAIN ANALYZE` to identify slow queries
   - Limit result sets with pagination
   - Use `COUNT(*)` efficiently

4. **Caching**
   - Cache report results for frequently run reports
   - Use Redis or similar for caching
   - Cache templates and metadata

#### Front-end Optimization

1. **Lazy Loading**
   - Load data in chunks (pagination)
   - Virtual scrolling for large datasets

2. **Debouncing**
   - Debounce filter changes
   - Debounce preview updates

3. **Web Workers**
   - Use web workers for data processing
   - Format data in background thread

4. **Memoization**
   - Memoize expensive calculations
   - Use React.memo for components

### 6.9 Security Considerations

1. **Row-Level Security (RLS)**
   - Respect existing RLS policies
   - Reports only show data user has access to

2. **SQL Injection Prevention**
   - Use parameterized queries
   - Validate all user inputs
   - Use Supabase RPC functions (safer than dynamic SQL)

3. **Permission Checks**
   - Check user role before allowing report creation
   - Restrict sensitive fields based on role
   - Audit who creates/runs reports

4. **Data Export Controls**
   - Log all data exports
   - Limit export frequency
   - Watermark PDFs with username/date

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Set up database infrastructure and basic reporting views

**Tasks:**
1. Create `reports` schema in database
2. Create `saved_reports` table
3. Create `report_execution_log` table
4. Build comprehensive reporting views (like `reporting.project_detailed_financials`)
5. Create RPC function for report execution
6. Add necessary indexes for performance

**Deliverables:**
- Database schema ready
- Base reporting views created
- RPC functions implemented
- Documentation for database layer

### Phase 2: Core Report Builder UI (Weeks 3-5)

**Goal:** Build the report builder interface

**Tasks:**
1. Design and implement Report Builder layout
2. Build Field Browser component
3. Build Filter Builder component
4. Build Report Canvas workspace
5. Implement drag-and-drop functionality
6. Build Preview Pane
7. Implement save/load report functionality

**Deliverables:**
- Functional report builder UI
- Ability to create custom reports
- Save reports to database
- Preview report results

### Phase 3: Pre-built Templates (Week 6)

**Goal:** Create pre-built report templates

**Tasks:**
1. Design template gallery UI
2. Implement 10-15 core templates
3. Create template categories
4. Build template selection workflow
5. Add template customization

**Deliverables:**
- Template gallery
- 15 production-ready templates
- Template documentation

### Phase 4: Export & Sharing (Week 7)

**Goal:** Implement export functionality

**Tasks:**
1. Implement PDF export
2. Implement Excel export
3. Implement CSV export
4. Add email sharing functionality
5. Add report URL sharing
6. Build export history log

**Deliverables:**
- Multi-format export working
- Email sharing functional
- Export audit trail

### Phase 5: Advanced Features (Weeks 8-9)

**Goal:** Add advanced reporting capabilities

**Tasks:**
1. Implement calculated fields
2. Add chart/visualization support
3. Build grouping and subtotal functionality
4. Add report scheduling
5. Implement report comparison (period over period)
6. Add dashboard widgets

**Deliverables:**
- Calculated fields working
- Charts and visualizations
- Scheduled reports
- Comparison reports

### Phase 6: Testing & Polish (Week 10)

**Goal:** Test, optimize, and polish

**Tasks:**
1. Performance testing with large datasets
2. User acceptance testing
3. Fix bugs
4. Optimize slow queries
5. Write user documentation
6. Create video tutorials

**Deliverables:**
- Tested and optimized system
- User documentation
- Video tutorials
- Production-ready release

---

## 8. TECHNICAL SPECIFICATIONS SUMMARY

### 8.1 Database Design

**New Tables to Create:**

```sql
-- Saved reports configuration
CREATE TABLE public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  config JSONB NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  shared_with UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Report execution log (for audit and caching)
CREATE TABLE public.report_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.saved_reports(id),
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INTEGER,
  row_count INTEGER,
  filters_used JSONB,
  export_format TEXT
);

-- Report schedules
CREATE TABLE public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.saved_reports(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER, -- 0-6 for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  time_of_day TIME NOT NULL DEFAULT '08:00:00',
  recipients TEXT[] NOT NULL,
  export_format TEXT NOT NULL DEFAULT 'pdf',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 Tech Stack

**Front-end:**
- React 18+ with TypeScript
- TanStack Query (React Query) for data fetching
- Zustand for state management
- React DnD for drag-and-drop
- TanStack Table for data tables
- Recharts for visualizations
- Tailwind CSS for styling
- Shadcn UI components

**Back-end:**
- Supabase (PostgreSQL)
- Supabase RPC functions
- Supabase Edge Functions (for scheduled reports)

**Export Libraries:**
- jsPDF + jspdf-autotable (PDF)
- ExcelJS (Excel)
- Custom CSV generator

**Deployment:**
- Existing deployment pipeline
- No additional infrastructure needed

### 8.3 API Endpoints (Supabase RPC)

```typescript
// Execute a report and return data
rpc('execute_report', {
  report_config: ReportDefinition
}) → { data: any[], metadata: { row_count, execution_time } }

// Save a report
from('saved_reports').insert({
  name, description, config, created_by
})

// Load saved reports
from('saved_reports').select('*').eq('created_by', user.id)

// Load template reports
from('saved_reports').select('*').eq('is_template', true)

// Share a report
from('saved_reports').update({
  shared_with: arrayAppend(user_id)
}).eq('id', report_id)

// Schedule a report
from('report_schedules').insert({
  report_id, frequency, recipients, export_format
})

// Get available fields metadata
rpc('get_report_fields', {
  table_name: string
}) → { fields: FieldMetadata[] }
```

### 8.4 Performance Targets

- Report execution: < 2 seconds for typical reports
- Preview refresh: < 500ms
- Export generation: < 5 seconds
- UI responsiveness: < 100ms for interactions
- Support datasets up to 10,000 rows efficiently

---

## 9. USER EXPERIENCE FLOWS

### 9.1 Creating a New Report from Scratch

```
1. User clicks "Create New Report" button
2. System shows data source selector
   - Projects
   - Estimates
   - Expenses
   - Quotes
   - Time Entries
3. User selects "Projects"
4. System loads field browser with all project-related fields
5. User drags "Project Number" field to canvas
6. User drags "Project Name" field to canvas
7. User drags "Contracted Amount" field to canvas
8. User drags "Current Margin" field to canvas
9. User clicks "Add Filter" button
10. User selects field: "Status"
11. User selects operator: "In"
12. User selects values: "In Progress", "Complete"
13. User clicks "Add Sorting"
14. User selects field: "Current Margin"
15. User selects direction: "Descending"
16. User clicks "Preview" button
17. System executes query and shows preview data
18. User reviews data (looks good!)
19. User clicks "Save Report"
20. System prompts for name: "Top Profitable Projects"
21. User clicks "Save"
22. System saves report and shows success message
```

### 9.2 Using a Pre-built Template

```
1. User clicks "Reports" in main navigation
2. System shows report gallery page
3. User sees categories: Financial, Operational, Schedule, etc.
4. User clicks "Financial" category
5. System shows financial report templates
6. User sees "Project Profitability Summary" template
7. User clicks on template card
8. System loads template preview
9. User sees default fields and filters
10. User clicks "Customize" button (optional)
11. User adds additional filter: "Client equals ABC Corp"
12. User clicks "Run Report"
13. System executes report and shows results
14. User clicks "Export to PDF"
15. System generates PDF and downloads
16. User clicks "Save Custom Version"
17. System saves as "ABC Corp Profitability"
```

### 9.3 Scheduling a Report

```
1. User opens saved report "Monthly Margin Report"
2. User clicks "Schedule" button
3. System shows scheduling dialog
4. User selects frequency: "Monthly"
5. User selects day: "1st of month"
6. User selects time: "8:00 AM"
7. User adds recipients: 
   - john@company.com
   - jane@company.com
8. User selects export format: "PDF"
9. User clicks "Save Schedule"
10. System creates schedule and shows confirmation
11. On the 1st of next month at 8 AM:
    - System executes report
    - System generates PDF
    - System emails to recipients
    - System logs execution
```

---

## 10. FUTURE ENHANCEMENTS (Post-MVP)

### Advanced Analytics
- Trend analysis with ML predictions
- Anomaly detection
- What-if scenario modeling
- Forecasting

### Collaboration
- Real-time collaborative report building
- Comments and annotations
- Version control for reports
- Report approval workflow

### Integrations
- QuickBooks report sync
- Export to Google Sheets
- Slack notifications
- Power BI/Tableau connector

### Mobile App
- Mobile-optimized report viewer
- Push notifications for scheduled reports
- Offline report viewing

### AI Assistant
- Natural language report queries
- Automatic insight generation
- Smart field suggestions
- Report optimization recommendations

---

## 11. SUCCESS METRICS

### User Adoption
- Number of reports created per month
- Number of active report users
- Average reports per user
- Template usage rate

### Performance
- Average report execution time
- Export generation time
- System uptime
- Error rate

### Business Value
- Time saved vs manual reporting
- Data-driven decisions made
- Reduction in spreadsheet usage
- User satisfaction score

---

## 12. RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance issues with large datasets | High | Medium | Implement pagination, caching, materialized views |
| Complex UI overwhelming users | Medium | Medium | Start simple, progressive disclosure, templates |
| Database schema changes breaking reports | High | Low | Version report configs, migration tools |
| Security vulnerabilities | High | Low | RLS policies, input validation, audit logging |
| User adoption challenges | Medium | Medium | Training, documentation, templates |

---

## 13. CONCLUSION & RECOMMENDATIONS

### Key Takeaways

1. **Strong Foundation:** The database architecture is well-designed with calculated fields and triggers - perfect for reporting.

2. **Minimal Front-end Work:** Since calculations are in the database, the report builder can focus on configuration and display.

3. **Clear Requirements:** The analysis identified 100+ metrics across 14 tables - plenty of data to report on.

4. **User-Friendly Approach:** Templates and drag-and-drop will make it accessible to non-technical users.

### Recommended Next Steps

1. **Week 1:** Review this document with stakeholders and get approval
2. **Week 2:** Begin Phase 1 (Database foundation)
3. **Ongoing:** User interviews to validate templates and UI design
4. **Month 2:** Beta release to select users
5. **Month 3:** Full production release

### Final Notes

This report builder will be a **game-changer** for your business. With automated calculations, flexible configuration, and beautiful exports, your team will have instant access to critical insights without relying on manual spreadsheets or technical staff.

The phased approach ensures we deliver value quickly while building toward a comprehensive solution. The focus on templates makes it immediately useful, while the custom builder provides long-term flexibility.

**This is a solid plan backed by thorough analysis. Let's build it! 🚀**

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-17  
**Next Review:** Upon stakeholder approval

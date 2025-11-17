# Database Tables & Fields Reference

**For Report Builder Planning**  
**Updated:** 2025-11-17

---

## Core Tables Summary

| # | Table Name | Record Count Typical | Primary Use | Key for Reporting |
|---|------------|---------------------|-------------|-------------------|
| 1 | `projects` | 100-500 | Master project records | ⭐⭐⭐ CRITICAL |
| 2 | `estimates` | 200-1000 | Project estimates | ⭐⭐⭐ CRITICAL |
| 3 | `estimate_line_items` | 2000-10000 | Estimate details | ⭐⭐⭐ HIGH |
| 4 | `quotes` | 500-2000 | Vendor quotes | ⭐⭐⭐ HIGH |
| 5 | `quote_line_items` | 2000-10000 | Quote details | ⭐⭐ MEDIUM |
| 6 | `expenses` | 1000-5000 | Actual costs | ⭐⭐⭐ CRITICAL |
| 7 | `expense_splits` | 200-1000 | Split expense allocation | ⭐⭐ MEDIUM |
| 8 | `change_orders` | 200-1000 | Project changes | ⭐⭐⭐ HIGH |
| 9 | `change_order_line_items` | 500-2000 | Change order details | ⭐⭐ MEDIUM |
| 10 | `payees` | 50-200 | Vendors & employees | ⭐⭐⭐ HIGH |
| 11 | `clients` | 20-100 | Customers | ⭐⭐⭐ HIGH |
| 12 | `project_revenues` | 500-2000 | Invoices/revenue | ⭐⭐⭐ HIGH |
| 13 | `receipts` | 500-2000 | Receipt images | ⭐⭐ MEDIUM |
| 14 | `project_media` | 1000-5000 | Photos/videos | ⭐ LOW |
| 15 | `activity_feed` | 5000-20000 | Audit log | ⭐ LOW |

---

## 1. PROJECTS Table

**Purpose:** Master record for all construction projects and work orders

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `project_number` | TEXT | No | Unique project identifier (e.g., "125-144") | Display, filter |
| `project_name` | TEXT | No | Project name | Display |
| `client_name` | TEXT | No | Client/customer name | Display, group by |
| `status` | ENUM | No | Project status | Filter, group by |
| `project_type` | ENUM | No | 'construction_project' or 'work_order' | Filter |
| `job_type` | TEXT | No | Commercial, Residential, etc. | Group by, filter |
| `start_date` | DATE | No | Project start | Date range |
| `end_date` | DATE | No | Project end | Date range, duration calc |
| `contracted_amount` | NUMERIC | **YES** | Total contract value | Display, sum, avg |
| `current_margin` | NUMERIC | **YES** | Revenue - actual expenses | Display, sum |
| `margin_percentage` | NUMERIC | **YES** | Margin as % of revenue | Display, avg, filter |
| `projected_margin` | NUMERIC | **YES** | Expected final margin | Display, sum |
| `original_margin` | NUMERIC | **YES** | Margin from original estimate | Comparison |
| `contingency_remaining` | NUMERIC | **YES** | Unused contingency | Display |
| `total_accepted_quotes` | NUMERIC | **YES** | Sum of accepted quotes | Display |
| `adjusted_est_costs` | NUMERIC | **YES** | Costs with accepted quotes | Comparison |
| `original_est_costs` | NUMERIC | **YES** | Original estimated costs | Comparison |
| `minimum_margin_threshold` | NUMERIC | No | Alert threshold | Conditional formatting |
| `target_margin` | NUMERIC | No | Target margin goal | Comparison |
| `created_at` | TIMESTAMP | No | Record creation | Sort, filter |
| `updated_at` | TIMESTAMP | No | Last update | Sort, filter |

### Status Values
- `estimating` - Initial phase
- `quoted` - Estimate sent
- `approved` - Client approved
- `in_progress` - Active work
- `complete` - Finished
- `on_hold` - Paused
- `cancelled` - Cancelled

### Relationships
- **Parent to:** estimates, quotes, expenses, change_orders, project_revenues, project_media
- **Referenced by:** All project-related tables

---

## 2. ESTIMATES Table

**Purpose:** Store project estimates and bids sent to clients

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `project_id` | UUID | No | Links to projects | JOIN |
| `estimate_number` | TEXT | No | Unique estimate ID | Display |
| `revision_number` | INTEGER | No | Version number | Display |
| `version_number` | INTEGER | No | Alternative version field | Display |
| `is_current_version` | BOOLEAN | No | Is this the current version? | Filter |
| `date_created` | DATE | No | Creation date | Sort, filter |
| `valid_until` | DATE | No | Expiration date | Filter, calc days |
| `status` | ENUM | No | draft, sent, approved, rejected, expired | Filter, group by |
| `total_amount` | NUMERIC | No | Total estimate revenue | Display, sum |
| `total_cost` | NUMERIC | **YES** | Total estimated cost | Display, sum |
| `contingency_percent` | NUMERIC | No | Contingency % | Display |
| `contingency_amount` | NUMERIC | No | Contingency $ amount | Display, sum |
| `contingency_used` | NUMERIC | No | Used contingency | Display |
| `default_markup_percent` | NUMERIC | No | Default markup % | Display |
| `target_margin_percent` | NUMERIC | No | Target margin % | Comparison |
| `notes` | TEXT | No | Estimate notes | Display (optional) |

### Relationships
- **Parent:** projects
- **Children:** estimate_line_items
- **Referenced by:** quotes (can link to estimate)

---

## 3. ESTIMATE_LINE_ITEMS Table

**Purpose:** Individual line items within estimates

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `estimate_id` | UUID | No | Links to estimates | JOIN |
| `category` | ENUM | No | Line item category | Group by, filter |
| `description` | TEXT | No | Item description | Display |
| `quantity` | NUMERIC | No | Quantity | Display, calc |
| `unit` | TEXT | No | Unit of measure | Display |
| `price_per_unit` | NUMERIC | No | Price per unit | Calc revenue |
| `cost_per_unit` | NUMERIC | No | Cost per unit | Calc cost |
| `total_cost` | NUMERIC | **YES** | qty * cost_per_unit (generated) | Sum, display |
| `total` | NUMERIC | **YES** | qty * price_per_unit (generated) | Sum, display |
| `markup_percent` | NUMERIC | No | Markup % | Display |
| `sort_order` | INTEGER | No | Display order | Sort |

### Category Values
- `labor_internal` - Internal labor
- `subcontractors` - External labor
- `materials` - Materials
- `equipment` - Equipment
- `permits` - Permits & fees
- `management` - Overhead
- `other` - Other

### Relationships
- **Parent:** estimates
- **Referenced by:** quote_line_items (can link back)

---

## 4. QUOTES Table

**Purpose:** Vendor and subcontractor quotes for work

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `project_id` | UUID | No | Links to projects | JOIN |
| `estimate_id` | UUID | No | Optional estimate link | JOIN |
| `payee_id` | UUID | No | Vendor/subcontractor | JOIN, group by |
| `quote_number` | TEXT | No | Unique quote ID | Display |
| `date_received` | DATE | No | When received | Sort, filter |
| `date_expires` | DATE | No | Expiration date | Filter |
| `status` | ENUM | No | pending, accepted, rejected, expired | Filter, group by |
| `accepted_date` | DATE | No | When accepted | Calc turnaround |
| `total_amount` | NUMERIC | No | Total quote amount | Display, sum |
| `includes_materials` | BOOLEAN | No | Includes materials? | Filter |
| `includes_labor` | BOOLEAN | No | Includes labor? | Filter |
| `notes` | TEXT | No | Quote notes | Display (optional) |
| `attachment_url` | TEXT | No | PDF attachment | Link |

### Relationships
- **Parent:** projects, estimates (optional), payees
- **Children:** quote_line_items

---

## 5. QUOTE_LINE_ITEMS Table

**Purpose:** Line items within vendor quotes

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `quote_id` | UUID | No | Links to quotes | JOIN |
| `estimate_line_item_id` | UUID | No | Optional estimate line link | JOIN |
| `category` | ENUM | No | Line item category | Group by |
| `description` | TEXT | No | Item description | Display |
| `quantity` | NUMERIC | No | Quantity | Calc |
| `price_per_unit` | NUMERIC | No | Vendor price per unit | Calc |
| `cost_per_unit` | NUMERIC | No | Vendor cost (if known) | Calc |
| `total` | NUMERIC | **YES** | qty * price_per_unit | Sum |
| `total_cost` | NUMERIC | **YES** | qty * cost_per_unit | Sum |

### Relationships
- **Parent:** quotes
- **Can reference:** estimate_line_items

---

## 6. EXPENSES Table

**Purpose:** Actual project expenses and costs

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `project_id` | UUID | No | Links to projects | JOIN, group by |
| `payee_id` | UUID | No | Vendor/employee paid | JOIN, group by |
| `transaction_type` | ENUM | No | Type of expense | Filter, group by |
| `expense_date` | DATE | No | Date of expense | Filter, group by |
| `category` | ENUM | No | Expense category | Filter, group by |
| `description` | TEXT | No | Expense description | Display |
| `amount` | NUMERIC | No | Expense amount | Sum, display |
| `invoice_number` | TEXT | No | Invoice reference | Display |
| `is_planned` | BOOLEAN | No | Was this planned? | Filter |
| `is_split` | BOOLEAN | No | Split across projects? | Filter |
| `approval_status` | ENUM | No | pending, approved, rejected | Filter |
| `approved_by` | UUID | No | Who approved | Display |
| `approved_at` | TIMESTAMP | No | When approved | Sort |
| `rejection_reason` | TEXT | No | Why rejected | Display |

### Transaction Types
- `expense` - General expense
- `bill` - Bill/invoice
- `check` - Check payment
- `credit_card` - Credit card charge
- `cash` - Cash payment

### Relationships
- **Parent:** projects, payees
- **Children:** expense_splits (if is_split = true)

---

## 7. EXPENSE_SPLITS Table

**Purpose:** Allocate split expenses across multiple projects

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `expense_id` | UUID | No | Links to expenses | JOIN |
| `project_id` | UUID | No | Project receiving allocation | JOIN |
| `split_amount` | NUMERIC | No | Amount allocated to project | Sum |
| `split_percentage` | NUMERIC | No | Percentage allocated | Display |
| `notes` | TEXT | No | Split notes | Display |

**Important:** When reporting on expenses, must handle split expenses:
```sql
SELECT 
  COALESCE(es.project_id, e.project_id) as project_id,
  COALESCE(es.split_amount, e.amount) as expense_amount
FROM expenses e
LEFT JOIN expense_splits es ON es.expense_id = e.id
WHERE e.is_split = false OR es.id IS NOT NULL
```

---

## 8. CHANGE_ORDERS Table

**Purpose:** Track project scope changes and their impact

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `project_id` | UUID | No | Links to projects | JOIN |
| `change_order_number` | TEXT | No | Unique CO number | Display |
| `status` | ENUM | No | draft, pending, approved, rejected | Filter |
| `date_created` | DATE | No | Creation date | Sort |
| `date_approved` | DATE | No | Approval date | Calc turnaround |
| `client_amount` | NUMERIC | No | Revenue added | Sum |
| `cost_impact` | NUMERIC | No | Cost added | Sum |
| `margin_impact` | NUMERIC | No | Net margin impact | Sum |
| `includes_contingency` | BOOLEAN | No | Uses contingency? | Filter |
| `reason_for_change` | TEXT | No | Why changed | Display |
| `approved_by` | UUID | No | Who approved | Display |

**Impact on Financials:**
- `contracted_amount` += approved change_orders.client_amount
- `costs` += approved change_orders.cost_impact
- `margin` += approved change_orders.margin_impact

---

## 9. CHANGE_ORDER_LINE_ITEMS Table

**Purpose:** Line items within change orders

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `change_order_id` | UUID | No | Links to change_orders | JOIN |
| `category` | ENUM | No | Line item category | Group by |
| `description` | TEXT | No | Item description | Display |
| `quantity` | NUMERIC | No | Quantity | Calc |
| `price_per_unit` | NUMERIC | No | Price per unit | Calc revenue |
| `cost_per_unit` | NUMERIC | No | Cost per unit | Calc cost |
| `total` | NUMERIC | **YES** | qty * price | Sum revenue |
| `total_cost` | NUMERIC | **YES** | qty * cost | Sum cost |

---

## 10. PAYEES Table

**Purpose:** Vendors, subcontractors, and employees

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `payee_name` | TEXT | No | Name | Display, group by |
| `payee_type` | ENUM | No | 'vendor' or 'employee' | Filter, group by |
| `hourly_rate` | NUMERIC | No | Employee hourly rate | Calc labor cost |
| `email` | TEXT | No | Contact email | Display |
| `phone` | TEXT | No | Contact phone | Display |
| `is_active` | BOOLEAN | No | Active status | Filter |

### Relationships
- **Referenced by:** expenses, quotes

---

## 11. CLIENTS Table

**Purpose:** Customer/client records

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `client_name` | TEXT | No | Client name | Display, group by |
| `contact_name` | TEXT | No | Contact person | Display |
| `email` | TEXT | No | Email | Display |
| `phone` | TEXT | No | Phone | Display |
| `address` | TEXT | No | Address | Display |

**Note:** projects.client_name is TEXT (not FK), so join on name:
```sql
JOIN clients c ON c.client_name = p.client_name
```

---

## 12. PROJECT_REVENUES Table

**Purpose:** Track invoices and revenue received

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `project_id` | UUID | No | Links to projects | JOIN |
| `invoice_number` | TEXT | No | Invoice # | Display |
| `amount` | NUMERIC | No | Invoice amount | Sum, display |
| `invoice_date` | DATE | No | Invoice date | Filter, group by |
| `description` | TEXT | No | Invoice description | Display |
| `account_name` | TEXT | No | QB account | Group by |

### Relationships
- **Parent:** projects

---

## 13. RECEIPTS Table

**Purpose:** Receipt images and documentation

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `project_id` | UUID | No | Links to projects | JOIN |
| `user_id` | UUID | No | Who uploaded | Group by |
| `amount` | NUMERIC | No | Receipt amount | Sum |
| `receipt_date` | DATE | No | Receipt date | Filter |
| `approval_status` | ENUM | No | pending, approved, rejected | Filter |
| `image_url` | TEXT | No | Image location | Display link |

---

## 14. ACTIVITY_FEED Table

**Purpose:** Audit trail and activity log

### Key Fields

| Field | Type | Calculated | Description | Report Use |
|-------|------|-----------|-------------|------------|
| `id` | UUID | No | Primary key | JOIN key |
| `activity_type` | TEXT | No | Type of activity | Group by |
| `entity_type` | TEXT | No | What entity changed | Filter |
| `entity_id` | UUID | No | Which record | JOIN |
| `user_id` | UUID | No | Who did it | Group by |
| `project_id` | UUID | No | Related project | JOIN |
| `description` | TEXT | No | Activity description | Display |
| `metadata` | JSONB | No | Additional data | Parse |
| `created_at` | TIMESTAMP | No | When it happened | Filter, group by |

---

## Common Join Patterns for Reporting

### Pattern 1: Project with Current Approved Estimate
```sql
SELECT p.*, e.*
FROM projects p
LEFT JOIN LATERAL (
  SELECT * FROM estimates e
  WHERE e.project_id = p.id
    AND e.status = 'approved'
    AND e.is_current_version = true
  LIMIT 1
) e ON true;
```

### Pattern 2: Project with Expense Totals
```sql
SELECT 
  p.*,
  COALESCE(SUM(COALESCE(es.split_amount, e.amount)), 0) as total_expenses
FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id
LEFT JOIN expense_splits es ON es.expense_id = e.id
WHERE e.is_split = false OR es.id IS NOT NULL
GROUP BY p.id;
```

### Pattern 3: Project with Accepted Quotes
```sql
SELECT 
  p.*,
  COALESCE(SUM(q.total_amount), 0) as accepted_quotes_total,
  COUNT(q.id) as quote_count
FROM projects p
LEFT JOIN quotes q ON q.project_id = p.id AND q.status = 'accepted'
GROUP BY p.id;
```

### Pattern 4: Project with Change Orders
```sql
SELECT 
  p.*,
  COALESCE(SUM(co.client_amount), 0) as co_revenue,
  COALESCE(SUM(co.cost_impact), 0) as co_cost,
  COUNT(co.id) as co_count
FROM projects p
LEFT JOIN change_orders co ON co.project_id = p.id AND co.status = 'approved'
GROUP BY p.id;
```

---

## Reporting Best Practices

### Always Filter System Projects
```sql
WHERE project_number NOT IN ('SYS-000', '000-UNASSIGNED')
```

### Use Calculated Fields from Projects Table
```sql
-- GOOD: Use database-calculated fields
SELECT contracted_amount, current_margin, margin_percentage
FROM projects;

-- BAD: Recalculate in query (slower, might be incorrect)
SELECT 
  (SELECT SUM(...) FROM estimates...) as margin  -- Don't do this!
FROM projects;
```

### Handle Nulls Properly
```sql
SELECT 
  COALESCE(contracted_amount, 0) as revenue,
  COALESCE(current_margin, 0) as margin
FROM projects;
```

### Use Approved Estimates Only
```sql
WHERE status = 'approved' AND is_current_version = true
```

### Date Ranges
```sql
WHERE expense_date BETWEEN '2024-01-01' AND '2024-12-31'
-- Or relative:
WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
```

---

## Index Recommendations

All key foreign keys already indexed. Additional useful indexes for reporting:

```sql
-- For date range queries
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_revenues_date ON project_revenues(invoice_date);

-- For status filtering
CREATE INDEX idx_estimates_status ON estimates(status) WHERE status = 'approved';
CREATE INDEX idx_quotes_status ON quotes(status) WHERE status = 'accepted';

-- For project reporting
CREATE INDEX idx_projects_status_dates ON projects(status, start_date, end_date);
```

---

## Summary

- **14 core tables** for reporting
- **100+ reportable fields**
- **Most calculations done in database** (efficient!)
- **Key table: projects** - has all calculated financial fields
- **Critical for accuracy:** Handle split expenses correctly
- **Best practice:** Use database views for complex aggregations

**Next:** See [REPORTS_BUILDER_COMPREHENSIVE_PLAN.md](./REPORTS_BUILDER_COMPREHENSIVE_PLAN.md) for full implementation plan.

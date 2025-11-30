# Invoice Splitting - Validation & Integration Checklist

## Overview

After implementing the core invoice splitting functionality, use this checklist to validate the database schema, update the KPI Guide, and ensure all reports handle split revenues correctly.

---

## Phase 1: Database Validation (Supabase MCP)

Use Cursor's Supabase MCP to verify the database schema is correct.

### 1.1 Verify `revenue_splits` Table Exists

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'revenue_splits'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid)
- `revenue_id` (uuid)
- `project_id` (uuid)
- `split_amount` (numeric)
- `split_percentage` (numeric)
- `notes` (text)
- `created_by` (uuid)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### 1.2 Verify `is_split` Column on `project_revenues`

```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_revenues' 
  AND column_name = 'is_split';
```

**Expected:** `is_split` column with type `boolean`, default `false`

### 1.3 Verify Foreign Key Constraints

```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'revenue_splits' 
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Expected foreign keys:**
- `revenue_id` → `project_revenues.id`
- `project_id` → `projects.id`

### 1.4 Verify Indexes Exist

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'revenue_splits'
ORDER BY indexname;
```

**Expected indexes:**
- `idx_revenue_splits_revenue_id`
- `idx_revenue_splits_project_id`
- `idx_revenue_splits_created_at`

### 1.5 Verify SYS-000 Project Exists

```sql
SELECT id, project_number, project_name, category
FROM projects
WHERE project_number = 'SYS-000';
```

**Expected:** One row with `project_name = 'Multiple Projects'` and `category = 'system'`

### 1.6 Verify RLS Policies

```sql
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'revenue_splits';
```

**Expected:** At least one policy allowing authenticated users

### 1.7 Test the Helper Function

```sql
-- Get a test project ID first
SELECT id, project_number FROM projects WHERE category = 'construction' LIMIT 1;

-- Then test the function (replace with actual UUID)
SELECT get_project_revenue_total('YOUR-PROJECT-UUID-HERE');
```

---

## Phase 2: Verify Reporting View

### 2.1 Check `reporting.project_financials` View Definition

```sql
SELECT pg_get_viewdef('reporting.project_financials'::regclass, true);
```

**Verify the view includes:**
- `revenue_agg` CTE that handles `revenue_splits`
- LEFT JOIN to `revenue_splits rs ON rs.revenue_id = r.id`
- `COALESCE(rs.split_amount, r.amount)` logic
- Filter: `WHERE (r.is_split = false OR r.is_split IS NULL OR rs.id IS NOT NULL)`

### 2.2 Test View Output

```sql
SELECT 
  project_number,
  project_name,
  total_invoiced,
  invoice_count,
  total_expenses,
  revenue_variance
FROM reporting.project_financials
WHERE total_invoiced > 0
ORDER BY total_invoiced DESC
LIMIT 5;
```

### 2.3 Verify Split Revenue Calculation

Create a test split and verify totals:

```sql
-- This is a read-only verification query
-- Shows how split revenues would be calculated
WITH test_calc AS (
  SELECT 
    COALESCE(rs.project_id, r.project_id) as project_id,
    SUM(COALESCE(rs.split_amount, r.amount)) as revenue
  FROM project_revenues r
  LEFT JOIN revenue_splits rs ON rs.revenue_id = r.id
  WHERE (r.is_split = false OR r.is_split IS NULL OR rs.id IS NOT NULL)
  GROUP BY COALESCE(rs.project_id, r.project_id)
)
SELECT 
  p.project_number,
  p.project_name,
  tc.revenue
FROM test_calc tc
JOIN projects p ON p.id = tc.project_id
WHERE p.category = 'construction'
ORDER BY tc.revenue DESC
LIMIT 10;
```

---

## Phase 3: Update KPI Guide

The KPI Guide (`src/pages/KPIGuide.tsx`) needs to be updated to document revenue split KPIs.

### 3.1 Locate the Revenue KPIs Section

Find the `revenueKPIs` array in `src/pages/KPIGuide.tsx`

### 3.2 Add These New KPI Entries

Add to the `revenueKPIs` array:

```typescript
// Add these entries to the revenueKPIs array in src/pages/KPIGuide.tsx

{ 
  name: 'Revenue Split Amount', 
  source: 'database', 
  field: 'revenue_splits.split_amount', 
  formula: 'Direct DB field - portion allocated to specific project', 
  whereUsed: 'Split revenue calculations, project financial views',
  notes: 'Only exists when parent revenue.is_split = true'
},
{ 
  name: 'Revenue Split Percentage', 
  source: 'database', 
  field: 'revenue_splits.split_percentage', 
  formula: '(split_amount / parent_revenue.amount) × 100', 
  whereUsed: 'Allocation display in RevenueSplitDialog',
  notes: 'Calculated field for display purposes'
},
{ 
  name: 'Is Split (Revenue)', 
  source: 'database', 
  field: 'project_revenues.is_split', 
  formula: 'Boolean flag - true when revenue is allocated across multiple projects', 
  whereUsed: 'RevenueForm, revenue lists, reporting queries',
  notes: 'When true, project_id points to SYS-000'
},
{ 
  name: 'Total Revenue by Project (Split-Aware)', 
  source: 'frontend', 
  field: 'calculateProjectRevenue()', 
  formula: 'SUM(revenues.amount WHERE !is_split) + SUM(revenue_splits.split_amount)', 
  whereUsed: 'Project financial views, dashboards',
  notes: 'Combines direct and split revenues for accurate project totals'
},
```

### 3.3 Update Existing Invoice KPIs

Modify these existing entries to note split handling:

```typescript
// Update the 'Total Invoiced' entry
{ 
  name: 'Total Invoiced', 
  source: 'database', 
  field: 'project_financial_summary.total_invoiced', 
  formula: 'SUM(project_revenues.amount) for non-split + SUM(revenue_splits.split_amount)', 
  whereUsed: 'Project financial summary, dashboards', 
  notes: 'View-calculated aggregate - NOW HANDLES SPLIT REVENUES CORRECTLY'
},
```

---

## Phase 4: Report Builder Validation

### 4.1 Verify Report Field Definitions

Check `src/components/reports/reportFieldDefinitions.ts` (or similar) includes revenue fields that work with splits.

The `total_invoiced` field should already work correctly if it pulls from the updated `reporting.project_financials` view.

### 4.2 Templates to Verify

These report templates use revenue data and should be tested:

| Template | Fields Used | Verification |
|----------|-------------|--------------|
| Project Profitability Analysis | `contracted_amount`, `total_expenses`, `current_margin` | May need `total_invoiced` added |
| Active Projects Dashboard | `contracted_amount`, `total_expenses`, `margin_percentage` | Check if using actual vs estimated revenue |
| Projects Summary | `contracted_amount`, `total_expenses` | Consider adding `total_invoiced` |
| Change Order Impact Analysis | `contracted_amount`, `current_margin` | Verify margin calculation |

### 4.3 Test Report Output

1. Create a split revenue in the UI
2. Run each report template that includes revenue data
3. Verify the project shows correct `total_invoiced` amount
4. Verify the split amounts are allocated to correct projects

---

## Phase 5: Frontend Component Validation

### 5.1 Verify Type Exports

Check that `src/types/revenue.ts` exports all new types:

```typescript
// These should all be exported
export interface RevenueSplit { ... }
export interface CreateRevenueSplitInput { ... }
export interface RevenueSplitFormInput { ... }
export interface RevenueSplitResult { ... }
export interface SplitValidationResult { ... }
```

### 5.2 Verify Utility Function Exports

Check that `src/utils/revenueSplits.ts` exports:

```typescript
export async function createRevenueSplits(...) { ... }
export async function getRevenueSplits(...) { ... }
export async function updateRevenueSplits(...) { ... }
export async function deleteRevenueSplits(...) { ... }
export function validateSplitTotal(...) { ... }
export function calculateSplitPercentage(...) { ... }
export async function calculateProjectRevenue(...) { ... }
export async function calculateTotalRevenues(...) { ... }
```

### 5.3 Verify Component Imports

Check `src/components/RevenueForm.tsx` imports:

```typescript
import { RevenueSplitDialog } from '@/components/RevenueSplitDialog';
```

### 5.4 Test UI Flow

Manual testing checklist:

- [ ] Open RevenueForm for existing invoice
- [ ] Click "Split Invoice" button
- [ ] RevenueSplitDialog opens
- [ ] Add 2+ project allocations
- [ ] Verify validation (amounts must sum to total)
- [ ] Save splits
- [ ] Verify invoice shows as split
- [ ] Verify "Manage Splits" button appears
- [ ] Edit existing splits
- [ ] Remove all splits
- [ ] Verify invoice reverts to single project

---

## Phase 6: Integration Test Queries

Run these queries to verify end-to-end functionality:

### 6.1 Create Test Split Revenue

```sql
-- Step 1: Create a test revenue
INSERT INTO project_revenues (project_id, amount, invoice_date, invoice_number, description)
SELECT id, 1000.00, CURRENT_DATE, 'TEST-SPLIT-001', 'Test split invoice'
FROM projects WHERE category = 'construction' LIMIT 1
RETURNING id;

-- Note the returned ID for next steps
```

### 6.2 Split the Test Revenue

```sql
-- Step 2: Get two construction projects
SELECT id, project_number FROM projects WHERE category = 'construction' LIMIT 2;

-- Step 3: Update revenue to SYS-000 and create splits
-- (Replace UUIDs with actual values)

-- Get SYS-000 ID
SELECT id FROM projects WHERE project_number = 'SYS-000';

-- Update parent revenue
UPDATE project_revenues 
SET project_id = 'SYS-000-UUID', is_split = true 
WHERE id = 'REVENUE-UUID';

-- Create splits
INSERT INTO revenue_splits (revenue_id, project_id, split_amount, split_percentage)
VALUES 
  ('REVENUE-UUID', 'PROJECT-1-UUID', 600.00, 60.0),
  ('REVENUE-UUID', 'PROJECT-2-UUID', 400.00, 40.0);
```

### 6.3 Verify in Reporting View

```sql
-- Check that both projects show their split amounts
SELECT 
  project_number,
  project_name,
  total_invoiced
FROM reporting.project_financials
WHERE project_number IN ('PROJECT-1-NUMBER', 'PROJECT-2-NUMBER');
```

### 6.4 Cleanup Test Data

```sql
-- Remove test data
DELETE FROM revenue_splits WHERE revenue_id = 'REVENUE-UUID';
DELETE FROM project_revenues WHERE invoice_number = 'TEST-SPLIT-001';
```

---

## Summary Checklist

### Database ✓
- [ ] `revenue_splits` table exists with correct schema
- [ ] `is_split` column on `project_revenues`
- [ ] Foreign keys configured
- [ ] Indexes created
- [ ] RLS policies active
- [ ] SYS-000 project exists
- [ ] Helper function works

### Reporting ✓
- [ ] `reporting.project_financials` view updated
- [ ] Split revenues calculated correctly
- [ ] Revenue variance accurate

### KPI Guide ✓
- [ ] New split KPIs documented
- [ ] Existing KPIs updated with split notes

### Reports ✓
- [ ] Field definitions include split-aware fields
- [ ] Templates using revenue data verified
- [ ] Test reports show correct totals

### Frontend ✓
- [ ] Types exported correctly
- [ ] Utility functions exported
- [ ] Components properly imported
- [ ] UI flow works end-to-end

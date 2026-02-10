# Phase 0: Migration Plan Validation — Discovery Prompt

## Context

We have a migration plan to move frontend financial calculations to database-first reads.
Before changing ANY code, we need to validate every assumption against the LIVE codebase
and LIVE Supabase schema. This prompt produces a validation report — NO code changes.

**CRITICAL: This is READ-ONLY. Do not modify any files. Only run grep/read commands and
Supabase MCP queries. Output a single markdown report at the end.**

---

## Step 1: Validate Database Resources Exist

Use Supabase MCP to confirm these objects exist and check their actual column definitions.

### 1a. Check `reporting.project_financials` view exists and list ALL columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'reporting' AND table_name = 'project_financials'
ORDER BY ordinal_position;
```

If the view doesn't exist or the schema `reporting` doesn't exist, that changes everything.
Note which of these columns ARE and ARE NOT present:
- total_expenses
- total_invoiced
- actual_margin
- adjusted_est_margin
- original_est_costs
- adjusted_est_costs
- contracted_amount
- margin_percentage
- invoice_count
- cost_variance
- budget_utilization_percent
- expenses_by_category
- change_order_revenue
- change_order_cost
- change_order_count
- contingency_amount
- contingency_used
- contingency_remaining
- project_type
- category
- status

### 1b. Check `projects` table — list ALL columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;
```

Specifically confirm existence of these trigger-maintained fields:
- contracted_amount
- actual_margin
- adjusted_est_margin
- original_margin
- margin_percentage
- original_est_costs
- adjusted_est_costs
- contingency_remaining
- total_accepted_quotes
- change_order_revenue (does this column exist on projects table?)
- cost_variance (does this column exist on projects table?)
- total_invoiced (does this column exist on projects table?)
- total_expenses (does this column exist on projects table?)
- projected_margin (does this still exist? is it deprecated?)
- current_margin (does this still exist? is it deprecated?)

### 1c. Check `get_profit_analysis_data` RPC exists

```sql
SELECT routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_profit_analysis_data';
```

Also get its parameter list:

```sql
SELECT parameter_name, data_type, parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND specific_name LIKE 'get_profit_analysis_data%';
```

### 1d. Check `weekly_labor_hours` view exists and list columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'weekly_labor_hours'
ORDER BY ordinal_position;
```

### 1e. Check `estimate_financial_summary` view exists and list columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'estimate_financial_summary'
ORDER BY ordinal_position;
```

### 1f. Check `expenses` table for lunch/hours columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'expenses'
AND column_name IN ('lunch_taken', 'lunch_duration_minutes', 'gross_hours',
  'start_time', 'end_time', 'hours', 'is_split', 'is_planned', 'category',
  'approval_status', 'amount', 'project_id', 'payee_id')
ORDER BY ordinal_position;
```

### 1g. List ALL database functions that reference 'margin' or 'financial'

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%margin%' OR routine_name LIKE '%financial%'
     OR routine_name LIKE '%profit%' OR routine_name LIKE '%dashboard%'
     OR routine_name LIKE '%expense%category%')
ORDER BY routine_name;
```

### 1h. List ALL triggers on the projects table

```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'projects'
ORDER BY trigger_name;
```

### 1i. List ALL views (public + reporting schemas)

```sql
SELECT table_schema, table_name
FROM information_schema.views
WHERE table_schema IN ('public', 'reporting')
ORDER BY table_schema, table_name;
```

---

## Step 2: Map ALL Import Sites (Live Grep)

Run every grep command below and capture FULL output with line numbers.

### 2a. Tier 1 — Deprecated file imports

```bash
echo "=== projectFinancials imports ==="
grep -rn "projectFinancials" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== ProjectWithFinancials type usage ==="
grep -rn "ProjectWithFinancials" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== calculateProjectMargin imports ==="
grep -rn "calculateProjectMargin" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== profitCalculations imports ==="
grep -rn "profitCalculations" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== calculateProjectProfit usage ==="
grep -rn "calculateProjectProfit" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== calculateProfitAnalytics usage ==="
grep -rn "calculateProfitAnalytics" src/ --include="*.ts" --include="*.tsx"
```

### 2b. Tier 2 — Expense aggregation

```bash
echo "=== calculateProjectExpenses usage ==="
grep -rn "calculateProjectExpenses" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== getExpenseAmount usage ==="
grep -rn "getExpenseAmount" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== getExpenseSplits usage ==="
grep -rn "getExpenseSplits" src/ --include="*.ts" --include="*.tsx"
```

### 2c. Duplicated functions

```bash
echo "=== calculateHours function definitions and calls ==="
grep -rn "calculateHours" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== calculateNetHours (check if shared util already exists) ==="
grep -rn "calculateNetHours" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== calculateTimeEntryHours usage ==="
grep -rn "calculateTimeEntryHours" src/ --include="*.ts" --include="*.tsx"
```

### 2d. Deprecated field names still in use

```bash
echo "=== current_margin references ==="
grep -rn "current_margin" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== projected_margin references ==="
grep -rn "projected_margin" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== originalContractAmount references ==="
grep -rn "originalContractAmount" src/ --include="*.ts" --include="*.tsx"
```

### 2e. Routing — verify which ProfitAnalysis component is mounted

```bash
echo "=== All ProfitAnalysis references ==="
grep -rn "ProfitAnalysis" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== Router/route config ==="
grep -rn "profit" src/App.tsx src/routes* src/router* --include="*.ts" --include="*.tsx" 2>/dev/null
# Also check for lazy imports
grep -rn "lazy.*Profit" src/ --include="*.ts" --include="*.tsx"
```

### 2f. validateCostNotPrice — where is it used?

```bash
echo "=== validateCostNotPrice usage ==="
grep -rn "validateCostNotPrice" src/ --include="*.ts" --include="*.tsx"
```

### 2g. Change order revenue/costs — what fields does the code actually read?

```bash
echo "=== changeOrderRevenue in components ==="
grep -rn "changeOrderRevenue\|change_order_revenue" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== changeOrderCosts in components ==="
grep -rn "changeOrderCosts\|change_order_cost" src/ --include="*.ts" --include="*.tsx"
```

### 2h. useProfitAnalysisData hook consumers

```bash
echo "=== useProfitAnalysisData consumers ==="
grep -rn "useProfitAnalysisData" src/ --include="*.ts" --include="*.tsx"

echo ""
echo "=== get_profit_analysis_data RPC calls ==="
grep -rn "get_profit_analysis_data" src/ --include="*.ts" --include="*.tsx"
```

### 2i. Dashboard.tsx — how many separate supabase queries?

```bash
echo "=== Dashboard supabase.from() calls ==="
grep -n "supabase" src/pages/Dashboard.tsx | head -50

echo ""
echo "=== Dashboard .reduce() calls ==="
grep -n "\.reduce(" src/pages/Dashboard.tsx
```

### 2j. ProjectExpenseTracker — how many calculateProjectExpenses calls?

```bash
echo "=== ProjectExpenseTracker expense calculation calls ==="
grep -n "calculateProjectExpenses\|calculateProjectSummary" src/components/ProjectExpenseTracker.tsx
```

### 2k. Check if deprecated/ directories already exist

```bash
echo "=== Existing deprecated directories ==="
find src/ -type d -name "deprecated" 2>/dev/null
ls -la src/utils/deprecated/ 2>/dev/null
ls -la src/components/deprecated/ 2>/dev/null
```

### 2l. Check for any existing timeCalculations utility

```bash
echo "=== Existing time calculation utilities ==="
find src/ -name "*timeCalculat*" -o -name "*time-calculat*" -o -name "*hourCalculat*" 2>/dev/null
```

### 2m. Check project type references (is `margin.ts` a types file or utils?)

```bash
echo "=== margin.ts file location ==="
find src/ -name "margin.ts" -o -name "margin.tsx"

echo ""
echo "=== What does margin.ts export? ==="
grep -n "^export" src/types/margin.ts 2>/dev/null
grep -n "^export" src/utils/margin.ts 2>/dev/null
```

---

## Step 3: Verify Component Mount Status

### 3a. Is the OLD components/ProfitAnalysis.tsx mounted anywhere?

```bash
# Check all route definitions
grep -rn "import.*ProfitAnalysis\|import.*profit-analysis" src/App.tsx src/pages/ src/routes/ 2>/dev/null
# Check lazy loading
grep -rn "lazy.*ProfitAnalysis\|lazy.*profit" src/ --include="*.ts" --include="*.tsx"
# Check sidebar/navigation for links
grep -rn "profit-analysis\|profitanalysis" src/components/layout/ src/components/navigation/ src/components/sidebar/ 2>/dev/null
```

### 3b. Is ProjectProfitTable.tsx used by the NEW profit analysis page?

```bash
grep -rn "ProjectProfitTable" src/pages/ src/components/profit-analysis/ --include="*.ts" --include="*.tsx"
```

### 3c. What components does the project detail page actually render?

```bash
# Find the project detail page
find src/ -name "ProjectDetail*" -o -name "ProjectView*" 2>/dev/null
# Check what it imports
grep -n "^import" src/pages/ProjectDetail.tsx 2>/dev/null || grep -n "^import" src/pages/ProjectDetails.tsx 2>/dev/null
```

---

## Step 4: Cross-Reference Type Definitions

### 4a. What does ProjectWithFinancials actually contain?

```bash
echo "=== ProjectWithFinancials interface definition ==="
# Find and print the full interface
sed -n '/interface ProjectWithFinancials/,/^}/p' src/utils/projectFinancials.ts 2>/dev/null
sed -n '/type ProjectWithFinancials/,/^}/p' src/utils/projectFinancials.ts 2>/dev/null
```

### 4b. What does the Project type contain? (check for fields we assume exist)

```bash
echo "=== Project type definition ==="
sed -n '/interface Project/,/^}/p' src/types/project.ts 2>/dev/null | head -80
```

### 4c. ProfitAnalysisProject type — current field names

```bash
echo "=== ProfitAnalysisProject interface ==="
cat src/types/profitAnalysis.ts 2>/dev/null
```

---

## Step 5: Output Validation Report

After running ALL of the above, compile results into a single report with these sections:

### Report Template

```markdown
# Migration Plan Validation Report
Date: [today]

## 1. Database Schema Validation

### reporting.project_financials view
- EXISTS: [yes/no]
- Columns found: [list]
- Columns MISSING from plan assumptions: [list]

### projects table trigger-maintained fields
- Fields confirmed present: [list]
- Fields NOT found (plan assumes they exist): [list]
- Fields found but not in plan: [list]

### RPCs and Functions
- get_profit_analysis_data: [exists/missing], params: [list]
- calculate_project_margins: [exists/missing]
- check_margin_thresholds: [exists/missing]
- Other relevant functions found: [list]

### Views
- weekly_labor_hours: [exists/missing], columns: [list]
- estimate_financial_summary: [exists/missing], columns: [list]
- Other views found: [list]

### Triggers on projects table
- [list all triggers and what they do]

## 2. Import Map

### projectFinancials.ts consumers
[full grep output with line numbers]
- Total files importing: [count]
- Files NOT in migration plan: [list any surprises]

### ProjectWithFinancials type consumers
[full grep output]
- Total files using this type: [count]

### calculateProjectMargin consumers
[full grep output]
- Matches plan? [yes/no, explain differences]

### profitCalculations.ts consumers
[full grep output]
- Old ProfitAnalysis component mounted? [yes/no, evidence]

### calculateProjectExpenses consumers
[full grep output]
- Total call sites: [count]
- N+1 in ProjectExpenseTracker confirmed? [yes/no]

### calculateHours duplicates
[full grep output]
- Number of independent definitions: [count]
- Files: [list]

## 3. Routing Verification
- /profit-analysis route points to: [which file]
- Old components/ProfitAnalysis.tsx: [mounted/orphaned]
- ProjectProfitTable.tsx: [used by new page / orphaned]

## 4. Field Name Audit
- current_margin references: [count, files]
- projected_margin references: [count, files]
- Which are in types vs runtime code?

## 5. Dashboard Query Count
- Total supabase.from() calls in Dashboard.tsx: [count]
- Total .reduce() aggregations: [count]
- Queries that could be replaced by RPC: [list]

## 6. Surprises / Plan Corrections Needed
- [List anything that contradicts the migration plan]
- [List any new files/imports not accounted for]
- [List any DB columns/views that don't exist but plan assumes they do]
- [List any deprecated files that are ALREADY moved to deprecated/]

## 7. Risk Assessment
For each phase, based on actual findings:
- Phase 1 (calculateProjectMargin): [safe/risky, why]
- Phase 2 (old ProfitAnalysis): [safe/risky, why]
- Phase 3 (projectFinancials.ts): [safe/risky, why]
- Phase 4 (calculateHours): [safe/risky, why]
- Phase 5 (Dashboard queries): [safe/risky, why]
- Phase 6 (N+1 expense fix): [safe/risky, why]
- Phase 7 (cleanup): [safe/risky, why]
```

---

## REMEMBER: This entire prompt is READ-ONLY.

Do not create, modify, or delete any files. Do not run any migrations.
Only run SELECT queries against Supabase and grep/find/cat against the codebase.
Output the validation report as a single markdown file.

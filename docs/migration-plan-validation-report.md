# Migration Plan Validation Report

Date: 2026-02-09

## 1. Database Schema Validation

### reporting.project_financials view

- **EXISTS:** yes
- **Columns found:** id, project_number, project_name, client_name, status, category, job_type, start_date, end_date, contracted_amount, total_invoiced, original_est_costs, adjusted_est_costs, total_expenses, original_margin, adjusted_est_margin, projected_margin, actual_margin, margin_percentage, current_margin, contingency_amount, contingency_remaining, cost_variance, cost_variance_percent, budget_utilization_percent, revenue_variance, adjusted_est_margin_percent, actual_margin_percent, invoice_count, expense_count, change_order_count, accepted_quote_count, change_order_revenue, change_order_cost, created_at, updated_at
- **Columns MISSING from plan assumptions:** contingency_used, expenses_by_category, project_type (view has `category` and `status` but not a separate `project_type` column)

### projects table trigger-maintained fields

- **Fields confirmed present on projects:** contracted_amount, total_accepted_quotes, current_margin, margin_percentage, contingency_remaining, original_margin, projected_margin, adjusted_est_costs, original_est_costs, actual_margin, adjusted_est_margin, contingency_amount
- **Fields NOT found on projects table (plan may assume they exist here):** change_order_revenue, cost_variance, total_invoiced, total_expenses (these exist on `reporting.project_financials` and in RPC output only)
- **Fields found but not in plan:** minimum_margin_threshold, target_margin, estimated_hours, actual_hours

Financial fields on `projects` are maintained by triggers on **child tables** (change_orders, estimate_line_items, estimates, expenses, project_revenues, quote_line_items, quotes, revenue_splits) that call `trigger_calculate_project_margins()` and `update_project_financial_totals()`. There are **no** margin/financial triggers directly on the `projects` table.

### RPCs and Functions

- **get_profit_analysis_data:** exists (FUNCTION, returns record). Params: IN `status_filter` (ARRAY); OUT id, project_number, project_name, client_name, status, job_type, start_date, end_date, contracted_amount, total_invoiced, original_est_costs, adjusted_est_costs, total_expenses, original_margin, adjusted_est_margin, projected_margin, actual_margin, margin_percentage, current_margin, contingency_amount, contingency_remaining, contingency_used, cost_variance, cost_variance_percent, budget_utilization_percent, invoice_count, change_order_count, change_order_revenue, change_order_cost, accepted_quote_count, total_accepted_quotes, expenses_by_category
- **calculate_project_margins:** exists (FUNCTION)
- **check_margin_thresholds:** exists (FUNCTION)
- **Other relevant functions found:** calculate_change_order_margin_impact, get_project_financial_summary, safe_cast_to_expense_category, trigger_calculate_project_margins, update_project_financial_totals

### Views

- **weekly_labor_hours:** exists (in both public and reporting schemas). Columns include employee_number, payee_id, employee_name, week_start_sunday, week_end_saturday, hourly_rate, total_hours, gross_hours, total_cost, entry_count, approved_entries, pending_entries, rejected_entries (result set had duplicate column names across schemas)
- **estimate_financial_summary:** exists. Columns: estimate_id, project_id, estimate_number, status, contingency_percent, subtotal, total_estimated_cost, estimated_gross_profit, total_labor_hours, total_labor_cushion, total_labor_actual_cost, total_labor_billing_cost, total_labor_client_price, cushion_hours_capacity, total_labor_capacity, schedule_buffer_percent, max_gross_profit_potential, estimated_gross_margin_percent, max_potential_margin_percent, contingency_amount, total_with_contingency, created_at, updated_at
- **Other views found:** public: estimate_financial_summary, weekly_labor_hours; reporting: estimate_line_items_quote_status, estimate_quote_status_summary, internal_labor_hours_by_project, project_financials, training_status, weekly_labor_hours

### Triggers on projects table

- set_project_sequence_trigger (INSERT, UPDATE) → set_project_sequence_number()
- trigger_log_project_status_activity (UPDATE) → log_project_status_activity()
- update_projects_updated_at (UPDATE) → update_updated_at_column()

No margin/financial triggers on `projects`; margin/financial logic runs via triggers on change_orders, estimate_line_items, estimates, expenses, project_revenues, quote_line_items, quotes, revenue_splits.

### expenses table (selected columns)

- **Present:** project_id, payee_id, category, amount, is_planned, approval_status, start_time, end_time, is_split, lunch_taken, lunch_duration_minutes, gross_hours
- **Not in result (query filtered by name):** `hours` — table uses `gross_hours`; no column named `hours` in the filtered list

---

## 2. Import Map

### projectFinancials.ts consumers

- src/hooks/useProjectData.tsx (import ProjectWithFinancials; uses projectFinancials variable from RPC response; total_invoiced/total_expenses from projectFinancials)
- src/components/ProjectDetailView.tsx (import ProjectWithFinancials)
- src/pages/Projects.tsx (import ProjectWithFinancials)
- src/components/ProjectsTableView.tsx (import ProjectWithFinancials)
- src/lib/kpi-definitions/deprecated-kpis.ts (references projectFinancials.ts as deprecated)
- src/utils/projectFinancials.ts (defines ProjectWithFinancials, calculateProjectFinancials, and dynamic import of calculateProjectExpenses)

**Total files importing or referencing projectFinancials/ProjectWithFinancials:** 5 (excluding the deprecated-kpis doc and the defining file). **Files NOT in migration plan:** deprecated-kpis.ts is documentation only; no unexpected runtime consumers.

### ProjectWithFinancials type consumers

- useProjectData.tsx, ProjectDetailView.tsx, Projects.tsx, ProjectsTableView.tsx, projectFinancials.ts (definition). Total files using type: 5.

### calculateProjectMargin consumers

- src/components/MarginDashboard.tsx (import and call)
- src/types/margin.ts (definition, deprecated)
- src/components/QuoteAcceptanceModal.tsx (import and call)

**Matches plan:** yes — only MarginDashboard and QuoteAcceptanceModal call it; margin.ts is the definition.

### profitCalculations.ts consumers

- src/components/ProfitAnalysis.tsx (imports calculateProfitAnalytics, calculateProjectProfit)
- src/utils/profitCalculations.ts (definitions)

**Old ProfitAnalysis component mounted?** No. Route `profit-analysis` uses `pages/ProfitAnalysis.tsx` (lazy from App.tsx). `components/ProfitAnalysis.tsx` is the OLD component (uses profitCalculations) and is **not** mounted anywhere.

### calculateProjectExpenses consumers

- src/components/ExpensesList.tsx (1 call)
- src/utils/expenseSplits.ts (definition)
- src/lib/kpi-definitions/expense-kpis.ts (reference in field description)
- src/utils/projectFinancials.ts (2 dynamic imports + calls)
- src/hooks/useLineItemControl.ts (import + 1 call)
- src/utils/profitCalculations.ts (dynamic import + 1 call)
- src/components/ProjectExpenseTracker.tsx (import + many calls)

**Total call sites:** 6 files with actual calls; ProjectExpenseTracker has 13+ calls (3 in calculateProjectSummary + 10 in summary rows). **N+1 in ProjectExpenseTracker confirmed:** yes — multiple per-estimate calculateProjectExpenses calls in one component.

### calculateHours duplicates

- src/components/TimeEntryExportModal.tsx: local function `calculateHours` (line 85) + usage (146)
- src/hooks/useTimeEntries.ts: local function `calculateHours` (line 211) + usages (81, 179, 190)

**Number of independent definitions:** 2 (both local, not a shared util). **Files:** TimeEntryExportModal.tsx, useTimeEntries.ts.

### calculateNetHours

- src/components/time-tracker/MobileTimeTracker.tsx only — local function `calculateNetHours` (line 989), used at 1605. No shared util named calculateNetHours.

### calculateTimeEntryHours usage

- MobileTimeTracker.tsx (import + 2 uses), timeEntryCalculations.ts (definition), EditTimeEntryDialog.tsx (import + use), useTimeEntryForm.ts (import + 2 uses). Single shared definition in utils/timeEntryCalculations.ts.

### getExpenseAmount

- Only in ExpenseDashboard.tsx as a local function (line 63); not from a shared util. Multiple reduce calls use it.

### getExpenseSplits / getExpenseSplitsBatch

- getExpenseSplits: expenseSplits.ts (definition), ExpenseSplitDialog.tsx, expenseSplits.ts internal (2x), useLineItemControl.ts (import only)
- getExpenseSplitsBatch: ExpensesList.tsx, useVarianceCalculation.ts, expenseSplits.ts (definition)

### validateCostNotPrice

- Used only inside src/utils/projectFinancials.ts (definition + 6 call sites). Not exported; no other files use it.

### change_order_revenue / changeOrderRevenue

- Read in: ProjectOperationalDashboard, useProjectData, ProjectFinancialReconciliation, Projects (pages), ProjectsTableView, ProjectsList, ProjectOverviewCompact, projectFinancials (utils), profit-analysis (ProjectCostBreakdown), types (profitAnalysis, revenue), report builder, KPI definitions. RPC and view provide snake_case; ProjectWithFinancials and some components use camelCase (changeOrderRevenue).

### change_order_cost(s) / changeOrderCosts

- Same pattern as change order revenue; code uses both snake_case (RPC/reconciliation) and camelCase (ProjectWithFinancials, list/table views).

### useProfitAnalysisData consumers

- src/pages/ProfitAnalysis.tsx (only page that calls the hook)
- src/components/profit-analysis/ProfitSummaryCards.tsx (imports calculateSummaryTotals from same hooks file, not the hook itself)
- src/components/profit-analysis/hooks/useProfitAnalysisData.ts (definition)

### get_profit_analysis_data RPC calls

- src/hooks/useProjectData.tsx (line 166)
- src/pages/Projects.tsx (line 113)
- src/components/profit-analysis/hooks/useProfitAnalysisData.ts (line 12)
- Supabase types (generated)

### Deprecated directories

- No `src/utils/deprecated/` or `src/components/deprecated/` directories. There is `src/_archived/` (unrelated). **No existing deprecated/ dirs for migration.**

### Time calculation utilities

- No files named *timeCalculat*, *time-calculat*, or *hourCalculat*. There is `src/utils/timeEntryCalculations.ts` (calculateTimeEntryHours, etc.) and labor/time logic in other utils.

### margin.ts location and exports

- **Location:** src/types/margin.ts only (no src/utils/margin.ts).
- **Exports:** ProjectMargin interface, calculateProjectMargin (deprecated), isMarginAtRisk, getMarginEfficiency, getMarginStatusLevel, getContingencyUtilization, formatMarginCurrency.

---

## 3. Routing Verification

- **/profit-analysis route points to:** `src/pages/ProfitAnalysis.tsx` (App.tsx: `const ProfitAnalysis = lazy(() => import("./pages/ProfitAnalysis"));` and `<Route path="profit-analysis" element={<LazyRoute component={ProfitAnalysis} />} />`).
- **Old components/ProfitAnalysis.tsx:** Orphaned. Not imported by any route or layout; only defines the component that uses profitCalculations/calculateProjectProfit/calculateProfitAnalytics.
- **ProjectProfitTable.tsx:** Orphaned. Not imported by pages/ or components/profit-analysis/. Used only by its own file; no references in route tree or new profit analysis page.

---

## 4. Field Name Audit

- **current_margin references:** Many. Types: src/types/project.ts, supabase types, margin.ts (ProjectMargin, calculateProjectMargin). Components: ProjectProfitMargin, MarginDashboard, WorkOrdersTableView, WorkOrders, ProjectFinancialReconciliation, ProjectExportModal, profit-analysis/ProjectCostBreakdown, ProfitAnalysis (old), QuoteAcceptanceModal. KPI/docs: business-rules, KPIGuide, project-kpis, deprecated-kpis, ai-context-generator, few-shot-examples, semantic-mappings. **Count:** 20+ files; mix of types, runtime UI, and KPI/docs.
- **projected_margin references:** Types: project.ts, supabase types. Components: ProjectOperationalDashboard, WorkOrdersTableView, ProjectsList, ProjectsTableView, projectFinancials, Dashboard, profit-analysis (ProjectCostBreakdown, MarginAnalysisTable, useProfitAnalysisData), ProjectOverviewCompact, marginValidation, SimpleReportBuilder. KPI/docs: project-kpis, deprecated-kpis, work-order-kpis, ai-context-generator. **Count:** 20+ files; same mix.
- **Which are in types vs runtime:** Both field names appear in types (project.ts, profitAnalysis.ts, margin.ts, revenue.ts, supabase types) and in runtime code (components and pages). KPI and doc references are metadata only.

---

## 5. Dashboard Query Count

- **Total supabase.* calls in Dashboard.tsx:** 18+ (one import, one channel, one removeChannel, then multiple `await supabase...` in loadDashboardData and loadPendingApprovals — .from(), .rpc(), .channel()). Distinct data fetches: projects (with status filter), work orders (two queries), revenues (per WO in loop), count queries (time entries, receipts, change orders, quotes, estimates, overdue, on hold), in-progress WOs, expenses (inside loop per WO), active projects, completed projects, revenues (per project in loop).
- **Total .reduce() aggregations:** 11 (lines 138, 176, 204, 205, 206, 213, 238, 324, 358, 360, 362, 385, 405).
- **Queries that could be replaced by RPC:** Project status counts and work order status counts could be a single RPC. Financial rollups (contract value, estimated costs, projected margin, completed value, invoiced) could come from reporting.project_financials or a dashboard RPC instead of fetching projects/WOs and reducing in the client. Per-WO revenue and per-project revenue fetches in loops are strong candidates for batch RPC or view-based reads.

---

## 6. Surprises / Plan Corrections Needed

- **reporting.project_financials** does not have `contingency_used` or `expenses_by_category`; **get_profit_analysis_data** RPC does return them (contingency_used, expenses_by_category). So profit-analysis page can rely on RPC; any code expecting these on the view must use RPC or a different source.
- **projects** table does not store total_invoiced, total_expenses, change_order_revenue, or cost_variance; those live on the view and RPC. Migration should not assume these columns on projects.
- **Financial triggers** are on child tables (estimates, expenses, quotes, change_orders, etc.), not on projects. Plan wording “trigger-maintained fields on projects” is correct for the stored values, but the triggers themselves are on related tables.
- **Old ProfitAnalysis** (components/ProfitAnalysis.tsx) is not mounted; only pages/ProfitAnalysis.tsx is. So deprecating the old component does not affect routing but does affect any future refactor that might import it.
- **ProjectProfitTable** is unused by the new profit-analysis page; the new page uses ProfitSummaryCards, BudgetHealthTable, MarginAnalysisTable, CostAnalysisTable, ProjectCostBreakdown. ProjectProfitTable can be treated as dead code for the migration.
- **No src/utils/deprecated or src/components/deprecated** directories exist yet; plan can create them when moving files.
- **Expenses table:** column is `gross_hours`, not `hours`; any code or docs assuming `expenses.hours` should use `gross_hours`.
- **calculateProjectExpenses** is used heavily in ProjectExpenseTracker (13+ calls per load); N+1 replacement (e.g. batch or DB-side aggregation) is important for Phase 6.
- **Two local calculateHours** implementations (TimeEntryExportModal, useTimeEntries); no single shared calculateHours util. Plan’s “calculateHours duplicates” is validated.

---

## 7. Risk Assessment

- **Phase 1 (calculateProjectMargin):** **Safe.** Only two call sites (MarginDashboard, QuoteAcceptanceModal); definition is in types/margin.ts and already deprecated. Replace with project.actual_margin / project.adjusted_est_margin (and current_margin where appropriate) from DB.

- **Phase 2 (old ProfitAnalysis):** **Safe.** components/ProfitAnalysis.tsx is not mounted; route uses pages/ProfitAnalysis.tsx and useProfitAnalysisData (RPC). Removing or archiving the old component has no routing impact. Only risk is accidental import elsewhere; grep shows no other imports.

- **Phase 3 (projectFinancials.ts):** **Risky.** ProjectWithFinancials is used in useProjectData, ProjectDetailView, Projects, ProjectsTableView; calculateProjectFinancials (and internal use of calculateProjectExpenses) is used to “enrich” projects. Migration must either switch these to reporting.project_financials or get_profit_analysis_data and map to a slimmer type, or keep a thin adapter that only maps DB fields. Many computed fields (originalContractAmount, changeOrderRevenue, etc.) are derived in projectFinancials; some are available from RPC/view, so mapping and testing per screen is required.

- **Phase 4 (calculateHours):** **Safe.** Two local implementations only; no shared util. Consolidating into timeEntryCalculations (or one chosen place) and updating TimeEntryExportModal and useTimeEntries is straightforward.

- **Phase 5 (Dashboard queries):** **Risky.** Many .from() and .reduce() calls; several fetches are in loops (revenues per WO, per project). Replacing with one or more RPCs or view reads will require schema/API design and regression testing. Performance gain is high.

- **Phase 6 (N+1 expense fix):** **Risky but high value.** ProjectExpenseTracker calls calculateProjectExpenses many times per estimate; replacing with batch or DB aggregation (e.g. get_profit_analysis_data-style or expense summary RPC) touches data shape and component logic. Confirmed N+1 pattern.

- **Phase 7 (cleanup):** **Safe.** Deprecated-kpis and doc references to current_margin/projected_margin can be updated after runtime is migrated. Orphaned components (ProfitAnalysis.tsx, ProjectProfitTable.tsx) can be moved to deprecated/ or removed after confirming no dynamic imports.

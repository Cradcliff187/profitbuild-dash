# Post-Implementation Validation Prompt
**Date:** February 3, 2026
**Usage:** Copy this entire prompt into Claude after all 3 phases are complete.
**Purpose:** Full audit of every change across Phases 1-3 against the implementation specs.

---

```
TASK: Full post-implementation audit of the Project Details Area Enhancement (Phases 1-3).
You are validating that all changes were implemented correctly, nothing was missed, and 
nothing was broken. This is a read-only audit — do not make changes, only report findings.

IMPORTANT CONTEXT:
- QuickBooks handles all bookkeeping. RCG Work = project operations only.
- Receipts are documentation only — they do NOT feed into financial calculations.
- projectFinancials.ts is DEPRECATED — no new code should import it.
- Database-first approach: 31 calculations in PostgreSQL triggers/functions.
- All email edge functions (Resend) must be completely untouched.

===================================================================
SECTION 1: FILES THAT MUST EXIST
===================================================================

Verify these files exist and are not empty:

NEW FILES (created during implementation):
□ src/utils/financialColors.ts (Phase 1)
□ src/components/profit-analysis/BudgetHealthTable.tsx (Phase 3)

MODIFIED FILES (should have changes):
□ src/components/ProjectsList.tsx (Phase 1 — metricsColumns prop)
□ src/components/ProjectOperationalDashboard.tsx (Phase 2 — major redesign)
□ src/components/MarginDashboard.tsx (Phase 3 — color consolidation)
□ src/components/ProjectProfitMargin.tsx (Phase 3 — color consolidation)
□ src/pages/ProfitAnalysis.tsx (Phase 3 — tab replacement + MobileResponsiveTabs)
□ src/components/profit-analysis/index.ts (Phase 3 — BudgetHealthTable export)

===================================================================
SECTION 2: FILES THAT MUST BE UNTOUCHED
===================================================================

Run: git diff --name-only

The following files/directories MUST NOT appear in the diff. If any do, flag as CRITICAL:

□ supabase/functions/send-auth-email/
□ supabase/functions/send-receipt-notification/
□ supabase/functions/send-training-notification/
□ supabase/functions/admin-reset-password/
□ supabase/functions/ai-report-assistant/ (except if kpi-context was regenerated — note only)
□ supabase/migrations/ (zero new migration files)
□ src/utils/projectDashboard.ts (calculation logic)
□ src/utils/thresholdUtils.ts (kept as-is)
□ src/components/ui/mobile-list-card.tsx (used as-is)
□ src/components/ui/mobile-responsive-tabs.tsx (used as-is)
□ src/components/ProjectNotesTimeline.tsx
□ src/components/profit-analysis/BillingProgressTable.tsx (kept, just not default tab)
□ src/components/profit-analysis/MarginAnalysisTable.tsx
□ src/components/profit-analysis/CostAnalysisTable.tsx
□ src/components/profit-analysis/ProjectCostBreakdown.tsx
□ src/components/profit-analysis/ProfitSummaryCards.tsx (unless density-only CSS changes)
□ src/lib/kpi-definitions/ (reference only, never modified)

Also verify:
□ No new files in supabase/migrations/
□ No new files in supabase/functions/
□ projectFinancials.ts is NOT imported in any new or modified file
  Run: grep -r "projectFinancials" src/ --include="*.ts" --include="*.tsx" | grep -v "DEPRECATED" | grep -v ".d.ts"

===================================================================
SECTION 3: PHASE 1 VALIDATION — Quick Wins
===================================================================

### 3.1 metricsColumns={3} in ProjectsList

Open: src/components/ProjectsList.tsx

□ Find the MobileListCard render inside the mobile project mapping
□ Verify metricsColumns={3} prop is present
□ Verify the metrics array still returns exactly 3 items from getStatusKPIs():
  - metrics[0] = { label: primary.label1, value: formatCurrency(primary.value1) }
  - metrics[1] = { label: primary.label2, value: formatCurrency(primary.value2) }
  - metrics[2] = { label: primary.label3, value: ... } (percent or currency based on isPercent3)
□ Verify getStatusKPIs() function is UNCHANGED — diff it against the original:
  - case 'estimating' → Contract/Estimate, Est. Costs, Margin %
  - case 'approved' → Contract, Est. Costs, Margin %
  - case 'in_progress' → Contract, Est. Costs, Margin % + secondary (budget, contingency)
  - case 'complete' → Contract/Total Invoiced, Actual Costs, Actual Margin % + secondary (variance)
  - case 'on_hold' → Contract, Spent, Margin %
  - case 'cancelled' → Contract, Spent, Loss (or Margin if 3C was applied)
□ Verify WorkOrdersTableView.tsx was NOT modified (separate card implementation)

### 3.2 financialColors.ts

Open: src/utils/financialColors.ts

□ File exists and exports ALL of these functions:
  - getFinancialHealth(value, warningThreshold, criticalThreshold, invertDirection?)
    Returns: 'healthy' | 'warning' | 'critical' | 'neutral'
  - getFinancialHealthColor(status) → Tailwind text class string
  - getFinancialHealthHSL(status) → HSL string for chart usage
  - getMarginColor(marginPct, minThreshold?, target?) → text class
  - getBudgetUtilizationColor(utilizationPct) → text class
  - getContingencyColor(remainingPct) → text class
  - getCostVarianceColor(variancePct) → text class

□ Verify threshold alignment with src/lib/kpi-definitions/business-benchmarks.ts:
  - Margin: warning=10%, critical=5% (or per benchmark: healthy min=15, warning=10, critical=5)
  - Budget utilization: warning around 80-85%, critical around 95%+
  - Contingency remaining: warning=40% remaining, critical=20% remaining
  - Cost variance: warning=10%, critical=20%

□ Verify the function does NOT import from or modify thresholdUtils.ts
□ Verify invertDirection parameter works correctly:
  - false (default): higher value = healthier (e.g., margin %)
  - true: higher value = worse (e.g., budget utilization %)

### 3.3 Status-Aware Rendering QA

Verify the following status → metric mapping is correct by reading getStatusKPIs():

| Status | Label 1 | Label 2 | Label 3 | isPercent3 | Secondary |
|--------|---------|---------|---------|------------|-----------|
| estimating (no contract) | Estimate | Est. Costs | Margin | true | none |
| estimating (with contract) | Contract | Adj. Est. Costs | Adj. Est. Margin | true | none |
| approved | Contract | Est. Costs | Margin | true | none |
| in_progress | Contract | Est. Costs | Margin | true | budgetUtilization, contingencyRemaining |
| complete | Contract or Total Invoiced | Actual Costs | Margin | true | variance vs original |
| on_hold | Contract | Spent | Margin | true | none |
| cancelled | Contract | Spent | Loss or Margin | varies | none |

□ Every status has exactly 3 primary metrics
□ Secondary data is only present for in_progress and complete
□ Complete uses contractValue > 0 check to decide label1

===================================================================
SECTION 4: PHASE 2 VALIDATION — Overview Redesign
===================================================================

Open: src/components/ProjectOperationalDashboard.tsx

### 4.1 Enhanced Needs Attention

□ needsAttention useMemo includes ALL of these items:
  EXISTING (must still be present):
  - Pending time entries (pendingTimeEntries > 0)
  - Pending receipts (pendingReceipts > 0)
  - Pending change orders (changeOrders with status 'pending')
  - Expiring quotes (via getExpiringQuotes or similar)

  NEW (added in Phase 2):
  - DNE warning: fires when do_not_exceed > 0 AND total_expenses/do_not_exceed >= 80%
  - Contingency warning: fires when contingency_amount > 0 AND contingency_remaining/contingency_amount <= 25%
  - Data freshness — expense: fires for approved/in_progress when no expenses in 14+ days
  - Data freshness — time: fires for approved/in_progress when no time entries in 7+ days

□ DNE warning shows remaining amount and percentage
□ DNE warning color: red if >= 95%, orange if >= 80%
□ Contingency warning shows remaining amount
□ Contingency warning color: red if <= 10% remaining, orange if <= 25%
□ Data freshness warnings only fire for ['approved', 'in_progress'] statuses
□ Data freshness queries use expense_date (NOT created_at)

### 4.2 Data Freshness Implementation

□ New state exists: something like dataFreshness or lastExpenseDays/lastTimeDays
□ useEffect queries Supabase for:
  a) Last expense_date WHERE project_id AND category != 'labor_internal' (non-labor expenses)
  b) Last expense_date WHERE project_id AND category = 'labor_internal' (time entries)
□ Only fires for approved/in_progress statuses (has a status guard)
□ Calculates days since last entry using expense_date
□ dataFreshness is in the needsAttention useMemo dependency array
□ No query runs for estimating/complete/cancelled/on_hold projects

### 4.3 Contract Narrative Section

□ Section exists with FileSignature icon (or similar contract icon)
□ Calculates:
  - currentContract = project.contracted_amount ?? 0
  - coRevenue = sum of approved change orders' client_amount
  - baseContract = currentContract - coRevenue
□ Math check: baseContract + coRevenue ALWAYS equals currentContract
□ Renders:
  - "Original Contract" → formatCurrency(baseContract)
  - If COs exist: "+ Change Orders (N)" → formatCurrency(coRevenue)
  - Separator between original and current
  - "Current Contract" → formatCurrency(currentContract) in bold
□ Hidden when contracted_amount is 0 or null (estimating projects without contract)
□ Does NOT show: invoicing progress, % billed, billing lag, AR/AP, or any QuickBooks metrics

### 4.4 Labor Section

□ Section exists showing estimated vs actual hours
□ Only renders when BOTH conditions met:
  - Status is 'approved' or 'in_progress'
  - estimated_hours > 0
□ Shows: Estimated Hours, Actual Hours, Remaining Hours (estimated - actual)
□ Progress bar: actual / estimated * 100 (capped at 100%)
□ Data freshness line showing last time entry date (from dataFreshness state)
□ Uses project.estimated_hours and project.actual_hours (database fields)
□ Does NOT do its own hour calculation — uses DB values directly

### 4.5 Enhanced Budget Status

□ Existing budget progress bar still present and working
□ NEW contingency sub-section (only when contingency_amount > 0):
  - Shows contingency remaining amount
  - Progress bar: remaining / total * 100
  - Color from getContingencyColor() (financialColors.ts)
  - Visually separated from main budget bar (border-t or similar)

### 4.6 Section Render Order

□ Verify sections appear in this order (top to bottom):
  1. Needs Attention (if any items exist)
  2. Contract Narrative (if contract exists)
  3. Financial Summary grid (existing — Contract, Costs, Margin in grid)
  4. Margin Status (existing — threshold display)
  5. Budget Status + Contingency (existing + enhanced)
  6. Labor + Schedule (side by side on desktop if labor exists, stacked on mobile)
  7. Change Order Summary (existing)
  8. Quick Stats (existing)
  9. Project Notes Timeline (existing)

□ If Labor section doesn't render (no estimated_hours), Schedule takes full width
□ Needs Attention renders nothing/hides when no items exist (no empty card)

### 4.7 Status-Specific Overview Rendering

Verify the overview renders correctly for ALL statuses:

| Status | Contract Narrative | Labor | Budget + Contingency | Data Freshness |
|--------|-------------------|-------|---------------------|----------------|
| estimating | Hidden (no contract) | Hidden | Hidden | Hidden |
| approved | Visible | Visible (if est_hours > 0) | Visible | Active |
| in_progress | Visible | Visible (if est_hours > 0) | Visible | Active |
| complete | Visible | Hidden | Visible (read-only) | Hidden |
| on_hold | Visible | Hidden | Visible | Hidden |
| cancelled | Visible (if contract existed) | Hidden | Hidden | Hidden |

### 4.8 Imports Added

□ FileSignature from lucide-react
□ Separator from @/components/ui/separator
□ Progress from @/components/ui/progress (may already be imported)
□ getContingencyColor (or equivalent) from @/utils/financialColors

===================================================================
SECTION 5: PHASE 3 VALIDATION — Design System + Profit Analysis
===================================================================

### 5.1 Color Consolidation — MarginDashboard.tsx

Open: src/components/MarginDashboard.tsx

□ Inline getMarginColorClass function is REMOVED (not just unused — deleted)
□ Inline getContingencyUsageColorClass function is REMOVED
□ Imports from '@/utils/financialColors' are present
□ All margin percentage colors now use getMarginColor() or equivalent
□ All contingency colors now use getContingencyColor() or equivalent
□ Visual output is identical to before (same colors at same thresholds)
□ No other logic or data fetching was changed

### 5.2 Color Consolidation — ProjectProfitMargin.tsx

Open: src/components/ProjectProfitMargin.tsx

□ Threshold-based color patterns use financialColors.ts functions
□ Simple binary profit/loss (positive=green, negative=red) may remain inline (acceptable)
□ Card density: CardContent has appropriate padding (p-3 or similar)
□ Financial values use font-mono styling
□ No calculation logic was changed
□ No component props or exports were changed

### 5.3 BudgetHealthTable Component

Open: src/components/profit-analysis/BudgetHealthTable.tsx

□ File exists and is properly typed
□ Accepts props: { data: ProfitAnalysisProject[], isLoading: boolean, onProjectSelect?: (id: string) => void }
□ Table columns include:
  - Project (name + number)
  - Budget (adjusted_est_costs)
  - Spent (total_expenses)
  - Remaining (budget - spent)
  - Utilization (progress bar + percentage)
  - Variance (cost_variance_percent with sign)
  - Contingency (remaining amount or "—")
□ Sorted by budget utilization descending (highest/worst first)
□ Uses colors from financialColors.ts:
  - getBudgetUtilizationColor for utilization %
  - getCostVarianceColor for variance %
  - getContingencyColor for contingency remaining
□ Rows are clickable and call onProjectSelect with project.id
□ Financial values use font-mono styling
□ Negative remaining values show in red

### 5.4 Barrel Export Updated

Open: src/components/profit-analysis/index.ts

□ BudgetHealthTable is exported
□ BillingProgressTable is STILL exported (not removed)
□ All other exports unchanged (MarginAnalysisTable, CostAnalysisTable, ProjectCostBreakdown, etc.)

### 5.5 ProfitAnalysis Tab Replacement

Open: src/pages/ProfitAnalysis.tsx

□ "Billing Progress" tab is GONE — replaced with "Budget Health"
□ Default tab is 'budget' (not 'billing')
□ BudgetHealthTable component is rendered in the budget tab
□ BillingProgressTable is NOT imported (or if imported, not rendered in any tab)
□ MarginAnalysisTable still renders in 'margins' tab
□ CostAnalysisTable still renders in 'costs' tab

### 5.6 MobileResponsiveTabs Migration

Open: src/pages/ProfitAnalysis.tsx

□ MobileResponsiveTabs is imported from '@/components/ui/mobile-responsive-tabs'
□ Custom mobile Select dropdown for tabs is REMOVED
□ Custom desktop TabsList is REMOVED
□ Separate TabsContent blocks are REMOVED
□ tabs array is defined with { value, label, content } for each tab
□ <MobileResponsiveTabs tabs={tabs} defaultTab="budget" /> is rendered
□ maxMobileTabs is set (3 or omitted since there are only 3 tabs)
□ The activeTab useState is REMOVED (MobileResponsiveTabs manages its own state)
□ The tabOptions array is REMOVED

STILL PRESENT (must not be removed):
□ Status filter <Select> at top of page (filters by project status)
□ ProfitSummaryCards component
□ ProjectCostBreakdown component (responds to selectedProjectId)
□ selectedProjectId state and setSelectedProjectId
□ useProfitAnalysisData hook
□ statusFilter state

### 5.7 Optional: Cancelled Status Fix (Prompt 3C)

If implemented:
□ case 'cancelled' in getStatusKPIs now shows margin % instead of raw expenses as "Loss"
□ label3 is 'Margin' with isPercent3: true
□ value3 is actualMarginPct (will be negative for losses)
□ label1 adapts: 'Contract' if contractValue > 0, else 'Spent'

If NOT implemented:
□ Cancelled case is unchanged from original (Contract, Spent, Loss with raw amount)
□ Note this as a known issue for future cleanup

===================================================================
SECTION 6: BUILD VERIFICATION
===================================================================

□ Run: npm run build
  - Must complete with ZERO errors
  - Warnings are acceptable but note any new ones

□ Run: npm run lint (if configured)
  - No new lint errors in modified files

□ Check for unused imports in modified files:
  - grep for removed component imports that might still be listed
  - Specifically check ProfitAnalysis.tsx for leftover Tabs/TabsList/TabsTrigger/TabsContent imports
  - Check MarginDashboard.tsx for leftover inline color function references

□ TypeScript strict check:
  - No 'any' types introduced in new code (BudgetHealthTable, financialColors)
  - All function parameters properly typed
  - Return types explicitly defined on utility functions

===================================================================
SECTION 7: RUNTIME VERIFICATION
===================================================================

Test these pages at both desktop (1280px+) and mobile (375px) viewports:

### 7.1 Projects List Page
□ Mobile cards show 3 metrics in 3-column layout
□ All 6 statuses render correct metrics (per Section 3.3 table)
□ Cards are tappable and navigate to project detail
□ No horizontal page scroll at 320px
□ Desktop table view is unchanged

### 7.2 Project Detail — Overview Tab
□ Navigate to an IN_PROGRESS project with:
  - A contract value
  - At least one approved change order
  - estimated_hours > 0
  - contingency_amount > 0
  - Recent expenses and time entries

Verify ALL sections render:
□ Needs Attention (if applicable warnings exist)
□ Contract Narrative showing Original → +COs → Current
□ Financial Summary grid
□ Margin Status
□ Budget Status with contingency sub-bar
□ Labor section with hours + progress bar
□ Schedule card
□ Change Order Summary
□ Quick Stats
□ Project Notes Timeline

Then test edge cases:
□ Navigate to an ESTIMATING project (no contract) — Contract Narrative hidden, Labor hidden
□ Navigate to a COMPLETE project — Labor hidden, data freshness hidden
□ Navigate to an ON_HOLD project — Labor hidden, correct sections visible
□ Navigate to a project with NO change orders — Contract Narrative shows only "Original Contract"
□ Navigate to a project with NO estimated_hours — Labor section hidden, Schedule full width
□ Navigate to a project with NO contingency — Contingency sub-bar hidden

### 7.3 Profit Analysis Page
□ Page loads with "Budget Health" as first/default tab
□ Budget Health table renders with correct data
□ Clicking a project row selects it (ProjectCostBreakdown updates)
□ Switch to "Margin Analysis" tab — content renders correctly
□ Switch to "Cost Analysis" tab — content renders correctly
□ Status filter at top works across all tabs
□ Mobile: tabs render correctly without horizontal scroll
□ ProfitSummaryCards render above tabs

### 7.4 Console Check
Open browser console on each page:
□ No errors on Projects list
□ No errors on Project detail overview (all 6 statuses)
□ No errors on Profit Analysis
□ No warnings about missing props or undefined values

===================================================================
SECTION 8: FINANCIAL ACCURACY SPOT CHECKS
===================================================================

Pick one IN_PROGRESS project and verify these values match between views:

□ Contract value on Projects list card = Contract value on Overview = Contract value on Profit Analysis
□ Estimated costs on list card = Adj. Est. Costs on Overview
□ Margin % on list card = Margin % on Overview
□ Budget utilization on Overview = Utilization column in Budget Health table
□ Contingency remaining on Overview = Contingency column in Budget Health table
□ Actual hours on Overview Labor section = sum of time entries in Time Entries tab

For the Contract Narrative:
□ Pick a project with 2+ approved COs
□ Sum up approved COs' client_amount values manually
□ Verify: Original Contract + CO Revenue = Current Contract (displayed value)
□ Verify: Current Contract matches contracted_amount in the database

===================================================================
SECTION 9: REPORT FORMAT
===================================================================

Present your findings as:

## Audit Results — [DATE]

### ✅ Passed (list items that are correct)
### ⚠️ Minor Issues (cosmetic, non-blocking)
### ❌ Failed (functional issues, missing implementations, broken behavior)
### 📝 Notes (observations, suggestions for future work)

For each failed item, include:
- What was expected
- What was found
- Which file/line is affected
- Suggested fix

End with: "Build status: PASS / FAIL" and overall assessment.
```

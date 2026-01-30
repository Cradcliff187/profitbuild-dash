/**
 * Deprecated KPI Definitions
 *
 * Legacy fields that are no longer used or have been replaced.
 * Kept for reference, migration guidance, and backward compatibility.
 *
 * @version 2.0.0
 * @lastUpdated 2026-01-30
 *
 * CHANGELOG v2.0.0:
 * - ADDED: current_margin (replaced by actual_margin)
 * - ADDED: projected_margin (renamed to adjusted_est_margin)
 * - Updated notes with clear replacement guidance
 */

import { KPIMeasure } from './types';

export const deprecatedKPIs: KPIMeasure[] = [
  // ==========================================================================
  // MARGIN FIELDS - NEWLY DEPRECATED
  // ==========================================================================
  {
    id: 'deprecated_current_margin',
    name: 'Current Margin (DEPRECATED)',
    source: 'deprecated',
    field: 'projects.current_margin',
    formula: 'contracted_amount - total_expenses',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'DEPRECATED - do not use in new code',
    notes: `DEPRECATED as of v2.0.0.

PROBLEM: This field mixed concepts. It represented "unrealized margin" (contract minus actual expenses)
which is neither actual profit (invoiced - expenses) nor projected profit (contract - estimated costs).

REPLACEMENT: Use actual_margin instead.
- actual_margin = total_invoiced - total_expenses (real profit)

MIGRATION: 
1. Replace all references to current_margin with actual_margin
2. Update queries to use actual_margin from reporting.project_financials view
3. The database column will be retained during transition but will be removed in a future release

WHY DEPRECATED:
- Confusing name: "current" could mean many things
- Mixed concepts: Used contract value (future) with actual expenses (past)
- Misleading: Didn't reflect real profit (which should be invoiced - expenses)`,
    aliases: ['margin', 'current margin'],
    replacedBy: 'actual_margin',
    relatedTo: ['actual_margin'],
  },
  
  {
    id: 'deprecated_projected_margin',
    name: 'Projected Margin (DEPRECATED)',
    source: 'deprecated',
    field: 'projects.projected_margin',
    formula: 'contracted_amount - adjusted_est_costs',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'DEPRECATED - use adjusted_est_margin instead',
    notes: `DEPRECATED as of v2.0.0.

RENAMED TO: adjusted_est_margin

REASON: "Projected" was ambiguous. The new name "adjusted_est_margin" clearly indicates:
- "adjusted" = includes quote adjustments and change orders
- "est" = estimated (not actual)
- "margin" = profit metric

MIGRATION:
1. Replace all references to projected_margin with adjusted_est_margin
2. Both columns exist during transition period
3. Database triggers update both columns simultaneously
4. projected_margin column will be removed in a future release

NO BEHAVIORAL CHANGE: The calculation remains exactly the same:
adjusted_est_margin = contracted_amount - adjusted_est_costs`,
    aliases: ['projected margin', 'forecast margin'],
    replacedBy: 'adjusted_est_margin',
    relatedTo: ['adjusted_est_margin'],
  },

  // ==========================================================================
  // LEGACY PROJECT FIELDS
  // ==========================================================================
  {
    id: 'deprecated_project_budget',
    name: 'Project Budget (DEPRECATED)',
    source: 'deprecated',
    field: 'projects.budget',
    formula: 'Replaced by contracted_amount',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'N/A - no longer used',
    notes: `DEPRECATED - Legacy field from early versions.

REPLACEMENT: Use contracted_amount instead.

The "budget" field was ambiguous - it wasn't clear if it meant:
- What we expect to spend (costs)
- What the client will pay (revenue)

contracted_amount clearly indicates client-side revenue.
adjusted_est_costs clearly indicates our expected costs.`,
    replacedBy: 'contracted_amount',
    aliases: ['budget', 'old budget'],
  },

  // ==========================================================================
  // LEGACY ESTIMATE FIELDS
  // ==========================================================================
  {
    id: 'deprecated_estimate_rate',
    name: 'Estimate Rate (DEPRECATED)',
    source: 'deprecated',
    field: 'estimate_line_items.rate',
    formula: 'Replaced by price_per_unit',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'N/A - no longer used',
    notes: `DEPRECATED - Legacy field renamed for clarity.

REPLACEMENT: Use price_per_unit instead.

"Rate" was ambiguous. Could mean:
- Hourly rate
- Unit price
- Cost rate

New fields are explicit:
- price_per_unit = what we charge client (revenue)
- cost_per_unit = what we pay vendor (cost)`,
    replacedBy: 'estimate_line_item_price_per_unit',
    aliases: ['rate', 'old rate', 'line rate'],
  },

  // ==========================================================================
  // LEGACY REVENUE TRACKING
  // ==========================================================================
  {
    id: 'deprecated_old_revenue_calculations',
    name: 'Old Revenue Calculations (DEPRECATED)',
    source: 'deprecated',
    field: 'Various legacy fields',
    formula: 'See project_revenues table',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'N/A - no longer used',
    notes: `DEPRECATED - Revenue tracking restructured.

REPLACEMENT: Use total_invoiced from reporting.project_financials view.

Legacy approach had revenue scattered across multiple fields.
New approach uses dedicated tables:
- project_revenues: Direct invoices
- revenue_splits: Split invoices across projects

The reporting view handles split calculations automatically.`,
    replacedBy: 'total_invoiced',
    aliases: ['old revenue', 'legacy revenue', 'old invoicing'],
  },

  // ==========================================================================
  // LEGACY EXPENSE TRACKING
  // ==========================================================================
  {
    id: 'deprecated_old_expense_tracking',
    name: 'Old Expense Tracking (DEPRECATED)',
    source: 'deprecated',
    field: 'Legacy expense fields',
    formula: 'See expenses table',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'N/A - no longer used',
    notes: `DEPRECATED - Expense tracking restructured.

REPLACEMENT: Use total_expenses from reporting.project_financials view.

Legacy approach didn't handle split expenses properly.
New approach uses:
- expenses table: Direct expenses
- expense_splits table: Split expenses across projects

The reporting view handles split calculations automatically.`,
    replacedBy: 'total_expenses',
    aliases: ['old expenses', 'legacy expenses'],
  },

  // ==========================================================================
  // LEGACY QUOTE SYSTEM
  // ==========================================================================
  {
    id: 'deprecated_old_quote_system',
    name: 'Old Quote System (DEPRECATED)',
    source: 'deprecated',
    field: 'Legacy quote fields',
    formula: 'See quotes table',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'N/A - no longer used',
    notes: `DEPRECATED - Quote system restructured.

Quote system moved to dedicated tables:
- quotes: Quote header
- quote_line_items: Quote details with estimate line item linking

Quotes now properly link to estimate line items via estimate_line_item_id,
allowing accurate cost replacement in adjusted_est_costs calculation.`,
    replacedBy: 'quote_total_amount',
    aliases: ['old quotes', 'legacy quotes'],
  },

  // ==========================================================================
  // LEGACY CHANGE ORDER TRACKING
  // ==========================================================================
  {
    id: 'deprecated_old_change_order_tracking',
    name: 'Old Change Order Tracking (DEPRECATED)',
    source: 'deprecated',
    field: 'Legacy CO fields',
    formula: 'See change_orders table',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'N/A - no longer used',
    notes: `DEPRECATED - Change order tracking restructured.

Now uses dedicated change_orders table with:
- client_amount: Revenue impact
- cost_impact: Cost impact
- includes_contingency: Whether uses contingency

Margins automatically recalculated via triggers when COs are approved.`,
    replacedBy: 'change_order_revenue',
    aliases: ['old COs', 'legacy change orders'],
  },

  // ==========================================================================
  // LEGACY WORK ORDER FIELDS
  // ==========================================================================
  {
    id: 'deprecated_old_work_order_fields',
    name: 'Old Work Order Fields (DEPRECATED)',
    source: 'deprecated',
    field: 'Legacy WO fields',
    formula: 'See projects table with project_type filtering',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'N/A - no longer used',
    notes: `DEPRECATED - Work orders now use regular projects table.

Work orders are projects with project_type = 'work_order'.
They have all the same financial fields as regular projects.
No separate work_orders table needed.`,
    replacedBy: 'work_order_contracted_amount',
    aliases: ['old WOs', 'legacy work orders'],
  },

  // ==========================================================================
  // DEPRECATED FRONTEND CALCULATIONS
  // ==========================================================================
  {
    id: 'deprecated_projectFinancials_ts',
    name: 'projectFinancials.ts Functions (DEPRECATED)',
    source: 'deprecated',
    field: 'src/utils/projectFinancials.ts',
    formula: 'Various frontend calculations',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'DEPRECATED - use database fields directly',
    notes: `DEPRECATED - The entire projectFinancials.ts file is deprecated.

PROBLEM: This file duplicated database calculations in the frontend, leading to:
- Inconsistent results
- Maintenance burden
- Potential drift between frontend and database values

REPLACEMENT: Use database fields directly:
- project.contracted_amount (not calculated in frontend)
- project.adjusted_est_margin (not projectedMargin calculation)
- project.actual_margin (not currentMargin calculation)
- project.adjusted_est_costs (not projectedCosts calculation)

MIGRATION:
1. Replace calculateProjectFinancials() with direct DB queries
2. Replace calculateMultipleProjectFinancials() with direct DB queries
3. Use reporting.project_financials view for complex aggregations
4. Move file to src/utils/deprecated/ for reference`,
    aliases: ['projectFinancials', 'calculateProjectFinancials'],
  },
];

export default deprecatedKPIs;

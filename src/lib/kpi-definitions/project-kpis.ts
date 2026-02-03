/**
 * Project Financial KPI Definitions
 * 
 * Core project-level financial metrics and margin calculations.
 * These are the primary metrics for project profitability analysis.
 * 
 * @version 2.1.0
 * @lastUpdated 2026-02-03
 * 
 * CHANGELOG v2.1.0:
 * - ADDED: Labor Tracking section (estimated_hours, actual_hours, hours_variance)
 * - FIXED: contingency_amount field mapping (estimates → projects)
 * - ADDED: Database columns via migration (contingency_amount, estimated_hours, actual_hours)
 * 
 * CHANGELOG v2.0.0:
 * - RENAMED: projected_margin → adjusted_est_margin
 * - DEPRECATED: current_margin (use actual_margin instead)
 * - ADDED: adjusted_est_margin_percent, actual_margin_percent
 * - ADDED: budget_utilization_percent
 * - UPDATED: All margin terminology for consistency
 */

import { KPIMeasure } from './types';

export const projectFinancialKPIs: KPIMeasure[] = [
  // ==========================================================================
  // REVENUE METRICS
  // ==========================================================================
  {
    id: 'contracted_amount',
    name: 'Contracted Amount',
    source: 'database',
    field: 'projects.contracted_amount',
    formula: 'Base estimate amount + approved change order client amounts',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'ProjectDetailView, ProfitAnalysis, MarginDashboard, WorkOrders table',
    notes: 'Total contract value with client. Updated by triggers when estimates approved or change orders accepted.',
    aliases: ['contract value', 'contract amount', 'total contract', 'revenue', 'contract'],
    relatedTo: ['total_invoiced', 'change_order_revenue'],
    preferWhen: 'User asks about expected/contracted revenue',
    avoidWhen: 'User asks about actual received revenue (use total_invoiced instead)'
  },
  {
    id: 'total_invoiced',
    name: 'Total Invoiced',
    source: 'view',
    field: 'reporting.project_financials.total_invoiced',
    formula: 'SUM(project_revenues.amount) for direct + SUM(revenue_splits.split_amount) for splits',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'ProfitAnalysis, BillingProgressTable, financial dashboards',
    notes: 'Actual revenue received. Handles split invoices correctly via the view.',
    aliases: ['invoiced', 'billed', 'actual revenue', 'received', 'collected'],
    relatedTo: ['contracted_amount', 'revenue_variance'],
    preferWhen: 'User asks about actual/real revenue received',
  },
  {
    id: 'invoice_count',
    name: 'Invoice Count',
    source: 'view',
    field: 'reporting.project_financials.invoice_count',
    formula: 'COUNT(project_revenues) + COUNT(revenue_splits)',
    dataType: 'number',
    domain: 'project',
    whereUsed: 'Project summary, financial reports',
    notes: 'Total number of invoices/revenue entries for the project.',
  },
  {
    id: 'revenue_variance',
    name: 'Revenue Variance',
    source: 'view',
    field: 'reporting.project_financials.revenue_variance',
    formula: 'contracted_amount - total_invoiced',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'BillingProgressTable, variance analysis',
    notes: 'How much is left to bill. Positive = still owed, Negative = overbilled.',
    aliases: ['billing gap', 'remaining to bill', 'unbilled'],
  },

  // ==========================================================================
  // MARGIN METRICS - UPDATED TERMINOLOGY
  // ==========================================================================
  
  // NEW: Replaces projected_margin
  {
    id: 'adjusted_est_margin',
    name: 'Adjusted Estimated Margin',
    source: 'database',
    field: 'projects.adjusted_est_margin',
    formula: 'contracted_amount - adjusted_est_costs',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'WorkOrders table, margin forecasting, ProjectsTableView',
    notes: 'Expected final margin based on current estimates (adjusted for accepted quotes and change orders). This is the PRIMARY margin metric for forecasting.',
    aliases: ['projected margin', 'expected margin', 'forecast margin', 'est margin'],
    relatedTo: ['actual_margin', 'adjusted_est_costs', 'original_margin'],
    preferWhen: 'User asks about expected/projected/forecast final margin',
  },
  
  // DEPRECATED: Use actual_margin instead
  {
    id: 'current_margin',
    name: 'Current Margin',
    source: 'deprecated',
    field: 'projects.current_margin',
    formula: 'contracted_amount - total_expenses',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'DEPRECATED - being phased out',
    notes: 'DEPRECATED: Use actual_margin instead. This field mixed concepts and will be removed.',
    aliases: ['margin'],
    relatedTo: ['actual_margin'],
    replacedBy: 'actual_margin',
    avoidWhen: 'ALWAYS - this field is deprecated',
  },
  
  {
    id: 'actual_margin',
    name: 'Actual Margin',
    source: 'database',
    field: 'projects.actual_margin',
    formula: 'total_invoiced - total_expenses',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'ProfitAnalysis, MarginAnalysisTable, completed project analysis',
    notes: 'REAL profit based on actual invoices received minus actual expenses. This is true realized profit.',
    aliases: ['real margin', 'real profit', 'actual profit', 'profit', 'true margin'],
    relatedTo: ['total_invoiced', 'total_expenses'],
    preferWhen: 'User asks about actual/real/true profit or margin',
  },
  
  {
    id: 'original_margin',
    name: 'Original Margin',
    source: 'database',
    field: 'projects.original_margin',
    formula: 'contracted_amount - original_est_costs',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'Variance analysis, margin comparison',
    notes: 'Margin from original approved estimate. Immutable baseline for comparison.',
    aliases: ['baseline margin', 'initial margin'],
    relatedTo: ['adjusted_est_margin', 'original_est_costs'],
    preferWhen: 'User asks about original/baseline margin for comparison',
  },
  
  // DEPRECATED alias - kept for backward compatibility
  {
    id: 'projected_margin',
    name: 'Projected Margin',
    source: 'deprecated',
    field: 'projects.projected_margin',
    formula: 'contracted_amount - adjusted_est_costs',
    dataType: 'currency',
    domain: 'deprecated',
    whereUsed: 'DEPRECATED - use adjusted_est_margin',
    notes: 'DEPRECATED: Renamed to adjusted_est_margin for clarity. Both columns exist during transition.',
    aliases: ['forecast margin'],
    replacedBy: 'adjusted_est_margin',
    relatedTo: ['adjusted_est_margin'],
  },
  
  {
    id: 'margin_percentage',
    name: 'Margin Percentage',
    source: 'database',
    field: 'projects.margin_percentage',
    formula: '(adjusted_est_margin / contracted_amount) × 100',
    dataType: 'percent',
    domain: 'project',
    whereUsed: 'Dashboard cards, financial reports, project lists',
    notes: 'Adjusted estimated margin as percentage of contract value. Based on adjusted_est_margin.',
    aliases: ['margin %', 'margin percent', 'profit margin %'],
  },
  
  // NEW: Added for clarity
  {
    id: 'adjusted_est_margin_percent',
    name: 'Adjusted Est. Margin %',
    source: 'view',
    field: 'reporting.project_financials.adjusted_est_margin_percent',
    formula: '(adjusted_est_margin / contracted_amount) × 100',
    dataType: 'percent',
    domain: 'project',
    whereUsed: 'Financial reports, margin comparison',
    notes: 'Adjusted estimated margin as percentage. Same as margin_percentage but explicit naming.',
    aliases: ['projected margin %', 'forecast margin %'],
    relatedTo: ['adjusted_est_margin', 'margin_percentage'],
  },
  
  // NEW: Added for clarity
  {
    id: 'actual_margin_percent',
    name: 'Actual Margin %',
    source: 'view',
    field: 'reporting.project_financials.actual_margin_percent',
    formula: '(actual_margin / total_invoiced) × 100',
    dataType: 'percent',
    domain: 'project',
    whereUsed: 'Completed project analysis, profit reports',
    notes: 'Actual realized margin as percentage of actual revenue. For completed/invoiced projects.',
    aliases: ['real margin %', 'true margin %', 'profit %'],
    relatedTo: ['actual_margin', 'total_invoiced'],
    preferWhen: 'User asks about actual margin percentage for completed work',
  },

  // ==========================================================================
  // COST METRICS
  // ==========================================================================
  {
    id: 'total_expenses',
    name: 'Total Expenses',
    source: 'view',
    field: 'reporting.project_financials.total_expenses',
    formula: 'SUM(expenses.amount) for direct + SUM(expense_splits.split_amount) for splits',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'All financial views, margin calculations',
    notes: 'All actual costs incurred. Handles split expenses correctly via the view.',
    aliases: ['costs', 'actual costs', 'expenses', 'spent', 'actual expenses'],
    relatedTo: ['adjusted_est_costs', 'original_est_costs', 'cost_variance'],
  },
  {
    id: 'original_est_costs',
    name: 'Original Estimated Costs',
    source: 'database',
    field: 'projects.original_est_costs',
    formula: 'SUM(estimate_line_items.total_cost) from original approved estimate',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'WorkOrders table, variance analysis',
    notes: 'Immutable baseline cost estimate. Set when estimate first approved. Uses COSTS not prices.',
    aliases: ['original costs', 'baseline costs', 'initial estimate', 'original est'],
  },
  {
    id: 'adjusted_est_costs',
    name: 'Adjusted Estimated Costs',
    source: 'database',
    field: 'projects.adjusted_est_costs',
    formula: 'original_est_costs + accepted_quote_variances + change_order_costs',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'WorkOrders table, current budget tracking',
    notes: 'Current expected costs including all approved changes. Quote costs replace original line item costs.',
    aliases: ['current estimate', 'revised costs', 'budget', 'adjusted costs', 'est costs'],
    relatedTo: ['original_est_costs', 'cost_variance'],
  },
  {
    id: 'cost_variance',
    name: 'Cost Variance',
    source: 'view',
    field: 'reporting.project_financials.cost_variance',
    formula: 'total_expenses - adjusted_est_costs',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'Financial dashboards, variance analysis',
    notes: 'Positive = over budget, Negative = under budget (savings).',
    aliases: ['budget variance', 'over/under budget'],
    relatedTo: ['total_expenses', 'adjusted_est_costs'],
  },
  {
    id: 'cost_variance_percent',
    name: 'Cost Variance %',
    source: 'view',
    field: 'reporting.project_financials.cost_variance_percent',
    formula: '(cost_variance / adjusted_est_costs) × 100',
    dataType: 'percent',
    domain: 'project',
    whereUsed: 'Financial dashboards',
    notes: 'Cost variance as percentage of budget.',
    aliases: ['variance %'],
  },
  
  // NEW: Budget utilization
  {
    id: 'budget_utilization_percent',
    name: 'Budget Utilization %',
    source: 'view',
    field: 'reporting.project_financials.budget_utilization_percent',
    formula: '(total_expenses / adjusted_est_costs) × 100',
    dataType: 'percent',
    domain: 'project',
    whereUsed: 'Financial dashboards, project progress',
    notes: 'Percentage of budget consumed. 100% = on budget, >100% = over budget.',
    aliases: ['budget used', 'burn rate', 'budget consumed'],
    relatedTo: ['total_expenses', 'adjusted_est_costs'],
  },

  // ==========================================================================
  // CONTINGENCY METRICS
  // ==========================================================================
  {
    id: 'contingency_amount',
    name: 'Contingency Amount',
    source: 'database',
    field: 'projects.contingency_amount',
    formula: 'Total contingency budget set at project approval',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'ProjectOperationalDashboard, ContingencyAllocation, financial dashboards',
    notes: 'Total contingency budget set at project level. Maintained by triggers when estimates approved or change orders created. Used to calculate contingency_remaining.',
    aliases: ['contingency', 'buffer', 'reserve', 'total contingency'],
    relatedTo: ['contingency_remaining', 'contingency_used'],
  },
  {
    id: 'contingency_used',
    name: 'Contingency Used',
    source: 'database',
    field: 'projects.contingency_used',
    formula: 'SUM(change_orders.cost_impact WHERE includes_contingency = true)',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'ContingencyAllocation, financial dashboards',
    notes: 'How much contingency has been consumed by change orders.',
  },
  {
    id: 'contingency_remaining',
    name: 'Contingency Remaining',
    source: 'database',
    field: 'projects.contingency_remaining',
    formula: 'contingency_amount - contingency_used',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'Budget planning, risk assessment',
    notes: 'Available contingency buffer.',
    aliases: ['available contingency'],
  },

  // ==========================================================================
  // LABOR TRACKING METRICS
  // ==========================================================================
  {
    id: 'estimated_hours',
    name: 'Estimated Hours',
    source: 'database',
    field: 'projects.estimated_hours',
    formula: 'SUM(estimate_line_items.quantity) WHERE category=labor_internal AND unit IN (HR, HRS, HOUR, HOURS)',
    dataType: 'number',
    domain: 'project',
    whereUsed: 'ProjectOperationalDashboard Labor Section, internal_labor_hours_by_project view, labor reports',
    notes: 'Total estimated labor hours from approved estimate line items. Calculated and stored when estimates are approved. Maintained by triggers.',
    aliases: ['planned hours', 'budgeted hours', 'est hours', 'labor estimate'],
    relatedTo: ['actual_hours', 'hours_variance'],
    preferWhen: 'User asks about planned or estimated labor hours',
  },
  {
    id: 'actual_hours',
    name: 'Actual Hours',
    source: 'database',
    field: 'projects.actual_hours',
    formula: 'Calculated from time entries and labor expenses (see internal_labor_hours_by_project view for logic)',
    dataType: 'number',
    domain: 'project',
    whereUsed: 'ProjectOperationalDashboard Labor Section, time tracking reports, labor analysis',
    notes: 'Total actual labor hours tracked via time entries and labor expenses. Maintained by triggers. Complex calculation handles start_time/end_time, description parsing, and hourly rate division.',
    aliases: ['tracked hours', 'worked hours', 'logged hours', 'labor actual'],
    relatedTo: ['estimated_hours', 'hours_variance'],
    preferWhen: 'User asks about actual or tracked labor hours',
  },
  {
    id: 'hours_variance',
    name: 'Hours Variance',
    source: 'frontend',
    field: 'calculated',
    formula: 'estimated_hours - actual_hours',
    dataType: 'number',
    domain: 'project',
    whereUsed: 'ProjectOperationalDashboard Labor Section, variance analysis',
    notes: 'Remaining labor hours. Positive = under hours (savings), Negative = over hours (overrun). Used for labor utilization tracking.',
    aliases: ['hours remaining', 'hours delta', 'labor variance'],
    relatedTo: ['estimated_hours', 'actual_hours'],
  },

  // ==========================================================================
  // TARGET/THRESHOLD METRICS
  // ==========================================================================
  {
    id: 'target_margin',
    name: 'Target Margin',
    source: 'database',
    field: 'projects.target_margin',
    formula: 'User-defined goal amount',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'MarginDashboard, budget planning',
    notes: 'Desired margin goal for the project.',
  },
  {
    id: 'minimum_margin_threshold',
    name: 'Minimum Margin Threshold',
    source: 'database',
    field: 'projects.minimum_margin_threshold',
    formula: 'User-defined floor amount (alert threshold)',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'Risk alerts, MarginDashboard',
    notes: 'Below this triggers warnings.',
    aliases: ['margin floor', 'minimum margin'],
  },

  // ==========================================================================
  // CHANGE ORDER METRICS
  // ==========================================================================
  {
    id: 'change_order_revenue',
    name: 'Change Order Revenue',
    source: 'view',
    field: 'reporting.project_financials.change_order_revenue',
    formula: 'SUM(change_orders.client_amount WHERE status = approved)',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'Financial reports, margin analysis',
    notes: 'Total revenue added from approved change orders.',
    aliases: ['CO revenue'],
    relatedTo: ['change_order_cost', 'contracted_amount'],
  },
  {
    id: 'change_order_cost',
    name: 'Change Order Cost',
    source: 'view',
    field: 'reporting.project_financials.change_order_cost',
    formula: 'SUM(change_orders.cost_impact WHERE status = approved)',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'Financial reports, cost analysis',
    notes: 'Total cost added from approved change orders.',
    aliases: ['CO cost'],
    relatedTo: ['change_order_revenue', 'adjusted_est_costs'],
  },
  {
    id: 'change_order_count',
    name: 'Change Order Count',
    source: 'view',
    field: 'reporting.project_financials.change_order_count',
    formula: 'COUNT(change_orders WHERE status = approved)',
    dataType: 'number',
    domain: 'project',
    whereUsed: 'Project summary',
    notes: 'Number of approved change orders.',
  },

  // ==========================================================================
  // PROJECT STATUS & METADATA
  // ==========================================================================
  {
    id: 'project_status',
    name: 'Project Status',
    source: 'database',
    field: 'projects.status',
    formula: 'Enum: draft | pending | approved | in_progress | on_hold | complete | cancelled',
    dataType: 'enum',
    domain: 'project',
    whereUsed: 'All project views, filtering',
    notes: 'Current project status.',
    aliases: ['status'],
  },
  {
    id: 'project_category',
    name: 'Project Category',
    source: 'database',
    field: 'projects.category',
    formula: 'Enum: construction | overhead | system',
    dataType: 'enum',
    domain: 'project',
    whereUsed: 'Filtering, reporting',
    notes: 'Construction = visible everywhere, Overhead = expenses only, System = internal.',
    aliases: ['category'],
  },
];

export default projectFinancialKPIs;

/**
 * Work Order KPI Definitions
 *
 * Metrics related to work orders, which are a subset of projects.
 * Work orders have project_type = 'work_order' and specific budget controls.
 *
 * AUDIT NOTES (2026-01-23):
 * - Work orders are projects with project_type = 'work_order'
 * - do_not_exceed field is critical for budget control
 * - customer_po_number and work_order_counter are key fields
 * - Auto-generated estimates have is_auto_generated = true
 */

import { KPIMeasure } from './types';

export const workOrderKPIs: KPIMeasure[] = [
  // ==========================================================================
  // WORK ORDER AGGREGATION METRICS
  // ==========================================================================
  {
    id: 'work_order_count',
    name: 'Work Order Count',
    source: 'frontend',
    field: 'statistics.total',
    formula: "COUNT(projects WHERE project_type = 'work_order')",
    dataType: 'number',
    domain: 'work_order',
    whereUsed: 'WorkOrders dashboard, portfolio overview',
    notes: 'Total number of work orders across all projects.',
    aliases: ['total work orders', 'WO count', 'number of work orders'],
  },
  {
    id: 'work_order_pending_in_progress',
    name: 'Pending/In Progress',
    source: 'frontend',
    field: 'statistics.pendingInProgress',
    formula: "COUNT(WOs WHERE status IN ('in_progress', 'estimating', 'quoted'))",
    dataType: 'number',
    domain: 'work_order',
    whereUsed: 'WorkOrders stats cards, workload management',
    notes: 'Work orders currently being worked on or in process.',
    aliases: ['active work orders', 'in progress WOs', 'current work orders'],
  },
  {
    id: 'work_order_completed_this_week',
    name: 'Completed This Week',
    source: 'frontend',
    field: 'statistics.completedThisWeek',
    formula: "COUNT(WOs WHERE status = 'complete' AND end_date >= weekStart)",
    dataType: 'number',
    domain: 'work_order',
    whereUsed: 'WorkOrders stats cards, weekly performance',
    notes: 'Work orders completed in the current week.',
    aliases: ['weekly completions', 'this week completions'],
  },
  {
    id: 'work_order_completed_this_month',
    name: 'Completed This Month',
    source: 'frontend',
    field: 'statistics.completedThisMonth',
    formula: "COUNT(WOs WHERE status = 'complete' AND end_date >= monthStart)",
    dataType: 'number',
    domain: 'work_order',
    whereUsed: 'WorkOrders stats cards, monthly performance',
    notes: 'Work orders completed in the current month.',
    aliases: ['monthly completions', 'this month completions'],
  },

  // ==========================================================================
  // INDIVIDUAL WORK ORDER METRICS
  // ==========================================================================
  {
    id: 'work_order_has_real_estimate',
    name: 'Has Real Estimate',
    source: 'frontend',
    field: 'has_estimate && !is_auto_generated_estimate',
    formula: 'Excludes system-created placeholder estimates',
    dataType: 'boolean',
    domain: 'work_order',
    whereUsed: 'WorkOrders table badge, estimate validation',
    notes: 'Whether the work order has a real estimate (not auto-generated placeholder).',
    aliases: ['real estimate', 'valid estimate', 'proper estimate'],
  },
  {
    id: 'work_order_total_expenses',
    name: 'Total Expenses',
    source: 'frontend',
    field: 'workOrder.total_expenses',
    formula: 'SUM(expenses.amount WHERE project_id = WO)',
    dataType: 'currency',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, budget tracking',
    notes: 'All expenses incurred on this work order.',
    aliases: ['WO expenses', 'work order costs', 'total costs'],
    relatedTo: ['work_order_do_not_exceed', 'work_order_dne_utilization_percent'],
  },
  {
    id: 'work_order_expense_count',
    name: 'Expense Count',
    source: 'frontend',
    field: 'workOrder.expense_count',
    formula: 'COUNT(expenses WHERE project_id = WO)',
    dataType: 'number',
    domain: 'work_order',
    whereUsed: 'WorkOrders details, expense tracking',
    notes: 'Number of expense transactions for this work order.',
    aliases: ['expense count', 'number of expenses'],
  },
  {
    id: 'work_order_dne_utilization_percent',
    name: 'DNE Utilization %',
    source: 'frontend',
    field: 'calculateDNEUtilization()',
    formula: '(Total Expenses / Do Not Exceed) × 100',
    dataType: 'percent',
    domain: 'work_order',
    whereUsed: 'Budget alerts, work order monitoring',
    notes: 'Percentage of budget cap that has been used.',
    aliases: ['budget utilization', 'DNE %', 'budget used %'],
    relatedTo: ['work_order_total_expenses', 'work_order_do_not_exceed'],
  },

  // ==========================================================================
  // WORK ORDER SPECIFIC FIELDS
  // ==========================================================================
  {
    id: 'work_order_number',
    name: 'Work Order Number',
    source: 'frontend',
    field: 'generateWorkOrderNumber()',
    formula: '{project_number}-WO-{counter}',
    dataType: 'text',
    domain: 'work_order',
    whereUsed: 'Work order number generation, display',
    notes: 'Unique identifier for work orders under a project.',
    aliases: ['WO number', 'work order #', 'WO ID'],
  },
  {
    id: 'work_order_do_not_exceed',
    name: 'Do Not Exceed',
    source: 'database',
    field: 'projects.do_not_exceed',
    formula: 'Maximum billable amount (work orders only)',
    dataType: 'currency',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, QuickWorkOrderForm, budget control',
    notes: 'CRITICAL: Budget cap for work orders. Expenses should not exceed this amount.',
    aliases: ['DNE', 'budget cap', 'max budget', 'WO limit'],
    relatedTo: ['work_order_total_expenses', 'work_order_dne_utilization_percent'],
  },
  {
    id: 'work_order_customer_po_number',
    name: 'Customer PO Number',
    source: 'database',
    field: 'projects.customer_po_number',
    formula: 'Client reference number',
    dataType: 'text',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, invoicing, client reference',
    notes: 'Purchase order number provided by the client.',
    aliases: ['PO number', 'customer PO', 'client PO'],
  },
  {
    id: 'work_order_counter',
    name: 'Work Order Counter',
    source: 'database',
    field: 'projects.work_order_counter',
    formula: 'Auto-incrementing per project',
    dataType: 'number',
    domain: 'work_order',
    whereUsed: 'Work order number generation',
    notes: 'Sequential counter for work orders under each project.',
    aliases: ['WO counter', 'counter', 'sequence'],
  },

  // ==========================================================================
  // WORK ORDER COST METRICS
  // ==========================================================================
  {
    id: 'work_order_original_est_costs',
    name: 'Original Estimated Costs',
    source: 'database',
    field: 'projects.original_est_costs',
    formula: 'Initial cost estimate at work order creation',
    dataType: 'currency',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, variance analysis',
    notes: 'Immutable baseline cost estimate set when work order was created.',
    aliases: ['original estimate', 'baseline costs', 'initial costs'],
    relatedTo: ['work_order_adjusted_est_costs', 'work_order_projected_margin'],
  },
  {
    id: 'work_order_adjusted_est_costs',
    name: 'Adjusted Estimated Costs',
    source: 'database',
    field: 'projects.adjusted_est_costs',
    formula: 'Original Est. Costs + Change Order Costs',
    dataType: 'currency',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, current budget tracking',
    notes: 'Current expected costs including approved changes.',
    aliases: ['current estimate', 'adjusted costs', 'revised costs'],
    relatedTo: ['work_order_original_est_costs', 'work_order_projected_margin'],
  },
  {
    id: 'work_order_projected_margin',
    name: 'Projected Margin',
    source: 'database',
    field: 'projects.projected_margin',
    formula: 'contracted_amount - adjusted_est_costs',
    dataType: 'currency',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, margin forecasting',
    notes: 'Expected final margin based on current estimates.',
    aliases: ['projected margin', 'expected margin', 'forecast margin'],
    relatedTo: ['work_order_contracted_amount', 'work_order_adjusted_est_costs'],
  },
  {
    id: 'work_order_contracted_amount',
    name: 'Contracted Amount',
    source: 'database',
    field: 'projects.contracted_amount',
    formula: 'Total contract value with client',
    dataType: 'currency',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, financial summary',
    notes: 'What the client agreed to pay for this work order.',
    aliases: ['contract amount', 'agreed amount', 'WO value'],
    relatedTo: ['work_order_projected_margin'],
  },

  // ==========================================================================
  // WORK ORDER STATUS & METADATA
  // ==========================================================================
  {
    id: 'work_order_status',
    name: 'Work Order Status',
    source: 'database',
    field: 'projects.status',
    formula: "ENUM: 'estimating' | 'quoted' | 'approved' | 'in_progress' | 'complete'",
    dataType: 'enum',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, status filtering, workflow',
    notes: 'Current status of the work order in the process.',
    aliases: ['status', 'WO status'],
  },
  {
    id: 'work_order_project_type',
    name: 'Project Type',
    source: 'database',
    field: 'projects.project_type',
    formula: "'work_order' (constant for work orders)",
    dataType: 'enum',
    domain: 'work_order',
    whereUsed: 'Work order identification, filtering',
    notes: 'Always "work_order" for work order records.',
    aliases: ['type', 'project type'],
  },
  {
    id: 'work_order_category',
    name: 'Work Order Category',
    source: 'database',
    field: 'projects.category',
    formula: "'construction' | 'system' | 'overhead'",
    dataType: 'enum',
    domain: 'work_order',
    whereUsed: 'Work order filtering, visibility control',
    notes: 'Controls which work orders are visible in different contexts.',
    aliases: ['category', 'WO category'],
  },

  // ==========================================================================
  // WORK ORDER TIMING METRICS
  // ==========================================================================
  {
    id: 'work_order_start_date',
    name: 'Start Date',
    source: 'database',
    field: 'projects.start_date',
    formula: 'When work order work began',
    dataType: 'date',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, scheduling, timeline',
    notes: 'Actual start date of work order execution.',
    aliases: ['start', 'began', 'started'],
  },
  {
    id: 'work_order_end_date',
    name: 'End Date',
    source: 'database',
    field: 'projects.end_date',
    formula: 'When work order was completed',
    dataType: 'date',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, completion tracking',
    notes: 'Date when work order reached completion status.',
    aliases: ['end', 'completed', 'finished'],
  },
  {
    id: 'work_order_created_at',
    name: 'Created At',
    source: 'database',
    field: 'projects.created_at',
    formula: 'When work order was first created',
    dataType: 'date',
    domain: 'work_order',
    whereUsed: 'WorkOrders table, creation tracking',
    notes: 'Timestamp of work order creation in the system.',
    aliases: ['created', 'creation date'],
  },
];

export default workOrderKPIs;
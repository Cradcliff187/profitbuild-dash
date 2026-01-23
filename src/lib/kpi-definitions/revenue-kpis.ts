/**
 * Revenue KPI Definitions
 *
 * Metrics related to project revenue, invoicing, and billing.
 * Revenue is tracked in the project_revenues table.
 *
 * AUDIT NOTES (2026-01-23):
 * - Revenue stored in project_revenues table (not revenues)
 * - Split revenues handled via revenue_splits table
 * - total_invoiced in reporting.project_financials view handles splits correctly
 * - invoice_count includes both direct and split revenue records
 */

import { KPIMeasure } from './types';

export const revenueKPIs: KPIMeasure[] = [
  // ==========================================================================
  // BASIC REVENUE METRICS
  // ==========================================================================
  {
    id: 'revenue_invoice_amount',
    name: 'Invoice Amount',
    source: 'database',
    field: 'project_revenues.amount',
    formula: 'Direct DB field - individual invoice amount',
    dataType: 'currency',
    domain: 'revenue',
    whereUsed: 'ProjectFinancialReconciliation, financial reports, invoice tracking',
    notes: 'The dollar amount of a specific invoice/revenue entry.',
    aliases: ['invoice amount', 'revenue amount', 'billed amount', 'amount'],
    relatedTo: ['revenue_total_invoiced', 'revenue_invoice_count'],
  },
  {
    id: 'revenue_invoice_date',
    name: 'Invoice Date',
    source: 'database',
    field: 'project_revenues.invoice_date',
    formula: 'Direct DB field - when invoice was issued',
    dataType: 'date',
    domain: 'revenue',
    whereUsed: 'Revenue tracking, cash flow analysis, timeline reporting',
    notes: 'Date the invoice was created/issued to the client.',
    aliases: ['invoice date', 'billed date', 'date', 'issued date'],
    relatedTo: ['revenue_invoice_amount'],
  },
  {
    id: 'revenue_invoice_number',
    name: 'Invoice Number',
    source: 'database',
    field: 'project_revenues.invoice_number',
    formula: 'Direct DB field - QuickBooks invoice reference',
    dataType: 'text',
    domain: 'revenue',
    whereUsed: 'Invoice lookup, reconciliation, client reference',
    notes: 'Unique identifier from QuickBooks or internal system.',
    aliases: ['invoice number', 'invoice #', 'reference number', 'invoice ref'],
  },

  // ==========================================================================
  // AGGREGATE REVENUE METRICS (View-Calculated)
  // ==========================================================================
  {
    id: 'revenue_total_invoiced',
    name: 'Total Invoiced',
    source: 'view',
    field: 'reporting.project_financials.total_invoiced',
    formula: 'SUM(project_revenues.amount) for direct + SUM(revenue_splits.split_amount) for splits',
    dataType: 'currency',
    domain: 'revenue',
    whereUsed: 'Project financial summary, dashboards, profit calculations',
    notes: 'Total revenue actually received. Handles split revenues correctly via the view.',
    aliases: ['total invoiced', 'total revenue', 'invoiced total', 'revenue received'],
    relatedTo: ['revenue_actual_margin', 'revenue_invoice_count'],
    preferWhen: 'User asks about actual/real revenue received',
  },
  {
    id: 'revenue_invoice_count',
    name: 'Invoice Count',
    source: 'view',
    field: 'reporting.project_financials.invoice_count',
    formula: 'COUNT(project_revenues) + COUNT(revenue_splits)',
    dataType: 'number',
    domain: 'revenue',
    whereUsed: 'Project financial summary, billing progress tracking',
    notes: 'Total number of invoice/revenue records for the project.',
    aliases: ['invoice count', 'number of invoices', 'billing count'],
  },

  // ==========================================================================
  // REVENUE VARIANCE METRICS
  // ==========================================================================
  {
    id: 'revenue_revenue_variance',
    name: 'Revenue Variance',
    source: 'view',
    field: 'reporting.project_financials.revenue_variance',
    formula: 'contracted_amount - total_invoiced',
    dataType: 'currency',
    domain: 'revenue',
    whereUsed: 'Variance analysis, billing progress, financial dashboards',
    notes: 'How much is left to bill. Positive = still owed, Negative = overbilled.',
    aliases: ['billing gap', 'remaining to bill', 'unbilled amount', 'revenue gap'],
    relatedTo: ['revenue_total_invoiced', 'project_contracted_amount'],
  },
  {
    id: 'revenue_revenue_variance_percent',
    name: 'Revenue Variance Percentage',
    source: 'view',
    field: 'reporting.project_financials.revenue_variance_percent',
    formula: '(revenue_variance / contracted_amount) × 100',
    dataType: 'percent',
    domain: 'revenue',
    whereUsed: 'Variance analysis dashboards, billing progress indicators',
    notes: 'Revenue variance as percentage of contract value.',
    aliases: ['billing gap %', 'revenue variance %'],
  },

  // ==========================================================================
  // SPLIT REVENUE METRICS
  // ==========================================================================
  {
    id: 'revenue_split_amount',
    name: 'Revenue Split Amount',
    source: 'database',
    field: 'revenue_splits.split_amount',
    formula: 'Direct DB field - portion allocated to specific project',
    dataType: 'currency',
    domain: 'revenue',
    whereUsed: 'Split revenue calculations, project financial views',
    notes: 'Only exists when parent revenue.is_split = true.',
    aliases: ['split amount', 'allocated revenue', 'revenue portion'],
    relatedTo: ['revenue_invoice_amount', 'revenue_split_percentage'],
  },
  {
    id: 'revenue_split_percentage',
    name: 'Revenue Split Percentage',
    source: 'database',
    field: 'revenue_splits.split_percentage',
    formula: '(split_amount / parent_revenue.amount) × 100',
    dataType: 'percent',
    domain: 'revenue',
    whereUsed: 'Allocation display in RevenueSplitDialog, percentage breakdowns',
    notes: 'Calculated field for display purposes showing allocation percentage.',
    aliases: ['split %', 'allocation percent', 'revenue split %'],
  },
  {
    id: 'revenue_is_split',
    name: 'Is Split (Revenue)',
    source: 'database',
    field: 'project_revenues.is_split',
    formula: 'Boolean flag - true when revenue is allocated across multiple projects',
    dataType: 'boolean',
    domain: 'revenue',
    whereUsed: 'RevenueForm, revenue lists, reporting queries',
    notes: 'When true, project_id points to SYS-000 and revenue is split via revenue_splits.',
    aliases: ['split revenue', 'allocated revenue', 'multi-project revenue'],
  },

  // ==========================================================================
  // CALCULATED REVENUE METRICS
  // ==========================================================================
  {
    id: 'revenue_total_revenue_by_project',
    name: 'Total Revenue by Project (Split-Aware)',
    source: 'frontend',
    field: 'calculateProjectRevenue()',
    formula: 'SUM(revenues.amount WHERE !is_split) + SUM(revenue_splits.split_amount)',
    dataType: 'currency',
    domain: 'revenue',
    whereUsed: 'Project financial views, dashboards, profit analysis',
    notes: 'Combines direct and split revenues for accurate project totals.',
    aliases: ['project revenue', 'total project revenue', 'revenue by project'],
    relatedTo: ['revenue_invoice_amount', 'revenue_split_amount'],
  },

  // ==========================================================================
  // REVENUE STATUS & METADATA
  // ==========================================================================
  {
    id: 'revenue_status',
    name: 'Revenue Status',
    source: 'database',
    field: 'project_revenues.status',
    formula: "ENUM: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled'",
    dataType: 'enum',
    domain: 'revenue',
    whereUsed: 'Revenue tracking, payment status, workflow management',
    notes: 'Current payment/collection status of the revenue.',
    aliases: ['status', 'payment status', 'invoice status'],
  },
  {
    id: 'revenue_payment_date',
    name: 'Payment Date',
    source: 'database',
    field: 'project_revenues.payment_date',
    formula: 'Date when payment was received',
    dataType: 'date',
    domain: 'revenue',
    whereUsed: 'Cash flow analysis, payment tracking, financial reporting',
    notes: 'When the client actually paid the invoice.',
    aliases: ['payment date', 'paid date', 'received date'],
  },
  {
    id: 'revenue_due_date',
    name: 'Due Date',
    source: 'database',
    field: 'project_revenues.due_date',
    formula: 'Date payment is due from client',
    dataType: 'date',
    domain: 'revenue',
    whereUsed: 'Collections management, aging reports, overdue tracking',
    notes: 'When payment is expected from the client.',
    aliases: ['due date', 'payment due', 'deadline'],
  },
  {
    id: 'revenue_quickbooks_invoice_id',
    name: 'QuickBooks Invoice ID',
    source: 'database',
    field: 'project_revenues.quickbooks_invoice_id',
    formula: 'QuickBooks internal ID for the invoice',
    dataType: 'text',
    domain: 'revenue',
    whereUsed: 'QuickBooks integration, reconciliation, API calls',
    notes: 'Internal QuickBooks reference for API operations.',
    aliases: ['QB invoice ID', 'QuickBooks ID', 'QB reference'],
  },
];

export default revenueKPIs;
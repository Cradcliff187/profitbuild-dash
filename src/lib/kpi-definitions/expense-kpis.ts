/**
 * Expense KPI Definitions
 *
 * Metrics related to project expenses, time tracking, and cost allocation.
 * Time entries are stored in the expenses table with category = 'labor_internal'.
 *
 * AUDIT NOTES (2026-01-23):
 * - Time entries are in expenses table with category='labor_internal'
 * - Lunch tracking fields: lunch_taken (boolean), lunch_duration_minutes (integer)
 * - Hours calculation: (end_time - start_time) / 3600 minus lunch if taken
 * - Split expenses handled via expense_splits table
 */

import { KPIMeasure } from './types';

export const expenseKPIs: KPIMeasure[] = [
  // ==========================================================================
  // BASIC EXPENSE METRICS
  // ==========================================================================
  {
    id: 'expense_amount',
    name: 'Expense Amount',
    source: 'database',
    field: 'expenses.amount',
    formula: 'Direct field - transaction amount',
    dataType: 'currency',
    domain: 'expense',
    whereUsed: 'ExpensesList, project costs, financial reports',
    notes: 'The actual dollar amount of the expense transaction.',
    aliases: ['amount', 'cost', 'expense cost', 'transaction amount'],
    relatedTo: ['total_expenses', 'expense_split_amount'],
  },
  {
    id: 'expense_is_split',
    name: 'Is Split',
    source: 'database',
    field: 'expenses.is_split',
    formula: 'Boolean - expense allocated across multiple projects',
    dataType: 'boolean',
    domain: 'expense',
    whereUsed: 'ExpenseAllocationSheet, expense filtering',
    notes: 'When true, expense is split across multiple projects via expense_splits table.',
    aliases: ['split expense', 'allocated expense'],
    relatedTo: ['expense_split_amount', 'expense_split_percentage'],
  },
  {
    id: 'expense_split_amount',
    name: 'Split Amount',
    source: 'database',
    field: 'expense_splits.split_amount',
    formula: 'Portion allocated to specific project',
    dataType: 'currency',
    domain: 'expense',
    whereUsed: 'ExpenseAllocationSheet, project cost calculations',
    notes: 'How much of the parent expense is allocated to this specific project.',
    aliases: ['allocated amount', 'portion amount'],
    relatedTo: ['expense_amount', 'expense_split_percentage'],
  },
  {
    id: 'expense_split_percentage',
    name: 'Split Percentage',
    source: 'database',
    field: 'expense_splits.split_percentage',
    formula: '(split_amount / parent_expense.amount) × 100',
    dataType: 'percent',
    domain: 'expense',
    whereUsed: 'Allocation display, ExpenseAllocationSheet',
    aliases: ['allocation percent', 'split %'],
  },

  // ==========================================================================
  // TIME TRACKING METRICS (Labor Internal Only)
  // ==========================================================================
  {
    id: 'expense_lunch_taken',
    name: 'Lunch Taken',
    source: 'database',
    field: 'expenses.lunch_taken',
    formula: 'Boolean - whether lunch break was taken during shift',
    dataType: 'boolean',
    domain: 'expense',
    whereUsed: 'TimeEntries table, time entry forms, lunch tracking UI',
    notes: 'Only applicable to labor_internal expenses (time entries).',
    aliases: ['took lunch', 'lunch break', 'had lunch'],
    relatedTo: ['expense_lunch_duration_minutes', 'expense_net_hours'],
  },
  {
    id: 'expense_lunch_duration_minutes',
    name: 'Lunch Duration Minutes',
    source: 'database',
    field: 'expenses.lunch_duration_minutes',
    formula: 'Integer (15-120) - duration of lunch break in minutes',
    dataType: 'number',
    domain: 'expense',
    whereUsed: 'TimeEntries table, lunch tracking UI, reports',
    notes: 'Only meaningful when lunch_taken = true. Typically 30-60 minutes.',
    aliases: ['lunch minutes', 'lunch duration', 'break time'],
    relatedTo: ['expense_lunch_taken', 'expense_net_hours'],
  },
  {
    id: 'expense_gross_hours',
    name: 'Gross Hours',
    source: 'database',
    field: 'expenses.gross_hours',
    formula: '(end_time - start_time) / 3600',
    dataType: 'number',
    domain: 'expense',
    whereUsed: 'Time entry calculations, reports, time tracking',
    notes: 'Total shift duration before lunch deduction. Calculated from timestamp fields.',
    aliases: ['gross hours', 'total hours', 'shift hours', 'raw hours'],
    relatedTo: ['expense_net_hours', 'expense_start_time', 'expense_end_time'],
    preferWhen: 'User asks about total time worked before breaks',
    avoidWhen: 'User asks about billable hours (use net_hours instead)',
  },
  {
    id: 'expense_net_hours',
    name: 'Net Hours (Billable)',
    source: 'database',
    field: 'expenses.hours',
    formula: 'Gross Hours - (Lunch Duration / 60) when lunch_taken = true',
    dataType: 'number',
    domain: 'expense',
    whereUsed: 'TimeEntries table, billing calculations, amount calculation',
    notes: 'Billable hours after lunch deduction. Stored in expenses.hours field. Amount = Net Hours × Hourly Rate.',
    aliases: ['hours', 'billable hours', 'net hours', 'productive hours', 'worked hours'],
    relatedTo: ['expense_gross_hours', 'expense_lunch_taken', 'expense_amount'],
    preferWhen: 'User asks about billable/productively worked hours',
  },

  // ==========================================================================
  // CALCULATED / DERIVED METRICS
  // ==========================================================================
  {
    id: 'total_expenses_by_project',
    name: 'Total Expenses by Project',
    source: 'frontend',
    field: 'calculateProjectExpenses()',
    formula: 'SUM(expenses.amount) + SUM(expense_splits.split_amount)',
    dataType: 'currency',
    domain: 'expense',
    whereUsed: 'Project financial views, dashboards, ExpenseList summaries',
    notes: 'Combines direct expenses and split expense allocations for accurate project totals.',
    aliases: ['project expenses', 'total project costs', 'project spend'],
    relatedTo: ['expense_amount', 'expense_split_amount'],
  },
  {
    id: 'expense_count_by_project',
    name: 'Expense Count by Project',
    source: 'frontend',
    field: 'calculateExpenseCount()',
    formula: 'COUNT(expenses) + COUNT(expense_splits)',
    dataType: 'number',
    domain: 'expense',
    whereUsed: 'Project summaries, expense dashboards',
    notes: 'Total number of expense records for the project, including splits.',
    aliases: ['expense count', 'number of expenses'],
  },

  // ==========================================================================
  // TIME TRACKING FIELDS (For Reference)
  // ==========================================================================
  {
    id: 'expense_start_time',
    name: 'Start Time',
    source: 'database',
    field: 'expenses.start_time',
    formula: 'Timestamp when time entry began',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Time tracking, schedule analysis',
    notes: 'Only populated for labor_internal expenses.',
    aliases: ['clock in', 'start', 'begin time'],
  },
  {
    id: 'expense_end_time',
    name: 'End Time',
    source: 'database',
    field: 'expenses.end_time',
    formula: 'Timestamp when time entry ended',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Time tracking, schedule analysis',
    notes: 'Only populated for labor_internal expenses.',
    aliases: ['clock out', 'end', 'finish time'],
  },
  {
    id: 'expense_category',
    name: 'Expense Category',
    source: 'database',
    field: 'expenses.category',
    formula: "ENUM: 'labor_internal' | 'materials' | 'subcontractor' | 'equipment' | etc.",
    dataType: 'enum',
    domain: 'expense',
    whereUsed: 'Expense filtering, categorization, reporting',
    notes: 'Critical field for determining expense type and applicable calculations.',
    aliases: ['category', 'expense type', 'type'],
  },

  // ==========================================================================
  // DATE/TIMESTAMP FIELDS
  // ==========================================================================
  {
    id: 'expense_date',
    name: 'Work Date / Expense Date',
    source: 'database',
    field: 'expenses.expense_date',
    formula: 'Date when the work was performed or expense incurred',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Payroll reports, financial reports, time-based filtering',
    notes: "PRIMARY DATE FOR BUSINESS QUERIES. Use this for \"last week's hours\", payroll, financial reporting. This is the business date, not when the entry was created.",
    aliases: ['work date', 'date', 'expense date', 'business date'],
  },
  {
    id: 'expense_created_at',
    name: 'Created At',
    source: 'database',
    field: 'expenses.created_at',
    formula: 'Timestamp when the expense record was created in the system',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Audit trails, entry tracking, "when was this entered"',
    notes: 'When the record was created in the database. NOT the same as when work was done (use expense_date for that) or when it was submitted for approval.',
    aliases: ['created', 'entry date', 'record created'],
  },
  {
    id: 'expense_submitted_for_approval_at',
    name: 'Submitted For Approval At',
    source: 'database',
    field: 'expenses.submitted_for_approval_at',
    formula: 'Timestamp when the expense was submitted for approval',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Approval workflow, pending duration calculations, audit trails',
    notes: 'When the user clicked "Submit for Approval". Use for workflow metrics like "how long has this been pending".',
    aliases: ['submitted', 'submission date', 'submitted at'],
  },
  {
    id: 'expense_approved_at',
    name: 'Approved At',
    source: 'database',
    field: 'expenses.approved_at',
    formula: 'Timestamp when the expense was approved or rejected',
    dataType: 'date',
    domain: 'expense',
    whereUsed: 'Approval audit trail, approval metrics, compliance reporting',
    notes: 'When the approval decision was made. May be null if status is still pending.',
    aliases: ['approved', 'approval date', 'decision date'],
  },
];

export default expenseKPIs;
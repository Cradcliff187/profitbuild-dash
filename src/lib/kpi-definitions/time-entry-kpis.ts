/**
 * Time Entry KPI Definitions
 *
 * KPIs specific to time tracking and labor entries.
 * These map to the expenses table where category = 'labor_internal'.
 *
 * @version 1.0.0
 * @created 2026-01-30
 * @lastUpdated 2026-01-30
 *
 * CRITICAL DISTINCTIONS:
 * - gross_hours: Total shift duration (end_time - start_time)
 * - hours (net_hours): Billable hours after lunch deduction
 * - amount: Total cost = hours × hourly_rate
 */

import { KPIMeasure } from './types';

export const timeEntryKPIs: KPIMeasure[] = [
  // ==========================================================================
  // IDENTITY FIELDS
  // ==========================================================================
  {
    id: 'time_entry_id',
    name: 'Time Entry ID',
    source: 'database',
    field: 'expenses.id',
    formula: 'UUID primary key',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'All time entry operations',
    notes: 'Unique identifier for the time entry record.',
  },
  {
    id: 'worker_name',
    name: 'Worker Name',
    source: 'database',
    field: 'payees.payee_name',
    formula: 'Joined from payees table via expenses.payee_id',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, reports, filtering',
    notes: 'Employee name from payees table. Use payee_name in SQL joins.',
    aliases: ['employee', 'worker', 'employee_name', 'name', 'staff'],
    relatedTo: ['payee_id', 'employee_number'],
  },
  {
    id: 'employee_number',
    name: 'Employee Number',
    source: 'database',
    field: 'payees.employee_number',
    formula: 'Joined from payees table via expenses.payee_id',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, payroll exports',
    notes: 'Employee ID number from payees table.',
    aliases: ['emp #', 'employee #', 'emp number', 'staff number'],
    relatedTo: ['worker_name', 'payee_id'],
  },

  // ==========================================================================
  // DATE/TIME FIELDS
  // ==========================================================================
  {
    id: 'time_entry_expense_date',
    name: 'Work Date',
    source: 'database',
    field: 'expenses.expense_date',
    formula: 'Date when work was performed',
    dataType: 'date',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, filtering, payroll',
    notes: 'Business date for the time entry. Used for payroll periods.',
    aliases: ['work date', 'date', 'shift date'],
  },
  {
    id: 'time_entry_start_time',
    name: 'Start Time',
    source: 'database',
    field: 'expenses.start_time',
    formula: 'Timestamp when shift began',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Time tracking, schedule analysis, gross_hours calc',
    notes: 'Clock-in time. Used with end_time to calculate gross_hours.',
    aliases: ['clock in', 'start', 'in time'],
    relatedTo: ['time_entry_end_time', 'time_entry_gross_hours'],
  },
  {
    id: 'time_entry_end_time',
    name: 'End Time',
    source: 'database',
    field: 'expenses.end_time',
    formula: 'Timestamp when shift ended',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Time tracking, schedule analysis, gross_hours calc',
    notes: 'Clock-out time. Used with start_time to calculate gross_hours.',
    aliases: ['clock out', 'end', 'out time'],
    relatedTo: ['time_entry_start_time', 'time_entry_gross_hours'],
  },
  {
    id: 'time_entry_created_at',
    name: 'Created At',
    source: 'database',
    field: 'expenses.created_at',
    formula: 'Timestamp when record was created',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Audit trails, sorting',
    notes: 'When the time entry was first created in the system.',
  },
  {
    id: 'time_entry_submitted_at',
    name: 'Submitted At',
    source: 'database',
    field: 'expenses.submitted_for_approval_at',
    formula: 'Timestamp when submitted for approval',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Approval workflows, reporting',
    notes: 'When the entry was submitted for manager approval. NULL if not yet submitted.',
    aliases: ['submitted', 'submission date'],
  },
  {
    id: 'time_entry_approved_at',
    name: 'Approved At',
    source: 'database',
    field: 'expenses.approved_at',
    formula: 'Timestamp when approved or rejected',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Approval workflows, payroll',
    notes: 'When the entry was approved or rejected. NULL if still pending.',
    aliases: ['approved', 'approval date'],
  },

  // ==========================================================================
  // HOURS CALCULATIONS - CRITICAL
  // ==========================================================================
  {
    id: 'time_entry_gross_hours',
    name: 'Gross Hours',
    source: 'frontend', // Calculated, not stored
    field: 'CALCULATED: (end_time - start_time) / 3600',
    formula: 'EXTRACT(EPOCH FROM (end_time - start_time)) / 3600',
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, weekly_labor_hours view, compliance',
    notes: 'CALCULATED FIELD - total shift duration before lunch deduction. Computed from start_time/end_time. For compliance tracking (e.g., >8 hours may indicate OT eligibility). Employee-facing term: "Shift Hours".',
    aliases: ['gross hours', 'total hours', 'shift hours', 'raw hours', 'total time', 'time logged', 'clock time'],
    relatedTo: ['time_entry_hours', 'time_entry_start_time', 'time_entry_end_time'],
    preferWhen: 'User asks about total time worked, shift length, or overtime eligibility',
    avoidWhen: 'User asks about billable hours or payroll hours (use hours/net_hours)',
  },
  {
    id: 'time_entry_hours',
    name: 'Hours (Net/Billable)',
    source: 'database',
    field: 'expenses.hours',
    formula: 'Gross Hours - (lunch_duration_minutes / 60) when lunch_taken = true',
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, payroll, billing, amount calculation',
    notes: 'Stored billable hours after lunch deduction. Used for: amount = hours × hourly_rate. Employee-facing term: "Paid Hours".',
    aliases: ['hours', 'billable hours', 'net hours', 'productive hours', 'worked hours', 'payable hours', 'paid hours'],
    relatedTo: ['time_entry_gross_hours', 'time_entry_amount', 'time_entry_lunch_taken'],
    preferWhen: 'User asks about billable hours, payroll hours, or productive hours',
  },

  // ==========================================================================
  // LUNCH TRACKING
  // ==========================================================================
  {
    id: 'time_entry_lunch_taken',
    name: 'Lunch Taken',
    source: 'database',
    field: 'expenses.lunch_taken',
    formula: 'Boolean - whether lunch break was taken during shift',
    dataType: 'boolean',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, compliance',
    notes: 'Indicates if worker took a lunch break. Required for compliance in some jurisdictions.',
    aliases: ['took lunch', 'lunch break', 'had lunch'],
    relatedTo: ['time_entry_lunch_duration_minutes', 'time_entry_hours'],
  },
  {
    id: 'time_entry_lunch_duration_minutes',
    name: 'Lunch Duration (Minutes)',
    source: 'database',
    field: 'expenses.lunch_duration_minutes',
    formula: 'Integer 15-120 - minutes of lunch break',
    dataType: 'number',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, hours calculation',
    notes: 'Length of lunch break in minutes. Typically 30-60. Only meaningful when lunch_taken = true.',
    aliases: ['lunch minutes', 'lunch duration', 'break time', 'lunch length'],
    relatedTo: ['time_entry_lunch_taken', 'time_entry_hours'],
  },

  // ==========================================================================
  // FINANCIAL FIELDS
  // ==========================================================================
  {
    id: 'time_entry_hourly_rate',
    name: 'Hourly Rate',
    source: 'database',
    field: 'payees.hourly_rate',
    formula: 'Joined from payees table via expenses.payee_id',
    dataType: 'currency',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, cost calculations',
    notes: 'Employee hourly rate from payees table. Used to calculate amount.',
    aliases: ['rate', 'pay rate', 'hourly pay'],
    relatedTo: ['time_entry_amount', 'time_entry_hours'],
  },
  {
    id: 'time_entry_amount',
    name: 'Total Amount',
    source: 'database',
    field: 'expenses.amount',
    formula: 'hours × hourly_rate',
    dataType: 'currency',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, project costs, payroll',
    notes: 'Total labor cost for this time entry. Calculated as net hours × hourly rate.',
    aliases: ['amount', 'cost', 'total cost', 'labor cost'],
    relatedTo: ['time_entry_hours', 'time_entry_hourly_rate'],
  },

  // ==========================================================================
  // PROJECT CONTEXT
  // ==========================================================================
  {
    id: 'time_entry_project_id',
    name: 'Project ID',
    source: 'database',
    field: 'expenses.project_id',
    formula: 'Foreign key to projects table',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'Filtering, joins',
    notes: 'Project this time entry is charged to.',
  },
  {
    id: 'time_entry_project_number',
    name: 'Project Number',
    source: 'database',
    field: 'projects.project_number',
    formula: 'Joined from projects table',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, reports',
    notes: 'Project number for display.',
    aliases: ['project #', 'job number'],
  },
  {
    id: 'time_entry_project_name',
    name: 'Project Name',
    source: 'database',
    field: 'projects.project_name',
    formula: 'Joined from projects table',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, reports',
    notes: 'Project name for display.',
    aliases: ['project', 'job name'],
  },
  {
    id: 'time_entry_client_name',
    name: 'Client Name',
    source: 'database',
    field: 'projects.client_name',
    formula: 'Joined from projects table',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, reports',
    notes: 'Client name from project.',
    aliases: ['client', 'customer'],
  },

  // ==========================================================================
  // APPROVAL STATUS
  // ==========================================================================
  {
    id: 'time_entry_approval_status',
    name: 'Approval Status',
    source: 'database',
    field: 'expenses.approval_status',
    formula: 'Enum: pending | approved | rejected',
    dataType: 'enum',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, approval workflows, filtering',
    notes: 'Current approval state of the time entry. Values: pending, approved, rejected.',
    aliases: ['status', 'approval', 'approved'],
    relatedTo: ['time_entry_approved_at', 'time_entry_submitted_at'],
  },

  // ==========================================================================
  // DESCRIPTION/NOTES
  // ==========================================================================
  {
    id: 'time_entry_description',
    name: 'Description',
    source: 'database',
    field: 'expenses.description',
    formula: 'Free text description',
    dataType: 'text',
    domain: 'time_entry',
    whereUsed: 'TimeEntries table, detail views',
    notes: 'Work description or notes for the time entry.',
    aliases: ['notes', 'work description', 'details'],
  },
];

export default timeEntryKPIs;

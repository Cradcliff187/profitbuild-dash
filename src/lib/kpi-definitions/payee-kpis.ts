/**
 * Payee KPI Definitions
 *
 * KPIs for the payees table - vendors, subcontractors, and employees.
 *
 * @version 1.0.0
 * @created 2026-01-30
 * @lastUpdated 2026-01-30
 *
 * CRITICAL DISTINCTIONS:
 * - Vendors: Material suppliers (payee_type = 'vendor')
 * - Subcontractors: Trade contractors (payee_type = 'subcontractor')
 * - Employees: Internal workers (is_internal = true)
 *
 * NOTE: The unified payees table structure exists for QuickBooks compatibility.
 */

import { KPIMeasure } from './types';

export const payeeKPIs: KPIMeasure[] = [
  // ==========================================================================
  // IDENTITY FIELDS
  // ==========================================================================
  {
    id: 'payee_id',
    name: 'Payee ID',
    source: 'database',
    field: 'payees.id',
    formula: 'UUID primary key',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'All payee operations, joins',
    notes: 'Unique identifier for the payee record.',
  },
  {
    id: 'payee_name',
    name: 'Payee Name',
    source: 'database',
    field: 'payees.payee_name',
    formula: 'Business or individual name',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Expenses, quotes, time entries, reports',
    notes: 'Display name for the vendor, subcontractor, or employee.',
    aliases: ['vendor', 'subcontractor', 'employee', 'worker', 'supplier', 'name'],
  },
  {
    id: 'payee_type',
    name: 'Payee Type',
    source: 'database',
    field: 'payees.payee_type',
    formula: 'Enum: vendor | subcontractor | employee',
    dataType: 'enum',
    domain: 'payee',
    whereUsed: 'Filtering, categorization',
    notes: 'Type of payee. Vendors = material suppliers, Subcontractors = trade contractors.',
    aliases: ['type'],
  },

  // ==========================================================================
  // EMPLOYEE-SPECIFIC FIELDS
  // ==========================================================================
  {
    id: 'payee_is_internal',
    name: 'Is Internal Employee',
    source: 'database',
    field: 'payees.is_internal',
    formula: 'Boolean - true for company employees',
    dataType: 'boolean',
    domain: 'payee',
    whereUsed: 'Time entry filtering, labor reports',
    notes: 'True for company employees who log time. False for external vendors/subcontractors.',
    aliases: ['internal', 'employee', 'is employee'],
  },
  {
    id: 'payee_employee_number',
    name: 'Employee Number',
    source: 'database',
    field: 'payees.employee_number',
    formula: 'Company-assigned employee ID',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Time entries, payroll exports',
    notes: 'Internal employee ID number. Only populated for is_internal = true.',
    aliases: ['emp #', 'employee #', 'emp number', 'staff number', 'badge number'],
    relatedTo: ['payee_is_internal'],
  },
  {
    id: 'payee_hourly_rate',
    name: 'Hourly Rate',
    source: 'database',
    field: 'payees.hourly_rate',
    formula: 'Decimal - employee pay rate',
    dataType: 'currency',
    domain: 'payee',
    whereUsed: 'Time entries, labor cost calculations',
    notes: 'Hourly pay rate for internal employees. Used to calculate time entry amounts.',
    aliases: ['rate', 'pay rate', 'hourly pay', 'wage'],
    relatedTo: ['payee_is_internal', 'time_entry_amount'],
  },
  {
    id: 'payee_job_title',
    name: 'Job Title',
    source: 'database',
    field: 'payees.job_title',
    formula: 'Employee position/role',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Employee profiles, reports',
    notes: 'Job title or role for internal employees.',
    aliases: ['title', 'position', 'role'],
  },

  // ==========================================================================
  // CONTACT INFORMATION
  // ==========================================================================
  {
    id: 'payee_email',
    name: 'Email',
    source: 'database',
    field: 'payees.email',
    formula: 'Contact email address',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Contact info, notifications',
    notes: 'Primary email address for the payee.',
    aliases: ['email address'],
  },
  {
    id: 'payee_phone',
    name: 'Phone',
    source: 'database',
    field: 'payees.phone',
    formula: 'Contact phone number',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Contact info, SMS notifications',
    notes: 'Primary phone number for the payee.',
    aliases: ['phone number', 'cell', 'mobile'],
  },
  {
    id: 'payee_address',
    name: 'Address',
    source: 'database',
    field: 'payees.address',
    formula: 'Street address',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Vendor/contractor profiles',
    notes: 'Physical address for the payee.',
  },
  {
    id: 'payee_city',
    name: 'City',
    source: 'database',
    field: 'payees.city',
    formula: 'City name',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Vendor/contractor profiles',
  },
  {
    id: 'payee_state',
    name: 'State',
    source: 'database',
    field: 'payees.state',
    formula: 'State/province code',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Vendor/contractor profiles',
  },
  {
    id: 'payee_zip',
    name: 'ZIP Code',
    source: 'database',
    field: 'payees.zip',
    formula: 'Postal code',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Vendor/contractor profiles',
    aliases: ['zip', 'postal code'],
  },

  // ==========================================================================
  // QUICKBOOKS INTEGRATION
  // ==========================================================================
  {
    id: 'payee_quickbooks_vendor_id',
    name: 'QuickBooks Vendor ID',
    source: 'database',
    field: 'payees.quickbooks_vendor_id',
    formula: 'External ID from QuickBooks',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'QuickBooks sync, CSV imports',
    notes: 'QuickBooks vendor/employee ID for sync purposes.',
    aliases: ['qb id', 'quickbooks id'],
  },
  {
    id: 'payee_account_number',
    name: 'Account Number',
    source: 'database',
    field: 'payees.account_number',
    formula: 'Vendor account number',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Invoicing, payments',
    notes: 'Customer/vendor account number with this payee.',
    aliases: ['account #', 'acct number'],
  },

  // ==========================================================================
  // STATUS & METADATA
  // ==========================================================================
  {
    id: 'payee_status',
    name: 'Payee Status',
    source: 'database',
    field: 'payees.status',
    formula: 'Enum: active | inactive',
    dataType: 'enum',
    domain: 'payee',
    whereUsed: 'Filtering, vendor management',
    notes: 'Active/inactive status for the payee.',
    aliases: ['status', 'active'],
  },
  {
    id: 'payee_created_at',
    name: 'Created At',
    source: 'database',
    field: 'payees.created_at',
    formula: 'Timestamp when record created',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Audit trails',
  },
  {
    id: 'payee_updated_at',
    name: 'Updated At',
    source: 'database',
    field: 'payees.updated_at',
    formula: 'Timestamp when record last updated',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Audit trails',
  },

  // ==========================================================================
  // VENDOR-SPECIFIC FIELDS
  // ==========================================================================
  {
    id: 'payee_vendor_type',
    name: 'Vendor Type',
    source: 'database',
    field: 'payees.vendor_type',
    formula: 'Categorization of vendor specialty',
    dataType: 'text',
    domain: 'payee',
    whereUsed: 'Vendor filtering, quote requests',
    notes: 'Type of materials or services the vendor provides.',
    aliases: ['specialty', 'trade'],
  },
  {
    id: 'payee_tax_id',
    name: 'Tax ID',
    source: 'database',
    field: 'payees.tax_id',
    formula: 'EIN or SSN for 1099 reporting',
    dataType: 'text',
    domain: 'payee',
    whereUsed: '1099 reporting, compliance',
    notes: 'Federal tax ID for vendors/subcontractors. Sensitive field.',
    aliases: ['ein', 'ssn', 'tax number'],
  },

  // ==========================================================================
  // AGGREGATED METRICS (Calculated)
  // ==========================================================================
  {
    id: 'payee_total_expenses',
    name: 'Total Expenses',
    source: 'frontend',
    field: 'SUM(expenses.amount) WHERE payee_id = payee.id',
    formula: 'Sum of all expenses paid to this payee',
    dataType: 'currency',
    domain: 'payee',
    whereUsed: 'Vendor analysis, spending reports',
    notes: 'Total amount paid to this vendor/subcontractor/employee across all projects.',
    aliases: ['total paid', 'spend'],
  },
  {
    id: 'payee_expense_count',
    name: 'Expense Count',
    source: 'frontend',
    field: 'COUNT(expenses) WHERE payee_id = payee.id',
    formula: 'Number of expense records for this payee',
    dataType: 'number',
    domain: 'payee',
    whereUsed: 'Vendor analysis',
    notes: 'Total number of transactions with this payee.',
  },
  {
    id: 'payee_quote_count',
    name: 'Quote Count',
    source: 'frontend',
    field: 'COUNT(quotes) WHERE payee_id = payee.id',
    formula: 'Number of quotes received from this payee',
    dataType: 'number',
    domain: 'payee',
    whereUsed: 'Vendor analysis',
    notes: 'Number of quotes submitted by this vendor.',
  },
  {
    id: 'payee_accepted_quote_count',
    name: 'Accepted Quotes',
    source: 'frontend',
    field: "COUNT(quotes) WHERE payee_id = payee.id AND status = 'accepted'",
    formula: 'Number of accepted quotes from this payee',
    dataType: 'number',
    domain: 'payee',
    whereUsed: 'Vendor performance',
    notes: 'How many quotes from this vendor were accepted.',
  },
];

export default payeeKPIs;

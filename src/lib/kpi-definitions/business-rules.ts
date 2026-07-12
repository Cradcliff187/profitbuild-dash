/**
 * Business Rules
 *
 * Critical rules the AI must follow when generating queries.
 * These prevent common mistakes and ensure accurate results.
 */

import { BusinessRule } from './types';

export const businessRules: BusinessRule[] = [
  // ==========================================================================
  // DATA SOURCE RULES
  // ==========================================================================
  {
    id: 'use_reporting_view',
    category: 'data_source',
    rule: 'Use `reporting.project_financials` view for project financial queries instead of raw `projects` table',
    reason: 'The view pre-calculates aggregations (expenses, invoices, quotes) correctly, including split handling.',
    correctExample: 'SELECT project_name, total_expenses, actual_margin FROM reporting.project_financials',
    incorrectExample: 'SELECT project_name FROM projects p JOIN expenses e ON ... (manual aggregation)',
    severity: 'critical'
  },
  {
    id: 'receipts_documentation_only',
    category: 'data_source',
    rule: 'NEVER use the receipts table for financial calculations - receipts are documentation only',
    reason: 'Receipts are attached as proof of expenses but the financial data comes from expenses table or QuickBooks CSV imports.',
    correctExample: 'SELECT SUM(amount) FROM expenses WHERE project_id = ...',
    incorrectExample: 'SELECT SUM(amount) FROM receipts WHERE project_id = ...',
    severity: 'critical'
  },
  {
    id: 'time_entries_are_expenses',
    category: 'data_source',
    rule: 'Time entries are rows in the `expenses` table WHERE is_time_entry = true. ALWAYS use is_time_entry = true to identify time entries — do NOT filter by category = \'labor_internal\'.',
    reason: "is_time_entry is a generated column (category = 'labor_internal' OR start_time IS NOT NULL). It is the single canonical definition of a time entry. Filtering by category = 'labor_internal' silently drops the time entries of labor-providing subcontractors (payee_type = 'subcontractor', is_internal = false), whose logged time is stored under category = 'subcontractors' but still has is_time_entry = true.",
    correctExample: "SELECT * FROM expenses WHERE is_time_entry = true",
    incorrectExample: "SELECT * FROM expenses WHERE category = 'labor_internal' (misses labor-providing subcontractors) — also wrong: SELECT * FROM time_entries (no such table)",
    severity: 'critical'
  },

  // ==========================================================================
  // FILTERING RULES
  // ==========================================================================
  {
    id: 'filter_by_category',
    category: 'filtering',
    rule: "Always filter projects by category = 'construction' unless user specifically asks for overhead or system projects",
    reason: "System projects (SYS-000) and overhead (001-GAS) are internal - don't include in client-facing reports.",
    correctExample: "SELECT * FROM reporting.project_financials WHERE category = 'construction'",
    incorrectExample: "SELECT * FROM reporting.project_financials (missing category filter)",
    severity: 'critical'
  },
  {
    id: 'employee_filter',
    category: 'filtering',
    rule: "To list employees as an entity, use payees WHERE is_internal = true. BUT for time/hours questions about a person, do NOT add is_internal = true — match by name (ILIKE) and scope with is_time_entry = true. Some people who log time are labor-providing subcontractors (is_internal = false), and gating on is_internal hides their hours entirely.",
    reason: 'Payees contains internal employees AND external vendors/subs. Not everyone who logs labor time is is_internal = true — labor-providing subcontractors do too.',
    correctExample: "-- who worked hours: JOIN payees p ON e.payee_id = p.id WHERE p.payee_name ILIKE '%chris%' AND e.is_time_entry = true (no is_internal filter)",
    incorrectExample: "SELECT ... WHERE p.is_internal = true AND e.category = 'labor_internal' AND p.payee_name ILIKE '%chris%' (misses labor-providing subcontractors like a subcontractor who logs time)",
    severity: 'important'
  },
  {
    id: 'vendor_vs_subcontractor',
    category: 'filtering',
    rule: "Vendors are material suppliers (payee_type='vendor'). Subcontractors are trade contractors (payee_type='subcontractor').",
    reason: 'RCG distinguishes between material suppliers and trade contractors for categorization.',
    correctExample: "SELECT * FROM payees WHERE payee_type = 'vendor' AND is_internal = false",
    severity: 'important'
  },

  // ==========================================================================
  // CALCULATION RULES
  // ==========================================================================
  {
    id: 'cost_vs_price',
    category: 'calculation',
    rule: 'Cost = what RCG pays to vendors/workers. Price = what clients are charged. When comparing quotes to estimates, always use cost fields (total_cost, cost_per_unit), never price fields (total, price_per_unit).',
    reason: 'Important distinction for margin calculations and reporting. Quotes represent vendor cost — compare against estimate cost, not estimate price.',
    severity: 'important'
  },
  {
    id: 'labor_cushion',
    category: 'calculation',
    rule: 'Labor cushion = (billing_rate - actual_cost_rate) × hours. RCG bills at $75/hr, actual cost is ~$35/hr.',
    reason: 'This hidden profit opportunity should be tracked separately from visible markup.',
    severity: 'advisory'
  },
  {
    id: 'actual_vs_adjusted_est_margin',
    category: 'calculation',
    rule: 'actual_margin = invoiced - expenses (REAL profit). adjusted_est_margin = contracted - adjusted estimated costs (EXPECTED profit). current_margin is deprecated — use adjusted_est_margin instead.',
    reason: 'Users asking about "real" or "actual" profit want actual_margin. Users asking about "expected" or "projected" profit want adjusted_est_margin.',
    severity: 'important'
  },
  {
    id: 'use_database_calculations',
    category: 'calculation',
    rule: 'Use pre-calculated fields from the reporting view or projects table instead of recalculating in queries. Prefer reporting.project_financials for multi-project queries; projects table is OK for single project lookups.',
    reason: 'Database triggers maintain these calculations accurately. Manual calculations may be inconsistent.',
    correctExample: 'SELECT actual_margin, adjusted_est_margin FROM reporting.project_financials WHERE project_id = ...',
    incorrectExample: 'SELECT (contracted_amount - (SELECT SUM(amount) FROM expenses...)) as margin',
    severity: 'important'
  },

  // ==========================================================================
  // TERMINOLOGY RULES
  // ==========================================================================
  {
    id: 'project_financial_summary_deprecated',
    category: 'terminology',
    rule: 'The view `project_financial_summary` is deprecated. Use `reporting.project_financials` instead.',
    reason: 'Older documentation may reference the old view name.',
    correctExample: 'SELECT * FROM reporting.project_financials',
    incorrectExample: 'SELECT * FROM project_financial_summary',
    severity: 'important'
  },
  {
    id: 'payees_not_vendors_table',
    category: 'terminology',
    rule: 'All vendors, subcontractors, and employees are in the `payees` table. There is no separate vendors or employees table.',
    reason: 'Unified data structure for QuickBooks compatibility.',
    correctExample: "SELECT * FROM payees WHERE payee_type = 'vendor'",
    incorrectExample: 'SELECT * FROM vendors (table does not exist)',
    severity: 'critical'
  },

  // ==========================================================================
  // QUERY BEST PRACTICES
  // ==========================================================================
  {
    id: 'fuzzy_name_matching',
    category: 'data_source',
    rule: 'Use ILIKE with wildcards for name searches. Names may have variations (John vs John Smith vs J. Smith).',
    reason: 'Exact matching often fails due to name variations in the data.',
    correctExample: "WHERE payee_name ILIKE '%john%'",
    incorrectExample: "WHERE payee_name = 'John'",
    severity: 'important'
  },
  {
    id: 'use_view_for_splits',
    category: 'data_source',
    rule: 'The reporting.project_financials view handles expense and revenue splits correctly. Do not try to manually aggregate.',
    reason: 'Split expenses/revenues are complex - the view handles the UNION logic.',
    severity: 'critical'
  },
  {
    id: 'date_filtering',
    category: 'filtering',
    rule: 'Use project start_date for project date filtering, expense_date for expense filtering.',
    reason: 'Different tables have different date columns.',
    correctExample: "WHERE expense_date >= '2026-01-01'",
    severity: 'advisory'
  },
  {
    id: 'approved_estimates_only',
    category: 'filtering',
    rule: "When querying estimates for financial data, filter by status = 'approved' AND is_current_version = true",
    reason: 'Projects may have multiple estimate versions. Only approved current versions affect financials.',
    correctExample: "SELECT * FROM estimates WHERE status = 'approved' AND is_current_version = true",
    severity: 'important'
  },

  // ==========================================================================
  // SECURITY RULES
  // ==========================================================================
  {
    id: 'expenses_amount_not_total_cost',
    category: 'terminology',
    rule: 'The expenses table cost column is `amount`, NOT `total_cost`. There is no `total_cost` column on expenses. For labor cost per project, use `reporting.internal_labor_hours_by_project` which has pre-calculated `actual_cost`.',
    reason: 'Common AI hallucination: generating e.total_cost when the column is e.amount. The internal_labor_hours_by_project view handles the aggregation correctly.',
    correctExample: "SELECT SUM(e.amount) FROM expenses e WHERE e.category = 'labor_internal'",
    incorrectExample: "SELECT SUM(e.total_cost) FROM expenses e (column does not exist)",
    severity: 'critical'
  },
  {
    id: 'select_only',
    category: 'security',
    rule: 'Only SELECT queries are allowed. No INSERT, UPDATE, DELETE, DROP, or DDL statements.',
    reason: 'AI assistant is read-only. Changes must go through the application.',
    severity: 'critical'
  }
];

export default businessRules;
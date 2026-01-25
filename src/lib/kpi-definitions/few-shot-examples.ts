/**
 * Few-Shot Examples
 *
 * Real examples of questions and correct SQL queries.
 * These teach the AI what good looks like in RCG's context.
 */

import { FewShotExample } from './types';

export const fewShotExamples: FewShotExample[] = [
  // ==========================================================================
  // AGGREGATION QUERIES
  // ==========================================================================
  {
    question: "What's our total profit this month?",
    reasoning: "User wants actual realized profit. Use actual_margin (invoiced - expenses) from the reporting view. Filter to current month and construction projects only.",
    sql: `SELECT
  SUM(actual_margin) as total_profit,
  COUNT(*) as project_count
FROM reporting.project_financials
WHERE category = 'construction'
  AND start_date >= DATE_TRUNC('month', CURRENT_DATE)`,
    kpisUsed: ['actual_margin'],
    category: 'aggregation'
  },
  {
    question: "How much have we spent on materials this year?",
    reasoning: "Looking for expense totals by category. Use expenses table filtered to materials category and current year.",
    sql: `SELECT
  SUM(e.amount) as total_materials,
  COUNT(*) as expense_count
FROM expenses e
WHERE e.category = 'materials'
  AND e.expense_date >= DATE_TRUNC('year', CURRENT_DATE)`,
    kpisUsed: ['total_expenses'],
    category: 'aggregation'
  },
  {
    question: "What's our average margin percentage across all active projects?",
    reasoning: "Need margin_percentage from projects that are in progress. Use the reporting view.",
    sql: `SELECT
  AVG(margin_percentage) as avg_margin_percent,
  MIN(margin_percentage) as min_margin,
  MAX(margin_percentage) as max_margin,
  COUNT(*) as project_count
FROM reporting.project_financials
WHERE category = 'construction'
  AND status IN ('in_progress', 'approved')`,
    kpisUsed: ['margin_percentage'],
    category: 'aggregation'
  },

  // ==========================================================================
  // FILTERING QUERIES
  // ==========================================================================
  {
    question: "Show me projects over budget",
    reasoning: "Over budget means cost_variance > 0. Use the reporting view which calculates this.",
    sql: `SELECT
  project_number,
  project_name,
  cost_variance,
  cost_variance_percent,
  budget_utilization_percent
FROM reporting.project_financials
WHERE category = 'construction'
  AND cost_variance > 0
ORDER BY cost_variance DESC`,
    kpisUsed: ['cost_variance', 'cost_variance_percent', 'budget_utilization_percent'],
    category: 'filtering'
  },
  {
    question: "Which projects have low margins?",
    reasoning: "Low margin typically means below 15-20%. Filter by margin_percentage.",
    sql: `SELECT
  project_number,
  project_name,
  current_margin,
  margin_percentage,
  status
FROM reporting.project_financials
WHERE category = 'construction'
  AND margin_percentage < 15
  AND status NOT IN ('cancelled', 'on_hold')
ORDER BY margin_percentage ASC`,
    kpisUsed: ['current_margin', 'margin_percentage'],
    category: 'filtering'
  },
  {
    question: "Find projects with remaining contingency",
    reasoning: "Check contingency_remaining > 0 for available buffer.",
    sql: `SELECT
  project_number,
  project_name,
  contingency_amount,
  contingency_used,
  contingency_remaining
FROM reporting.project_financials
WHERE category = 'construction'
  AND contingency_remaining > 0
ORDER BY contingency_remaining DESC`,
    kpisUsed: ['contingency_amount', 'contingency_used', 'contingency_remaining'],
    category: 'filtering'
  },

  // ==========================================================================
  // TIME/EMPLOYEE QUERIES
  // ==========================================================================
  {
    question: "How many hours did John work last week?",
    reasoning: "Time entries are in expenses table with category='labor_internal'. Calculate hours from start_time/end_time minus lunch. Use ILIKE for fuzzy name matching. Join to payees for employee info.",
    sql: `SELECT
  p.payee_name,
  SUM(
    CASE
      WHEN e.lunch_taken = true THEN
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
      ELSE
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
    END
  ) as total_hours,
  SUM(e.amount) as total_billed
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE p.is_internal = true
  AND p.payee_name ILIKE '%john%'
  AND e.category = 'labor_internal'
  AND e.expense_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.payee_name`,
    kpisUsed: ['hours_worked'],
    category: 'time_based'
  },
  {
    question: "Show me all employee hours this month by person",
    reasoning: "Aggregate time entries by employee. Calculate net billable hours from start_time/end_time minus lunch. Filter to internal payees only.",
    sql: `SELECT
  p.payee_name as employee,
  SUM(
    CASE
      WHEN e.lunch_taken = true THEN
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600) - (e.lunch_duration_minutes / 60.0)
      ELSE
        (EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600)
    END
  ) as total_hours,
  COUNT(DISTINCT e.project_id) as projects_worked,
  SUM(e.amount) as total_billed
FROM expenses e
JOIN payees p ON e.payee_id = p.id
WHERE p.is_internal = true
  AND e.category = 'labor_internal'
  AND e.expense_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY p.payee_name
ORDER BY total_hours DESC`,
    kpisUsed: ['hours_worked'],
    category: 'time_based'
  },

  // ==========================================================================
  // COMPARISON QUERIES
  // ==========================================================================
  {
    question: "Compare expected vs actual revenue for active projects",
    reasoning: "contracted_amount is expected, total_invoiced is actual. Calculate the gap.",
    sql: `SELECT
  project_number,
  project_name,
  contracted_amount as expected_revenue,
  total_invoiced as actual_revenue,
  revenue_variance as remaining_to_bill,
  CASE
    WHEN contracted_amount > 0
    THEN ROUND((total_invoiced / contracted_amount * 100)::numeric, 1)
    ELSE 0
  END as billing_progress_percent
FROM reporting.project_financials
WHERE category = 'construction'
  AND status IN ('in_progress', 'approved')
ORDER BY revenue_variance DESC`,
    kpisUsed: ['contracted_amount', 'total_invoiced', 'revenue_variance'],
    category: 'comparison'
  },
  {
    question: "How do our original estimates compare to actual costs?",
    reasoning: "Compare original_est_costs to total_expenses. Calculate variance.",
    sql: `SELECT
  project_number,
  project_name,
  original_est_costs as estimated,
  total_expenses as actual,
  (total_expenses - original_est_costs) as variance,
  CASE
    WHEN original_est_costs > 0
    THEN ROUND(((total_expenses - original_est_costs) / original_est_costs * 100)::numeric, 1)
    ELSE 0
  END as variance_percent
FROM reporting.project_financials
WHERE category = 'construction'
  AND status IN ('complete', 'in_progress')
  AND original_est_costs > 0
ORDER BY variance DESC`,
    kpisUsed: ['original_est_costs', 'total_expenses', 'cost_variance'],
    category: 'comparison'
  },

  // ==========================================================================
  // LOOKUP QUERIES
  // ==========================================================================
  {
    question: "What's the status of the Smith project?",
    reasoning: "Lookup by partial project or client name using ILIKE.",
    sql: `SELECT
  project_number,
  project_name,
  client_name,
  status,
  contracted_amount,
  total_expenses,
  current_margin,
  margin_percentage
FROM reporting.project_financials
WHERE category = 'construction'
  AND (project_name ILIKE '%smith%' OR client_name ILIKE '%smith%')`,
    kpisUsed: ['contracted_amount', 'total_expenses', 'current_margin', 'margin_percentage'],
    category: 'lookup'
  },
  {
    question: "Show me all expenses for project 2024-001",
    reasoning: "Direct lookup by project number. Get expense details.",
    sql: `SELECT
  e.expense_date,
  e.category,
  e.amount,
  e.description,
  p.payee_name as vendor
FROM expenses e
LEFT JOIN payees p ON e.payee_id = p.id
WHERE e.project_id = (
  SELECT id FROM projects WHERE project_number = '2024-001'
)
ORDER BY e.expense_date DESC`,
    kpisUsed: ['total_expenses'],
    category: 'lookup'
  },

  // ==========================================================================
  // TIME-BASED QUERIES
  // ==========================================================================
  {
    question: "What projects did we complete last quarter?",
    reasoning: "Filter by status='complete' and end_date in previous quarter.",
    sql: `SELECT
  project_number,
  project_name,
  client_name,
  end_date,
  contracted_amount,
  total_invoiced,
  actual_margin,
  margin_percentage
FROM reporting.project_financials
WHERE category = 'construction'
  AND status = 'complete'
  AND end_date >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '3 months'
  AND end_date < DATE_TRUNC('quarter', CURRENT_DATE)
ORDER BY end_date DESC`,
    kpisUsed: ['contracted_amount', 'total_invoiced', 'actual_margin', 'margin_percentage'],
    category: 'time_based'
  },
  {
    question: "Show me expenses from yesterday",
    reasoning: "Simple date filter on expenses table.",
    sql: `SELECT
  e.expense_date,
  proj.project_number,
  e.category,
  e.amount,
  e.description,
  p.payee_name
FROM expenses e
JOIN projects proj ON e.project_id = proj.id
LEFT JOIN payees p ON e.payee_id = p.id
WHERE e.expense_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY e.amount DESC`,
    kpisUsed: ['total_expenses'],
    category: 'time_based'
  },

  // ==========================================================================
  // LABOR CUSHION QUERIES
  // ==========================================================================
  {
    question: "What's our total labor profit opportunity?",
    reasoning: "Labor cushion is the hidden profit from billing at $75/hr vs $35/hr actual cost. Use the estimated_labor_cushion from the view.",
    sql: `SELECT
  SUM(estimated_labor_cushion) as total_labor_opportunity,
  SUM(estimated_labor_hours) as total_labor_hours,
  SUM(estimated_max_profit_potential) as total_max_profit_potential,
  COUNT(*) as project_count
FROM reporting.project_financials
WHERE category = 'construction'
  AND status IN ('in_progress', 'approved')
  AND estimated_labor_cushion > 0`,
    kpisUsed: ['estimated_labor_cushion', 'estimated_labor_hours', 'estimated_max_profit_potential'],
    category: 'aggregation'
  }
];

export default fewShotExamples;
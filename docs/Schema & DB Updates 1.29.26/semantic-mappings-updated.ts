/**
 * Semantic Mappings
 *
 * Maps business concepts/terms to specific KPIs.
 * This is the "translator" that helps AI understand what users mean.
 *
 * @version 2.0.0
 * @lastUpdated 2026-01-30
 *
 * CHANGELOG v2.0.0:
 * - Updated margin concept to default to adjusted_est_margin (was current_margin)
 * - Added adjusted_est_margin to profit disambiguation
 * - Marked current_margin as deprecated in disambiguation
 * - Added new employee/worker concepts
 */

import { SemanticMapping } from './types';

export const semanticMappings: SemanticMapping[] = [
  // ==========================================================================
  // PROFIT / MARGIN CONCEPTS - UPDATED
  // ==========================================================================
  {
    concept: 'profit',
    aliases: ['earnings', 'made', 'earned', 'net', 'bottom line', 'money made'],
    description: 'Money made on a project after expenses',
    kpiIds: ['actual_margin', 'adjusted_est_margin', 'original_margin'],
    defaultKpiId: 'actual_margin',
    disambiguation: {
      actual_margin: 'Use when user asks about REAL/ACTUAL/TRUE profit (total_invoiced - total_expenses). This is realized profit.',
      adjusted_est_margin: 'Use when user asks about EXPECTED/PROJECTED/FORECAST profit (contracted_amount - adjusted_est_costs)',
      original_margin: 'Use when user asks about ORIGINAL/BASELINE profit estimate from initial approved estimate',
      // REMOVED: current_margin - deprecated
    }
  },
  {
    concept: 'margin',
    aliases: ['markup', 'spread', 'profit margin'],
    description: 'Difference between revenue and costs',
    kpiIds: ['adjusted_est_margin', 'actual_margin', 'margin_percentage', 'original_margin'],
    defaultKpiId: 'adjusted_est_margin', // CHANGED from current_margin
    disambiguation: {
      adjusted_est_margin: 'Default - expected margin based on current estimates (contracted - adjusted costs)',
      actual_margin: 'Real margin - actual invoiced minus actual expenses',
      margin_percentage: 'When user asks for percentage/percent',
      original_margin: 'Baseline margin from original estimate',
      // NOTE: current_margin is DEPRECATED - do not use
    }
  },
  {
    concept: 'projected margin',
    aliases: ['expected margin', 'forecast margin', 'estimated margin', 'projected profit'],
    description: 'Expected final margin based on current estimates',
    kpiIds: ['adjusted_est_margin'],
    defaultKpiId: 'adjusted_est_margin',
    disambiguation: {
      adjusted_est_margin: 'Expected margin = contracted_amount - adjusted_est_costs'
    }
  },

  // ==========================================================================
  // REVENUE CONCEPTS
  // ==========================================================================
  {
    concept: 'revenue',
    aliases: ['income', 'sales', 'money coming in', 'billed'],
    description: 'Money received or expected from clients',
    kpiIds: ['total_invoiced', 'contracted_amount'],
    defaultKpiId: 'total_invoiced',
    disambiguation: {
      total_invoiced: 'ACTUAL revenue received/billed to date',
      contracted_amount: 'EXPECTED total revenue from contract'
    }
  },
  {
    concept: 'contract',
    aliases: ['contract value', 'deal size', 'project value', 'contract amount'],
    description: 'Total agreed contract value with client',
    kpiIds: ['contracted_amount'],
    defaultKpiId: 'contracted_amount',
    disambiguation: {
      contracted_amount: 'Total contract = original estimate + approved change orders'
    }
  },
  {
    concept: 'invoiced',
    aliases: ['billed', 'collected', 'received', 'paid by client'],
    description: 'Actual revenue received from client',
    kpiIds: ['total_invoiced'],
    defaultKpiId: 'total_invoiced',
    disambiguation: {
      total_invoiced: 'Sum of all invoices/payments received'
    }
  },

  // ==========================================================================
  // COST CONCEPTS
  // ==========================================================================
  {
    concept: 'costs',
    aliases: ['expenses', 'spending', 'spent', 'paid out', 'outgoing'],
    description: 'Money spent on project',
    kpiIds: ['total_expenses', 'adjusted_est_costs', 'original_est_costs'],
    defaultKpiId: 'total_expenses',
    disambiguation: {
      total_expenses: 'ACTUAL costs incurred to date',
      adjusted_est_costs: 'EXPECTED total costs (estimate + quotes + change orders)',
      original_est_costs: 'ORIGINAL estimated costs from first approved estimate'
    }
  },
  {
    concept: 'budget',
    aliases: ['estimated costs', 'cost estimate', 'projected costs'],
    description: 'Planned/estimated project costs',
    kpiIds: ['adjusted_est_costs', 'original_est_costs'],
    defaultKpiId: 'adjusted_est_costs',
    disambiguation: {
      adjusted_est_costs: 'Current budget (includes quote adjustments and change orders)',
      original_est_costs: 'Original budget from first estimate'
    }
  },
  {
    concept: 'over budget',
    aliases: ['budget overrun', 'cost overrun', 'overspent'],
    description: 'Projects spending more than estimated',
    kpiIds: ['cost_variance', 'cost_variance_percent', 'budget_utilization_percent'],
    defaultKpiId: 'cost_variance',
    disambiguation: {
      cost_variance: 'Positive = over budget, negative = under budget',
      budget_utilization_percent: 'Over 100% = over budget'
    }
  },

  // ==========================================================================
  // EMPLOYEE / WORKER CONCEPTS - NEW
  // ==========================================================================
  {
    concept: 'employee',
    aliases: ['worker', 'staff', 'team member', 'field worker', 'crew'],
    description: 'Internal company employees',
    kpiIds: ['worker_name', 'employee_number', 'payee_hourly_rate'],
    defaultKpiId: 'worker_name',
    disambiguation: {
      worker_name: 'Employee name (from payees table)',
      employee_number: 'Employee ID number',
      payee_hourly_rate: 'Employee pay rate'
    }
  },
  {
    concept: 'hours',
    aliases: ['time', 'worked', 'labor hours'],
    description: 'Time worked by employees',
    kpiIds: ['time_entry_hours', 'time_entry_gross_hours'],
    defaultKpiId: 'time_entry_hours',
    disambiguation: {
      time_entry_hours: 'NET billable hours (after lunch deduction) - use for payroll',
      time_entry_gross_hours: 'GROSS total hours (shift duration before lunch) - use for compliance'
    }
  },
  {
    concept: 'overtime',
    aliases: ['OT', 'extra hours', 'over 8 hours'],
    description: 'Hours beyond standard work day',
    kpiIds: ['time_entry_gross_hours'],
    defaultKpiId: 'time_entry_gross_hours',
    disambiguation: {
      time_entry_gross_hours: 'Use gross hours (>8) to identify potential overtime'
    }
  },

  // ==========================================================================
  // VENDOR / SUBCONTRACTOR CONCEPTS
  // ==========================================================================
  {
    concept: 'vendor',
    aliases: ['supplier', 'material supplier', 'materials vendor'],
    description: 'External material suppliers',
    kpiIds: ['payee_name'],
    defaultKpiId: 'payee_name',
    disambiguation: {
      payee_name: 'Vendor name (filter by payee_type = vendor)'
    }
  },
  {
    concept: 'subcontractor',
    aliases: ['sub', 'contractor', 'trade contractor'],
    description: 'External trade contractors',
    kpiIds: ['payee_name'],
    defaultKpiId: 'payee_name',
    disambiguation: {
      payee_name: 'Subcontractor name (filter by payee_type = subcontractor)'
    }
  },

  // ==========================================================================
  // QUOTE CONCEPTS
  // ==========================================================================
  {
    concept: 'quotes',
    aliases: ['bids', 'proposals', 'estimates from vendors'],
    description: 'Quotes received from vendors/subcontractors',
    kpiIds: ['quote_total_amount', 'quote_status', 'total_accepted_quotes'],
    defaultKpiId: 'quote_total_amount',
    disambiguation: {
      quote_total_amount: 'Amount quoted by vendor',
      quote_status: 'Quote status (pending/accepted/rejected)',
      total_accepted_quotes: 'Sum of all accepted quotes for project'
    }
  },

  // ==========================================================================
  // CONTINGENCY CONCEPTS
  // ==========================================================================
  {
    concept: 'contingency',
    aliases: ['buffer', 'reserve', 'safety margin', 'cushion'],
    description: 'Budget buffer for unexpected costs',
    kpiIds: ['contingency_amount', 'contingency_remaining', 'contingency_used'],
    defaultKpiId: 'contingency_remaining',
    disambiguation: {
      contingency_remaining: 'How much contingency is left',
      contingency_used: 'How much contingency has been consumed',
      contingency_amount: 'Original contingency amount'
    }
  },

  // ==========================================================================
  // CHANGE ORDER CONCEPTS
  // ==========================================================================
  {
    concept: 'change orders',
    aliases: ['COs', 'scope changes', 'modifications', 'change requests'],
    description: 'Approved changes to project scope',
    kpiIds: ['change_order_revenue', 'change_order_cost', 'change_order_count'],
    defaultKpiId: 'change_order_count',
    disambiguation: {
      change_order_revenue: 'Revenue added from change orders',
      change_order_cost: 'Cost added from change orders',
      change_order_count: 'Number of approved change orders'
    }
  },

  // ==========================================================================
  // TIME TRACKING CONCEPTS
  // ==========================================================================
  {
    concept: 'time entries',
    aliases: ['timesheets', 'time records', 'labor entries', 'clock entries'],
    description: 'Employee time tracking records',
    kpiIds: ['time_entry_hours', 'time_entry_amount', 'time_entry_approval_status'],
    defaultKpiId: 'time_entry_hours',
    disambiguation: {
      time_entry_hours: 'Billable hours worked',
      time_entry_amount: 'Labor cost for entry',
      time_entry_approval_status: 'Approval status (pending/approved/rejected)'
    }
  },
  {
    concept: 'pending approval',
    aliases: ['unapproved', 'awaiting approval', 'needs approval'],
    description: 'Items waiting for manager approval',
    kpiIds: ['time_entry_approval_status'],
    defaultKpiId: 'time_entry_approval_status',
    disambiguation: {
      time_entry_approval_status: "Filter by approval_status = 'pending'"
    }
  },

  // ==========================================================================
  // PROJECT STATUS CONCEPTS
  // ==========================================================================
  {
    concept: 'active projects',
    aliases: ['in progress', 'ongoing', 'current projects'],
    description: 'Projects currently being worked on',
    kpiIds: ['project_status'],
    defaultKpiId: 'project_status',
    disambiguation: {
      project_status: "Filter by status IN ('approved', 'in_progress')"
    }
  },
  {
    concept: 'completed projects',
    aliases: ['finished', 'done', 'closed projects'],
    description: 'Projects that are complete',
    kpiIds: ['project_status'],
    defaultKpiId: 'project_status',
    disambiguation: {
      project_status: "Filter by status = 'complete'"
    }
  },
];

export default semanticMappings;

/**
 * Semantic Mappings
 *
 * Maps business concepts/terms to specific KPIs.
 * This is the "translator" that helps AI understand what users mean.
 *
 * Example: User asks "What's our profit?"
 * → AI looks up "profit" → finds actual_margin is the default
 * → AI uses projects.actual_margin in the query
 */

import { SemanticMapping } from './types';

export const semanticMappings: SemanticMapping[] = [
  // ==========================================================================
  // PROFIT / MARGIN CONCEPTS
  // ==========================================================================
  {
    concept: 'profit',
    aliases: ['earnings', 'made', 'earned', 'net', 'bottom line'],
    description: 'Money made on a project after expenses',
    kpiIds: ['actual_margin', 'current_margin', 'projected_margin', 'original_margin'],
    defaultKpiId: 'actual_margin',
    disambiguation: {
      actual_margin: 'Use when user asks about REAL/ACTUAL/TRUE profit (invoiced - expenses)',
      current_margin: 'Use when user asks about EXPECTED profit based on contract (contracted - expenses)',
      projected_margin: 'Use when user asks about FORECAST/PROJECTED final profit',
      original_margin: 'Use when user asks about ORIGINAL/BASELINE profit estimate'
    }
  },
  {
    concept: 'margin',
    aliases: ['markup', 'spread'],
    description: 'Difference between revenue and costs',
    kpiIds: ['current_margin', 'actual_margin', 'margin_percentage', 'projected_margin'],
    defaultKpiId: 'current_margin',
    disambiguation: {
      current_margin: 'Default - contract value minus expenses',
      actual_margin: 'Real margin - invoiced minus expenses',
      margin_percentage: 'When user asks for percentage/percent'
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
      total_invoiced: 'ACTUAL revenue received (invoices sent)',
      contracted_amount: 'EXPECTED revenue (contract value)'
    }
  },
  {
    concept: 'contract',
    aliases: ['contract value', 'deal size', 'project value'],
    description: 'Total contracted amount with client',
    kpiIds: ['contracted_amount'],
    defaultKpiId: 'contracted_amount'
  },
  {
    concept: 'invoiced',
    aliases: ['billed', 'collected', 'received'],
    description: 'Actual amounts billed to clients',
    kpiIds: ['total_invoiced', 'invoice_count'],
    defaultKpiId: 'total_invoiced'
  },
  {
    concept: 'remaining to bill',
    aliases: ['unbilled', 'left to invoice', 'billing gap', 'still owed'],
    description: 'Contract amount not yet invoiced',
    kpiIds: ['revenue_variance'],
    defaultKpiId: 'revenue_variance'
  },

  // ==========================================================================
  // COST CONCEPTS
  // ==========================================================================
  {
    concept: 'costs',
    aliases: ['expenses', 'spent', 'spending', 'outflow', 'paid out'],
    description: 'Money spent on the project',
    kpiIds: ['total_expenses', 'adjusted_est_costs', 'original_est_costs'],
    defaultKpiId: 'total_expenses',
    disambiguation: {
      total_expenses: 'ACTUAL costs incurred (default)',
      adjusted_est_costs: 'ESTIMATED/BUDGETED costs',
      original_est_costs: 'ORIGINAL estimate (baseline)'
    }
  },
  {
    concept: 'budget',
    aliases: ['budgeted', 'estimated costs', 'planned costs'],
    description: 'Planned/estimated costs for the project',
    kpiIds: ['adjusted_est_costs', 'original_est_costs', 'remaining_budget'],
    defaultKpiId: 'adjusted_est_costs'
  },
  {
    concept: 'over budget',
    aliases: ['overspent', 'exceeded budget', 'cost overrun'],
    description: 'When actual costs exceed estimates',
    kpiIds: ['cost_variance', 'cost_variance_percent'],
    defaultKpiId: 'cost_variance'
  },
  {
    concept: 'under budget',
    aliases: ['savings', 'cost savings', 'below budget'],
    description: 'When actual costs are less than estimates',
    kpiIds: ['cost_variance', 'remaining_budget'],
    defaultKpiId: 'cost_variance'
  },

  // ==========================================================================
  // CONTINGENCY CONCEPTS
  // ==========================================================================
  {
    concept: 'contingency',
    aliases: ['buffer', 'reserve', 'safety margin', 'cushion'],
    description: 'Budget set aside for unknowns',
    kpiIds: ['contingency_amount', 'contingency_used', 'contingency_remaining'],
    defaultKpiId: 'contingency_remaining',
    disambiguation: {
      contingency_amount: 'Total contingency allocated',
      contingency_used: 'Contingency already consumed',
      contingency_remaining: 'Contingency still available'
    }
  },

  // ==========================================================================
  // LABOR CONCEPTS
  // ==========================================================================
  {
    concept: 'labor',
    aliases: ['workers', 'hours', 'time', 'labor costs'],
    description: 'Internal employee work',
    kpiIds: ['estimated_labor_hours', 'estimated_labor_cushion'],
    defaultKpiId: 'estimated_labor_hours'
  },
  {
    concept: 'labor cushion',
    aliases: ['labor opportunity', 'labor profit', 'hidden profit', 'rate spread'],
    description: 'Hidden profit from billing $75/hr vs $35/hr actual cost',
    kpiIds: ['estimated_labor_cushion', 'estimated_max_profit_potential'],
    defaultKpiId: 'estimated_labor_cushion'
  },

  // ==========================================================================
  // TIME / HOURS CONCEPTS
  // ==========================================================================
  {
    concept: 'hours',
    aliases: ['time worked', 'hours logged', 'time entries'],
    description: 'Employee work hours',
    kpiIds: ['estimated_labor_hours'],
    defaultKpiId: 'estimated_labor_hours'
  },

  // ==========================================================================
  // EMPLOYEE CONCEPTS
  // ==========================================================================
  {
    concept: 'employee',
    aliases: ['worker', 'staff', 'team member', 'internal'],
    description: 'Internal company employees (not subcontractors)',
    kpiIds: [],  // Not a KPI, but important for query filtering
    defaultKpiId: '',
    disambiguation: {
      '': 'Use payees table WHERE is_internal = true'
    }
  },
  {
    concept: 'subcontractor',
    aliases: ['sub', 'trade contractor', 'contractor'],
    description: 'External trade contractors (not employees)',
    kpiIds: [],
    defaultKpiId: '',
    disambiguation: {
      '': "Use payees table WHERE payee_type = 'subcontractor' AND is_internal = false"
    }
  },
  {
    concept: 'vendor',
    aliases: ['supplier', 'material supplier'],
    description: 'Material suppliers (not subcontractors)',
    kpiIds: [],
    defaultKpiId: '',
    disambiguation: {
      '': "Use payees table WHERE payee_type = 'vendor' AND is_internal = false"
    }
  },

  // ==========================================================================
  // QUOTE CONCEPTS
  // ==========================================================================
  {
    concept: 'quotes',
    aliases: ['bids', 'proposals', 'vendor quotes'],
    description: 'Vendor quotes for materials/services',
    kpiIds: ['total_accepted_quotes'],
    defaultKpiId: 'total_accepted_quotes'
  },

  // ==========================================================================
  // CHANGE ORDER CONCEPTS
  // ==========================================================================
  {
    concept: 'change orders',
    aliases: ['COs', 'changes', 'scope changes', 'modifications'],
    description: 'Approved changes to original scope',
    kpiIds: ['change_order_amount'],
    defaultKpiId: 'change_order_amount'
  },

  // ==========================================================================
  // PROJECT STATE CONCEPTS
  // ==========================================================================
  {
    concept: 'active projects',
    aliases: ['in progress', 'ongoing', 'current projects'],
    description: "Projects currently being worked on",
    kpiIds: ['project_status'],
    defaultKpiId: 'project_status',
    disambiguation: {
      project_status: "Filter WHERE status IN ('in_progress', 'approved')"
    }
  },
  {
    concept: 'completed projects',
    aliases: ['finished', 'done', 'closed'],
    description: 'Projects that are finished',
    kpiIds: ['project_status'],
    defaultKpiId: 'project_status',
    disambiguation: {
      project_status: "Filter WHERE status = 'complete'"
    }
  },

  // ==========================================================================
  // PERFORMANCE CONCEPTS
  // ==========================================================================
  {
    concept: 'performance',
    aliases: ['doing', 'performing', 'health'],
    description: 'How well a project is doing financially',
    kpiIds: ['margin_percentage', 'cost_variance_percent', 'budget_utilization_percent'],
    defaultKpiId: 'margin_percentage'
  },
  {
    concept: 'at risk',
    aliases: ['troubled', 'problem', 'warning', 'concern'],
    description: 'Projects with potential issues',
    kpiIds: ['cost_variance', 'margin_percentage'],
    defaultKpiId: 'cost_variance',
    disambiguation: {
      cost_variance: 'Use when cost_variance > 0 (over budget)',
      margin_percentage: 'Use when margin below threshold'
    }
  }
];

export default semanticMappings;
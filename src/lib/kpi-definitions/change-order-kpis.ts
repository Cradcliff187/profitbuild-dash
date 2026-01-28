/**
 * Change Order KPI Definitions
 *
 * Metrics related to approved changes to original project scope.
 * Change orders are stored in the change_orders table.
 *
 * AUDIT NOTES (2026-01-23):
 * - Change orders update project financials when approved
 * - client_amount is what the client pays for the change
 * - cost_impact is the additional cost to RCG
 * - margin_impact = client_amount - cost_impact
 * - contingency can be billed to client via contingency_billed_to_client
 */

import { KPIMeasure } from './types';

export const changeOrderKPIs: KPIMeasure[] = [
  // ==========================================================================
  // BASIC CHANGE ORDER METRICS
  // ==========================================================================
  {
    id: 'change_order_amount',
    name: 'Amount',
    source: 'database',
    field: 'change_orders.amount',
    formula: 'Direct field - CO cost impact amount',
    dataType: 'currency',
    domain: 'change_order',
    whereUsed: 'ChangeOrdersList, budget impact analysis',
    notes: 'The dollar impact of the change order on project costs.',
    aliases: ['CO amount', 'change amount', 'cost impact', 'impact amount'],
    relatedTo: ['change_order_client_amount', 'change_order_margin_impact'],
  },
  {
    id: 'change_order_client_amount',
    name: 'Client Amount',
    source: 'database',
    field: 'change_orders.client_amount',
    formula: 'Amount charged to client for the change',
    dataType: 'currency',
    domain: 'change_order',
    whereUsed: 'Billing, margin calculations, client pricing',
    notes: 'What the client is charged for this change order.',
    aliases: ['client amount', 'charged amount', 'billing amount'],
    relatedTo: ['change_order_amount', 'change_order_margin_impact'],
  },
  {
    id: 'change_order_cost_impact',
    name: 'Cost Impact',
    source: 'database',
    field: 'change_orders.cost_impact',
    formula: 'Change to project costs (same as amount field)',
    dataType: 'currency',
    domain: 'change_order',
    whereUsed: 'Budget revisions, cost tracking, financial impact',
    notes: 'How much this change adds to RCG\'s costs.',
    aliases: ['cost impact', 'additional cost', 'cost change'],
    relatedTo: ['change_order_client_amount', 'change_order_margin_impact'],
  },
  {
    id: 'change_order_margin_impact',
    name: 'Margin Impact',
    source: 'database',
    field: 'change_orders.margin_impact',
    formula: 'client_amount - cost_impact',
    dataType: 'currency',
    domain: 'change_order',
    whereUsed: 'Profitability tracking, margin analysis',
    notes: 'Profit impact of the change order (client_amount - cost_impact).',
    aliases: ['margin impact', 'profit impact', 'margin change'],
    relatedTo: ['change_order_client_amount', 'change_order_cost_impact'],
  },

  // ==========================================================================
  // CONTINGENCY-RELATED METRICS
  // ==========================================================================
  {
    id: 'change_order_contingency_billed_to_client',
    name: 'Contingency Billed to Client',
    source: 'database',
    field: 'change_orders.contingency_billed_to_client',
    formula: 'Portion of contingency recovered from client',
    dataType: 'currency',
    domain: 'change_order',
    whereUsed: 'ContingencyAllocation, contingency tracking',
    notes: 'Amount of project contingency that was billed to the client as part of this change.',
    aliases: ['contingency billed', 'recovered contingency', 'contingency recovery'],
    relatedTo: ['contingency_amount', 'contingency_used'],
  },
  {
    id: 'change_order_includes_contingency',
    name: 'Includes Contingency',
    source: 'database',
    field: 'change_orders.includes_contingency',
    formula: 'Boolean flag indicating contingency usage',
    dataType: 'boolean',
    domain: 'change_order',
    whereUsed: 'Budget tracking, contingency management',
    notes: 'Whether this change order utilizes project contingency.',
    aliases: ['uses contingency', 'contingency included', 'from contingency'],
  },

  // ==========================================================================
  // CHANGE ORDER METADATA
  // ==========================================================================
  {
    id: 'change_order_status',
    name: 'Status',
    source: 'database',
    field: 'change_orders.status',
    formula: "ENUM: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'",
    dataType: 'enum',
    domain: 'change_order',
    whereUsed: 'Change order workflow, status tracking, approvals',
    notes: 'Current approval status of the change order.',
    aliases: ['CO status', 'approval status', 'status'],
  },
  {
    id: 'change_order_type',
    name: 'Type',
    source: 'database',
    field: 'change_orders.type',
    formula: "ENUM: 'addition' | 'deduction' | 'modification' | 'time_extension'",
    dataType: 'enum',
    domain: 'change_order',
    whereUsed: 'Change order categorization, reporting, analysis',
    notes: 'Type of change being requested.',
    aliases: ['CO type', 'change type', 'type'],
  },
  {
    id: 'change_order_description',
    name: 'Description',
    source: 'database',
    field: 'change_orders.description',
    formula: 'Detailed explanation of the change',
    dataType: 'text',
    domain: 'change_order',
    whereUsed: 'Change order details, documentation, client communication',
    notes: 'Human-readable description of what the change entails.',
    aliases: ['description', 'details', 'explanation', 'scope'],
  },
  {
    id: 'change_order_requested_by',
    name: 'Requested By',
    source: 'database',
    field: 'change_orders.requested_by',
    formula: 'User ID of person who requested the change',
    dataType: 'text',
    domain: 'change_order',
    whereUsed: 'Audit trail, responsibility tracking',
    notes: 'Who initiated this change order request.',
    aliases: ['requester', 'requested by', 'initiated by'],
  },
  {
    id: 'change_order_approved_by',
    name: 'Approved By',
    source: 'database',
    field: 'change_orders.approved_by',
    formula: 'User ID of person who approved the change',
    dataType: 'text',
    domain: 'change_order',
    whereUsed: 'Audit trail, approval workflow',
    notes: 'Who approved this change order.',
    aliases: ['approver', 'approved by', 'authorized by'],
  },
  {
    id: 'change_order_approved_at',
    name: 'Approved At',
    source: 'database',
    field: 'change_orders.approved_at',
    formula: 'Timestamp when change was approved',
    dataType: 'date',
    domain: 'change_order',
    whereUsed: 'Timeline tracking, approval metrics',
    notes: 'When the change order was officially approved.',
    aliases: ['approved date', 'approval date', 'approved at'],
  },
  {
    id: 'change_order_submitted_at',
    name: 'Submitted At',
    source: 'database',
    field: 'change_orders.submitted_at',
    formula: 'Timestamp when change was submitted for approval',
    dataType: 'date',
    domain: 'change_order',
    whereUsed: 'Workflow timing, process metrics',
    notes: 'When the change order was submitted for approval.',
    aliases: ['submitted date', 'submission date', 'submitted at'],
  },

  // ==========================================================================
  // PROJECT IMPACT METRICS
  // ==========================================================================
  {
    id: 'change_order_project_impact',
    name: 'Project Impact',
    source: 'frontend',
    field: 'calculateChangeOrderImpact()',
    formula: 'Combined impact on project timeline and budget',
    dataType: 'text',
    domain: 'change_order',
    whereUsed: 'Project management, impact assessment',
    notes: 'Overall assessment of how the change affects the project.',
    aliases: ['impact', 'project impact', 'effect on project'],
  },
  {
    id: 'change_order_schedule_impact_days',
    name: 'Schedule Impact (Days)',
    source: 'database',
    field: 'change_orders.schedule_impact_days',
    formula: 'Number of days added to project timeline',
    dataType: 'number',
    domain: 'change_order',
    whereUsed: 'Schedule management, project planning',
    notes: 'How many days this change adds to the project duration.',
    aliases: ['schedule impact', 'timeline impact', 'days added'],
  },
];

export default changeOrderKPIs;
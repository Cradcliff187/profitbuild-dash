/**
 * Deprecated KPI Definitions
 *
 * Legacy fields that are no longer used or have been replaced.
 * Kept for reference and migration guidance.
 *
 * AUDIT NOTES (2026-01-23):
 * - These fields should not be used in new code
 * - References to these should be updated to use replacements
 * - Kept for backward compatibility documentation
 */

import { KPIMeasure } from './types';

export const deprecatedKPIs: KPIMeasure[] = [
  {
    id: 'deprecated_project_budget',
    name: 'Project Budget',
    source: 'deprecated',
    field: 'projects.budget',
    formula: 'Replaced by contracted_amount',
    dataType: 'currency',
    domain: 'project',
    whereUsed: 'N/A - no longer used',
    notes: 'Legacy field replaced by contracted_amount. Use contracted_amount instead.',
    replacedBy: 'contracted_amount',
    aliases: ['budget', 'old budget'],
  },
  {
    id: 'deprecated_estimate_rate',
    name: 'Estimate Rate',
    source: 'deprecated',
    field: 'estimate_line_items.rate',
    formula: 'Replaced by price_per_unit',
    dataType: 'currency',
    domain: 'estimate',
    whereUsed: 'N/A - no longer used',
    notes: 'Legacy field replaced by price_per_unit. Use price_per_unit instead.',
    replacedBy: 'estimate_line_item_total',
    aliases: ['rate', 'old rate', 'line rate'],
  },
  {
    id: 'deprecated_old_revenue_calculations',
    name: 'Old Revenue Calculations',
    source: 'deprecated',
    field: 'Various legacy fields',
    formula: 'See project_revenues table',
    dataType: 'currency',
    domain: 'revenue',
    whereUsed: 'N/A - no longer used',
    notes: 'Revenue tracking moved to dedicated project_revenues table. Use total_invoiced instead.',
    replacedBy: 'revenue_total_invoiced',
    aliases: ['old revenue', 'legacy revenue', 'old invoicing'],
  },
  {
    id: 'deprecated_old_expense_tracking',
    name: 'Old Expense Tracking',
    source: 'deprecated',
    field: 'Legacy expense fields',
    formula: 'See expenses table',
    dataType: 'currency',
    domain: 'expense',
    whereUsed: 'N/A - no longer used',
    notes: 'Expense tracking moved to dedicated expenses table with proper categorization.',
    replacedBy: 'expense_amount',
    aliases: ['old expenses', 'legacy expenses'],
  },
  {
    id: 'deprecated_old_quote_system',
    name: 'Old Quote System',
    source: 'deprecated',
    field: 'Legacy quote fields',
    formula: 'See quotes table',
    dataType: 'currency',
    domain: 'quote',
    whereUsed: 'N/A - no longer used',
    notes: 'Quote system moved to dedicated quotes table with proper vendor management.',
    replacedBy: 'quote_quote_amount',
    aliases: ['old quotes', 'legacy quotes'],
  },
  {
    id: 'deprecated_old_change_order_tracking',
    name: 'Old Change Order Tracking',
    source: 'deprecated',
    field: 'Legacy CO fields',
    formula: 'See change_orders table',
    dataType: 'currency',
    domain: 'change_order',
    whereUsed: 'N/A - no longer used',
    notes: 'Change order tracking moved to dedicated change_orders table.',
    replacedBy: 'change_order_amount',
    aliases: ['old COs', 'legacy change orders'],
  },
  {
    id: 'deprecated_old_work_order_fields',
    name: 'Old Work Order Fields',
    source: 'deprecated',
    field: 'Legacy WO fields',
    formula: 'See projects table with project_type filtering',
    dataType: 'text',
    domain: 'work_order',
    whereUsed: 'N/A - no longer used',
    notes: 'Work orders now use regular projects table with project_type = \'work_order\'.',
    replacedBy: 'work_order_number',
    aliases: ['old WOs', 'legacy work orders'],
  },
];

export default deprecatedKPIs;
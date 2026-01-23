/**
 * Quote KPI Definitions
 *
 * Metrics related to vendor quotes, pricing comparisons, and cost analysis.
 * Quotes are stored in the quotes table and linked to projects.
 *
 * AUDIT NOTES (2026-01-23):
 * - Quotes are separate from estimates - they represent vendor bids for materials/services
 * - Best quote selection logic uses lowest quote_amount by category
 * - Quotes feed into project cost calculations when accepted
 */

import { KPIMeasure } from './types';

export const quoteKPIs: KPIMeasure[] = [
  // ==========================================================================
  // BASIC QUOTE METRICS
  // ==========================================================================
  {
    id: 'quote_quote_amount',
    name: 'Quote Amount',
    source: 'database',
    field: 'quotes.quote_amount',
    formula: 'Direct field - total quoted to client/vendor',
    dataType: 'currency',
    domain: 'quote',
    whereUsed: 'QuotesList, project financials, cost comparisons',
    notes: 'The base cost quoted by the vendor before any markup.',
    aliases: ['quote amount', 'quoted price', 'bid amount', 'vendor quote'],
    relatedTo: ['quote_client_amount', 'quote_markup_amount'],
  },
  {
    id: 'quote_client_amount',
    name: 'Client Amount',
    source: 'database',
    field: 'quotes.client_amount',
    formula: 'Amount charged to client (may include markup)',
    dataType: 'currency',
    domain: 'quote',
    whereUsed: 'Quote comparison, billing, client pricing',
    notes: 'What the client is charged (quote_amount + markup).',
    aliases: ['client price', 'selling price', 'charged amount'],
    relatedTo: ['quote_quote_amount', 'quote_markup_amount'],
  },
  {
    id: 'quote_markup_amount',
    name: 'Markup Amount',
    source: 'database',
    field: 'quotes.markup_amount',
    formula: 'client_amount - quote_amount',
    dataType: 'currency',
    domain: 'quote',
    whereUsed: 'Profitability analysis, margin tracking',
    notes: 'Profit margin added to vendor quote for client billing.',
    aliases: ['markup', 'profit amount', 'margin amount'],
    relatedTo: ['quote_quote_amount', 'quote_client_amount', 'quote_markup_percent'],
  },
  {
    id: 'quote_markup_percent',
    name: 'Markup Percent',
    source: 'database',
    field: 'quotes.markup_percent',
    formula: '(markup_amount / quote_amount) × 100',
    dataType: 'percent',
    domain: 'quote',
    whereUsed: 'QuoteForm, financial reports, margin analysis',
    notes: 'Markup as percentage of vendor quote cost.',
    aliases: ['markup %', 'profit margin %', 'margin percent'],
    relatedTo: ['quote_markup_amount'],
  },
  {
    id: 'quote_profit_per_unit',
    name: 'Profit Per Unit',
    source: 'database',
    field: 'quotes.profit_per_unit',
    formula: 'Total profit / quantity (if applicable)',
    dataType: 'currency',
    domain: 'quote',
    whereUsed: 'Unit economics, detailed profitability analysis',
    notes: 'Profit breakdown per unit when quantity is specified.',
    aliases: ['unit profit', 'profit per item'],
  },

  // ==========================================================================
  // COMPARISON & SELECTION METRICS
  // ==========================================================================
  {
    id: 'quote_cost_variance_status',
    name: 'Cost Variance Status',
    source: 'frontend',
    field: 'getCostVarianceStatus()',
    formula: 'Compare actual vs quoted costs',
    dataType: 'enum',
    domain: 'quote',
    whereUsed: 'QuoteComparison, variance analysis',
    notes: 'Status indicating if actual costs match quoted amounts.',
    aliases: ['variance status', 'cost comparison', 'quote vs actual'],
  },
  {
    id: 'quote_best_quote_per_category',
    name: 'Best Quote Per Category',
    source: 'frontend',
    field: 'getBestQuoteForCategory()',
    formula: 'Lowest quote_amount by category',
    dataType: 'currency',
    domain: 'quote',
    whereUsed: 'Quote selection, project budgets, cost optimization',
    notes: 'Automatically identifies the lowest quote for each category to help with vendor selection.',
    aliases: ['best quote', 'lowest bid', 'cheapest option', 'optimal quote'],
    preferWhen: 'User asks about cheapest/best vendor options',
    relatedTo: ['quote_quote_amount'],
  },

  // ==========================================================================
  // QUOTE STATUS & METADATA
  // ==========================================================================
  {
    id: 'quote_status',
    name: 'Quote Status',
    source: 'database',
    field: 'quotes.status',
    formula: "ENUM: 'pending' | 'accepted' | 'rejected' | 'expired'",
    dataType: 'enum',
    domain: 'quote',
    whereUsed: 'Quote filtering, status tracking, workflow management',
    notes: 'Current status of the quote in the approval process.',
    aliases: ['status', 'quote status'],
  },
  {
    id: 'quote_category',
    name: 'Quote Category',
    source: 'database',
    field: 'quotes.category',
    formula: "ENUM: 'materials' | 'labor' | 'equipment' | 'subcontractor' | etc.",
    dataType: 'enum',
    domain: 'quote',
    whereUsed: 'Quote organization, filtering, categorization',
    notes: 'Type of work or materials the quote covers.',
    aliases: ['category', 'type', 'quote type'],
  },
  {
    id: 'quote_vendor_name',
    name: 'Vendor Name',
    source: 'database',
    field: 'quotes.vendor_name',
    formula: 'Name of the vendor providing the quote',
    dataType: 'text',
    domain: 'quote',
    whereUsed: 'Quote display, vendor management, reporting',
    notes: 'Human-readable vendor identifier.',
    aliases: ['vendor', 'supplier', 'company'],
  },
  {
    id: 'quote_description',
    name: 'Quote Description',
    source: 'database',
    field: 'quotes.description',
    formula: 'Detailed description of quoted work/materials',
    dataType: 'text',
    domain: 'quote',
    whereUsed: 'Quote details, work specifications, documentation',
    notes: 'Detailed explanation of what the quote covers.',
    aliases: ['description', 'details', 'scope'],
  },
  {
    id: 'quote_valid_until',
    name: 'Valid Until',
    source: 'database',
    field: 'quotes.valid_until',
    formula: 'Date until which the quote remains valid',
    dataType: 'date',
    domain: 'quote',
    whereUsed: 'Quote management, expiration tracking',
    notes: 'Quotes may expire and require re-quoting.',
    aliases: ['expiration', 'expires', 'valid date'],
  },
];

export default quoteKPIs;
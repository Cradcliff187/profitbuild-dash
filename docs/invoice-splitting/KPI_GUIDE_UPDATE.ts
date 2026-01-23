/**
 * KPI Guide Update - Revenue Split KPIs
 * 
 * Add these entries to the revenueKPIs array in src/pages/KPIGuide.tsx
 * 
 * Find the existing revenueKPIs array and add these new entries.
 */

// ============================================================================
// NEW KPI ENTRIES TO ADD
// ============================================================================

// Add these to the revenueKPIs array:

{ 
  name: 'Revenue Split Amount', 
  source: 'database', 
  field: 'revenue_splits.split_amount', 
  formula: 'Direct DB field - portion allocated to specific project', 
  whereUsed: 'Split revenue calculations, project financial views',
  notes: 'Only exists when parent revenue.is_split = true'
},
{ 
  name: 'Revenue Split Percentage', 
  source: 'database', 
  field: 'revenue_splits.split_percentage', 
  formula: '(split_amount / parent_revenue.amount) × 100', 
  whereUsed: 'Allocation display in RevenueSplitDialog',
  notes: 'Calculated field for display purposes'
},
{ 
  name: 'Is Split (Revenue)', 
  source: 'database', 
  field: 'project_revenues.is_split', 
  formula: 'Boolean flag - true when revenue is allocated across multiple projects', 
  whereUsed: 'RevenueForm, revenue lists, reporting queries',
  notes: 'When true, project_id points to SYS-000'
},
{ 
  name: 'Total Revenue by Project (Split-Aware)', 
  source: 'frontend', 
  field: 'calculateProjectRevenue()', 
  formula: 'SUM(revenues.amount WHERE !is_split) + SUM(revenue_splits.split_amount)', 
  whereUsed: 'Project financial views, dashboards',
  notes: 'Combines direct and split revenues for accurate project totals'
},

// ============================================================================
// EXISTING KPI TO UPDATE
// ============================================================================

// Find and update the 'Total Invoiced' entry to reflect split handling:

{ 
  name: 'Total Invoiced', 
  source: 'database', 
  field: 'project_financial_summary.total_invoiced', 
  formula: 'SUM(project_revenues.amount) for non-split + SUM(revenue_splits.split_amount)', 
  whereUsed: 'Project financial summary, dashboards', 
  notes: 'View-calculated aggregate - handles split revenues correctly'
},

// ============================================================================
// FULL UPDATED revenueKPIs ARRAY (for reference)
// ============================================================================

/*
const revenueKPIs: KPIMeasure[] = [
  { 
    name: 'Invoice Amount', 
    source: 'database', 
    field: 'project_revenues.amount', 
    formula: 'Direct DB field - individual invoice amount', 
    whereUsed: 'ProjectFinancialReconciliation, financial reports', 
    notes: 'Stored per invoice record. For split invoices, this is the TOTAL before splitting.' 
  },
  { 
    name: 'Invoice Date', 
    source: 'database', 
    field: 'project_revenues.invoice_date', 
    formula: 'Direct DB field - when invoice was issued', 
    whereUsed: 'Revenue tracking, cash flow', 
    notes: 'Stored per invoice record' 
  },
  { 
    name: 'Invoice Number', 
    source: 'database', 
    field: 'project_revenues.invoice_number', 
    formula: 'Direct DB field - QuickBooks invoice reference', 
    whereUsed: 'Invoice lookup, reconciliation', 
    notes: 'Stored per invoice record' 
  },
  { 
    name: 'Is Split (Revenue)', 
    source: 'database', 
    field: 'project_revenues.is_split', 
    formula: 'Boolean flag - true when revenue is allocated across multiple projects', 
    whereUsed: 'RevenueForm, revenue lists, reporting queries',
    notes: 'When true, project_id points to SYS-000'
  },
  { 
    name: 'Revenue Split Amount', 
    source: 'database', 
    field: 'revenue_splits.split_amount', 
    formula: 'Direct DB field - portion allocated to specific project', 
    whereUsed: 'Split revenue calculations, project financial views',
    notes: 'Only exists when parent revenue.is_split = true'
  },
  { 
    name: 'Revenue Split Percentage', 
    source: 'database', 
    field: 'revenue_splits.split_percentage', 
    formula: '(split_amount / parent_revenue.amount) × 100', 
    whereUsed: 'Allocation display in RevenueSplitDialog',
    notes: 'Calculated field for display purposes'
  },
  { 
    name: 'Total Invoiced', 
    source: 'database', 
    field: 'project_financial_summary.total_invoiced', 
    formula: 'SUM(project_revenues.amount) for non-split + SUM(revenue_splits.split_amount)', 
    whereUsed: 'Project financial summary, dashboards', 
    notes: 'View-calculated aggregate - handles split revenues correctly'
  },
  { 
    name: 'Invoice Count', 
    source: 'database', 
    field: 'project_financial_summary.invoice_count', 
    formula: 'COUNT(project_revenues)', 
    whereUsed: 'Project financial summary', 
    notes: 'View-calculated aggregate' 
  },
  { 
    name: 'Revenue Variance', 
    source: 'database', 
    field: 'project_financial_summary.revenue_variance', 
    formula: 'contracted_amount - total_invoiced', 
    whereUsed: 'Variance analysis, financial dashboards', 
    notes: 'View-calculated - shows billing gap. Now split-aware.' 
  },
  { 
    name: 'Total Revenue by Project (Split-Aware)', 
    source: 'frontend', 
    field: 'calculateProjectRevenue()', 
    formula: 'SUM(revenues.amount WHERE !is_split) + SUM(revenue_splits.split_amount)', 
    whereUsed: 'Project financial views, dashboards',
    notes: 'Combines direct and split revenues for accurate project totals'
  },
];
*/

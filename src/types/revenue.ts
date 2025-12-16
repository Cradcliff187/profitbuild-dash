/**
 * @file revenue.ts
 * @description TypeScript types for project revenues and revenue splitting
 * 
 * UPDATED: Added RevenueSplit interface and updated ProjectRevenue
 * to support splitting invoices across multiple projects.
 * 
 * Pattern mirrors existing expense/expense_splits implementation.
 */

// ============================================================================
// REVENUE SPLIT TYPES (NEW)
// ============================================================================

/**
 * Represents a single split allocation of a revenue to a project
 * Child record of project_revenues when is_split = true
 */
export interface RevenueSplit {
  id: string;
  revenue_id: string;
  project_id: string;
  split_amount: number;
  split_percentage?: number | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields for display
  project_name?: string;
  project_number?: string;
}

/**
 * Input type for creating a new revenue split
 */
export interface CreateRevenueSplitInput {
  project_id: string;
  split_amount: number;
  split_percentage?: number;
  notes?: string;
}

/**
 * Input type for the split dialog form
 */
export interface RevenueSplitFormInput {
  project_id: string;
  split_amount: string; // String for form input handling
  notes: string;
}

// ============================================================================
// PROJECT REVENUE TYPES (UPDATED)
// ============================================================================

/**
 * Represents an invoice/revenue record
 * UPDATED: Added is_split flag for split revenue support
 */
export interface ProjectRevenue {
  id: string;
  project_id: string;
  invoice_number?: string;
  client_id?: string;
  amount: number;
  invoice_date: Date;
  description?: string;
  account_name?: string;
  account_full_name?: string;
  quickbooks_transaction_id?: string;
  created_at: Date;
  updated_at: Date;
  
  // NEW: Split support
  is_split?: boolean;
  
  // Display fields populated from joins
  client_name?: string;
  project_name?: string;
  project_number?: string;
  customer_po_number?: string;
  
  // Optional: Loaded splits for display
  splits?: RevenueSplit[];
}

/**
 * Data required to create a new revenue record
 * UPDATED: Added is_split flag
 */
export interface CreateProjectRevenueData {
  project_id: string;
  invoice_number?: string;
  client_id?: string;
  amount: number;
  invoice_date: Date;
  description?: string;
  account_name?: string;
  account_full_name?: string;
  quickbooks_transaction_id?: string;
  is_split?: boolean;
}

/**
 * Revenue with split details for list display
 */
export interface RevenueWithSplits extends ProjectRevenue {
  splits: RevenueSplit[];
  split_count?: number;
}

// ============================================================================
// EXISTING TYPES (UNCHANGED)
// ============================================================================

export interface ExpenseLineItemCorrelation {
  id: string;
  expense_id: string;
  estimate_line_item_id?: string;
  quote_id?: string;
  correlation_type: 'estimated' | 'quoted' | 'unplanned' | 'change_order';
  confidence_score?: number;
  auto_correlated: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectFinancialSummary {
  project_id: string;
  project_name: string;
  project_number: string;
  client_name: string;
  status: string;
  contracted_amount: number;
  
  // Estimate totals
  total_estimated: number;
  
  // Revenue totals (now handles splits correctly)
  total_invoiced: number;
  invoice_count: number;
  
  // Expense totals
  total_expenses: number;
  expense_count: number;
  
  // Change order impact
  change_order_revenue: number;
  change_order_costs: number;
  
  // Calculated margins
  actual_profit: number;
  current_margin_percentage: number;
  
  // Variance calculations
  cost_variance: number;
  revenue_variance: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Result type for split operations
 */
export interface RevenueSplitResult {
  success: boolean;
  error?: string;
  splits?: RevenueSplit[];
}

/**
 * Validation result for split totals
 */
export interface SplitValidationResult {
  valid: boolean;
  error?: string;
  total?: number;
  difference?: number;
}

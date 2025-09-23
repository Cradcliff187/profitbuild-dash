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
  // Display fields populated from joins
  client_name?: string;
  project_name?: string;
}

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
}

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
  
  // Estimate totals
  total_estimated: number;
  contingency_amount: number;
  
  // Revenue totals
  total_invoiced: number;
  invoice_count: number;
  
  // Expense totals
  total_expenses: number;
  expense_count: number;
  
  // Quote totals
  total_quoted: number;
  accepted_quote_count: number;
  
  // Change order impact
  change_order_revenue: number;
  change_order_costs: number;
  
  // Calculated margins
  actual_profit: number;
  actual_margin_percentage: number;
  
  // Variance calculations
  cost_variance: number;
  revenue_variance: number;
}
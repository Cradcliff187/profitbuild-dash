export interface ProfitAnalysisProject {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string | null;
  status: 'approved' | 'in_progress' | 'complete';
  job_type: string | null;
  start_date: string | null;
  end_date: string | null;
  
  // Revenue/Billing - from database
  contracted_amount: number;
  total_invoiced: number;
  invoice_count: number;
  change_order_revenue: number;
  
  // Margins - from database
  original_margin: number;
  projected_margin: number;
  current_margin: number;
  actual_margin: number;
  margin_percentage: number;
  adjusted_est_margin: number;
  
  // Costs - from database
  original_est_costs: number;
  adjusted_est_costs: number;
  total_expenses: number;
  cost_variance: number;
  cost_variance_percent: number;
  budget_utilization_percent: number;
  
  // Quotes - from database
  total_accepted_quotes: number;
  accepted_quote_count: number;
  
  // Change Orders - from database
  change_order_cost: number;
  change_order_count: number;
  
  // Contingency - from database
  contingency_amount: number;
  contingency_used: number;
  contingency_remaining: number;
  
  // Category breakdown (JSONB from database)
  expenses_by_category: Record<string, number>;
}

export interface ProfitSummaryTotals {
  totalContractValue: number;
  totalInvoiced: number;
  totalRemainingToBill: number;
  totalProjectedMargin: number;
  totalActualMargin: number;
  totalOriginalEstCosts: number;
  totalAdjustedEstCosts: number;
  totalActualExpenses: number;
  aggregateMarginPercent: number;
  projectCount: number;
}


export interface ProjectProfitData {
  projectId: string;
  projectName: string;
  client: string;
  estimateTotal: number;
  quoteTotal: number; // Best/selected quote for each category
  actualExpenses: number;
  
  // Profit calculations
  estimatedProfit: number; // Quote - Estimate (what we expected to make)
  actualProfit: number; // Quote - Actual Expenses (what we actually made)
  profitMargin: number; // (actualProfit / quoteTotal) * 100
  profitVariance: number; // actualProfit - estimatedProfit
  
  // Time-based data
  projectStartDate: Date;
  projectEndDate?: Date;
  status: 'Estimating' | 'In Progress' | 'Complete';
}

export interface ProfitTrend {
  month: string;
  year: number;
  totalProfit: number;
  totalRevenue: number;
  marginPercentage: number;
  projectCount: number;
}

export interface ProfitAnalyticsSummary {
  totalProfit: number;
  totalRevenue: number;
  averageMargin: number;
  projectCount: number;
  monthlyTrends: ProfitTrend[];
  quarterlyRunRate: number;
  projectedAnnualProfit: number;
}
import { Estimate } from '@/types/estimate';
import { Quote } from '@/types/quote';
import { Expense } from '@/types/expense';
import { Project } from '@/types/project';
import { ProjectProfitData, ProfitTrend, ProfitAnalyticsSummary } from '@/types/profit';

export function calculateProjectProfit(
  estimate: Estimate,
  quotes: Quote[],
  expenses: Expense[],
  storedProjectData?: {
    contracted_amount?: number | null;
    current_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }
): ProjectProfitData {
  // Find the best quote for this project (lowest total)
  const projectQuotes = quotes.filter(q => q.project_id === estimate.project_id);
  const bestQuote = projectQuotes.reduce((best, current) => 
    current.total < best.total ? current : best, 
    projectQuotes[0] || { total: 0, quotedBy: 'No Quote', dateReceived: new Date() }
  );
  
  // NOTE: This function uses pre-calculated values from stored project data
  // For accurate split-aware calculations, use calculateProjectProfitAsync
  const actualExpenses = storedProjectData?.current_margin 
    ? ((storedProjectData.contracted_amount || 0) - storedProjectData.current_margin)
    : expenses.filter(e => e.project_id === estimate.project_id).reduce((sum, e) => sum + e.amount, 0);
  
  // Use stored data if available, otherwise calculate
  const quoteTotal = storedProjectData?.contracted_amount ?? bestQuote?.total ?? 0;
  const estimatedProfit = quoteTotal - estimate.total_amount;
  const actualProfit = storedProjectData?.current_margin ?? (quoteTotal - actualExpenses);
  const profitMargin = storedProjectData?.margin_percentage ?? (quoteTotal > 0 ? (actualProfit / quoteTotal) * 100 : 0);
  const profitVariance = actualProfit - estimatedProfit;
  
  // Determine project status
  let status: 'Estimating' | 'In Progress' | 'Complete' = 'Estimating';
  if (projectQuotes.length > 0 && actualExpenses > 0) {
    status = actualExpenses >= quoteTotal * 0.8 ? 'Complete' : 'In Progress';
  } else if (projectQuotes.length > 0) {
    status = 'In Progress';
  }
  
  return {
    projectId: estimate.project_id,
    projectName: estimate.project_name || `Project for ${estimate.estimate_number}`,
    client: estimate.client_name || 'Unknown Client',
    estimateTotal: estimate.total_amount,
    quoteTotal,
    actualExpenses,
    estimatedProfit,
    actualProfit,
    profitMargin,
    profitVariance,
    projectStartDate: estimate.date_created,
    projectEndDate: status === 'Complete' ? new Date() : undefined,
    status
  };
}

/**
 * Async version of calculateProjectProfit that correctly handles split expenses
 * Use this version when you need accurate expense calculations
 */
export async function calculateProjectProfitAsync(
  estimate: Estimate,
  quotes: Quote[],
  expenses: Expense[],
  storedProjectData?: {
    contracted_amount?: number | null;
    current_margin?: number | null;
    margin_percentage?: number | null;
    total_accepted_quotes?: number | null;
  }
): Promise<ProjectProfitData> {
  // Find the best quote for this project (lowest total)
  const projectQuotes = quotes.filter(q => q.project_id === estimate.project_id);
  const bestQuote = projectQuotes.reduce((best, current) => 
    current.total < best.total ? current : best, 
    projectQuotes[0] || { total: 0, quotedBy: 'No Quote', dateReceived: new Date() }
  );
  
  // Calculate actual expenses for this project (handling splits correctly)
  const { calculateProjectExpenses } = await import('./expenseSplits');
  const actualExpenses = await calculateProjectExpenses(estimate.project_id, expenses);
  
  // Use stored data if available, otherwise calculate
  const quoteTotal = storedProjectData?.contracted_amount ?? bestQuote?.total ?? 0;
  const estimatedProfit = quoteTotal - estimate.total_amount;
  const actualProfit = storedProjectData?.current_margin ?? (quoteTotal - actualExpenses);
  const profitMargin = storedProjectData?.margin_percentage ?? (quoteTotal > 0 ? (actualProfit / quoteTotal) * 100 : 0);
  const profitVariance = actualProfit - estimatedProfit;
  
  // Determine project status
  let status: 'Estimating' | 'In Progress' | 'Complete' = 'Estimating';
  if (projectQuotes.length > 0 && actualExpenses > 0) {
    status = actualExpenses >= quoteTotal * 0.8 ? 'Complete' : 'In Progress';
  } else if (projectQuotes.length > 0) {
    status = 'In Progress';
  }
  
  return {
    projectId: estimate.project_id,
    projectName: estimate.project_name || `Project for ${estimate.estimate_number}`,
    client: estimate.client_name || 'Unknown Client',
    estimateTotal: estimate.total_amount,
    quoteTotal,
    actualExpenses,
    estimatedProfit,
    actualProfit,
    profitMargin,
    profitVariance,
    projectStartDate: estimate.date_created,
    projectEndDate: status === 'Complete' ? new Date() : undefined,
    status
  };
}

export function calculateProfitTrends(projectProfits: ProjectProfitData[]): ProfitTrend[] {
  const monthlyData = new Map<string, {
    totalProfit: number;
    totalRevenue: number;
    projectCount: number;
    year: number;
    month: string;
  }>();
  
  projectProfits.forEach(project => {
    const date = project.projectEndDate || project.projectStartDate;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        totalProfit: 0,
        totalRevenue: 0,
        projectCount: 0,
        year: date.getFullYear(),
        month: monthName
      });
    }
    
    const data = monthlyData.get(monthKey)!;
    data.totalProfit += project.actualProfit;
    data.totalRevenue += project.quoteTotal;
    data.projectCount += 1;
  });
  
  return Array.from(monthlyData.values())
    .map(data => ({
      month: data.month,
      year: data.year,
      totalProfit: data.totalProfit,
      totalRevenue: data.totalRevenue,
      marginPercentage: data.totalRevenue > 0 ? (data.totalProfit / data.totalRevenue) * 100 : 0,
      projectCount: data.projectCount
    }))
    .sort((a, b) => `${a.year}-${a.month}`.localeCompare(`${b.year}-${b.month}`));
}

export function calculateProfitAnalytics(
  estimates: Estimate[],
  quotes: Quote[],
  expenses: Expense[],
  projects?: Project[]
): ProfitAnalyticsSummary {
  const projectProfits = estimates.map(estimate => {
    // Find corresponding project for stored margin data
    const project = projects?.find(p => p.id === estimate.project_id);
    const storedProjectData = project ? {
      contracted_amount: project.contracted_amount,
      current_margin: project.current_margin,
      margin_percentage: project.margin_percentage,
      total_accepted_quotes: project.total_accepted_quotes,
    } : undefined;
    
    return calculateProjectProfit(estimate, quotes, expenses, storedProjectData);
  });
  
  const totalProfit = projectProfits.reduce((sum, project) => sum + project.actualProfit, 0);
  const totalRevenue = projectProfits.reduce((sum, project) => sum + project.quoteTotal, 0);
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const projectCount = projectProfits.length;
  
  const monthlyTrends = calculateProfitTrends(projectProfits);
  
  // Calculate quarterly run rate based on last 3 months
  const recentTrends = monthlyTrends.slice(-3);
  const quarterlyProfit = recentTrends.reduce((sum, trend) => sum + trend.totalProfit, 0);
  const quarterlyRunRate = quarterlyProfit / Math.max(recentTrends.length, 1);
  
  // Project annual profit based on quarterly run rate
  const projectedAnnualProfit = quarterlyRunRate * 12;
  
  return {
    totalProfit,
    totalRevenue,
    averageMargin,
    projectCount,
    monthlyTrends,
    quarterlyRunRate,
    projectedAnnualProfit
  };
}

export function getTopProfitableProjects(
  projectProfits: ProjectProfitData[],
  limit: number = 5
): ProjectProfitData[] {
  return [...projectProfits]
    .sort((a, b) => b.actualProfit - a.actualProfit)
    .slice(0, limit);
}

export function getWorstPerformingProjects(
  projectProfits: ProjectProfitData[],
  limit: number = 5
): ProjectProfitData[] {
  return [...projectProfits]
    .sort((a, b) => a.actualProfit - b.actualProfit)
    .slice(0, limit);
}

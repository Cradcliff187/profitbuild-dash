import { Estimate } from '@/types/estimate';
import { Quote } from '@/types/quote';
import { Expense } from '@/types/expense';
import { ProjectProfitData, ProfitTrend, ProfitAnalyticsSummary } from '@/types/profit';

export function calculateProjectProfit(
  estimate: Estimate,
  quotes: Quote[],
  expenses: Expense[]
): ProjectProfitData {
  // Find the best quote for this project (lowest total)
  const projectQuotes = quotes.filter(q => q.estimateId === estimate.id);
  const bestQuote = projectQuotes.reduce((best, current) => 
    current.total < best.total ? current : best, 
    projectQuotes[0] || { total: 0, quotedBy: 'No Quote', dateReceived: new Date() }
  );
  
  // Calculate actual expenses for this project
  const projectExpenses = expenses.filter(e => e.projectId === estimate.id);
  const actualExpenses = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Calculate profits
  const quoteTotal = bestQuote?.total || 0;
  const estimatedProfit = quoteTotal - estimate.total;
  const actualProfit = quoteTotal - actualExpenses;
  const profitMargin = quoteTotal > 0 ? (actualProfit / quoteTotal) * 100 : 0;
  const profitVariance = actualProfit - estimatedProfit;
  
  // Determine project status
  let status: 'Estimating' | 'In Progress' | 'Complete' = 'Estimating';
  if (projectQuotes.length > 0 && actualExpenses > 0) {
    status = actualExpenses >= quoteTotal * 0.8 ? 'Complete' : 'In Progress';
  } else if (projectQuotes.length > 0) {
    status = 'In Progress';
  }
  
  return {
    projectId: estimate.id,
    projectName: estimate.projectName,
    client: estimate.client,
    estimateTotal: estimate.total,
    quoteTotal,
    actualExpenses,
    estimatedProfit,
    actualProfit,
    profitMargin,
    profitVariance,
    projectStartDate: estimate.date,
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
  expenses: Expense[]
): ProfitAnalyticsSummary {
  const projectProfits = estimates.map(estimate => 
    calculateProjectProfit(estimate, quotes, expenses)
  );
  
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
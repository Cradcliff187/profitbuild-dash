import { Project } from './project';
import { Expense } from './expense';
import { Estimate } from './estimate';

export interface ProjectMargin {
  project_id: string;
  contracted_amount: number;
  total_accepted_quotes: number;
  current_margin: number;
  margin_percentage: number;
  contingency_total: number;
  contingency_used: number;
  contingency_remaining: number;
  minimum_threshold: number;
  target_margin: number;
  at_risk: boolean;
}

/**
 * Calculate project margin data from project, expenses, and estimates
 */
export const calculateProjectMargin = (
  project: Project,
  expenses: Expense[] = [],
  estimates: Estimate[] = []
): ProjectMargin => {
  const projectExpenses = expenses.filter(exp => exp.project_id === project.id);
  const totalExpenses = projectExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  
  // Get current estimate for contingency data
  const currentEstimate = estimates.find(est => 
    est.project_id === project.id && est.is_current_version
  );
  
  const contractedAmount = project.contracted_amount || 0;
  const totalAcceptedQuotes = project.total_accepted_quotes || 0;
  const currentMargin = project.current_margin || (contractedAmount - totalExpenses);
  const marginPercentage = project.margin_percentage || 
    (contractedAmount > 0 ? (currentMargin / contractedAmount) * 100 : 0);
  
  const contingencyTotal = currentEstimate?.contingency_amount || 0;
  const contingencyUsed = currentEstimate?.contingency_used || 0;
  const contingencyRemaining = project.contingency_remaining || (contingencyTotal - contingencyUsed);
  
  const minimumThreshold = project.minimum_margin_threshold || 10.0;
  const targetMargin = project.target_margin || 20.0;
  
  const atRisk = marginPercentage < minimumThreshold;

  return {
    project_id: project.id,
    contracted_amount: contractedAmount,
    total_accepted_quotes: totalAcceptedQuotes,
    current_margin: currentMargin,
    margin_percentage: marginPercentage,
    contingency_total: contingencyTotal,
    contingency_used: contingencyUsed,
    contingency_remaining: contingencyRemaining,
    minimum_threshold: minimumThreshold,
    target_margin: targetMargin,
    at_risk: atRisk
  };
};

/**
 * Check if a project margin is at risk
 */
export const isMarginAtRisk = (margin: ProjectMargin): boolean => {
  return margin.at_risk || margin.margin_percentage < margin.minimum_threshold;
};

/**
 * Calculate margin efficiency as a percentage of target
 */
export const getMarginEfficiency = (margin: ProjectMargin): number => {
  if (margin.target_margin === 0) return 0;
  return Math.max(0, (margin.margin_percentage / margin.target_margin) * 100);
};

/**
 * Get margin status level
 */
export const getMarginStatusLevel = (margin: ProjectMargin): 'critical' | 'at_risk' | 'on_target' | 'excellent' => {
  if (margin.margin_percentage < margin.minimum_threshold) return 'critical';
  if (margin.margin_percentage < margin.target_margin) return 'at_risk';
  if (margin.margin_percentage >= 30.0) return 'excellent';
  return 'on_target';
};

/**
 * Calculate contingency utilization percentage
 */
export const getContingencyUtilization = (margin: ProjectMargin): number => {
  if (margin.contingency_total === 0) return 0;
  return (margin.contingency_used / margin.contingency_total) * 100;
};

/**
 * Format currency for display
 */
export const formatMarginCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
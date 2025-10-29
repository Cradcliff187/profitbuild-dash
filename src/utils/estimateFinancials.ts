import { LineItem } from "@/types/estimate";

export interface EstimateFinancialMetrics {
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  averageMarkupPercent: number;
  totalMarkupAmount: number;
}

/**
 * Calculate the total revenue (price) of all line items
 */
export const calculateEstimateTotalAmount = (lineItems: LineItem[]): number => {
  return lineItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
};

/**
 * Calculate the total cost of all line items
 */
export const calculateEstimateTotalCost = (lineItems: LineItem[]): number => {
  return lineItems.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.costPerUnit), 0);
};

/**
 * Calculate the gross profit (revenue - cost)
 */
export const calculateEstimateGrossProfit = (lineItems: LineItem[]): number => {
  const totalAmount = calculateEstimateTotalAmount(lineItems);
  const totalCost = calculateEstimateTotalCost(lineItems);
  return totalAmount - totalCost;
};

/**
 * Calculate the gross margin percentage ((revenue - cost) / revenue * 100)
 */
export const calculateEstimateGrossMargin = (lineItems: LineItem[]): number => {
  const totalAmount = calculateEstimateTotalAmount(lineItems);
  if (totalAmount === 0) return 0;
  
  const grossProfit = calculateEstimateGrossProfit(lineItems);
  return (grossProfit / totalAmount) * 100;
};

/**
 * Calculate the total markup amount across all line items
 */
export const calculateEstimateTotalMarkup = (lineItems: LineItem[]): number => {
  return lineItems.reduce((sum, item) => {
    const itemMarkup = item.quantity * (item.pricePerUnit - item.costPerUnit);
    return sum + itemMarkup;
  }, 0);
};

/**
 * Calculate the average markup percentage across all line items (weighted by cost)
 */
export const calculateEstimateAverageMarkup = (lineItems: LineItem[]): number => {
  const totalCost = calculateEstimateTotalCost(lineItems);
  if (totalCost === 0) return 0;
  
  const totalMarkup = calculateEstimateTotalMarkup(lineItems);
  return (totalMarkup / totalCost) * 100;
};

/**
 * Calculate all financial metrics for an estimate
 */
export const calculateEstimateFinancials = (lineItems: LineItem[]): EstimateFinancialMetrics => {
  return {
    totalAmount: calculateEstimateTotalAmount(lineItems),
    totalCost: calculateEstimateTotalCost(lineItems),
    grossProfit: calculateEstimateGrossProfit(lineItems),
    grossMarginPercent: calculateEstimateGrossMargin(lineItems),
    averageMarkupPercent: calculateEstimateAverageMarkup(lineItems),
    totalMarkupAmount: calculateEstimateTotalMarkup(lineItems)
  };
};

/**
 * Get margin performance status based on percentage thresholds
 */
export const getMarginPerformanceStatus = (marginPercent: number): 'excellent' | 'good' | 'poor' | 'critical' | 'loss' => {
  if (marginPercent < 0) return 'loss';
  if (marginPercent >= 25) return 'excellent';
  if (marginPercent >= 15) return 'good';  
  if (marginPercent >= 5) return 'poor';
  return 'critical';
};

/**
 * Get markup performance status based on percentage thresholds
 */
export const getMarkupPerformanceStatus = (markupPercent: number): 'excellent' | 'good' | 'poor' | 'critical' | 'loss' => {
  if (markupPercent < 0) return 'loss';
  if (markupPercent >= 30) return 'excellent';
  if (markupPercent >= 20) return 'good';
  if (markupPercent >= 10) return 'poor';
  return 'critical';
};
import { QuoteLineItem } from "@/types/quote";
import { LineItem } from "@/types/estimate";

// Financial metrics interface for quotes
export interface QuoteFinancialMetrics {
  totalAmount: number;
  totalCost: number;
  totalMarkup: number;
  grossProfit: number;
  grossMargin: number;
  averageMarkup: number;
}

// Calculate total amount from quote line items
export function calculateQuoteTotalAmount(lineItems: QuoteLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.total, 0);
}

// Calculate total cost from quote line items
export function calculateQuoteTotalCost(lineItems: QuoteLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
}

// Calculate total markup from quote line items
export function calculateQuoteTotalMarkup(lineItems: QuoteLineItem[]): number {
  return lineItems.reduce((sum, item) => {
    if (item.markupPercent !== null && item.markupPercent !== undefined) {
      return sum + (item.quantity * item.costPerUnit * (item.markupPercent / 100));
    }
    if (item.markupAmount !== null && item.markupAmount !== undefined) {
      return sum + (item.quantity * item.markupAmount);
    }
    return sum;
  }, 0);
}

// Calculate gross profit (total amount - total cost)
export function calculateQuoteGrossProfit(lineItems: QuoteLineItem[]): number {
  const totalAmount = calculateQuoteTotalAmount(lineItems);
  const totalCost = calculateQuoteTotalCost(lineItems);
  return totalAmount - totalCost;
}

// Calculate gross margin percentage
export function calculateQuoteGrossMargin(lineItems: QuoteLineItem[]): number {
  const totalAmount = calculateQuoteTotalAmount(lineItems);
  const grossProfit = calculateQuoteGrossProfit(lineItems);
  
  if (totalAmount === 0) return 0;
  return (grossProfit / totalAmount) * 100;
}

// Calculate average markup percentage
export function calculateQuoteAverageMarkup(lineItems: QuoteLineItem[]): number {
  const totalCost = calculateQuoteTotalCost(lineItems);
  const totalMarkup = calculateQuoteTotalMarkup(lineItems);
  
  if (totalCost === 0) return 0;
  return (totalMarkup / totalCost) * 100;
}

// Calculate all financial metrics at once
export function calculateQuoteFinancials(lineItems: QuoteLineItem[]): QuoteFinancialMetrics {
  const totalAmount = calculateQuoteTotalAmount(lineItems);
  const totalCost = calculateQuoteTotalCost(lineItems);
  const totalMarkup = calculateQuoteTotalMarkup(lineItems);
  const grossProfit = totalAmount - totalCost;
  const grossMargin = totalAmount > 0 ? (grossProfit / totalAmount) * 100 : 0;
  const averageMarkup = totalCost > 0 ? (totalMarkup / totalCost) * 100 : 0;

  return {
    totalAmount,
    totalCost,
    totalMarkup,
    grossProfit,
    grossMargin,
    averageMarkup
  };
}

// Compare quote vs estimate costs by category
export interface CategoryCostComparison {
  estimatedCost: number;
  quotedCost: number;
  estimatedPrice: number;
  quotedPrice: number;
  costVariance: number;
  priceVariance: number;
  costVariancePercent: number;
  priceVariancePercent: number;
}

export function compareQuoteToEstimate(
  quoteLineItems: QuoteLineItem[],
  estimateLineItems: LineItem[]
): { [category: string]: CategoryCostComparison } {
  const comparison: { [category: string]: CategoryCostComparison } = {};

  // Get unique categories from both quote and estimate
  const categories = new Set([
    ...quoteLineItems.map(item => item.category),
    ...estimateLineItems.map(item => item.category)
  ]);

  categories.forEach(category => {
    const quoteItems = quoteLineItems.filter(item => item.category === category);
    const estimateItems = estimateLineItems.filter(item => item.category === category);

    const estimatedCost = estimateItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
    const quotedCost = quoteItems.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
    const estimatedPrice = estimateItems.reduce((sum, item) => sum + item.total, 0);
    const quotedPrice = quoteItems.reduce((sum, item) => sum + item.total, 0);

    const costVariance = quotedCost - estimatedCost;
    const priceVariance = quotedPrice - estimatedPrice;
    const costVariancePercent = estimatedCost > 0 ? (costVariance / estimatedCost) * 100 : 0;
    const priceVariancePercent = estimatedPrice > 0 ? (priceVariance / estimatedPrice) * 100 : 0;

    comparison[category] = {
      estimatedCost,
      quotedCost,
      estimatedPrice,
      quotedPrice,
      costVariance,
      priceVariance,
      costVariancePercent,
      priceVariancePercent
    };
  });

  return comparison;
}

// Performance status functions
export function getCostVarianceStatus(variancePercent: number): 'excellent' | 'good' | 'poor' | 'critical' {
  const absVariance = Math.abs(variancePercent);
  if (absVariance <= 5) return 'excellent';
  if (absVariance <= 15) return 'good';
  if (absVariance <= 30) return 'poor';
  return 'critical';
}

export function getMarginPerformanceStatus(marginPercent: number): 'excellent' | 'good' | 'poor' | 'critical' {
  if (marginPercent >= 25) return 'excellent';
  if (marginPercent >= 15) return 'good';
  if (marginPercent >= 5) return 'poor';
  return 'critical';
}